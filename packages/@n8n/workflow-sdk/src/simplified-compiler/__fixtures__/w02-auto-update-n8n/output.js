const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 5 * * *"}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET registry.npmjs.org/n8n/latest",
    "parameters": {
      "method": "GET",
      "url": "https://registry.npmjs.org/n8n/latest",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect latest',
    parameters: {
      jsCode: `// @aggregate: latest\nconst _raw = $('GET registry.npmjs.org/n8n/latest').all().map(i => i.json);\nconst latest = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { latest } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET 0.0.0.0/rest/settings",
    "parameters": {
      "method": "GET",
      "url": "http://0.0.0.0:5678/rest/settings",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'n8n API', id: '' } }
}
});

const agg2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect local 2',
    parameters: {
      jsCode: `// @aggregate: local\nconst _raw = $('GET 0.0.0.0/rest/settings').all().map(i => i.json);\nconst local = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { local } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST my-server/api/exec",
    "parameters": {
      "method": "POST",
      "url": "https://my-server/api/exec",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"latestVersion\": $('Collect latest').first().json.latest.version, \"currentVersion\": $('Collect local 2').first().json.local.data.versionCli } }}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(agg1).to(http2).to(agg2).to(http3));
