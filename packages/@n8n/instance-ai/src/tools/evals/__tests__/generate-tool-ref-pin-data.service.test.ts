import type { WorkflowJSON } from '@n8n/workflow-sdk';

jest.mock('../../../utils/eval-agents', () => {
	const actual: object = jest.requireActual('../../../utils/eval-agents');
	return { ...actual, createEvalAgent: jest.fn(), extractText: jest.fn() };
});

import { createEvalAgent, extractText } from '../../../utils/eval-agents';
import type { ToolRef } from '../detect-tool-refs.service';
import { generateToolRefPinData } from '../generate-tool-ref-pin-data.service';

const mockCreateEvalAgent = createEvalAgent as jest.MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as jest.MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = jest.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
}

const wf = (nodes: WorkflowJSON['nodes']): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections: {},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

const triggerNode: WorkflowJSON['nodes'][number] = {
	name: 'Telegram Trigger',
	type: 'n8n-nodes-base.telegramTrigger',
	typeVersion: 1,
	parameters: { updates: ['message'] },
	position: [0, 0],
	id: 't',
} as WorkflowJSON['nodes'][number];

const agentNode: WorkflowJSON['nodes'][number] = {
	name: 'Agent',
	type: '@n8n/n8n-nodes-langchain.agent',
	typeVersion: 1,
	parameters: { text: 'hi' },
	position: [100, 0],
	id: 'a',
} as WorkflowJSON['nodes'][number];

describe('generateToolRefPinData', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns {} when no refs are passed', async () => {
		const result = await generateToolRefPinData({
			workflow: wf([agentNode]),
			agentNodeName: 'Agent',
			refs: [],
		});
		expect(result).toEqual({});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('returns parsed pinData for each requested source node', async () => {
		setupAgentMock(
			JSON.stringify({
				'Telegram Trigger': [{ json: { message: { chat: { id: '123' } } } }],
			}),
		);
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'message', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(result).toEqual({
			'Telegram Trigger': [{ json: { message: { chat: { id: '123' } } } }],
		});
	});

	it('strips markdown code fences around the JSON output', async () => {
		setupAgentMock('```json\n{"Telegram Trigger":[{"json":{"chat_id":"42"}}]}\n```');
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(result['Telegram Trigger']).toEqual([{ json: { chat_id: '42' } }]);
	});

	it('returns {} on malformed LLM output', async () => {
		setupAgentMock('not json at all');
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(result).toEqual({});
	});

	it('returns {} on schema-invalid LLM output', async () => {
		setupAgentMock(JSON.stringify({ 'Telegram Trigger': 'not-an-array' }));
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(result).toEqual({});
	});

	it('drops entries for nodes that were not requested', async () => {
		setupAgentMock(
			JSON.stringify({
				'Telegram Trigger': [{ json: { chat_id: '1' } }],
				Unrelated: [{ json: { foo: 'bar' } }],
			}),
		);
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(Object.keys(result)).toEqual(['Telegram Trigger']);
	});

	it('omits nodes the LLM failed to populate (no throw)', async () => {
		setupAgentMock(JSON.stringify({ 'Other Trigger': [{ json: { x: 1 } }] }));
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
			{ sourceNodeName: 'Other Trigger', field: 'x', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, { ...triggerNode, name: 'Other Trigger', id: 'o' }, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(Object.keys(result)).toEqual(['Other Trigger']);
	});

	it('returns {} when the LLM call throws', async () => {
		const generate = jest.fn().mockRejectedValue(new Error('boom'));
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		const result = await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		expect(result).toEqual({});
	});

	it('passes node type and required fields to the LLM prompt', async () => {
		const generate = jest.fn().mockResolvedValue({ messages: [] });
		mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockExtractText.mockReturnValue(
			JSON.stringify({ 'Telegram Trigger': [{ json: { chat_id: '1' } }] }),
		);
		const refs: ToolRef[] = [
			{ sourceNodeName: 'Telegram Trigger', field: 'chat_id', toolNodeName: 'Memory' },
		];
		await generateToolRefPinData({
			workflow: wf([triggerNode, agentNode]),
			agentNodeName: 'Agent',
			refs,
		});
		const userMessage = generate.mock.calls[0][0][0];
		const userText = userMessage.content[0].text;
		expect(userText).toContain('Telegram Trigger');
		expect(userText).toContain('telegramTrigger');
		expect(userText).toContain('chat_id');
	});
});
