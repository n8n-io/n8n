import type { PromotePackageResultDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { promoteSuccessToast, withMoveAndRenameNote } from '../promotionResult';
import { promotionEventBus } from '../promotions.eventBus';
import type { AppliedResult } from '../promotions.types';

/** The toasts and events after a promote or an apply of a project selection. */
export function usePromotionOutcome() {
	const i18n = useI18n();
	const toast = useToast();
	const projectsStore = useProjectsStore();

	function showPromoted(projectId: string, result: PromotePackageResultDto) {
		promotionEventBus.emit('promoted', { projectId });
		toast.showMessage({
			title: i18n.baseText('promotions.operation.toast.success.title'),
			type: result.warnings?.length ? 'warning' : 'success',
			...promoteSuccessToast(result, {
				pushed: i18n.baseText('promotions.result.pushed', {
					interpolate: { branch: result.git.branchName },
				}),
				viewMergeRequest: i18n.baseText('promotions.result.viewMergeRequest'),
				reviewNotRecorded: i18n.baseText('promotions.result.reviewNotRecorded'),
			}),
		});
	}

	function showApplied(result: AppliedResult) {
		const { workflows } = result.counts;
		const notPublished = workflows.publishing.failed + workflows.publishing.blocked;
		const interpolate = {
			created: String(workflows.created),
			updated: String(workflows.updated),
			archived: String(workflows.archived),
			deleted: String(workflows.deleted),
			notPublished: String(notPublished),
		};
		// A workflow can be imported and still fail to publish, so success alone would mislead.
		toast.showMessage({
			title: i18n.baseText('promotions.operation.incoming.applied.title'),
			message: withMoveAndRenameNote(
				i18n,
				i18n.baseText(
					notPublished
						? 'promotions.operation.incoming.applied.messageNotPublished'
						: 'promotions.operation.incoming.applied.message',
					{ interpolate },
				),
				result.counts,
			),
			type: notPublished ? 'warning' : 'success',
		});
	}

	// The open views refresh once the outcome for this project is known, so none of them
	// asks for a project the package removed.
	async function announceApplied(projectId: string) {
		try {
			const project = await projectsStore.fetchProject(projectId);
			promotionEventBus.emit('applied', { projectId, project });
		} catch (error) {
			if (error instanceof ResponseError && error.httpStatusCode === 404) {
				toast.showMessage({
					title: i18n.baseText('promotions.applied.projectRemoved'),
					type: 'info',
				});
				promotionEventBus.emit('projectRemoved', { projectId });
				return;
			}
			// The apply went through, so the views still refresh. Only the header keeps its name.
			promotionEventBus.emit('applied', { projectId });
		}
	}

	return { showPromoted, showApplied, announceApplied };
}
