import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

import type { PackageRequirementConsumer } from './requirements.schema';

export function getWorkflowConsumerIds(requirement: {
	usedBy: PackageRequirementConsumer[];
}): string[] {
	return requirement.usedBy.filter(({ kind }) => kind === 'workflow').map(({ id }) => id);
}

export function mergeRequirementConsumers(
	consumers: PackageRequirementConsumer[],
): PackageRequirementConsumer[] {
	return sortBy(
		uniqBy(consumers, ({ kind, id }) => `${kind}:${id}`),
		['kind', 'id'],
	);
}
