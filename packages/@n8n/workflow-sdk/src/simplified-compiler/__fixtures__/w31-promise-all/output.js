const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/dashboard"}, pinData: [{"body":{"userId":"user-123"}}] } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json.body;\nconst userId = body.userId;\nreturn [{ json: { userId } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/users",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/users",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect users',
    parameters: {
      jsCode: `// @aggregate: users\nconst _raw = $('GET api.example.com/users').all().map(i => i.json);\nconst users = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { users } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/orders",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/orders",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect orders 2',
    parameters: {
      jsCode: `// @aggregate: orders\nconst _raw = $('GET api.example.com/orders').all().map(i => i.json);\nconst orders = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { orders } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const merge1 = node({
  type: 'n8n-nodes-base.merge', version: 3.2,
  config: {
    name: 'Merge parallel 1',
    parameters: {
      mode: 'append',
      numberInputs: 2
    }
  }
});

const collect1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect parallel 1',
    parameters: {
      jsCode: `// @parallel-collect: users, orders\nconst users = $('Collect users').first().json.users;\nconst orders = $('Collect orders 2').first().json.orders;\nreturn [{ json: { users, orders } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/dashboard",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/dashboard",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"userCount\": $('Collect parallel 1').first().json.users.length, \"orderCount\": $('Collect parallel 1').first().json.orders.length, \"requestedBy\": $('Code 1').first().json.userId } }}"
    },
    "executeOnce": true
  }
});

code1.to(http1);
http1.to(agg1);
agg1.to(merge1.input(0));
code1.to(http2);
http2.to(agg2);
agg2.to(merge1.input(1));
merge1.to(collect1);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1))
  .add(collect1.to(http3));
