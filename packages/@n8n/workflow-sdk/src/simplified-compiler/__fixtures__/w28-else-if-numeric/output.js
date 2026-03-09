const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/grade"} } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json.body;\nconst score = body.score;\nreturn [{ json: { score } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/grades",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/grades",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"grade\":\"A\",\"score\":\"={{ $('Code 1').first().json.score }}\"}"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/grades",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/grades",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"grade\":\"B\",\"score\":\"={{ $('Code 1').first().json.score }}\"}"
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/grades",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/grades",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"grade\":\"F\",\"score\":\"={{ $('Code 1').first().json.score }}\"}"
    },
    "executeOnce": true
  }
});

const if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.score }}","rightValue":"70","operator":{"type":"number","operation":"gt"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http2)
  .onFalse(http3);

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.score }}","rightValue":"90","operator":{"type":"number","operation":"gt"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http1)
  .onFalse(if2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(if1));
