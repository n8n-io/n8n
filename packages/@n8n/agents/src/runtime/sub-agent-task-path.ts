/**
 * Task paths for sub-agent delegation.
 *
 * A "task path" is a filesystem-like address that gives every agent run a
 * stable, human-readable position in the delegation tree, e.g.:
 *
 *   /root                                      ← the top-level (orchestrating) agent
 *   /root/research_api_0                       ← the agent's first delegation
 *   /root/research_api_0/compare_pricing_0     ← a grandchild that child delegated to
 *
 * Each child segment carries the parent's 0-based child index (`_0`, `_1`, …) so
 * that delegations with the same task name stay distinct.
 *
 * Why this concept exists:
 *  - Identity: each delegated unit of work gets a unique, traceable name we can
 *    log and surface in the timeline — without the parent having to invent ids.
 *    (Memory/session ids are independent — a run gets its own thread id.)
 *  - Depth: the path encodes how deeply nested a delegation is (root = 0), which
 *    is what lets us bound recursion when a consumer wires nested delegation.
 *  - Policy enforcement: together with {@link SubAgentTaskPathPolicy}, the path
 *    lets us cap nesting depth and per-parent fan-out so a misbehaving agent
 *    can't trigger runaway delegation — an infinite "agent delegates to agent
 *    delegates to agent…" chain, or one agent spawning hundreds of parallel
 *    children — which would blow up cost, latency, and resources.
 *
 * Everything in this file is pure (no I/O, no n8n-specific concepts), which is
 * why it lives in the runtime SDK: it is shared verbatim by both the generic
 * `delegate_subagent` tool and the n8n CLI runner.
 */

/**
 * A delegation task path: always begins at `/root`, followed by zero or more
 * `/segment` parts. Modeled as a template-literal type so a plain string can be
 * narrowed to a validated path via {@link assertSubAgentTaskPath}.
 */
export type SubAgentTaskPath = `/root${'' | `/${string}`}`;

/**
 * Guardrails applied when a parent tries to spawn a child sub-agent. Every limit
 * is optional; an undefined field means "no limit for that dimension".
 */
export interface SubAgentTaskPathPolicy {
	/** Maximum nesting depth allowed (root = 0). Bounds how deep delegation can recurse. */
	maxDepth?: number;
	/** Maximum number of children a single parent may spawn. Bounds fan-out width. */
	maxChildren?: number;
	/** Hard on/off switch: when false the parent may not delegate at all. */
	canSpawnSubAgents?: boolean;
}

/** Top of the tree — the path of the initiating (orchestrating) agent, depth 0. */
export const ROOT_SUB_AGENT_TASK_PATH = '/root' satisfies SubAgentTaskPath;

/** Upper bound on a single path segment, so paths stay bounded and readable. */
const MAX_TASK_NAME_LENGTH = 64;
/** A valid path is `/root` plus zero or more lowercase alphanumeric/underscore segments. */
const SUB_AGENT_TASK_PATH_PATTERN = /^\/root(?:\/[a-z0-9_]+)*$/;

/**
 * Turn a free-text, model-supplied task name (e.g. "Research API pricing!")
 * into a safe, deterministic path segment (e.g. "research_api_pricing").
 *
 * The task name comes from the LLM, so it can contain anything. We normalize to
 * lowercase, collapse each run of non-alphanumerics into a single underscore,
 * strip leading/trailing underscores, and cap the length — producing segments
 * that are collision-resistant, log/URL-safe, and accepted by
 * {@link SUB_AGENT_TASK_PATH_PATTERN}.
 *
 * @throws if nothing alphanumeric survives (we refuse to build a nameless path).
 */
export function sanitizeSubAgentTaskName(taskName: string): string {
	const sanitized = taskName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, MAX_TASK_NAME_LENGTH)
		.replace(/_+$/g, '');

	if (!sanitized) {
		throw new Error('Sub-agent task name must contain at least one alphanumeric character');
	}

	return sanitized;
}

