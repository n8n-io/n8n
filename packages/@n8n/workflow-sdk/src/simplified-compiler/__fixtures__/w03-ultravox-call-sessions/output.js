const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/call-session","responseMode":"responseNode"}, pinData: [{"body":{"callerId":"+15551234567","department":"support"}}] } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.ultravox.ai/api/calls",
    "parameters": {
      "method": "POST",
      "url": "https://api.ultravox.ai/api/calls",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"voice\":\"c2c5cce4-72ec-4d8b-8cdb-f8a0f6610bd1\",\"medium\":{\"plivo\":{}},\"systemPrompt\":\"You are a voice assistant for the clinic...\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true,
    "pinData": [
      {
        "callId": "call_abc123",
        "joinUrl": "wss://voice.ultravox.ai/session/abc123",
        "status": "created"
      }
    ]
  , credentials: { httpHeaderAuth: { name: 'UltraVox API', id: '' } }
}
});

const respond1 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 1",
    "parameters": {
      "respondWith": "json",
      "responseBody": "<Response><Stream keepCallAlive=\"true\">joinUrl</Stream></Response>",
      "options": {
        "responseCode": 200,
        "responseHeaders": {
          "entries": [
            {
              "name": "Content-Type",
              "value": "text/xml"
            }
          ]
        }
      }
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(respond1));