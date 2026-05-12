import type {
	CloudAgentAssistantMessage,
	CloudAgentEvent,
	CloudAgentMessage,
} from './cloudAgent.types';

/**
 * Pure reducer: applies a single canonical event to the running message list.
 * The store calls this for each SSE event it receives.
 *
 * Mirrors the shape of instanceAi.reducer but is dramatically simpler — no
 * agent tree, no background tasks, no plan view. v1 surface is a flat chat.
 */
export function applyEvent(
	messages: CloudAgentMessage[],
	event: CloudAgentEvent,
): CloudAgentMessage[] {
	switch (event.type) {
		case 'run-start': {
			const assistant: CloudAgentAssistantMessage = {
				id: event.runId,
				role: 'assistant',
				runId: event.runId,
				text: '',
				toolCalls: [],
			};
			return [...messages, assistant];
		}

		case 'text-delta': {
			return updateAssistant(messages, event.runId, (assistant) => ({
				...assistant,
				text: assistant.text + event.delta,
			}));
		}

		case 'tool-call': {
			return updateAssistant(messages, event.runId, (assistant) => ({
				...assistant,
				toolCalls: [
					...assistant.toolCalls,
					{
						toolCallId: event.toolCallId,
						name: event.name,
						args: event.args,
						family: event.family,
					},
				],
			}));
		}

		case 'tool-result': {
			return updateAssistant(messages, event.runId, (assistant) => ({
				...assistant,
				toolCalls: assistant.toolCalls.map((call) =>
					call.toolCallId === event.toolCallId
						? { ...call, result: { output: event.output, isError: event.isError } }
						: call,
				),
			}));
		}

		case 'run-finish': {
			return updateAssistant(messages, event.runId, (assistant) => ({
				...assistant,
				finishedAt: Date.now(),
			}));
		}

		case 'run-error': {
			return updateAssistant(messages, event.runId, (assistant) => ({
				...assistant,
				text:
					assistant.text +
					(assistant.text.length > 0 ? '\n\n' : '') +
					`[run errored: ${event.message}]`,
				finishedAt: Date.now(),
			}));
		}

		default:
			return messages;
	}
}

function updateAssistant(
	messages: CloudAgentMessage[],
	runId: string,
	updater: (assistant: CloudAgentAssistantMessage) => CloudAgentAssistantMessage,
): CloudAgentMessage[] {
	return messages.map((m) => (m.role === 'assistant' && m.runId === runId ? updater(m) : m));
}
