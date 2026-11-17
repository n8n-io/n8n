import type { PromotePackageResultDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { getProject, ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';

import { promoteSuccessToast, withFolderNotes } from '../promotionResult';
import { promotionEventBus } from '../promotions.eventBus';
import type { AppliedResult } from '../promotions.types';

/** The toasts and events after a promote or an apply. */
export function usePromotionOutcome() {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const projectContext = capabilityRegistry.use(capabilities.projectContext);
	const usersStore = useUsersStore();

	/** What the Apply did for its dependencies, so the user knows what to finish by hand. */
	function dependencyNotes(result: AppliedResult): string[] {
		const count = (key: BaseTextKey, items: unknown[] | undefined) =>
			items?.length
				? [
						i18n.baseText(key, {
							adjustToNumber: items.length,
							interpolate: { count: String(items.length) },
						}),
					]
				: [];
		return [
			...count('promotions.dependencies.result.placeholders', result.placeholders),
			...count('promotions.dependencies.result.grants', result.grants),
			...count(
				'promotions.dependencies.result.moves',
				result.credentialMoves?.filter(({ allowed }) => allowed),
			),
			...count(
				'promotions.dependencies.result.movesRefused',
				result.credentialMoves?.filter(({ allowed }) => !allowed),
			),
			...count('promotions.dependencies.result.kept', result.keptWorkflows),
			...count('promotions.dependencies.result.gaps', result.dependencyReport?.gaps),
		];
	}

	// A Promote across projects is one push. Each project hears about it.
	function showPromoted(projectIds: string[], result: PromotePackageResultDto, gapCount = 0) {
		for (const projectId of projectIds) promotionEventBus.emit('promoted', { projectId });
		toast.showMessage({
			// An incomplete Promote says so: "Promoted with 2 gaps".
			title:
				gapCount > 0
					? i18n.baseText('promotions.operation.toast.success.titleWithGaps', {
							adjustToNumber: gapCount,
							interpolate: { count: String(gapCount) },
						})
					: i18n.baseText('promotions.operation.toast.success.title'),
			type: result.warnings?.length || gapCount > 0 ? 'warning' : 'success',
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
		const { workflows, projects } = result.counts;
		const notPublished = workflows.publishing.failed + workflows.publishing.blocked;
		const interpolate = {
			created: String(workflows.created),
			updated: String(workflows.updated),
			archived: String(workflows.archived),
			deleted: String(workflows.deleted),
			notPublished: String(notPublished),
		};
		const workflowSummary = i18n.baseText(
			notPublished
				? 'promotions.operation.incoming.applied.messageNotPublished'
				: 'promotions.operation.incoming.applied.message',
			{ interpolate },
		);
		// A project or folder Apply changes no workflows, so leave out a sentence of zeros.
		const workflowsChanged =
			workflows.created +
				workflows.updated +
				workflows.archived +
				workflows.deleted +
				notPublished >
			0;
		const notes = [
			withFolderNotes(i18n, workflowsChanged ? workflowSummary : '', result.counts),
			projects.updated > 0 ? i18n.baseText('promotions.applied.projectUpdated') : '',
			...dependencyNotes(result),
		].filter(Boolean);
		const incomplete = (result.dependencyReport?.gaps.length ?? 0) > 0;
		// A workflow can be imported and still fail to publish, so success alone would mislead.
		toast.showMessage({
			title: i18n.baseText('promotions.operation.incoming.applied.title'),
			message: notes.length > 0 ? notes.join(' ') : workflowSummary,
			type: notPublished || incomplete ? 'warning' : 'success',
		});
	}

	function showInstanceApplied(result: AppliedResult) {
		const { projects, workflows } = result.counts;
		const notPublished = workflows.publishing.failed + workflows.publishing.blocked;
		const interpolate = {
			projectsCreated: String(projects.created),
			projectsDeleted: String(projects.deleted),
			created: String(workflows.created),
			updated: String(workflows.updated),
			archived: String(workflows.archived),
			deleted: String(workflows.deleted),
			notPublished: String(notPublished),
		};
		// A workflow can be imported and still fail to publish, so success alone would mislead.
		const summary = withFolderNotes(
			i18n,
			i18n.baseText(
				notPublished
					? 'settings.promotions.apply.toast.success.messageNotPublished'
					: 'settings.promotions.apply.toast.success.message',
				{ interpolate },
			),
			result.counts,
		);
		const incomplete = (result.dependencyReport?.gaps.length ?? 0) > 0;
		toast.showMessage({
			title: i18n.baseText('settings.promotions.apply.toast.success.title'),
			message: [summary, ...dependencyNotes(result)].join(' '),
			type: notPublished || incomplete ? 'warning' : 'success',
		});
	}

	// An instance apply can create and delete projects. Reload the stores that the project
	// sidebar reads. Users who can list every project also read the full list.
	async function refreshProjects() {
		try {
			await Promise.all([
				projectContext.getMyProjects(),
				projectContext.getProjectsCount(),
				...(getResourcePermissions(usersStore.currentUser?.globalScopes).project.list
					? [projectContext.getAllProjects()]
					: []),
			]);
		} catch {
			// The apply went through. A stale project list is fixed by the next page load.
		}
	}

	// The open views refresh once the outcome for this project is known, so none of them
	// asks for a project the package removed.
	async function announceApplied(projectId: string) {
		try {
			const project = await getProject(rootStore.restApiContext, projectId);
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

	return { showPromoted, showApplied, showInstanceApplied, refreshProjects, announceApplied };
}
