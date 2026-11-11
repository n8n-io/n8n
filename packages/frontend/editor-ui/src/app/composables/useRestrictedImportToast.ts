import { h } from 'vue';
import {
	POLICY_VIOLATION_KIND,
	POLICY_VIOLATION_SUBJECT_TYPE,
	type PolicyViolation,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import {
	describeImportedRestrictions,
	getCredentialTypeRestriction,
	getNodeTypeRestriction,
	getViolationVerdict,
	PolicyViolationToastBody,
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

type RestrictionCheck = Pick<PolicyViolation, 'kind' | 'checkId' | 'subjectType'> & {
	typesOf: (node: INode, descriptionOf: DescriptionOf) => string[];
	restrictionOf: (type: string) => TypeRestriction | null;
};

const CHECKS: RestrictionCheck[] = [
	{
		kind: POLICY_VIOLATION_KIND.nodeTypeUnavailable,
		checkId: 'node-type-availability',
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.nodeType,
		typesOf: (node) => [node.type],
		restrictionOf: getNodeTypeRestriction,
	},
	{
		kind: POLICY_VIOLATION_KIND.credentialTypeUnavailable,
		checkId: 'credential-type-availability',
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.credentialType,
		typesOf: (node, descriptionOf) =>
			getRequestedCredentialTypes(node, () => descriptionOf(node), {
				isRelevant: (type) => getCredentialTypeRestriction(type) !== null,
			}),
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

			const violation: PolicyViolation = {
				kind: check.kind,
				checkId: check.checkId,
				message: type,
				subject: type,
				subjectType: check.subjectType,
				scope: found.restriction.scope,
				optInAvailable: found.restriction.optInAvailable,
			};
			return [{ violation, nodeIds: found.nodeIds }];
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

		const violations = restricted.map(({ violation }) => violation);
		const nodeIdsByViolation = new Map(restricted.map((item) => [item.violation, item.nodeIds]));
		const documentId = createWorkflowDocumentId(workflowsStore.workflowId);
		const linkedNodeIds = (violation: PolicyViolation) =>
			nodeIdsStillOnCanvas(documentId, nodeIdsByViolation.get(violation) ?? []);

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
						adjustToNumber: violations.length,
						interpolate: { count: violations.length },
					}),
					description: describeImportedRestrictions(violations.map(getViolationVerdict)),
					violations,
					labelOf,
					isJumpable: (violation: PolicyViolation) => linkedNodeIds(violation).length > 0,
					onJump: (violation: PolicyViolation) =>
						canvasEventBus.emit('nodes:select', {
							ids: linkedNodeIds(violation),
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
