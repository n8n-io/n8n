import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { getResourcePermissions } from '@n8n/permissions';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

export function useAppPermissions(projectId: MaybeRefOrGetter<string>) {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);

	const canDelete = computed(
		() =>
			!permissions.isReadOnly() &&
			Boolean(getResourcePermissions(permissions.scopesFor(toValue(projectId))).app?.delete),
	);

	return { canDelete };
}
