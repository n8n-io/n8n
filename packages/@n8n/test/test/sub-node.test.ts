import nock from 'nock';

import { createCredential, executeWorkflow, loadWorkflow, type WorkflowDefinition } from '../src';

afterEach(() => nock.cleanAll());

const definition: WorkflowDefinition = {
	name: 'Answer',
	nodes: [
		{
			id: 'a1',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'a2',
			name: 'Chain',
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			typeVersion: 1.4,
			position: [220, 0],
			parameters: { promptType: 'define', text: '={{ $json.question }}' },
		},
		{
			id: 'a3',
			name: 'Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1,
			position: [220, 200],
			parameters: { model: 'gpt-4o-mini', options: {} },
			credentials: { openAiApi: { id: 'openai-1', name: 'OpenAI' } },
		},
	],
	connections: {
		Start: { main: [[{ node: 'Chain', type: 'main', index: 0 }]] },
		Model: { ai_languageModel: [[{ node: 'Chain', type: 'ai_languageModel', index: 0 }]] },
	},
};

const completion = {
	id: 'chatcmpl-1',
	object: 'chat.completion',
	created: 0,
	model: 'gpt-4o-mini',
	choices: [
		{
			index: 0,
			message: { role: 'assistant', content: 'A workflow tool.' },
			finish_reason: 'stop',
		},
	],
	usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

test('keeps the parameters of a node whose sub-node runs, and reads its output', async () => {
	nock('https://api.openai.com').post('/v1/chat/completions').reply(200, completion);

	const result = await executeWorkflow(loadWorkflow(definition), {
		input: { question: 'What is n8n?' },
		credentials: { OpenAI: createCredential('openAiApi', { apiKey: 'sk-test' }) },
	});

	expect(result.node('Chain').parameters).toEqual([
		expect.objectContaining({ text: 'What is n8n?' }),
	]);
	expect(result.node('Model').runs).toHaveLength(1);
	expect(result.output).toEqual([{ text: 'A workflow tool.' }]);
});
