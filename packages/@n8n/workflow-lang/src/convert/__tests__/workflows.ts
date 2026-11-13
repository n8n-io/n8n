/** Small v1 workflows for the converter tests. */

type Params = Record<string, unknown>;

export function node(
	name: string,
	type: string,
	typeVersion: number,
	position: [number, number],
	parameters: Params = {},
	extra: Params = {},
) {
	return {
		id: name,
		name,
		type: `n8n-nodes-base.${type}`,
		typeVersion,
		position,
		parameters,
		...extra,
	};
}

export function connect(pairs: Array<[string, number, string, number]>) {
	const out: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> =
		{};
	for (const [from, output, to, input] of pairs) {
		const entry = (out[from] ??= { main: [] });
		while (entry.main.length <= output) entry.main.push([]);
		entry.main[output].push({ node: to, type: 'main', index: input });
	}
	return out;
}

export const webhookNode = (path = 'hook', responseMode = 'onReceived') =>
	node('Webhook', 'webhook', 2, [0, 0], { httpMethod: 'POST', path, responseMode, options: {} });

export const extraWorkflows: Record<string, unknown> = {
	'fallback-and-credentials': {
		name: 'Fallback nodes',
		nodes: [
			webhookNode(),
			node(
				'Create page',
				'postgres',
				2.5,
				[200, 0],
				{
					operation: 'executeQuery',
					query: '=SELECT * FROM pages WHERE title = {{ $json.body.title }}',
					table: { __rl: true, value: 'pages', mode: 'list' },
				},
				{
					credentials: { postgres: { id: '1', name: 'Main DB' } },
					retryOnFail: true,
					maxTries: 4,
					waitBetweenTries: 2000,
				},
			),
			node(
				'Post',
				'slack',
				2.2,
				[400, 0],
				{
					select: 'channel',
					channelId: { __rl: true, value: 'C1', mode: 'id' },
					text: '=Created {{ $json.id }}',
					otherOptions: {},
				},
				{ credentials: { slackApi: { id: '2', name: 'Slack account' } } },
			),
			node('Old step', 'noOp', 1, [600, 0], {}, { disabled: true }),
			node(
				'Rows',
				'mySql',
				2.4,
				[800, 0],
				{ operation: 'insert' },
				{ onError: 'continueRegularOutput', credentials: { mySql: { id: '3', name: 'Sheets' } } },
			),
		],
		connections: connect([
			['Webhook', 0, 'Create page', 0],
			['Create page', 0, 'Post', 0],
			['Post', 0, 'Old step', 0],
			['Old step', 0, 'Rows', 0],
		]),
		settings: { executionOrder: 'v1' },
	},
	'switch-expression-if-v1-choose-branch': {
		name: 'Routing',
		nodes: [
			webhookNode(),
			node('Route', 'switch', 3.2, [200, 0], {
				mode: 'expression',
				numberOutputs: 2,
				output: '={{ $json.body.n % 2 }}',
			}),
			node('Old if', 'if', 1, [400, -100], {
				conditions: {
					['number']: [{ value1: '={{ $json.body.n }}', operation: 'larger', value2: 3 }],
				},
			}),
			node('Even', 'set', 3.4, [400, 100], {
				assignments: { assignments: [{ id: 'a', name: 'even', value: true, type: 'boolean' }] },
				options: {},
			}),
			node('Choose', 'merge', 3.1, [600, 0], { mode: 'chooseBranch', useDataOfInput: 2 }),
			node('Wait a bit', 'wait', 1.1, [800, 0], { amount: 2, unit: 'minutes' }),
		],
		connections: connect([
			['Webhook', 0, 'Route', 0],
			['Route', 0, 'Old if', 0],
			['Route', 1, 'Even', 0],
			['Old if', 0, 'Choose', 0],
			['Even', 0, 'Choose', 1],
			['Choose', 0, 'Wait a bit', 0],
		]),
		settings: { executionOrder: 'v1' },
	},
	'schedule-cron': {
		name: 'Cron',
		nodes: [
			node('Schedule Trigger', 'scheduleTrigger', 1.2, [0, 0], {
				rule: {
					interval: [
						{ field: 'cronExpression', expression: '0 9 * * 1-5' },
						{ field: 'weeks', triggerAtDay: [1, 3], triggerAtHour: 8 },
					],
				},
			}),
			node('Ping', 'httpRequest', 4.2, [200, 0], { url: 'https://example.com/ping', options: {} }),
		],
		connections: connect([['Schedule Trigger', 0, 'Ping', 0]]),
		settings: { executionOrder: 'v1', timezone: 'Europe/Berlin' },
	},
	// An AI cluster: the agent and its sub-nodes run as one fallback-host step.
	'ai-cluster': {
		name: 'Support agent',
		nodes: [
			webhookNode(),
			{
				...node('AI Agent', 'noOp', 1, [200, 0], { text: '={{ $json.body.q }}' }),
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 3.1,
			},
			{
				...node(
					'Model',
					'noOp',
					1,
					[200, 200],
					{ model: 'gpt-4o-mini' },
					{ credentials: { openAiApi: { id: '1', name: 'OpenAI account' } } },
				),
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				typeVersion: 1.2,
			},
			{
				...node('Calculator', 'noOp', 1, [300, 200]),
				type: '@n8n/n8n-nodes-langchain.toolCalculator',
			},
			{
				...node('Retriever', 'noOp', 1, [400, 200]),
				type: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
			},
			{
				...node('Store', 'noOp', 1, [400, 400], { mode: 'retrieve' }),
				type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			},
			node('Notify', 'postgres', 2.5, [400, 0], { operation: 'executeQuery', query: 'select 1' }),
		],
		connections: {
			...connect([
				['Webhook', 0, 'AI Agent', 0],
				['AI Agent', 0, 'Notify', 0],
			]),
			Model: { ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]] },
			Calculator: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			Retriever: { ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]] },
			Store: { ai_vectorStore: [[{ node: 'Retriever', type: 'ai_vectorStore', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	},
	// A host step with two inputs and several outputs that feed different steps.
	'host-multi-output': {
		name: 'Compare lists',
		nodes: [
			webhookNode(),
			node('Old', 'postgres', 2.5, [200, 0], { operation: 'executeQuery', query: 'select 1' }),
			node('New', 'postgres', 2.5, [200, 200], { operation: 'executeQuery', query: 'select 2' }),
			node('Compare', 'compareDatasets', 2.3, [400, 0], {
				mergeByFields: { values: [{ field1: 'id', field2: 'id' }] },
				options: {},
			}),
			node('Insert', 'postgres', 2.5, [600, 0], { operation: 'executeQuery', query: 'select 3' }),
			node('Delete', 'postgres', 2.5, [600, 300], { operation: 'executeQuery', query: 'select 4' }),
		],
		connections: connect([
			['Webhook', 0, 'Old', 0],
			['Old', 0, 'New', 0],
			['Old', 0, 'Compare', 0],
			['New', 0, 'Compare', 1],
			['Compare', 0, 'Insert', 0],
			['Compare', 3, 'Delete', 0],
		]),
		settings: { executionOrder: 'v1' },
	},
};
