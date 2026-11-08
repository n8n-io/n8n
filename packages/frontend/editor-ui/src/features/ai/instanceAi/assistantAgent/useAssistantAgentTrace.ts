import type { AgentSseEvent } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { saveAs } from 'file-saver';
import type { DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import { appendTraceEvent, type AssistantAgentTraceEvent } from './assistantAgentTrace';
import { ASSISTANT_AGENT_ID } from './assistantAgentThreads';

export type AssistantAgentTraceAction = 'copy' | 'download';

/**
 * Lets a tester export what the browser received for an Assistant agent thread.
 * It shows for the same debug flag as the debug button of the current Assistant.
 */
export function useAssistantAgentTrace({
	threadId,
	messages,
}: {
	threadId: string;
	messages: () => ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
}) {
	const i18n = useI18n();
	const clipboard = useClipboard();
	const { showMessage, showError } = useToast();

	const isEnabled = localStorage.getItem('instanceAi.debugMode') === 'true';
	// A plain array, not a ref: nothing renders it, and a long turn sends many events.
	const events: AssistantAgentTraceEvent[] = [];

	/** Keeps the event only with the flag on, so other users keep no extra data. */
	function recordEvent(event: AgentSseEvent): void {
		if (isEnabled) appendTraceEvent(events, event);
	}

	const menuItems: Array<ActionDropdownItem<AssistantAgentTraceAction>> = [
		{ id: 'copy', label: i18n.baseText('instanceAi.assistantAgent.trace.copy'), icon: 'copy' },
		{
			id: 'download',
			label: i18n.baseText('instanceAi.assistantAgent.trace.download'),
			icon: 'download',
		},
	];

	function serialize(): string {
		const trace = {
			threadId,
			agentId: ASSISTANT_AGENT_ID,
			exportedAt: new Date().toISOString(),
			// The chat as the browser shows it.
			messages: messages(),
			// The stream events that this page received, with the deltas of each part joined.
			events,
		};
		return JSON.stringify(trace, null, 2);
	}

	async function copy(): Promise<void> {
		try {
			await clipboard.copy(serialize());
			showMessage({
				title: i18n.baseText('instanceAi.assistantAgent.trace.copied'),
				type: 'success',
			});
		} catch (error) {
			showError(error, i18n.baseText('instanceAi.assistantAgent.trace.copyError'));
		}
	}

	function download(): void {
		const blob = new Blob([serialize()], { type: 'application/json' });
		saveAs(blob, `assistant-trace-${threadId}.json`);
	}

	async function runAction(action: AssistantAgentTraceAction): Promise<void> {
		if (action === 'copy') await copy();
		else download();
	}

	return { isEnabled, menuItems, recordEvent, runAction };
}
