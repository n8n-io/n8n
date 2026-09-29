import type { AgentMessage } from '@n8n/agents';
import { UnexpectedError } from 'n8n-workflow';

/** Keep the reserved identity when the runtime adds model-input enrichment. */
export function bindExecutionInput(
	input: AgentMessage[] | string,
	messageIds: string[],
): AgentMessage[] | string {
	if (messageIds.length === 0) return input;
	const messages: AgentMessage[] =
		typeof input === 'string'
			? [{ role: 'user', content: [{ type: 'text', text: input }] }]
			: input;
	if (messages.length !== messageIds.length) {
		throw new UnexpectedError('Runtime input does not match the reserved messages');
	}
	return messages.map((message, index) => ({ ...message, id: messageIds[index] }));
}
