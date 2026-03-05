// --- Sub-workflow: enrichUser ---
const fn_enrichUser_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_enrichUser_http1 = node({
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

const fn_enrichUser_http2 = node({
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

const fn_enrichUser_http3 = node({
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
      "jsonBody": "{\"name\":\"={{ $('GET Request').first().json.name }}\",\"email\":\"={{ $('GET Request').first().json.email }}\",\"postCount\":\"={{ $('GET Request').first().json.length }}\"}"
    },
    "executeOnce": true
  }
});

const enrichUserWorkflow = workflow('enrichUser', 'enrichUser')
  .add(fn_enrichUser_t0.to(fn_enrichUser_http1).to(fn_enrichUser_http2).to(fn_enrichUser_http3));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":6}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET jsonplaceholder.typicode.com/todos",
    "parameters": {
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/todos",
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
      jsCode: `// From: GET jsonplaceholder.typicode.com/todos\nconst todos = $('GET jsonplaceholder.typicode.com/todos').all().map(i => i.json);\nconst pending = todos.filter((t) => !t.completed && t.id <= 10);\nreturn [{ json: { pending } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split tasks',
    parameters: {
      jsCode: `const pending = $('Code 1').all().map(i => i.json);
return pending.map(task => ({ json: task }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set enrichUser params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "userId",
            "type": "string",
            "value": "={{ $('Split tasks').first().json.userId }}"
          }
        ]
      }
    }
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'enrichUser',
    parameters: {
      source: 'parameter',
      workflowJson: enrichUserWorkflow,
      options: {}
    }
  }
});

const http2 = node({
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
      "jsonBody": "{\"processed\":\"={{ $('Code 1').first().json.pending.length }}\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(code2).to(set1).to(exec1).to(http2));
