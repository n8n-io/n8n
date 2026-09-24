import { h } from 'vue';
import type { PolicyViolation } from '@n8n/api-types';
import { useToast, type NotificationHandle } from '@n8n/composables/useToast';
import {
	getPolicyViolations,
	PolicyViolationList,
} from '@n8n/frontend-module-type-availability-policies';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { INodeUi } from '@/Interface';
import { hasNodeCredentialFilled } from '@/app/utils/nodes/nodeTransforms';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

type PolicyRefusedAction = 'save' | 'publish' | 'execute';

let activeToast: { handle: NotificationHandle; refusedAction: PolicyRefusedAction } | undefined;

const NODE_TYPE_SUBJECT = 'nodeType';
const CREDENTIAL_TYPE_SUBJECT = 'credentialType';

const NODE_MATCHER: Record<string, ((subject: string) => (node: INodeUi) => boolean) | undefined> =
	{
		[NODE_TYPE_SUBJECT]: (subject) => (node) => node.type === subject,
		[CREDENTIAL_TYPE_SUBJECT]: (subject) => (node) => hasNodeCredentialFilled(node, subject),
	};

export function usePolicyViolationToast() {
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	function displayNameOf({ subject, subjectType }: PolicyViolation): string | undefined {
		if (subject === undefined) return undefined;

		if (subjectType === NODE_TYPE_SUBJECT) return nodeTypesStore.getNodeType(subject)?.displayName;
		if (subjectType === CREDENTIAL_TYPE_SUBJECT) {
			return credentialsStore.getCredentialTypeByName(subject)?.displayName;
		}

		return undefined;
	}

	function nodeIdsFor(
		{ subject, subjectType }: PolicyViolation,
		documentId: WorkflowDocumentId,
	): string[] {
		const matcher = subjectType ? NODE_MATCHER[subjectType] : undefined;
		if (subject === undefined || !matcher) return [];

		return useWorkflowDocumentStore(documentId)
			.allNodes.filter(matcher(subject))
			.map((node) => node.id);
	}

	function showPolicyViolationToast(
		error: unknown,
		title: string,
		refusedAction: PolicyRefusedAction,
		documentId: WorkflowDocumentId = createWorkflowDocumentId(workflowsStore.workflowId),
	): boolean {
		const violations = getPolicyViolations(error);
		if (!violations) return false;

		activeToast?.handle.close();
		const handle = toast.showMessage({
			title,
			type: 'error',
			duration: 0,
			message: h(PolicyViolationList, {
				violations,
				labelOf: displayNameOf,
				isJumpable: (violation: PolicyViolation) => nodeIdsFor(violation, documentId).length > 0,
				onJump: (violation: PolicyViolation) => {
					const ids = nodeIdsFor(violation, documentId);
					if (ids.length > 0) canvasEventBus.emit('nodes:select', { ids, panIntoView: true });
				},
			}),
		});
		activeToast = { handle, refusedAction };

		return true;
	}

	/**
	 * A successful save only settles a refused save: save grandfathers the stored node types,
	 * so a publish or execution refusal can still apply after it.
	 */
	function closePolicyViolationToast(resolvedAction: PolicyRefusedAction) {
		if (activeToast?.refusedAction === resolvedAction) activeToast.handle.close();
	}

	return { showPolicyViolationToast, closePolicyViolationToast };
}
