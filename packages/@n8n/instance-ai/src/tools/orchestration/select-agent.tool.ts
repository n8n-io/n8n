/**
 * agent_builder_select_agent — selects the Agent that the builder tools change.
 *
 * The orchestrator runs the agents-module builder tools itself, and each of
 * them resolves its target through the thread-persisted binding in
 * `agent-target-binding.ts`. This tool creates, adopts, or switches that
 * binding, and returns the per-Agent session context (Preview link and model
 * recommendations) that the build needs.
 */
import { Tool } from '@n8n/agents';
import { agentChangeSchema } from '@n8n/api-types';
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
import { snapshotAgent } from './builder-tools';
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
				'slug of the display name. A repeated key selects that agent; a fresh key creates ' +
				'a new one only when no agent is bound yet, or alongside `createNew`. Omit to keep ' +
				'the current agent. When omitted on a create/switch call, the key is derived from `name`.',
		),
	name: z
		.string()
		.optional()
		.describe(
			'Display name for a new agent (required when creating). Also used as the addressing ' +
				'key when `agentRef` is omitted. Omit on calls for the current agent.',
		),
	agentId: z
		.string()
		.optional()
		.describe(
			'Existing agent id to adopt — use when editing an agent that was not built in this ' +
				'conversation (e.g. from the project list). Once adopted, prefer `agentRef`. NEVER ' +
				'pass for a request to build a NEW agent. Agents the request merely references — as ' +
				'sub-agents, delegation targets, or examples — are not the build target.',
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
		.describe('Addressing key for this agent. Pass it back as `agentRef` to select it again.'),
	agentName: z.string().optional().describe('Display name of the selected agent, when known.'),
	projectId: z.string().optional(),
	agentChange: agentChangeSchema.optional(),
	sessionContext: z
		.string()
		.optional()
		.describe('Preview link and model recommendations for the selected agent.'),
});

type SelectAgentOutput = z.infer<typeof selectAgentOutputSchema>;

type SelectionMode = 'create' | 'edit' | 'continued';

type TargetResolution =
	| {
			ok: true;
			target: AgentBuilderTarget;
			mode: SelectionMode;
			/** Persist the binding before the tool returns. */
			bind: boolean;
			/** The agent id came from the model or the registry, so confirm it exists before binding. */
			verify: boolean;
	  }
	| { ok: false; error: string };

const NO_TARGET_INPUT_ERROR =
	'Pass `name` (and optionally `agentRef`) to create a new agent, `agentId` to adopt an existing one, or `agentRef` to select an agent from this conversation.';
const UNKNOWN_REF_ERROR =
	'Unknown `agentRef`. Pass `name` to create a new agent under that key, or `agentId` to adopt an existing agent.';
const AGENT_ID_NEEDS_PROJECT_ERROR =
	'Cannot bind to agentId without an active project context. Start this conversation from within a project.';

function agentNotFoundError(agentId: string): string {
	return `Agent ${agentId} was not found in this project.`;
}

function agentRefConflictError(ref: string, boundAgentId: string, passedAgentId: string): string {
	return (
		`\`agentRef\` "${ref}" is already bound to agent ${boundAgentId} in this conversation, ` +
		`but \`agentId\` ${passedAgentId} was passed. Select the bound agent (omit \`agentId\`, ` +
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
 * Resolve which agent this call selects. Identity is keyed by
 * `slug(agentRef ?? name)` in the session registry — a repeated key selects,
 * an unknown key adopts (with `agentId`) or, when no target is bound yet,
 * creates (with `name`). A bound target stays active when neither key nor id
 * is given, and also when an unknown key arrives without `createNew`: naming
 * an agent is how the model addresses a new one, so treating that as a create
 * would strand the agent the user already has open behind a duplicate.
 * An agent id from the model or the registry is verified before it binds:
 * there is no unbind path, so a hallucinated, forbidden, or deleted id must
 * never reach the thread metadata.
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
			const target: AgentBuilderTarget = {
				...sessionAgent,
				ref: key,
				...(input.name ? { name: input.name } : {}),
			};
			if (boundTarget?.agentId === target.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ...target },
					mode: 'edit',
					bind: false,
					verify: false,
				};
			}
			// Switch-back: the registry entry can outlive a deleted agent.
			return { ok: true, target, mode: 'edit', bind: true, verify: true };
		}

		// The active target already addresses this key (e.g. a handoff whose
		// registry row is not available) — continue without a duplicate.
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
				bind: true,
				verify: false,
			};
		}

		if (input.agentId) {
			if (input.agentId === boundTarget?.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
					mode: 'edit',
					bind: true,
					verify: false,
				};
			}
			if (!domainContext.projectId) return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
			return {
				ok: true,
				target: {
					agentId: input.agentId,
					projectId: domainContext.projectId,
					ref: key,
					...(input.name ? { name: input.name } : {}),
				},
				mode: 'edit',
				bind: true,
				verify: true,
			};
		}

		if (input.name) {
			// On the first build request of a thread that already has a target — the
			// artifact the user opened — an unrecognised key would strand that agent
			// behind a duplicate. Continue the bound agent unless a second one was
			// asked for explicitly. `name` is not applied here: the build names the
			// agent, and overwriting would clobber a name the user chose.
			if (boundTarget && !input.createNew) {
				return {
					ok: true,
					target: { ...boundTarget, ref: key },
					mode: 'continued',
					bind: true,
					verify: false,
				};
			}
			// Adoption is authorized when the id came from this thread's own pending
			// marker: the editor may have won the insert on it and already configured
			// the row. Without a marker the backend mints the id, which cannot collide.
			const pendingId = await pendingAgentIdFor(domainContext);
			if (!pendingId && !input.createNew) {
				// No marker can also mean the editor persisted the artifact and bound it
				// since this turn read its target — which deleted the marker. Creating
				// now would mint a second agent beside that one, so continue it instead.
				const rebound = await rereadAgentBuilderTarget(domainContext);
				if (rebound) {
					return {
						ok: true,
						target: { ...rebound, ref: key },
						mode: 'continued',
						bind: true,
						verify: false,
					};
				}
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
					// An adopted row keeps the name it was configured with.
					name: created.name ?? input.name,
					ref: key,
				},
				// Adopting means the editor won the insert on the pending id, so this
				// turn edits an existing agent.
				mode: created.adopted ? 'edit' : 'create',
				bind: true,
				verify: false,
			};
		}

		return { ok: false, error: UNKNOWN_REF_ERROR };
	}

	// No addressing key (`name` always produces one) — agentId alone adopts,
	// otherwise keep the bound target.
	if (input.agentId) {
		if (input.agentId === boundTarget?.agentId) {
			return { ok: true, target: boundTarget, mode: 'edit', bind: false, verify: false };
		}
		if (!domainContext.projectId) return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		return {
			ok: true,
			target: { agentId: input.agentId, projectId: domainContext.projectId },
			mode: 'edit',
			bind: true,
			verify: true,
		};
	}

	if (boundTarget) {
		return { ok: true, target: boundTarget, mode: 'edit', bind: false, verify: false };
	}
	return { ok: false, error: NO_TARGET_INPUT_ERROR };
}

