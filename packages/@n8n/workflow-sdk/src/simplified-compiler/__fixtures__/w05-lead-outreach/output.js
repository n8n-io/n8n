const t0 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: { parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } },
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'GET sheets.googleapis.com/v4/spreadsh...',
		parameters: {
			method: 'GET',
			url: 'https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'oAuth2Api',
		},
		executeOnce: true,
		credentials: { oAuth2Api: { name: 'Google Sheets', id: '' } },
	},
});

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 1',
		parameters: {
			jsCode: `// From: GET sheets.googleapis.com/v4/spreadsh...\nconst leads = $('GET sheets.googleapis.com/v4/spreadsh...').all().map(i => i.json);\nconst newLeads = leads.values.filter(function (row) {
		return row[2] === 'New';
	});\nreturn [{ json: { newLeads } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const http2 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST gmail.googleapis.com/gmail/v1/us...',
		parameters: {
			method: 'POST',
			url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"to":"={{$json}}","subject":"Hello","body":"Your outreach message here..."}',
			authentication: 'genericCredentialType',
			genericAuthType: 'oAuth2Api',
		},
		executeOnce: true,
		credentials: { oAuth2Api: { name: 'Gmail', id: '' } },
	},
});

const http3 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'PUT sheets.googleapis.com/v4/spreadsh...',
		parameters: {
			method: 'PUT',
			url: 'https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"values":[null]}',
			authentication: 'genericCredentialType',
			genericAuthType: 'oAuth2Api',
		},
		executeOnce: true,
		credentials: { oAuth2Api: { name: 'Google Sheets', id: '' } },
	},
});

const sib1 = splitInBatches({
	version: 3,
	config: { name: 'Loop 1', parameters: { batchSize: 1 }, executeOnce: true },
}).to(http2.to(http3));

export default workflow('compiled', 'Compiled Workflow').add(
	t0.to(http1).to(code1).to(http2).to(http3).to(sib1),
);
