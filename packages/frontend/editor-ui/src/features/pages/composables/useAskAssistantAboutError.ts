import type { PageSummary } from '@n8n/api-types';
import { toResourcePath } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import { useIsPageModuleActive } from './useIsPageModuleActive';

/** The longest error message that the request holds. A longer message is cut. */
export const MAX_ERROR_MESSAGE_LENGTH = 500;

/** The longest error description that the request holds. A longer description is left out. */
export const MAX_ERROR_DESCRIPTION_LENGTH = 300;

/** The failure of a node that the assistant explains. */
export interface FailedNodeRun {
	workflowId: string;
	workflowName: string;
	nodeName: string;
	errorMessage: string;
	errorDescription?: string;
	/** The execution that failed, when it is saved. */
	executionId?: string;
}

/** Cuts a text to `maxLength` characters. A cut text ends with an ellipsis. */
function truncate(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function isShortDescription(description: string | undefined): description is string {
	return (
		description !== undefined &&
		description !== '' &&
		description.length <= MAX_ERROR_DESCRIPTION_LENGTH
	);
}

/**
 * Gives the "Ask the assistant" action of a failed node that has runbook pages.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `askAboutError` opens an assistant thread in the project and asks for the cause and a fix, with the links of the pages.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useAskAssistantAboutError() {
	const i18n = useI18n();
	const isAssistantAvailable = useInstanceAiAvailable();
	const isPageModuleActive = useIsPageModuleActive();
	const { startThread } = useInstanceAiHandoff();
	const isStarting = ref(false);

	const isAvailable = computed(() => isAssistantAvailable.value && isPageModuleActive.value);

	function toPageLine(page: PageSummary): string {
		return i18n.baseText('page.errorRunbook.prompt.page', {
			interpolate: {
				title: page.title,
				path: toResourcePath({ resourceType: 'page', resourceId: page.id }),
			},
		});
	}

	/** Gives the lines that state the failure. A fact that is not known has no line. */
	function toFailureLines(failure: FailedNodeRun): string[] {
		return [
			i18n.baseText('page.errorRunbook.prompt.failure', {
				interpolate: {
					nodeName: failure.nodeName,
					workflowName: failure.workflowName,
					workflowId: failure.workflowId,
				},
			}),
			...(failure.executionId
				? [
						i18n.baseText('page.errorRunbook.prompt.execution', {
							interpolate: { executionId: failure.executionId },
						}),
					]
				: []),
			i18n.baseText('page.errorRunbook.prompt.error', {
				interpolate: { message: truncate(failure.errorMessage, MAX_ERROR_MESSAGE_LENGTH) },
			}),
			...(isShortDescription(failure.errorDescription)
				? [
						i18n.baseText('page.errorRunbook.prompt.description', {
							interpolate: { description: failure.errorDescription },
						}),
					]
				: []),
		];
	}

	/** Builds the request: the failure, the links of the runbook pages, then what the assistant must do. */
	function toErrorRequest(failure: FailedNodeRun, pages: PageSummary[]): string {
		return [
			toFailureLines(failure).join('\n'),
			[i18n.baseText('page.errorRunbook.prompt.pages'), ...pages.map(toPageLine)].join('\n'),
			i18n.baseText('page.errorRunbook.prompt.instructions'),
		].join('\n\n');
	}

	async function askAboutError(
		failure: FailedNodeRun,
		pages: PageSummary[],
		projectId: string,
	): Promise<boolean> {
		isStarting.value = true;
		try {
			const outcome = await startThread(
				projectId,
				toErrorRequest(failure, pages),
				{ kind: 'prefill', prefillType: 'handoff_execution_error' },
				{
					source: 'node_error_view',
					origin: 'internal',
					sourceContext: { workflowId: failure.workflowId },
				},
				[{ type: 'workflow', id: failure.workflowId, name: failure.workflowName || undefined }],
			);
			return outcome === 'started';
		} finally {
			isStarting.value = false;
		}
	}

	return { isAvailable, isStarting, askAboutError };
}