/** Type guard: does this string match the `/root[/segment]*` shape? */
export function isSubAgentTaskPath(value: string): value is SubAgentTaskPath {
	return SUB_AGENT_TASK_PATH_PATTERN.test(value);
}

/**
 * Assert (and type-narrow) that a string is a valid task path. Used to validate
 * paths that were constructed here or received from elsewhere before we rely on
 * their shape (e.g. before computing depth).
 */
export function assertSubAgentTaskPath(value: string): asserts value is SubAgentTaskPath {
	if (!isSubAgentTaskPath(value)) {
		throw new Error(`Invalid sub-agent task path: ${value}`);
	}
}

/**
 * Nesting depth of a path: `/root` → 0, `/root/a` → 1, `/root/a/b` → 2, …
 *
 * `'/root/a'.split('/')` yields `['', 'root', 'a']`, so the number of segments
 * below root is `length - 2`. This is the value compared against `maxDepth`.
 */
export function getSubAgentTaskPathDepth(path: SubAgentTaskPath): number {
	assertSubAgentTaskPath(path);
	return path.split('/').length - 2;
}

/**
 * Build a child path by appending `<sanitized task name>_<childCount>` to the
 * parent path (defaulting to `/root` when there is no parent — i.e. the first
 * level of delegation). This is how the tree grows: every delegate call extends
 * its parent's path by exactly one segment.
 *
 * `childCount` is the parent's 0-based index for this child (the number of
 * children it had already spawned). Appending it disambiguates same-named
 * siblings within a single parent run, keeping each delegation's path — and the
 * memory scope derived from it — unique even when the model reuses a task name.
 */
export function createChildSubAgentTaskPath(
	parentPath: SubAgentTaskPath | undefined,
	taskName: string,
	childCount: number,
): SubAgentTaskPath {
	const parent = parentPath ?? ROOT_SUB_AGENT_TASK_PATH;
	assertSubAgentTaskPath(parent);

	const childPath = `${parent}/${sanitizeSubAgentTaskName(taskName)}_${childCount}`;
	assertSubAgentTaskPath(childPath);

	return childPath;
}

/**
 * Depth-dimension gate, checked BEFORE a child is spawned.
 *
 * Rejects when delegation is switched off outright (`canSpawnSubAgents === false`)
 * or when adding one more level below `parentPath` would exceed `maxDepth`. This
 * is what stops runaway recursion (an agent delegating to an agent delegating to
 * an agent…). When `maxDepth` is undefined, depth is unbounded.
 */
export function assertSubAgentPolicyAllowsChild(
	parentPath: SubAgentTaskPath | undefined,
	policy: SubAgentTaskPathPolicy | undefined,
): void {
	if (policy?.canSpawnSubAgents === false) {
		throw new Error('Sub-agent policy does not allow spawning child sub-agents');
	}

	if (policy?.maxDepth === undefined) return;

	// The depth the child would occupy = parent depth + 1.
	const nextDepth = getSubAgentTaskPathDepth(parentPath ?? ROOT_SUB_AGENT_TASK_PATH) + 1;
	if (nextDepth > policy.maxDepth) {
		throw new Error(`Sub-agent task path depth ${nextDepth} exceeds maxDepth ${policy.maxDepth}`);
	}
}

/**
 * Fan-out-dimension gate, checked BEFORE a child is spawned.
 *
 * `childCount` is how many children the parent has ALREADY spawned. If that has
 * reached `maxChildren`, spawning one more (the `+ 1` in the message is the
 * would-be new total) exceeds the limit, so we reject. This stops a single agent
 * from fanning out to an unbounded number of parallel sub-agents. When
 * `maxChildren` is undefined, fan-out is unbounded.
 */
export function assertSubAgentPolicyAllowsChildCount(
	childCount: number,
	policy: SubAgentTaskPathPolicy | undefined,
): void {
	if (policy?.maxChildren === undefined) return;

	if (childCount >= policy.maxChildren) {
		throw new Error(
			`Sub-agent child count ${childCount + 1} exceeds maxChildren ${policy.maxChildren}`,
		);
	}
}
