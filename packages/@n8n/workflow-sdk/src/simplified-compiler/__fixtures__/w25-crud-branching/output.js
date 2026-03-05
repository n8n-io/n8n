const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"cronExpression","expression":"0 9 * * 1"}]}} } });

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set reportTag",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "reportTag",
            "type": "string",
            "value": "weekly-check"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST jsonplaceholder.typicode.com/posts",
    "parameters": {
      "method": "POST",
      "url": "https://jsonplaceholder.typicode.com/posts",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"Test Post\",\"body\":\"auto-generated\",\"userId\":1}"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET Request",
    "parameters": {
      "method": "GET",
      "url": "{{dynamic URL}}",
      "options": {}
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PUT Request",
    "parameters": {
      "method": "PUT",
      "url": "{{dynamic URL}}",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"Updated Post\",\"body\":\"={{ $('GET Request').first().json.body }}\",\"userId\":1}"
    },
    "executeOnce": true
  }
});

const http4 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "PATCH Request",
    "parameters": {
      "method": "PATCH",
      "url": "{{dynamic URL}}",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"Final Post\"}"
    },
    "executeOnce": true
  }
});

const http5 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "DELETE Request",
    "parameters": {
      "method": "DELETE",
      "url": "{{dynamic URL}}",
      "options": {}
    },
    "executeOnce": true
  }
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `let backup = null;\nreturn [{ json: { backup } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http6 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET jsonplaceholder.typicode.com/posts/1",
    "parameters": {
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/posts/1",
      "options": {}
    },
    "executeOnce": true,
    "onError": "continueErrorOutput"
  }
});

const http7 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"error\":\"fetch failed\"}"
    },
    "executeOnce": true
  }
});

const http8 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"={{ $('GET jsonplaceholder.typicode.com/posts/1').first().json.title }}\",\"status\":\"ok\"}"
    },
    "executeOnce": true
  }
});

const http9 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"skipped\"}"
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('GET jsonplaceholder.typicode.com/posts/1').first().json }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http8)
  .onFalse(http9);

const http10 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET jsonplaceholder.typicode.com/todos/1",
    "parameters": {
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/todos/1",
      "options": {}
    },
    "executeOnce": true
  }
});

const http11 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"done\",\"title\":\"={{ $('GET jsonplaceholder.typicode.com/todos/1').first().json.title }}\"}"
    },
    "executeOnce": true
  }
});

const http12 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"pending\",\"title\":\"={{ $('GET jsonplaceholder.typicode.com/todos/1').first().json.title }}\"}"
    },
    "executeOnce": true
  }
});

const http13 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"status\":\"unknown\"}"
    },
    "executeOnce": true
  }
});

const sw1 = switchCase({ version: 3.2, config: { name: 'Switch 1', parameters: { mode: 'rules', rules: {"values":[{"conditions":{"conditions":[{"leftValue":"={{ $('GET jsonplaceholder.typicode.com/todos/1').first().json.completed }}","rightValue":"true","operator":{"type":"boolean","operation":"equals"}}],"combinator":"and"}},{"conditions":{"conditions":[{"leftValue":"={{ $('GET jsonplaceholder.typicode.com/todos/1').first().json.completed }}","rightValue":"false","operator":{"type":"boolean","operation":"equals"}}],"combinator":"and"}}]}, options: {"fallbackOutput":"extra"} }, executeOnce: true } })
  .onCase(0, http11)
  .onCase(1, http12)
  .onCase(2, http13);

const http14 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST httpbin.org/post",
    "parameters": {
      "method": "POST",
      "url": "https://httpbin.org/post",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"reportTag\":\"={{ $('Set reportTag').first().json.reportTag }}\",\"result\":\"complete\"}"
    },
    "executeOnce": true
  }
});

http6.onError(http7);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(set1).to(http1).to(http2).to(http3).to(http4).to(http5).to(code1).to(http6).to(if1).to(http10).to(sw1).to(http14));
