import { toResourcePath } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import { useIsPageModuleActive } from './useIsPageModuleActive';
import { DOCUMENTATION_OVERVIEW_MODE, OVERVIEW_MODE_QUERY_PARAMETER } from './useOverviewMode';

/** A workflow that no page documents. */
export interface UndocumentedWorkflow {
	id: string;
	name: string;
}

/** How many pages the assistant writes in one request. */
export const DOCUMENT_PROJECT_PAGE_COUNT = 5;

/**
 * Gives the "Write it for me" action of a project.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `documentProject` opens an assistant thread in the project. It asks for pages about the most important workflows without a page, and for the text of the page that sums up the project.
 * A project without a summary page gets an empty one first.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useDocumentProjectWithAi() {
	const i18n = useI18n();
	const isAssistantAvailable = useInstanceAiAvailable();
	const isPageModuleActive = useIsPageModuleActive();
	const { startThread } = useInstanceAiHandoff();
	const pageStore = usePageStore();
	const isStarting = ref(false);

	const isAvailable = computed(() => isAssistantAvailable.value && isPageModuleActive.value);

	function toWorkflowLine(workflow: UndocumentedWorkflow): string {
		const path = toResourcePath({ resourceType: 'workflow', resourceId: workflow.id });
		return `- [${workflow.name}](${path})`;
	}

	/** Gives the instance-relative path of the documentation overview of a project. */
	function toDocumentationOverviewPath(projectId: string): string {
		return `/projects/${projectId}/workflows?${OVERVIEW_MODE_QUERY_PARAMETER}=${DOCUMENTATION_OVERVIEW_MODE}`;
	}

	function toSummaryRequest(summaryPageId: string): string {
		return i18n.baseText('page.documentProject.summaryRequest', {
			interpolate: {
				summaryPath: toResourcePath({ resourceType: 'page', resourceId: summaryPageId }),
			},
		});
	}

	/** Asks for the summary only when each workflow has a page. */
	function toDocumentProjectRequest(
		projectId: string,
		workflows: UndocumentedWorkflow[],
		summaryPageId: string,
	): string {
		const closing = {
			summaryRequest: toSummaryRequest(summaryPageId),
			overviewLabel: i18n.baseText('page.documentProject.overviewLink'),
			overviewPath: toDocumentationOverviewPath(projectId),
		};
		return workflows.length > 0
			? i18n.baseText('page.documentProject.prompt', {
					interpolate: {
						...closing,
						pageCount: Math.min(DOCUMENT_PROJECT_PAGE_COUNT, workflows.length),
						workflowList: workflows.map(toWorkflowLine).join('\n'),
					},
				})
			: i18n.baseText('page.documentProject.summaryPrompt', { interpolate: closing });
	}

	async function documentProject(
		projectId: string,
		workflows: UndocumentedWorkflow[],
	): Promise<boolean> {
		isStarting.value = true;
		try {
			const summary = await pageStore.ensureProjectSummary(projectId);
			const outcome = await startThread(
				projectId,
				toDocumentProjectRequest(projectId, workflows, summary.id),
				{ kind: 'prefill', prefillType: 'handoff_document_project' },
				{ source: 'page_overview_button', origin: 'internal', sourceContext: { projectId } },
			);
			return outcome === 'started';
		} finally {
			isStarting.value = false;
		}
	}

	return { isAvailable, isStarting, documentProject };
}