/** Confirm the agent exists and fill in its display name. Undefined when it does not exist. */
async function verifyTarget(
	delegate: InstanceAiBuilderDelegate,
	target: AgentBuilderTarget,
): Promise<AgentBuilderTarget | undefined> {
	const name = await delegate.resolveAgentName(target.agentId);
	if (name === undefined) return undefined;
	return {
		...target,
		name,
		...(target.ref ? {} : { ref: normalizeAgentRef(name) }),
	};
}

export function createSelectAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.SELECT_AGENT)
		.description(
			'Selects the n8n Agent that the agent_builder_* tools create, change, test, and publish. ' +
				'Load `agent-builder` via `load_skill` before calling this tool. Call it once at the ' +
				'start of every Agent build request: pass `name` to create a new Agent, `agentRef` to ' +
				'select an Agent from this conversation, or `agentId` to adopt an existing one. With no ' +
				'arguments it keeps the current Agent. Returns the selected `agentRef`/`agentId` and the ' +
				'`sessionContext` with the Preview link and model recommendations. This tool is only for ' +
				'Agent artifacts; for read-only research use `agent-context`.',
		)
		.input(selectAgentInputSchema)
		.output(selectAgentOutputSchema)
		.handler(async (input: SelectAgentInput): Promise<SelectAgentOutput> => {
			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate) {
				return { ok: false, error: 'Agent building is not available on this instance.' };
			}

			const boundTarget = await resolveAgentBuilderTarget(domainContext);
			const resolution = await resolveTarget(domainContext, delegate, input, boundTarget);
			if (!resolution.ok) {
				context.trackTelemetry?.('instance_ai_agent_build_route', {
					thread_id: context.threadId,
					run_id: context.runId,
					user_id: context.userId,
					mode: 'resolution_failed',
				});
				return { ok: false, error: resolution.error };
			}

			let target = resolution.target;
			if (resolution.verify) {
				const verified = await verifyTarget(delegate, target);
				if (!verified) return { ok: false, error: agentNotFoundError(target.agentId) };
				target = verified;
			}
			if (resolution.bind) await saveAgentBuilderTarget(domainContext, target);
			domainContext.agentBuilderTarget = target;

			context.trackTelemetry?.('instance_ai_agent_build_route', {
				thread_id: context.threadId,
				run_id: context.runId,
				user_id: context.userId,
				mode: resolution.mode,
				agent_id: target.agentId,
			});

			if (resolution.mode === 'create') {
				await domainContext.onArtifactChanged?.({
					type: 'agent',
					id: target.agentId,
					projectId: target.projectId,
					...(target.name ? { name: target.name } : {}),
				});
			} else {
				// Repair-shaped eval cases seed from the state the build opened on.
				await snapshotAgent(context, delegate, target, 'target-resolved');
			}

			return {
				ok: true,
				agentId: target.agentId,
				projectId: target.projectId,
				...(target.ref ? { agentRef: target.ref } : {}),
				...(target.name ? { agentName: target.name } : {}),
				agentChange: resolution.mode === 'create' ? 'created' : 'none',
				sessionContext: await delegate.getBuilderSessionContext(target.agentId),
			};
		})
		.build();
}
