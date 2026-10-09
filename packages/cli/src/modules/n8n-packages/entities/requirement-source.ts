import type { PackageRequirementConsumer } from '../spec/requirements.schema';

export type AgentRequirementSource = { agentId: string; projectId: string };

export type RequirementSource = { workflowId: string } | AgentRequirementSource;

export interface RequirementUsage {
	usedBy: PackageRequirementConsumer[];
}

export function addRequirementUsage(usage: RequirementUsage, source: RequirementSource): void {
	const consumer: PackageRequirementConsumer =
		'workflowId' in source
			? { kind: 'workflow', id: source.workflowId }
			: { kind: 'agent', id: source.agentId };
	if (!usage.usedBy.some(({ kind, id }) => kind === consumer.kind && id === consumer.id)) {
		usage.usedBy.push(consumer);
	}
}

export function groupRequirementUsage<T extends RequirementSource>(
	requirements: T[],
	keyOf: (requirement: T) => string,
): Map<string, RequirementUsage> {
	const grouped = new Map<string, RequirementUsage>();
	for (const requirement of requirements) {
		const key = keyOf(requirement);
		const usage = grouped.get(key) ?? { usedBy: [] };
		addRequirementUsage(usage, requirement);
		grouped.set(key, usage);
	}
	return grouped;
}
