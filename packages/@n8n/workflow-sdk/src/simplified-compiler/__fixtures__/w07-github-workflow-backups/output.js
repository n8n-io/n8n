const t0 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } } },
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST slack.com/api/chat.postMessage',
		parameters: {
			method: 'POST',
			url: 'https://slack.com/api/chat.postMessage',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"channel":"#notifications","text":"Starting Workflow Backup..."}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'Slack', id: '' } },
	},
});

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 1',
		parameters: {
			jsCode: `const config = { owner: 'myuser', repo: 'n8n-workflows', path: 'workflows' };\nreturn [{ json: { config } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const http2 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'GET localhost/api/v1/workflows',
		parameters: {
			method: 'GET',
			url: 'http://localhost:5678/api/v1/workflows',
			options: {},
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'n8n API', id: '' } },
	},
});

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `// From: GET localhost/api/v1/workflows\nconst workflows = $('GET localhost/api/v1/workflows').all().map(i => i.json);\nconst recent = workflows.filter(function(w) {
    return new Date(w.updatedAt) >= new Date(Date.now() - 86400000);
  });\nreturn [{ json: { recent } }];`,
			mode: 'runOnceForAllItems',
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
			jsCode: `// From: Code 1\nconst config = $('Code 1').all().map(i => i.json);\nconst workflows = $('GET localhost/api/v1/workflows').all().map(i => i.json);\nconst filePath = config.path + '/' + wf.name + '.json';
function sortKeys(obj) {
      return Object.keys(obj).sort().reduce(function(acc, k) { acc[k] = obj[k]; return acc; }, {});
    }
const wfJson = JSON.stringify(sortKeys(wf), null, 2);
let existing = null;
existing = await http.get(
        'https://api.github.com/repos/myuser/n8n-workflows/contents/' + filePath,
        { auth: { type: 'bearer', credential: 'GitHub' } }
      );\nreturn [{ json: { filePath, wfJson, existing } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const http3 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'PUT Request',
		parameters: {
			method: 'PUT',
			url: '{{dynamic URL}}',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"message":"new","content":"={{ $json.wfJson }}"}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'GitHub', id: '' } },
	},
});

const http3 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'PUT Request',
		parameters: {
			method: 'PUT',
			url: '{{dynamic URL}}',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"message":"updated","content":"={{ $json.wfJson }}","sha":"={{$json}}"}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'GitHub', id: '' } },
	},
});

const if2 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 2',
		parameters: { conditions: { options: { leftValue: 'wfJson !== existing.content' } } },
		executeOnce: true,
	},
}).onTrue(http3);

const if1 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 1',
		parameters: { conditions: { options: { leftValue: '!existing' } } },
		executeOnce: true,
	},
})
	.onTrue(http3)
	.onFalse(http3.to(if2));

const sib1 = splitInBatches({
	version: 3,
	config: { name: 'Loop 1', parameters: { batchSize: 1 }, executeOnce: true },
}).to(code3.to(http3).to(http3).to(if2).to(if1));

const http3 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST slack.com/api/chat.postMessage',
		parameters: {
			method: 'POST',
			url: 'https://slack.com/api/chat.postMessage',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"channel":"#notifications","text":"Backup completed."}',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		},
		executeOnce: true,
		credentials: { httpHeaderAuth: { name: 'Slack', id: '' } },
	},
});

export default workflow('compiled', 'Compiled Workflow').add(
	t0
		.to(http1)
		.to(code1)
		.to(http2)
		.to(code2)
		.to(code3)
		.to(http3)
		.to(http3)
		.to(if2)
		.to(if1)
		.to(sib1)
		.to(http3),
);
