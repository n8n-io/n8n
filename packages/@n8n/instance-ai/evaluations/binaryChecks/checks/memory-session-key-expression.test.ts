import { memorySessionKeyExpression } from './memory-session-key-expression';
import type { WorkflowResponse } from '../../clients/n8n-client';

function createWorkflow(memoryParameters: Record<string, unknown>): WorkflowResponse {
	return {
		id: 'workflow-1',
		name: 'Memory expression test',
		active: false,
		nodes: [
			{
				name: 'Telegram Trigger',
				type: 'n8n-nodes-base.telegramTrigger',
				parameters: {},
			},
			{
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			},
			{
				name: 'Conversation Memory',
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				parameters: memoryParameters,
			},
		],
		connections: {
			'Telegram Trigger': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'Conversation Memory': {
				ai_memory: [[{ node: 'AI Agent', type: 'ai_memory', index: 0 }]],
			},
		},
	};
}

describe('memorySessionKeyExpression', () => {
	it('fails when a connected memory node uses $json in a custom sessionKey', async () => {
		const workflow = createWorkflow({
			sessionIdType: 'customKey',
			sessionKey: '={{ $json.chatId }}',
		});

		const result = await memorySessionKeyExpression.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Conversation Memory');
		expect(result.comment).toContain('sessionKey');
	});

	it('fails when a connected legacy memory node uses $json in sessionId', async () => {
		const workflow = createWorkflow({
			sessionIdType: 'customKey',
			sessionId: '={{ $json.chatId }}',
		});

		const result = await memorySessionKeyExpression.run(workflow, { prompt: '' });

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('sessionId');
	});

	it('passes when a connected memory node references the trigger explicitly', async () => {
		const workflow = createWorkflow({
			sessionIdType: 'customKey',
			sessionKey: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
		});

		const result = await memorySessionKeyExpression.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});

	it('passes for the Chat Trigger fromInput session ID mode', async () => {
		const workflow = createWorkflow({
			sessionIdType: 'fromInput',
			sessionKey: '={{ $json.sessionId }}',
		});

		const result = await memorySessionKeyExpression.run(workflow, { prompt: '' });

		expect(result).toEqual({ pass: true });
	});
});
