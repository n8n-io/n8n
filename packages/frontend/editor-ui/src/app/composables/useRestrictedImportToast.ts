import { h } from 'vue';
import { POLICY_VIOLATION_KIND, POLICY_VIOLATION_SUBJECT_TYPE } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import {
	describeImportedRestrictions,
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	PolicyViolationToastBody,
	type PolicyViolationListItem,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { getRequestedCredentialTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import { usePolicyViolationLabels } from '@/app/composables/usePolicyViolationLabels';
import { isWorkflowDocumentOpenOnCanvas } from '@/app/composables/usePolicyViolationToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

const RESTRICTED_IMPORT_TOAST_CLASS = 'content-toast restricted-import-toast';

type DescriptionOf = (node: INode) => INodeTypeDescription | null;

type RestrictionCheck = Pick<PolicyViolationListItem, 'kind' | 'subjectType'> & {
	typesOf: (node: INode, descriptionOf: DescriptionOf) => string[];
	restrictionOf: (type: string) => TypeRestriction | null;
};

const CHECKS: RestrictionCheck[] = [
	{
		kind: POLICY_VIOLATION_KIND.nodeTypeUnavailable,
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.nodeType,
		typesOf: (node) => [node.type],
		restrictionOf: getNodeTypeRestriction,
	},
	{
		kind: POLICY_VIOLATION_KIND.credentialTypeUnavailable,
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.credentialType,
		typesOf: (node, descriptionOf) => getRequestedCredentialTypes(node, () => descriptionOf(node)),
		restrictionOf: getCredentialTypeRestriction,
	},
];

let activeToast: NotificationHandle | undefined;

export function useRestrictedImportToast() {
	const i18n = useI18n();
	const toast = useToast();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const { labelOf } = usePolicyViolationLabels();

	const descriptionOf: DescriptionOf = (node) =>
		nodeTypesStore.getNodeType(node.type, node.typeVersion);

	function findRestricted(nodes: INode[], check: RestrictionCheck) {
		const byType = new Map<string, { restriction: TypeRestriction; nodeIds: string[] } | null>();
		for (const node of nodes) {
			for (const type of check.typesOf(node, descriptionOf)) {
				if (!byType.has(type)) {
					const restriction = check.restrictionOf(type);
					byType.set(type, restriction && { restriction, nodeIds: [] });
				}
				byType.get(type)?.nodeIds.push(node.id);
			}
		}

		return [...byType].flatMap(([type, found]) => {
			if (!found) return [];

			const item: PolicyViolationListItem = {
				kind: check.kind,
				subject: type,
				subjectType: check.subjectType,
				scope: found.restriction.scope,
			};
			return [{ item, restriction: found.restriction, nodeIds: found.nodeIds }];
		});
	}

	function nodeIdsStillOnCanvas(documentId: WorkflowDocumentId, nodeIds: string[]): string[] {
		if (!isWorkflowDocumentOpenOnCanvas(documentId)) return [];

		const documentStore = useWorkflowDocumentStore(documentId);
		return nodeIds.filter((id) => documentStore.getNodeById(id) !== undefined);
	}

	function warnIfImportHasRestrictedNodes(nodes: INode[]): boolean {
		const restricted: Array<ReturnType<typeof findRestricted>[number]> = [];
		for (const check of CHECKS) restricted.push(...findRestricted(nodes, check));
		if (restricted.length === 0) return false;

		const items = restricted.map(({ item }) => item);
		const nodeIdsByItem = new Map(restricted.map(({ item, nodeIds }) => [item, nodeIds]));
		const documentId = createWorkflowDocumentId(workflowsStore.workflowId);
		const linkedNodeIds = (item: PolicyViolationListItem) =>
			nodeIdsStillOnCanvas(documentId, nodeIdsByItem.get(item) ?? []);

		activeToast?.close();
		const handle: NotificationHandle = toast.showMessage(
			{
				duration: 0,
				position: 'top-right',
				customClass: RESTRICTED_IMPORT_TOAST_CLASS,
				onClose: () => {
					if (activeToast === handle) activeToast = undefined;
				},
				message: h(PolicyViolationToastBody, {
					title: i18n.baseText('typeAvailabilityPolicies.importedRestricted.title', {
						adjustToNumber: items.length,
						interpolate: { count: items.length },
					}),
					description: describeImportedRestrictions(
						restricted.map(({ restriction }) => restriction),
					),
					violations: items,
					labelOf,
					isJumpable: (item: PolicyViolationListItem) => linkedNodeIds(item).length > 0,
					onJump: (item: PolicyViolationListItem) =>
						canvasEventBus.emit('nodes:select', {
							ids: linkedNodeIds(item),
							panIntoView: true,
						}),
				}),
			},
			false,
		);
		activeToast = handle;
		return true;
	}

	return { warnIfImportHasRestrictedNodes };
}
