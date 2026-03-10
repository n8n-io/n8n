const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/process"} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/orders",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/orders",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"item\": $('Webhook').first().json.body.item, \"quantity\": $('Webhook').first().json.body.quantity } }}"
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect order',
    parameters: {
      jsCode: `// @aggregate: order\nconst _raw = $('POST api.example.com/orders').all().map(i => i.json);\nconst order = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { order } }];`,
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
      "resume": "specificTime",
      "dateTime": "2025-01-01T09:00:00Z"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/ship",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/ship",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"orderId\": $('Collect order').first().json.order.id } }}"
    },
    "executeOnce": true
  }
});

const wait2 = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: {
    "name": "Wait 2",
    "parameters": {
      "resume": "timeInterval",
      "amount": 1,
      "unit": "hours"
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/notify",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/notify",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"orderId\": $('Collect order').first().json.order.id, \"status\": \"shipped\" } }}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(agg1).to(wait1).to(http2).to(wait2).to(http3));
