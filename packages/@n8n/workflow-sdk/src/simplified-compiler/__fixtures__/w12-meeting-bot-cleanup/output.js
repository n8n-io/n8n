const t0 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: { parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] } } },
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'GET www.googleapis.com/calendar/v3/ca...',
		parameters: {
			method: 'GET',
			url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'oAuth2Api',
		},
		executeOnce: true,
		credentials: { oAuth2Api: { name: 'Google Calendar', id: '' } },
	},
});

const http2 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST gateway.vexa.ai/bots',
		parameters: {
			method: 'POST',
			url: 'https://gateway.vexa.ai/bots',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"platform":"google_meet","native_meeting_id":"meeting123"}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'Vexa API', id: '' } },
	},
});

const if1 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 1',
		parameters: { conditions: { options: { leftValue: "event.status === 'confirmed'" } } },
		executeOnce: true,
	},
}).onTrue(http2);

const http3 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'DELETE gateway.vexa.ai/bots/meeting123',
		parameters: {
			method: 'DELETE',
			url: 'https://gateway.vexa.ai/bots/meeting123',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'Vexa API', id: '' } },
	},
});

const if2 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 2',
		parameters: { conditions: { options: { leftValue: "event.status === 'cancelled'" } } },
		executeOnce: true,
	},
}).onTrue(http3);

const sib1 = splitInBatches({
	version: 3,
	config: { name: 'Loop 1', parameters: { batchSize: 1 }, executeOnce: true },
}).to(if1.to(if2));

export default workflow('compiled', 'Compiled Workflow').add(t0.to(http1).to(sib1));
