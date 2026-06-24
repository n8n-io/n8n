/**
 * Task paths for sub-agent delegation.
 *
 * A "task path" is a filesystem-like address that gives every agent run a
 * stable, human-readable position in the delegation flow, e.g.:
 *
 *   /root                ← the top-level (orchestrating) agent
 *   /root/research_api_0 ← a direct child delegation from the orchestrator
 *
 * Each child segment carries the parent's 0-based child index (`_0`, `_1`, …) so
 * that delegations with the same task name stay distinct.
 *
 * Why this concept exists:
 *  - Identity: each delegated unit of work gets a unique, traceable name we can
 *    log and surface in the timeline — without the parent having to invent ids.
 *    (Memory/session ids are independent — a run gets its own thread id.)
 *
 * Everything in this file is pure (no I/O, no n8n-specific concepts), which is
 * why it lives in the runtime SDK: it is shared verbatim by both the generic
 * `delegate_subagent` tool and the n8n CLI runner.
 */

/**
 * A delegation task path: `/root` or a single direct-child segment under `/root`.
 * Modeled as a template-literal type so a plain string can be narrowed to a
 * validated path via {@link assertSubAgentTaskPath}.
 */
export type SubAgentTaskPath = '/root' | `/root/${string}`;

/**
 * Policy fields related to sub-agent task paths and delegation parallelism.
 * Every limit is optional at the call site; undefined fields use runtime defaults.
 */
export interface SubAgentTaskPathPolicy {
	/** Maximum number of child sub-agent runs that may execute in parallel. Defaults to {@link DEFAULT_SUB_AGENT_MAX_CHILDREN}. */
	maxChildren?: number;
}

/** Default parallel delegate batch width when none is configured. */
export const DEFAULT_SUB_AGENT_MAX_CHILDREN = 10;

/** Path of the initiating (orchestrating) agent. */
export const ROOT_SUB_AGENT_TASK_PATH = '/root' satisfies SubAgentTaskPath;

/** Upper bound on a single path segment, so paths stay bounded and readable. */
const MAX_TASK_NAME_LENGTH = 64;
/** A valid path is `/root` or `/root` plus one lowercase alphanumeric/underscore segment. */
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

/** Type guard: does this string match `/root` or `/root/<segment>`? */
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
