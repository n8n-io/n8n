/**
 * Target resolution for `build-agent`: maps the orchestrator's addressing
 * inputs (`agentRef`, `name`, `agentId`, `createNew`) onto the agent the
 * call is about, creating one through the delegate when the key is new.
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

const resolved = (
	target: AgentBuilderTarget,
	mode: 'create' | 'edit' | 'continued',
	bindAfterTurn: boolean,
): TargetResolution => ({ ok: true, target, bindAfterTurn, mode });

const conflict = (ref: string, boundAgentId: string, passedAgentId: string): TargetResolution => ({
	ok: false,
	error:
		`\`agentRef\` "${ref}" is already bound to agent ${boundAgentId} in this conversation, ` +
		`but \`agentId\` ${passedAgentId} was passed. Continue the bound agent (omit \`agentId\`, ` +
		'or pass its id), or pick a different `agentRef` for a new agent.',
});

/** Display-name lookup for the first agent-spawned event; a lookup failure must not fail the turn. */
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
 * Resolves the agent this call builds or edits. Identity is the normalized
 * `agentRef ?? name` in the session registry: a known key continues that
 * agent, an unknown key adopts (`agentId`) or creates (`name`). A bound target
 * stays active when no key is given, and when an unknown key arrives without
 * `createNew`, so a named request cannot strand the open agent behind a
 * duplicate. agentId-path binds are deferred (`bindAfterTurn: true`) because a
 * wrong id must not poison the thread; a create binds at once because
 * `delegate.createAgent` proved the agent exists.
 */
export async function resolveTargetForCall(
	domainContext: InstanceAiContext,
	delegate: InstanceAiBuilderDelegate,
	input: TargetResolutionInput,
	boundTarget: AgentBuilderTarget | undefined,
): Promise<TargetResolution> {
	const keySource = input.agentRef ?? input.name;
	const key = keySource ? normalizeAgentRef(keySource) : undefined;
	if (!key) {
		// No addressing key: `agentId` alone adopts, otherwise continue the bound target.
		if (!input.agentId)
			return boundTarget
				? resolved(boundTarget, 'edit', false)
				: { ok: false, error: NO_TARGET_INPUT_ERROR };
		if (input.agentId === boundTarget?.agentId) return resolved(boundTarget, 'edit', false);
		if (!domainContext.projectId) return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		const name = await resolveAgentNameSafely(delegate, input.agentId);
		return resolved(
			{
				agentId: input.agentId,
				projectId: domainContext.projectId,
				...(name ? { name, ref: normalizeAgentRef(name) } : {}),
			},
			'edit',
			true,
		);
	}

	const withKey = (target: AgentBuilderTarget): AgentBuilderTarget => ({
		...target,
		ref: key,
		...(input.name ? { name: input.name } : {}),
	});
	const sessionAgent = await getSessionAgentByRef(domainContext, key);
	if (sessionAgent) {
		if (input.agentId && input.agentId !== sessionAgent.agentId)
			return conflict(key, sessionAgent.agentId, input.agentId);
		const target = withKey(sessionAgent);
		// The active binding needs no re-persist; a switch-back is deferred until the turn succeeds.
		return boundTarget?.agentId === target.agentId
			? resolved({ ...boundTarget, ...target }, 'edit', false)
			: resolved(target, 'edit', true);
	}

	// The active target already addresses this key: continue it instead of creating a duplicate.
	const boundKeySource = boundTarget?.ref || boundTarget?.name;
	if (boundTarget && boundKeySource && normalizeAgentRef(boundKeySource) === key) {
		if (input.agentId && input.agentId !== boundTarget.agentId)
			return conflict(key, boundTarget.agentId, input.agentId);
		return resolved(withKey(boundTarget), 'edit', false);
	}

	if (input.agentId) {
		if (input.agentId === boundTarget?.agentId)
			return resolved(withKey(boundTarget), 'edit', false);
		if (!domainContext.projectId) return { ok: false, error: AGENT_ID_NEEDS_PROJECT_ERROR };
		const name = input.name ?? (await resolveAgentNameSafely(delegate, input.agentId));
		return resolved(
			{
				agentId: input.agentId,
				projectId: domainContext.projectId,
				ref: key,
				...(name ? { name } : {}),
			},
			'edit',
			true,
		);
	}

	if (!input.name) return { ok: false, error: UNKNOWN_REF_ERROR };
	// Continue the bound target unless the call asks for a second agent explicitly.
	// The key is persisted after the turn; `name` is applied by the builder, not here.
	if (boundTarget && !input.createNew)
		return resolved({ ...boundTarget, ref: key }, 'continued', true);
	// Only this thread's own pending marker authorizes adoption; otherwise the backend mints the id.
	const pending = await readPendingAgentTarget(domainContext);
	const pendingId =
		pending && pending.projectId === domainContext.projectId ? pending.agentId : undefined;
	if (!pendingId && !input.createNew) {
		// The editor may have persisted and bound the artifact since this turn read its target.
		const rebound = await rereadAgentBuilderTarget(domainContext);
		if (rebound) return resolved({ ...rebound, ref: key }, 'continued', true);
	}
	const created = await delegate.createAgent(
		input.name,
		pendingId ? { id: pendingId, adoptOnCollision: true } : undefined,
	);
	const target: AgentBuilderTarget = {
		agentId: created.agentId,
		projectId: created.projectId,
		// An adopted row keeps the name it was configured with.
		name: created.name ?? input.name,
		ref: key,
	};
	domainContext.agentBuilderTarget = target;
	await saveAgentBuilderTarget(domainContext, target);
	// Adopting means the editor won the insert on the pending id, so this turn edits an existing agent.
	return resolved(target, created.adopted ? 'edit' : 'create', false);
}
