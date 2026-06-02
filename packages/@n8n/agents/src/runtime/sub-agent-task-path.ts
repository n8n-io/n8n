/**
 * Task paths for sub-agent delegation.
 *
 * A "task path" is a filesystem-like address that gives each delegated run a
 * stable, human-readable identity, e.g.:
 *
 *   /root                    ← the top-level (orchestrating) agent
 *   /root/research_api_0     ← a first-level delegated child
 *
 * Each child segment carries the parent's 0-based child index (`_0`, `_1`, …) so
 * that delegations with the same task name stay distinct.
 *
 * Why this concept exists:
 *  - Identity: each delegated unit of work gets a unique, traceable name we can
 *    log and surface in the timeline — without the parent having to invent ids.
 *    (Memory/session ids are independent — a run gets its own thread id.)
 *  - Policy enforcement: together with {@link SubAgentTaskPathPolicy}, the path
 *    supports per-parent fan-out limits so a misbehaving agent cannot spawn
 *    hundreds of parallel children, which would blow up cost, latency, and
 *    resources.
 *
 * Nesting is not supported: only `/root` and single-segment child paths under
 * `/root` are valid. Sub-agents cannot spawn other sub-agents.
 *
 * Everything in this file is pure (no I/O, no n8n-specific concepts), which is
 * why it lives in the runtime SDK: it is shared verbatim by both the generic
 * `delegate_subagent` tool and the n8n CLI runner.
 */

/**
 * A delegation task path: `/root` or `/root/<segment>` only. Modeled as a
 * template-literal type so a plain string can be narrowed to a validated path
 * via {@link assertSubAgentTaskPath}.
 */
export type SubAgentTaskPath = `/root${'' | `/${string}`}`;

/**
 * Guardrails applied when a parent tries to spawn a child sub-agent. Every limit
 * is optional; an undefined field means "no limit for that dimension".
 */
export interface SubAgentTaskPathPolicy {
	/** Maximum number of children a single parent may spawn. Bounds fan-out width. */
	maxChildren?: number;
	/** Hard on/off switch: when false the parent may not delegate at all. */
	canSpawnSubAgents?: boolean;
}

/** Top-level orchestrating agent path. */
export const ROOT_SUB_AGENT_TASK_PATH = '/root' satisfies SubAgentTaskPath;

/** Upper bound on a single path segment, so paths stay bounded and readable. */
const MAX_TASK_NAME_LENGTH = 64;
/** Valid paths: `/root` or `/root/<one segment>` — no nested delegation. */
const SUB_AGENT_TASK_PATH_PATTERN = /^\/root(?:\/[a-z0-9_]+)?$/;

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

/** Type guard: does this string match the flat `/root[/segment]?` shape? */
export function isSubAgentTaskPath(value: string): value is SubAgentTaskPath {
	return SUB_AGENT_TASK_PATH_PATTERN.test(value);
}

/**
 * Assert (and type-narrow) that a string is a valid task path. Used to validate
 * paths that were constructed here or received from elsewhere before we rely on
 * their shape.
 */
export function assertSubAgentTaskPath(value: string): asserts value is SubAgentTaskPath {
	if (!isSubAgentTaskPath(value)) {
		throw new Error(`Invalid sub-agent task path: ${value}`);
	}
}

/**
 * Build a first-level child path: `/root/<sanitized task name>_<childCount>`.
 *
 * `childCount` is the parent's 0-based index for this child (the number of
 * children it had already spawned). Appending it disambiguates same-named
 * siblings within a single parent run.
 */
export function createChildSubAgentTaskPath(
	taskName: string,
	childCount: number,
): SubAgentTaskPath {
	const childPath = `${ROOT_SUB_AGENT_TASK_PATH}/${sanitizeSubAgentTaskName(taskName)}_${childCount}`;
	assertSubAgentTaskPath(childPath);

	return childPath;
}

/**
 * Spawn gate, checked BEFORE a child is spawned.
 *
 * Rejects when delegation is switched off outright (`canSpawnSubAgents === false`).
 */
export function assertSubAgentPolicyAllowsChild(policy: SubAgentTaskPathPolicy | undefined): void {
	if (policy?.canSpawnSubAgents === false) {
		throw new Error('Sub-agent policy does not allow spawning child sub-agents');
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
