import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeItemRestriction } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { useToast } from '@n8n/composables/useToast';
import { describeNodeTypeRestriction } from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';

/** For flows that cannot show the restriction inline, such as a picker that closes on Save. */
export function useRestrictedNodeWarning() {
	const toast = useToast();
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();

	function warnIfRestricted(nodeTypeName: string): boolean {
		const restriction = getNodeItemRestriction(nodeTypeName);
		if (!restriction) return false;

		const displayName = nodeTypesStore.getNodeType(nodeTypeName)?.displayName ?? nodeTypeName;
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('typeAvailabilityPolicies.restrictedNode.title'),
			message: describeNodeTypeRestriction(displayName, restriction.scope),
		});
		return true;
	}

	return { warnIfRestricted };
}
