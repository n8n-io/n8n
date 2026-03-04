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
      "jsonBody": "{\"command\":\"echo \\\"true\\\" > n8n/check_update.txt\"}"
    },
    "executeOnce": true
  }
});

const http4 = node({
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
      "jsonBody": "{\"command\":\"echo \\\"false\\\" > n8n/check_update.txt\"}"
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('GET registry.npmjs.org/n8n/latest').item.json.version }}","rightValue":"={{ $('GET 0.0.0.0/rest/settings').item.json.data.versionCli }}","operator":{"type":"string","operation":"notEquals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http3)
  .onFalse(http4);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(http2).to(if1));