/**
 * select-agent — binds the n8n Agent that the Agent Builder tools edit.
 *
 * Instance AI builds Agents itself with the builder tools that the agents
 * module supplies. Those tools act on one target Agent, which this tool
 * resolves: it creates a new Agent, adopts an existing one, or continues or
 * switches between Agents targeted earlier in this conversation. The binding
 * is persisted in thread metadata, so follow-up turns keep editing the same
 * Agent instead of creating a new one.
 */
import { createAbortError, Tool } from '@n8n/agents';
import { z } from 'zod';

import {
	getSessionAgentByRef,
	normalizeAgentRef,
	readPendingAgentTarget,
	rereadAgentBuilderTarget,
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import { snapshotAgent } from '../../tracing/agent-snapshot-event';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const selectAgentInputSchema = z.object({
	agentRef: z
		.string()
		.optional()
		.describe(
			'Short stable key you choose once for an agent in this conversation and repeat on ' +
				'every later call for that same agent (like a workflow source filePath). Prefer a ' +
				'slug of the display name. A repeated key switches back to that agent; a fresh key ' +
				'creates a new one only when no agent is bound yet, or alongside `createNew`. When ' +
				'omitted, the key is derived from `name`.',
		),
	name: z
		.string()
		.optional()
		.describe(
			'Display name for a new agent (required when creating). Also used as the addressing ' +
				'key when `agentRef` is omitted.',
		),
	agentId: z
		.string()
		.optional()
		.describe(
			'Existing agent id to adopt — use when editing an agent that was not built in this ' +
				'conversation (e.g. from the project list). NEVER pass for a request to build a NEW ' +
				'agent. Agents the request merely references — as sub-agents, delegation targets, or ' +
				'examples — are not the build target.',
		),
	createNew: z
		.boolean()
		.optional()
		.describe(
			'Set to true ONLY when the user explicitly wants an ADDITIONAL agent alongside the one ' +
				'this conversation is already building. Leave unset otherwise: while a target is ' +
				'bound, a fresh `agentRef`/`name` continues that agent instead of creating a second ' +
				'one, so naming the agent for the first time cannot strand it behind a duplicate.',
		),
});

type SelectAgentInput = z.infer<typeof selectAgentInputSchema>;

const selectAgentOutputSchema = z.object({
	ok: z.boolean(),
	error: z.string().optional(),
	agentId: z.string().optional().describe('Id of the selected agent.'),
	agentRef: z
		.string()
		.optional()
		.describe('Addressing key for this agent. Pass it back as `agentRef` to switch to it later.'),
	agentName: z.string().optional().describe('Display name of the selected agent, when known.'),
	projectId: z.string().optional(),
	mode: z
		.enum(['create', 'edit', 'continued'])
		.optional()
		.describe(
			'`create` for a new agent with no config yet (initial build), otherwise the agent ' +
				'already exists.',
		),
	previewPath: z
		.string()
		.optional()
		.describe('Relative app path of the agent Preview. Use it for markdown Preview links.'),
});

type SelectAgentOutput = z.infer<typeof selectAgentOutputSchema>;

type TargetResolution =
	| { ok: true; target: AgentBuilderTarget; mode: 'create' | 'edit' | 'continued' }
	| { ok: false; error: string };

const NO_TARGET_INPUT_ERROR =
	'Pass `name` (and optionally `agentRef`) to create a new agent, `agentId` to adopt an existing one, or `agentRef` to switch to an agent from this conversation.';
const UNKNOWN_REF_ERROR =
	'Unknown `agentRef`. Pass `name` to create a new agent under that key, or `agentId` to adopt an existing agent.';
const AGENT_ID_NEEDS_PROJECT_ERROR =
	'Cannot bind to agentId without an active project context. Start this conversation from within a project.';
const UNKNOWN_AGENT_ID_ERROR =
	'No agent with this `agentId` exists in this project. Use the `agents` tool to list agents.';

function agentRefConflictError(ref: string, boundAgentId: string, passedAgentId: string): string {
	return (
		`\`agentRef\` "${ref}" is already bound to agent ${boundAgentId} in this conversation, ` +
		`but \`agentId\` ${passedAgentId} was passed. Continue the bound agent (omit \`agentId\`, ` +
		'or pass its id), or pick a different `agentRef` for a new agent.'
	);
}

/**
 * The id the frontend minted for an unsaved new-agent artifact on this thread,
 * so the build persists the agent the user already has open rather than a
 * second one beside it. Ignored when it belongs to a different project.
 */
async function pendingAgentIdFor(context: InstanceAiContext): Promise<string | undefined> {
	const pending = await readPendingAgentTarget(context);
	return pending && pending.projectId === context.projectId ? pending.agentId : undefined;
}

/**
 * Adopt an agent that was not targeted in this conversation. The name lookup
 * also checks that the agent exists and that the user can read it, so a
 * hallucinated or forbidden id never becomes the thread binding.
 */
async function adoptAgent(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	agentId: string,
	input: { ref?: string; name?: string },
): Promise<TargetResolution> {
	if (!domainContext.projectId) return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
	const persistedName = await delegate.resolveAgentName(agentId);
	if (persistedName === undefined) return { ok: false, error: UNKNOWN_AGENT_ID_ERROR };
	const name = input.name ?? persistedName;
	const ref = input.ref ?? (name ? normalizeAgentRef(name) : undefined);
	return {
		ok: true,
		target: {
			agentId,
			projectId: domainContext.projectId,
			...(ref ? { ref } : {}),
			...(name ? { name } : {}),
		},
		mode: 'edit',
	};
}

/**
 * Resolve which agent this call selects. Identity is keyed by
 * `slug(agentRef ?? name)` in the session registry — a repeated key continues,
 * an unknown key adopts (with `agentId`) or, when no target is bound yet,
 * creates (with `name`). A bound target stays active when an unknown key
 * arrives without `createNew`: naming an agent is how the model addresses a
 * new one, so treating that as a create would strand the agent the user
 * already has open behind a duplicate.
 */
async function resolveTarget(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	input: SelectAgentInput,
	boundTarget: AgentBuilderTarget | undefined,
): Promise<TargetResolution> {
	const keySource = input.agentRef ?? input.name;
	const key = keySource ? normalizeAgentRef(keySource) : undefined;

	if (key) {
		const sessionAgent = await getSessionAgentByRef(domainContext, key);
		if (sessionAgent) {
			if (input.agentId && input.agentId !== sessionAgent.agentId) {
				return {
					ok: false,
					error: agentRefConflictError(key, sessionAgent.agentId, input.agentId),
				};
			}
			const base = boundTarget?.agentId === sessionAgent.agentId ? boundTarget : sessionAgent;
			return {
				ok: true,
				target: { ...base, ...sessionAgent, ref: key, ...(input.name ? { name: input.name } : {}) },
				mode: 'edit',
			};
		}

		// Active target already addresses this key (e.g. a handoff whose registry
		// row isn't available) — continue without creating a duplicate.
		const boundKey = boundTarget?.ref
			? normalizeAgentRef(boundTarget.ref)
			: boundTarget?.name
				? normalizeAgentRef(boundTarget.name)
				: undefined;
		if (boundTarget && boundKey === key) {
			if (input.agentId && input.agentId !== boundTarget.agentId) {
				return { ok: false, error: agentRefConflictError(key, boundTarget.agentId, input.agentId) };
			}
			return {
				ok: true,
				target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
				mode: 'edit',
			};
		}

		if (input.agentId) {
			if (input.agentId === boundTarget?.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
					mode: 'edit',
				};
			}
			return await adoptAgent(domainContext, delegate, input.agentId, {
				ref: key,
				...(input.name ? { name: input.name } : {}),
			});
		}

		if (input.name) {
			// Continue the bound agent unless a second one was asked for explicitly.
			// `name` is not applied here: the build names the agent through its
			// config, and overwriting would clobber a name the user chose.
			if (boundTarget && !input.createNew) {
				return { ok: true, target: { ...boundTarget, ref: key }, mode: 'continued' };
			}
			// Adoption is authorized when the id came from this thread's own pending
			// marker: the editor may have won the insert on it and already
			// configured the row. Without a marker the backend mints the id, which
			// cannot collide — so `adoptOnCollision` would be meaningless.
			const pendingId = await pendingAgentIdFor(domainContext);
			if (!pendingId && !input.createNew) {
				// No marker can also mean the editor persisted the artifact and bound it
				// since this turn read its target — which deleted the marker. Creating
				// now would mint a second agent beside that one, so continue it instead.
				const rebound = await rereadAgentBuilderTarget(domainContext);
				if (rebound) return { ok: true, target: { ...rebound, ref: key }, mode: 'continued' };
			}
			const created = await delegate.createAgent(
				input.name,
				pendingId ? { id: pendingId, adoptOnCollision: true } : undefined,
			);
			return {
				ok: true,
				target: {
					agentId: created.agentId,
					projectId: created.projectId,
					// An adopted row keeps the name it was configured with; labelling the
					// binding with the requested one would show a name nothing persisted.
					name: created.name ?? input.name,
					ref: key,
				},
				// Adopting means the editor won the insert on the pending id, so this
				// turn edits an existing agent.
				mode: created.adopted ? 'edit' : 'create',
			};
		}

		return { ok: false, error: UNKNOWN_REF_ERROR };
	}

	if (input.agentId) {
		if (input.agentId === boundTarget?.agentId) {
			return { ok: true, target: boundTarget, mode: 'edit' };
		}
		return await adoptAgent(domainContext, delegate, input.agentId, {});
	}

	if (boundTarget) return { ok: true, target: boundTarget, mode: 'edit' };
	return { ok: false, error: NO_TARGET_INPUT_ERROR };
}

