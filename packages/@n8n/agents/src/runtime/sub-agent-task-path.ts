export type SubAgentTaskPath = `/root${'' | `/${string}`}`;

export interface SubAgentTaskPathPolicy {
	maxDepth?: number;
	maxChildren?: number;
	canSpawnSubAgents?: boolean;
}

export const ROOT_SUB_AGENT_TASK_PATH = '/root' satisfies SubAgentTaskPath;

const MAX_TASK_NAME_LENGTH = 64;
const SUB_AGENT_TASK_PATH_PATTERN = /^\/root(?:\/[a-z0-9_]+)*$/;

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

export function isSubAgentTaskPath(value: string): value is SubAgentTaskPath {
	return SUB_AGENT_TASK_PATH_PATTERN.test(value);
}

export function assertSubAgentTaskPath(value: string): asserts value is SubAgentTaskPath {
	if (!isSubAgentTaskPath(value)) {
		throw new Error(`Invalid sub-agent task path: ${value}`);
	}
}

export function getSubAgentTaskPathDepth(path: SubAgentTaskPath): number {
	assertSubAgentTaskPath(path);
	return path.split('/').length - 2;
}

export function createChildSubAgentTaskPath(
	parentPath: SubAgentTaskPath | undefined,
	taskName: string,
): SubAgentTaskPath {
	const parent = parentPath ?? ROOT_SUB_AGENT_TASK_PATH;
	assertSubAgentTaskPath(parent);

	const childPath = `${parent}/${sanitizeSubAgentTaskName(taskName)}`;
	assertSubAgentTaskPath(childPath);

	return childPath;
}

export function assertSubAgentPolicyAllowsChild(
	parentPath: SubAgentTaskPath | undefined,
	policy: SubAgentTaskPathPolicy | undefined,
): void {
	if (policy?.canSpawnSubAgents === false) {
		throw new Error('Sub-agent policy does not allow spawning child sub-agents');
	}

	if (policy?.maxDepth === undefined) return;

	const nextDepth = getSubAgentTaskPathDepth(parentPath ?? ROOT_SUB_AGENT_TASK_PATH) + 1;
	if (nextDepth > policy.maxDepth) {
		throw new Error(`Sub-agent task path depth ${nextDepth} exceeds maxDepth ${policy.maxDepth}`);
	}
}

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
