import { toResourcePath } from '@n8n/api-types';
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
 * Gives the "Document me" action of a project.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `documentProject` opens an assistant thread in the project and asks for pages about the most important workflows without a page, and for one general page about the project.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useDocumentProjectWithAi() {
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
		return `/projects/${projectId}/workflows?${OVERVIEW_MODE_QUERY_PARAMETER}=${DOCUMENTATION_OVERVIEW_MODE}`;
	}

	function toDocumentProjectRequest(projectId: string, workflows: UndocumentedWorkflow[]): string {
		return i18n.baseText('page.documentProject.prompt', {
			interpolate: {
				pageCount: Math.min(DOCUMENT_PROJECT_PAGE_COUNT, workflows.length),
				workflowList: workflows.map(toWorkflowLine).join('\n'),
				generalPageTitle: i18n.baseText('page.documentProject.generalPageTitle'),
				overviewLabel: i18n.baseText('page.documentProject.overviewLink'),
				overviewPath: toDocumentationOverviewPath(projectId),
			},
		});
	}

	async function documentProject(
		projectId: string,
		workflows: UndocumentedWorkflow[],
	): Promise<boolean> {
		isStarting.value = true;
		try {
			const outcome = await startThread(
				projectId,
				toDocumentProjectRequest(projectId, workflows),
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
