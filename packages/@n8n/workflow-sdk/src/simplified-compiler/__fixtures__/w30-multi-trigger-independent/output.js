const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/orders"} } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json.body;\nconst order = body;\nreturn [{ json: { order } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.warehouse.io/v1/fulfill",
    "parameters": {
      "method": "POST",
      "url": "https://api.warehouse.io/v1/fulfill",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"orderId\":\"={{ $('Code 1').first().json.order.id }}\",\"items\":\"={{ $('Code 1').first().json.order.items }}\"}"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST hooks.slack.com/services/T00/B00...",
    "parameters": {
      "method": "POST",
      "url": "https://hooks.slack.com/services/T00/B00/xxx",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"text\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const t4 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/returns"} } });

const code5 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 5',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json.body;\nconst ret = body;\nreturn [{ json: { ret } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http5 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.warehouse.io/v1/returns",
    "parameters": {
      "method": "POST",
      "url": "https://api.warehouse.io/v1/returns",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"orderId\":\"={{ $('Code 5').first().json.ret.orderId }}\",\"reason\":\"={{ $('Code 5').first().json.ret.reason }}\"}"
    },
    "executeOnce": true
  }
});

const http6 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST hooks.slack.com/services/T00/B00...",
    "parameters": {
      "method": "POST",
      "url": "https://hooks.slack.com/services/T00/B00/xxx",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"text\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const t8 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":1}]}} } });

const http9 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.warehouse.io/v1/inventory",
    "parameters": {
      "method": "GET",
      "url": "https://api.warehouse.io/v1/inventory",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg9 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect inventory 9',
    parameters: {
      jsCode: `// @aggregate: inventory\nconst _raw = $('GET api.warehouse.io/v1/inventory').all().map(i => i.json);\nconst inventory = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { inventory } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http10 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST hooks.slack.com/services/T00/B00...",
    "parameters": {
      "method": "POST",
      "url": "https://hooks.slack.com/services/T00/B00/xxx",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"text\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const if9 = ifElse({ version: 2.2, config: { name: 'IF 9', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Collect inventory 9').first().json.inventory.lowStockCount }}","rightValue":"0","operator":{"type":"number","operation":"gt"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http10);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(http1).to(http2))
  .add(t4.to(code5).to(http5).to(http6))
  .add(t8.to(http9).to(agg9).to(if9));
