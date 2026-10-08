import type { PackageRequirementConsumer } from './requirements.schema';

export function getWorkflowConsumerIds(requirement: {
	usedBy: PackageRequirementConsumer[];
}): string[] {
	return requirement.usedBy.map(({ id }) => id);
}
