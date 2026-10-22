import { h } from 'vue';
import type { FolderTransferResult, WorkflowTransferResult } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { PolicyViolationList } from '@n8n/frontend-module-type-availability-policies';
import { usePolicyViolationLabels } from '@/app/composables/usePolicyViolationLabels';

/** Warns that a move unpublished workflows, because the destination's policy refused them. */
export function useUnpublishedByMoveToast() {
	const i18n = useI18n();
	const toast = useToast();
	const { labelOf } = usePolicyViolationLabels();

	function showForWorkflow(
		result: WorkflowTransferResult | undefined,
		workflowName: string,
		projectName: string,
	) {
		if (!result || !('unpublishReasons' in result)) return;

		toast.showMessage({
			type: 'warning',
			duration: 0,
			title: i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.workflow.title'),
			message: h('div', [
				h(
					'p',
					i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.workflow.message', {
						interpolate: { name: workflowName, project: projectName },
					}),
				),
				h(PolicyViolationList, { violations: result.unpublishReasons, labelOf }),
			]),
		});
	}

	function showForFolder(result: FolderTransferResult | undefined, projectName: string) {
		if (!result?.unpublishedWorkflows.length) return;

		toast.showMessage({
			type: 'warning',
			duration: 0,
			title: i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.folder.title'),
			// A VNode, not a string: the toast renders strings as HTML, and names are user input.
			message: h(
				'p',
				i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.folder.message', {
					interpolate: {
						project: projectName,
						names: result.unpublishedWorkflows.map(({ name }) => `'${name}'`).join(', '),
					},
				}),
			),
		});
	}

	return { showForWorkflow, showForFolder };
}
