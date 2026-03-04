const t0 = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2,
	config: {
		parameters: { httpMethod: 'POST', path: '/call-session', responseMode: 'responseNode' },
	},
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST api.ultravox.ai/api/calls',
		parameters: {
			method: 'POST',
			url: 'https://api.ultravox.ai/api/calls',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody:
				'{"voice":"c2c5cce4-72ec-4d8b-8cdb-f8a0f6610bd1","medium":{"plivo":{}},"systemPrompt":"You are a voice assistant for the clinic..."}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'UltraVox API', id: '' } },
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
			responseBody: '<Response><Stream keepCallAlive="true">joinUrl</Stream></Response>',
			responseHeaders: {
				'Content-Type': 'text/xml',
			},
		},
		executeOnce: true,
	},
});

export default workflow('compiled', 'Compiled Workflow').add(t0.to(http1).to(respond1));