export function createSelectAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.SELECT_AGENT)
		.description(
			'Selects the n8n **Agent** that the Agent Builder tools (read_config, write_config, ' +
				'patch_config, call_agent, publish_agent, …) act on: creates a new Agent (`name`), ' +
				'adopts an existing one (`agentId`), or switches to one from this conversation ' +
				'(`agentRef`). Load `agent-builder` via `load_skill` first and follow it. The binding ' +
				'persists across turns, so call it again only to create, adopt, or switch. Returns ' +
				'`agentRef`/`agentId`, `mode`, and the Preview path.',
		)
		.input(selectAgentInputSchema)
		.output(selectAgentOutputSchema)
		.handler(async (input: SelectAgentInput): Promise<SelectAgentOutput> => {
			if (context.abortSignal.aborted) throw createAbortError('The agent selection was cancelled.');

			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate) {
				return { ok: false, error: 'Agent building is not available on this instance.' };
			}

			const boundTarget = await resolveAgentBuilderTarget(domainContext);
			const resolution = await resolveTarget(domainContext, delegate, input, boundTarget);
			context.trackTelemetry?.('instance_ai_agent_build_route', {
				thread_id: context.threadId,
				run_id: context.runId,
				user_id: context.userId,
				mode: resolution.ok ? resolution.mode : 'resolution_failed',
				...(resolution.ok ? { agent_id: resolution.target.agentId } : {}),
			});
			if (!resolution.ok) return { ok: false, error: resolution.error };

			const { target, mode } = resolution;
			domainContext.agentBuilderTarget = target;
			await saveAgentBuilderTarget(domainContext, target);

			// Before any builder tool touches it: a repair-shaped eval case seeds from
			// the state the build opened on. A new agent has no prior state.
			if (mode !== 'create') {
				await snapshotAgent(context, delegate, target, 'target-resolved');
			}

			return {
				ok: true,
				agentId: target.agentId,
				projectId: target.projectId,
				...(target.ref ? { agentRef: target.ref } : {}),
				...(target.name ? { agentName: target.name } : {}),
				mode,
				previewPath: delegate.getAgentPreviewPath(target.agentId),
			};
		})
		.build();
}
