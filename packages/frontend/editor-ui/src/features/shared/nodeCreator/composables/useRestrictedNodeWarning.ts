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

	function displayName(nodeTypeName: string): string {
		return nodeTypesStore.getNodeType(nodeTypeName)?.displayName ?? nodeTypeName;
	}

	function warnIfRestricted(nodeTypeName: string): boolean {
		const restriction = getNodeItemRestriction(nodeTypeName);
		if (!restriction) return false;

		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('typeAvailabilityPolicies.restrictedNode.title'),
			message: describeNodeTypeRestriction(displayName(nodeTypeName), restriction.scope),
		});
		return true;
	}

	/** Shows one warning for the restricted types among nodes that are already on the canvas. */
	function warnAboutRestrictedNodes(nodeTypeNames: string[]): void {
		const restricted = [...new Set(nodeTypeNames)].flatMap((name) => {
			const restriction = getNodeItemRestriction(name);
			return restriction ? [{ name, scope: restriction.scope }] : [];
		});
		if (restricted.length === 0) return;

		if (restricted.length === 1) {
			const [{ name, scope }] = restricted;
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('typeAvailabilityPolicies.restrictedNode.title'),
				message: describeNodeTypeRestriction(displayName(name), scope, 'replace'),
			});
			return;
		}

		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('typeAvailabilityPolicies.restrictedNodes.title'),
			message: i18n.baseText('typeAvailabilityPolicies.restrictedNodes.description', {
				interpolate: {
					nodeTypes: restricted.map(({ name }) => `'${displayName(name)}'`).join(', '),
				},
			}),
		});
	}

	return { warnIfRestricted, warnAboutRestrictedNodes };
}
