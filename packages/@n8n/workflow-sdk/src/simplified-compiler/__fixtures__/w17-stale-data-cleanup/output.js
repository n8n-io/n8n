const t0 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: {
		parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 2 * * *' }] } },
	},
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'GET api.app.com/items',
		parameters: {
			method: 'GET',
			url: 'https://api.app.com/items?status=stale',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBasicAuth',
		},
		executeOnce: true,
		credentials: { httpBasicAuth: { name: 'App API', id: '' } },
	},
});

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Split items',
		parameters: {
			jsCode: `const items = $('GET api.app.com/items').all().map(i => i.json);
return items.map(item => ({ json: item }));`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const http2 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'DELETE api.app.com/items/remove',
		parameters: {
			method: 'DELETE',
			url: 'https://api.app.com/items/remove',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBasicAuth',
		},
		credentials: { httpBasicAuth: { name: 'App API', id: '' } },
	},
});

export default workflow('compiled', 'Compiled Workflow').add(t0.to(http1).to(code1).to(http2));
