const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/moderate","responseMode":"responseNode"} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PATCH api.cms.com/posts/update",
    "parameters": {
      "method": "PATCH",
      "url": "https://api.cms.com/posts/update",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"published\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'CMS API', id: '' } }
}
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "DELETE api.cms.com/posts/remove",
    "parameters": {
      "method": "DELETE",
      "url": "https://api.cms.com/posts/remove",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'CMS API', id: '' } }
}
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.cms.com/escalations",
    "parameters": {
      "method": "POST",
      "url": "https://api.cms.com/escalations",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"postId\":\"post123\",\"reason\":\"needs review\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'CMS API', id: '' } }
}
});

const sw1 = switchCase({ version: 3.2, config: { name: 'Switch 1', parameters: { mode: 'rules', rules: {"values":[{"conditions":{"conditions":[{"leftValue":"={{ $('Start').first().json.action }}","rightValue":"approve","operator":{"type":"string","operation":"equals"}}],"combinator":"and"}},{"conditions":{"conditions":[{"leftValue":"={{ $('Start').first().json.action }}","rightValue":"reject","operator":{"type":"string","operation":"equals"}}],"combinator":"and"}},{"conditions":{"conditions":[{"leftValue":"={{ $('Start').first().json.action }}","rightValue":"escalate","operator":{"type":"string","operation":"equals"}}],"combinator":"and"}}]}, options: {} }, executeOnce: true } })
  .onCase(0, http1)
  .onCase(1, http2)
  .onCase(2, http3);

const respond1 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 1",
    "parameters": {
      "respondWith": "json",
      "responseCode": 200,
      "responseBody": "{\"processed\":true}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(sw1).to(respond1));