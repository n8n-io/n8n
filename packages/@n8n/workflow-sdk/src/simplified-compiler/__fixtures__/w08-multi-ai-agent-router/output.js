const t0 = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2,
	config: {
		parameters: { httpMethod: 'POST', path: '/ai-pipeline', responseMode: 'responseNode' },
	},
});

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 1',
		parameters: {
			jsCode: `// From: Start\nconst body = $('Start').all().map(i => i.json);\nconst inputData = body.data;
const priority = body.priority || 'balanced';
const complexity = inputData.length < 500 ? 1 : inputData.length < 2000 ? 2 : 3;
let provider, model;\nreturn [{ json: { inputData, priority, complexity, provider } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `// From: Code 1\nconst complexity = $('Code 1').all().map(i => i.json);\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'groq';
model = complexity <= 2 ? 'llama-3.1-8b-instant' : 'llama-3.1-70b-versatile';\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `// From: Code 1\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'openai';
model = 'gpt-4o';\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `// From: Code 1\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'anthropic';
model = 'claude-3-5-sonnet';\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const if2 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 2',
		parameters: { conditions: { options: { leftValue: "priority === 'performance'" } } },
		executeOnce: true,
	},
})
	.onTrue(code2)
	.onFalse(code2);

const if1 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 1',
		parameters: { conditions: { options: { leftValue: "priority === 'cost'" } } },
		executeOnce: true,
	},
})
	.onTrue(code2)
	.onFalse(code2.to(code2).to(if2));

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `const startTime = Date.now();
const prompt = 'Analyze and enrich this data';\nreturn [{ json: { startTime, prompt } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const ai1 = node({
	type: '@n8n/n8n-nodes-langchain.agent',
	version: 3.1,
	config: {
		name: 'AI: AI Chat',
		parameters: {
			promptType: 'define',
			text: '',
			options: {},
		},
		subnodes: {
			model: languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					parameters: { model: { __rl: true, mode: 'id', value: 'gpt-4o-mini' }, options: {} },
				},
			}),
		},
		executeOnce: true,
	},
});

const code3 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 3',
		parameters: {
			jsCode: `// From: Code 2\nconst startTime = $('Code 2').all().map(i => i.json);\nconst processingTime = Date.now() - startTime;\nreturn [{ json: { processingTime } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const respond1 = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.1,
	config: {
		name: 'Respond 1',
		parameters: {
			respondWith: 'json',
			responseCode: 200,
			responseBody:
				'{"enriched_data":"={{ $json.aiResponse }}","metrics":{"provider":"={{ $json.provider }}","model":"={{ $json.model }}","processing_time_ms":"={{ $json.processingTime }}"}}',
			responseHeaders: {
				'Content-Type': 'application/json',
			},
		},
		executeOnce: true,
	},
});

export default workflow('compiled', 'Compiled Workflow').add(
	t0
		.to(code1)
		.to(code2)
		.to(code2)
		.to(code2)
		.to(if2)
		.to(if1)
		.to(code2)
		.to(ai1)
		.to(code3)
		.to(respond1),
);
