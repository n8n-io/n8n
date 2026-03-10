const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/start",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/start",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect data',
    parameters: {
      jsCode: `// @aggregate: data\nconst _raw = $('GET api.example.com/start').all().map(i => i.json);\nconst data = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { data } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const wait1 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 1",
    "parameters": {
      "resume": "timeInterval",
      "amount": 5,
      "unit": "seconds"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/check",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/check",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect result 2',
    parameters: {
      jsCode: `// @aggregate: result\nconst _raw = $('GET api.example.com/check').all().map(i => i.json);\nconst result = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { result } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const wait2 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 2",
    "parameters": {
      "resume": "timeInterval",
      "amount": 2,
      "unit": "minutes"
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/finish",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/finish",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"done\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(agg1).to(wait1).to(http2).to(agg2).to(wait2).to(http3));
