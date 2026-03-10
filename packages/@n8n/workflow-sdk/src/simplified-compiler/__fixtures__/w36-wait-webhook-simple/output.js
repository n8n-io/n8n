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
      "jsonBody": "{\"status\":\"pending\"}"
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

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect approval',
    parameters: {
      jsCode: `// @aggregate: approval\nconst _raw = $('Wait 1').all().map(i => i.json);\nconst approval = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { approval } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/complete",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/complete",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"decision\": $('Collect approval').first().json.approval.body.decision } }}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(wait1).to(agg1).to(http2));
