import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

import type { PackageRequirementConsumer } from './requirements.schema';

export function getWorkflowConsumerIds(requirement: {
	usedBy: PackageRequirementConsumer[];
}): string[] {
	return getRequirementConsumerIds(requirement, 'workflow');
}

export function getRequirementConsumerIds(
	requirement: { usedBy: PackageRequirementConsumer[] },
	kind: PackageRequirementConsumer['kind'],
): string[] {
	return requirement.usedBy.filter((consumer) => consumer.kind === kind).map(({ id }) => id);
}

export function mergeRequirementConsumers(
	consumers: PackageRequirementConsumer[],
): PackageRequirementConsumer[] {
	return sortBy(
		uniqBy(consumers, ({ kind, id }) => `${kind}:${id}`),
		['kind', 'id'],
	);
}
