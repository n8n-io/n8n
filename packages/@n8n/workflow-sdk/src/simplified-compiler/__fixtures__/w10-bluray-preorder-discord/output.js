const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 1',
		parameters: {
			jsCode: `await checkBlurays();\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const t2 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: {
		parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 23 * * *' }] } },
	},
});

const code3 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 3',
		parameters: {
			jsCode: `await checkBlurays();\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

export default workflow('compiled', 'Compiled Workflow').add(t0.to(code1)).add(t2.to(code3));
