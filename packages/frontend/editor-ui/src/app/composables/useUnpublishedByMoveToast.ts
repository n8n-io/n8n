import { h } from 'vue';
import type { FolderTransferResult, WorkflowTransferResult } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { PolicyViolationList } from '@n8n/frontend-module-type-availability-policies';
import RepublishFailureList from '@/app/components/RepublishFailureList.vue';
import { usePolicyViolationLabels } from '@/app/composables/usePolicyViolationLabels';

/** Warns that a move unpublished workflows, and why: a destination policy or a failed republish. */
export function useUnpublishedByMoveToast() {
	const i18n = useI18n();
	const toast = useToast();
	const { labelOf } = usePolicyViolationLabels();

	function showForWorkflow(
		result: WorkflowTransferResult | undefined,
		workflowName: string,
		projectName: string,
	) {
		if (!result) return;

		const message =
			'unpublishReasons' in result
				? h('div', [
						h(
							'p',
							i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.workflow.message', {
								interpolate: { name: workflowName, project: projectName },
							}),
						),
						h(PolicyViolationList, { violations: result.unpublishReasons, labelOf }),
					])
				: h(
						'p',
						i18n.baseText('projects.move.republishFailed.workflow.message', {
							interpolate: { name: workflowName, reason: result.error.message },
						}),
					);

		toast.showMessage({
			type: 'warning',
			duration: 0,
			title: i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.workflow.title'),
			message,
		});
	}

	function showForFolder(result: FolderTransferResult | undefined, projectName: string) {
		if (!result?.unpublishedWorkflows.length) return;

		const refused = result.unpublishedWorkflows.filter((w) => 'unpublishReasons' in w);
		const failed = result.unpublishedWorkflows.flatMap((w) =>
			'error' in w ? [{ id: w.id, name: w.name, reason: w.error.message }] : [],
		);
		const quotedNames = refused.map(({ name }) => `'${name}'`).join(', ');
		// The list drops repeats, so a type blocked in several workflows shows once.
		const violations = result.unpublishedWorkflows.flatMap((w) =>
			'unpublishReasons' in w ? w.unpublishReasons : [],
		);

		toast.showMessage({
			type: 'warning',
			duration: 0,
			title: i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.folder.title'),
			// VNodes, not a string: the toast renders strings as HTML, and names are user input.
			message: h('div', [
				refused.length > 0 &&
					h(
						'p',
						i18n.baseText('typeAvailabilityPolicies.transfer.unpublished.folder.message', {
							interpolate: { project: projectName, names: quotedNames },
						}),
					),
				refused.length > 0 && h(PolicyViolationList, { violations, labelOf }),
				failed.length > 0 && h(RepublishFailureList, { failures: failed }),
			]),
		});
	}

	return { showForWorkflow, showForFolder };
}
