import type { ToolCallSimulation } from '@n8n/api-types';

import { ExecutionRecorder } from '../execution-recorder';
import { executionToMessagesDto } from '../utils/execution-to-message-mapper';

describe('safe testing tool-call simulation persistence', () => {
	it('records simulation metadata on tool-call timeline events and maps it into persisted messages', () => {
		const recorder = new ExecutionRecorder();
		const emailSimulation: ToolCallSimulation = {
			route: 'simulated',
			reason: 'served_from_world',
			evidence: ['world_write'],
		};
		const slackSimulation: ToolCallSimulation = {
			route: 'simulated_made_up',
			reason: 'invented_by_llm',
		};

		recorder.record({
			type: 'tool-call',
			toolCallId: 'call-email',
			toolName: 'gmail_send',
			input: { to: 'ana@example.com', subject: 'Refund', body: 'Issued $42.' },
		});
		recorder.record({
			type: 'tool-result',
			toolCallId: 'call-email',
			toolName: 'gmail_send',
			output: { sent: true },
			simulation: emailSimulation,
		});

		recorder.record({
			type: 'tool-call',
			toolCallId: 'call-slack',
			toolName: 'slack_post_message',
			input: { channel: '#support', text: 'Refund processed for Ana.' },
		});
		recorder.record({
			type: 'tool-result',
			toolCallId: 'call-slack',
			toolName: 'slack_post_message',
			output: { ok: true },
			simulation: slackSimulation,
		});

		const record = recorder.getMessageRecord();
		const messages = executionToMessagesDto({
			id: 'exec-1',
			userMessage: 'Send the refund email and notify Slack.',
			author: null,
			timeline: record.timeline,
			attachments: null,
			status: 'success',
			error: null,
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			inputMessages: undefined,
			stopReport: false,
		});

		const assistant = messages.find((message) => message.role === 'assistant');
		expect(assistant).toBeDefined();

		const toolParts = (assistant?.content ?? []).filter((part) => part.type === 'tool-call');
		expect(toolParts).toHaveLength(2);
		expect(toolParts[0]).toMatchObject({
			toolCallId: 'call-email',
			toolName: 'gmail_send',
			simulation: emailSimulation,
		});
		expect(toolParts[1]).toMatchObject({
			toolCallId: 'call-slack',
			toolName: 'slack_post_message',
			simulation: slackSimulation,
		});
	});
});
