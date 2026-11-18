import { toResourcePath } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import { useIsPageModuleActive } from './useIsPageModuleActive';
import { OVERVIEW_MODE_QUERY_PARAMETER } from './useOverviewMode';

/** A workflow that no page documents. */
export interface UndocumentedWorkflow {
	id: string;
	name: string;
}

/** How many pages the assistant writes in one request. */
export const SORT_IT_OUT_PAGE_COUNT = 5;

/**
 * Gives the "Sort it out!" action of a project.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `sortItOut` opens an assistant thread in the project and asks for pages about the most important workflows without a page.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useSortItOutWithAi() {
	const i18n = useI18n();
	const isAssistantAvailable = useInstanceAiAvailable();
	const isPageModuleActive = useIsPageModuleActive();
	const { startThread } = useInstanceAiHandoff();
	const isStarting = ref(false);

	const isAvailable = computed(() => isAssistantAvailable.value && isPageModuleActive.value);

	function toWorkflowLine(workflow: UndocumentedWorkflow): string {
		const path = toResourcePath({ resourceType: 'workflow', resourceId: workflow.id });
		return `- [${workflow.name}](${path})`;
	}

	/** Gives the instance-relative path of the documentation overview of a project. */
	function toDocumentationOverviewPath(projectId: string): string {
		return `/projects/${projectId}/workflows?${OVERVIEW_MODE_QUERY_PARAMETER}=docs`;
	}

	function toSortItOutRequest(projectId: string, workflows: UndocumentedWorkflow[]): string {
		return i18n.baseText('page.sortItOut.prompt', {
			interpolate: {
				pageCount: Math.min(SORT_IT_OUT_PAGE_COUNT, workflows.length),
				workflowList: workflows.map(toWorkflowLine).join('\n'),
				overviewLabel: i18n.baseText('page.sortItOut.overviewLink'),
				overviewPath: toDocumentationOverviewPath(projectId),
			},
		});
	}

	async function sortItOut(projectId: string, workflows: UndocumentedWorkflow[]): Promise<boolean> {
		isStarting.value = true;
		try {
			const outcome = await startThread(
				projectId,
				toSortItOutRequest(projectId, workflows),
				{ kind: 'prefill', prefillType: 'handoff_document_project' },
				{ source: 'page_overview_button', origin: 'internal', sourceContext: { projectId } },
			);
			return outcome === 'started';
		} finally {
			isStarting.value = false;
		}
	}

	return { isAvailable, isStarting, sortItOut };
}
