/**
 * Target resolution for `build-agent`: maps the orchestrator's addressing
 * inputs (`agentRef`, `name`, `agentId`, `createNew`) onto the agent the
 * call is about, creating one through the delegate when the key is new.
 * Extracted unchanged from the interactive builder tool so the compiler-
 * backed tool keeps the same addressing contract.
 */
import {
	getSessionAgentByRef,
	normalizeAgentRef,
	readPendingAgentTarget,
	rereadAgentBuilderTarget,
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import type { InstanceAiBuilderDelegate, InstanceAiContext } from '../../types';

export interface TargetResolutionInput {
	agentRef?: string;
	name?: string;
	agentId?: string;
	createNew?: boolean;
}

export { resolveAgentBuilderTarget };

export type TargetResolution =
	| {
			ok: true;
			target: AgentBuilderTarget;
			bindAfterTurn: boolean;
			mode: 'create' | 'edit' | 'continued';
	  }
	| { ok: false; error: string };

const NO_TARGET_INPUT_ERROR =
	'Pass `name` (and optionally `agentRef`) to create a new agent, `agentId` to adopt an existing one, or omit both to continue the current agent.';
const UNKNOWN_REF_ERROR =
	'Unknown `agentRef`. Pass `name` to create a new agent under that key, or `agentId` to adopt an existing agent.';
const AGENT_ID_NEEDS_PROJECT_ERROR =
	'Cannot bind to agentId without an active project context. Start this conversation from within a project.';

/** Best-effort display-name lookup so the first agent-spawned event can label the
 *  artifact; a lookup failure must not fail the turn. */
async function resolveAgentNameSafely(
	delegate: InstanceAiBuilderDelegate,
	agentId: string,
): Promise<string | undefined> {
	try {
		return await delegate.resolveAgentName(agentId);
	} catch {
		return undefined;
	}
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

function agentRefConflictError(ref: string, boundAgentId: string, passedAgentId: string): string {
	return (
		`\`agentRef\` "${ref}" is already bound to agent ${boundAgentId} in this conversation, ` +
		`but \`agentId\` ${passedAgentId} was passed. Continue the bound agent (omit \`agentId\`, ` +
		'or pass its id), or pick a different `agentRef` for a new agent.'
	);
}

/**
 * Resolve which agent this call should build/edit. Identity is keyed by
 * `slug(agentRef ?? name)` in the session registry — a repeated key continues,
 * an unknown key adopts (with `agentId`) or, when no target is bound yet,
 * creates (with `name`). A bound target stays active when neither key nor id
 * is given, and also when an unknown key arrives without `createNew`: naming
 * an agent is how the model addresses a new one, so treating that as a create
 * would strand the agent the user already has open behind a duplicate.
 * agentId-path binds are always deferred (`bindAfterTurn: true`) — persisting
 * before the builder run settles would let a hallucinated/forbidden/missing
 * agentId permanently poison the thread (no unbind path exists). A create
 * binds immediately since `delegate.createAgent` already proves the agent exists.
 */
export async function resolveTargetForCall(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	input: TargetResolutionInput,
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
			// Same agent as the active binding — no re-persist needed.
			if (boundTarget?.agentId === target.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ...target },
					bindAfterTurn: false,
					mode: 'edit',
				};
			}
			// Switch-back: deferred so a deleted-since-registry agent can't clobber
			// the current binding on a failed turn.
			return { ok: true, target, bindAfterTurn: true, mode: 'edit' };
		}

		// Active target already addresses this key (e.g. just created this turn,
		// or a handoff whose registry row isn't available) — continue without
		// creating a duplicate.
		const boundKey = boundTarget?.ref
			? normalizeAgentRef(boundTarget.ref)
			: boundTarget?.name
				? normalizeAgentRef(boundTarget.name)
				: undefined;
		if (boundTarget && boundKey === key) {
			if (input.agentId && input.agentId !== boundTarget.agentId) {
				return {
					ok: false,
					error: agentRefConflictError(key, boundTarget.agentId, input.agentId),
				};
			}
			return {
				ok: true,
				target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
				bindAfterTurn: false,
				mode: 'edit',
			};
		}

		if (input.agentId) {
			if (input.agentId === boundTarget?.agentId) {
				return {
					ok: true,
					target: { ...boundTarget, ref: key, ...(input.name ? { name: input.name } : {}) },
					bindAfterTurn: false,
					mode: 'edit',
				};
			}
			if (!domainContext.projectId) {
				return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
			}
			const name = input.name ?? (await resolveAgentNameSafely(delegate, input.agentId));
			return {
				ok: true,
				target: {
					agentId: input.agentId,
					projectId: domainContext.projectId,
					ref: key,
					...(name ? { name } : {}),
				},
				bindAfterTurn: true,
				mode: 'edit',
			};
		}

		if (input.name) {
			// Naming an agent is how the model addresses a new one, so on the first
			// build request of a thread that already has a target — the artifact the
			// user opened — an unrecognised key would strand that agent behind a
			// duplicate. Continue the bound agent unless a second one was asked for
			// explicitly. `name` is not applied here: the builder names the agent as
			// part of the build, and overwriting would clobber a name the user chose.
			if (boundTarget && !input.createNew) {
				// Persisted after the turn so the key we hand back resolves on later
				// calls — the tool reports this `agentRef`, and without registering it
				// the model could not address the agent by it again.
				return {
					ok: true,
					target: { ...boundTarget, ref: key },
					bindAfterTurn: true,
					mode: 'continued',
				};
			}
			// Adoption is authorized when the id came from this thread's
			// own pending marker: the editor may have won the insert on it and
			// already configured the row. Without a marker the backend mints the id,
			// which cannot collide — so `adoptOnCollision` would be meaningless.
			const pendingId = await pendingAgentIdFor(domainContext);
			// `createNew` asks for a second agent explicitly, so it keeps creating.
			if (!pendingId && !input.createNew) {
				// No marker can also mean the editor persisted the artifact and bound it
				// since this turn read its target — which deleted the marker. Creating
				// now would mint a second agent beside that one and then overwrite its
				// binding, so continue it instead (same policy as a target bound before
				// the turn started).
				const rebound = await rereadAgentBuilderTarget(domainContext);
				if (rebound) {
					return {
						ok: true,
						target: { ...rebound, ref: key },
						bindAfterTurn: true,
						mode: 'continued',
					};
				}
			}
			const created = await delegate.createAgent(
				input.name,
				pendingId ? { id: pendingId, adoptOnCollision: true } : undefined,
			);
			const target: AgentBuilderTarget = {
				agentId: created.agentId,
				projectId: created.projectId,
				// An adopted row keeps the name it was configured with; labelling the
				// binding with the requested one would show a name nothing persisted.
				name: created.name ?? input.name,
				ref: key,
			};
			domainContext.agentBuilderTarget = target;
			await saveAgentBuilderTarget(domainContext, target);
			// Adopting means the editor won the insert on the pending id, so this turn
			// is editing an existing agent — which the pre-turn snapshot depends on.
			return {
				ok: true,
				target,
				bindAfterTurn: false,
				mode: created.adopted ? 'edit' : 'create',
			};
		}

		return { ok: false, error: UNKNOWN_REF_ERROR };
	}

	// No addressing key (`name` always produces one) — agentId alone adopts,
	// otherwise continue the bound target.
	if (input.agentId) {
		if (input.agentId === boundTarget?.agentId) {
			return { ok: true, target: boundTarget, bindAfterTurn: false, mode: 'edit' };
		}
		if (!domainContext.projectId) {
			return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		}
		const name = await resolveAgentNameSafely(delegate, input.agentId);
		return {
			ok: true,
			target: {
				agentId: input.agentId,
				projectId: domainContext.projectId,
				...(name ? { name, ref: normalizeAgentRef(name) } : {}),
			},
			bindAfterTurn: true,
			mode: 'edit',
		};
	}

	if (boundTarget) {
		return { ok: true, target: boundTarget, bindAfterTurn: false, mode: 'edit' };
	}
	return { ok: false, error: NO_TARGET_INPUT_ERROR };
}
