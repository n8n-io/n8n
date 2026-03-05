const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `const config = { endpoint: 'https://api.example.com' };

let data = null;\nreturn [{ json: { config, data } }];`,
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
    "executeOnce": true,
    "onError": "continueErrorOutput"
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST hooks.slack.com/error",
    "parameters": {
      "method": "POST",
      "url": "https://hooks.slack.com/error",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"msg\":\"fetch failed\"}"
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/process",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/process",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ $('GET api.example.com/users').first().json }}"
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('GET api.example.com/users').first().json }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http3);

http1.onError(http2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(http1).to(if1));