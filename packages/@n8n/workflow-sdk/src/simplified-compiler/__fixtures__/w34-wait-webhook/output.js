const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/start",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/start",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"callbackUrl\":\"={{ $execution.resumeUrl }}\"}"
    },
    "executeOnce": true
  }
});

const wait1 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 1",
    "parameters": {
      "resume": "webhook"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/done",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/done",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"completed\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(wait1).to(http2));
