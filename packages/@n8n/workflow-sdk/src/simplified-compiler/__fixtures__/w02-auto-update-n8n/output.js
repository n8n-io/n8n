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
      "jsonBody": "{\"latestVersion\":\"={{ $('GET registry.npmjs.org/n8n/latest').first().json.version }}\",\"currentVersion\":\"={{ $('GET 0.0.0.0/rest/settings').first().json.data.versionCli }}\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(http2).to(http3));
