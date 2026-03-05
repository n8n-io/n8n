// --- Loop body sub-workflow ---
const loop_wf_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const loop_wf_code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Code 1\nconst config = $('Code 1').all().map(i => i.json);\nconst wf = $('When Executed by Another Workflow').all().map(i => i.json);\nconst filePath = config.path + '/' + wf.name + '.json';

function sortKeys(obj) {
	return Object.keys(obj)
		.sort()
		.reduce(function (acc, k) {
			acc[k] = obj[k];
			return acc;
		}, {});
}

const wfJson = JSON.stringify(sortKeys(wf), null, 2);

let existing = null;\nreturn [{ json: { filePath, wfJson, existing } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const loop_wf_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET Request",
    "parameters": {
      "method": "GET",
      "url": "{{dynamic URL}}",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true,
    "onError": "continueErrorOutput"
  , credentials: { httpHeaderAuth: { name: 'GitHub', id: '' } }
}
});

const loop_wf_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PUT Request",
    "parameters": {
      "method": "PUT",
      "url": "{{dynamic URL}}",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"message\":\"new\",\"content\":\"={{ $('Code 1').first().json.wfJson }}\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'GitHub', id: '' } }
}
});

const loop_wf_http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PUT Request",
    "parameters": {
      "method": "PUT",
      "url": "{{dynamic URL}}",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"message\":\"updated\",\"content\":\"={{ $('Code 1').first().json.wfJson }}\",\"sha\":\"={{ $('GET Request').first().json.sha }}\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'GitHub', id: '' } }
}
});

const loop_wf_if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.wfJson }}","rightValue":"={{ $('GET Request').first().json.content }}","operator":{"type":"string","operation":"notEquals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(loop_wf_http3);

const loop_wf_if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('GET Request').first().json }}","rightValue":"","operator":{"type":"string","operation":"notExists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(loop_wf_http2)
  .onFalse(loop_wf_if2);

const _loop_wfWorkflow = workflow('_loop_wf', '_loop_wf')
  .add(loop_wf_t0.to(loop_wf_code1).to(loop_wf_http1).to(loop_wf_if1));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":24}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST slack.com/api/chat.postMessage",
    "parameters": {
      "method": "POST",
      "url": "https://slack.com/api/chat.postMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"channel\":\"#notifications\",\"text\":\"Starting Workflow Backup...\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Slack', id: '' } }
}
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `const config = { owner: 'myuser', repo: 'n8n-workflows', path: 'workflows' };\nreturn [{ json: { config } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET localhost/api/v1/workflows",
    "parameters": {
      "method": "GET",
      "url": "http://localhost:5678/api/v1/workflows",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true,
    "pinData": [
      {
        "id": 1,
        "name": "Daily Report",
        "updatedAt": "2024-01-15T10:00:00Z",
        "nodes": []
      },
      {
        "id": 2,
        "name": "Lead Sync",
        "updatedAt": "2024-01-14T08:00:00Z",
        "nodes": []
      }
    ]
  , credentials: { httpHeaderAuth: { name: 'n8n API', id: '' } }
}
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 2',
    parameters: {
      jsCode: `// From: GET localhost/api/v1/workflows\nconst workflows = $('GET localhost/api/v1/workflows').all().map(i => i.json);\nconst recent = workflows.filter(function (w) {
	return new Date(w.updatedAt) >= new Date(Date.now() - 86400000);
});\nreturn [{ json: { recent } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code3 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split wfs',
    parameters: {
      jsCode: `const recent = $('Code 2').all().map(i => i.json);
return recent.map(wf => ({ json: wf }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'Loop wfs',
    parameters: {
      source: 'parameter',
      workflowJson: _loop_wfWorkflow,
      options: {}
    }
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST slack.com/api/chat.postMessage",
    "parameters": {
      "method": "POST",
      "url": "https://slack.com/api/chat.postMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"channel\":\"#notifications\",\"text\":\"Backup completed.\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'Slack', id: '' } }
}
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(http2).to(code2).to(code3).to(exec1).to(http3));