// --- Loop body sub-workflow ---
const loop_user_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const loop_user_set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set __tryCatch_1 params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "user",
            "type": "string",
            "value": "={{ $('When Executed by Another Workflow').first().json }}"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const loop_user_exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
      "name": "__tryCatch_1",
      "parameters": {
        "source": "parameter",
        "workflowJson": __tryCatch_1Workflow,
        "options": {}
      },
      "onError": "continueErrorOutput",
      "executeOnce": true
    }
});

const loop_user_http1 = node({
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
      "jsonBody": "{\"error\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const _loop_userWorkflow = workflow('_loop_user', '_loop_user')
  .add(loop_user_t0.to(loop_user_set1).to(loop_user_exec1));

// --- Try/catch sub-workflow ---
const tc_tryCatch_1_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const tc_tryCatch_1_http1 = node({
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

const tc_tryCatch_1_http2 = node({
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
      "jsonBody": "{\"user\":\"={{ $('When Executed by Another Workflow').first().json.user.name }}\",\"postCount\":\"={{ $('GET Request').first().json.length }}\"}"
    },
    "executeOnce": true
  }
});

const __tryCatch_1Workflow = workflow('__tryCatch_1', '__tryCatch_1')
  .add(tc_tryCatch_1_t0.to(tc_tryCatch_1_http1).to(tc_tryCatch_1_http2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":1}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET jsonplaceholder.typicode.com/users",
    "parameters": {
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/users",
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
      jsCode: `// From: GET jsonplaceholder.typicode.com/users\nconst users = $('GET jsonplaceholder.typicode.com/users').all().map(i => i.json);\nconst active = users.filter(u => u.id <= 5);\nreturn [{ json: { active } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split users',
    parameters: {
      jsCode: `const active = $('Code 1').all().map(i => i.json);
return active.map(user => ({ json: user }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'Loop users',
    parameters: {
      source: 'parameter',
      workflowJson: _loop_userWorkflow,
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
      "jsonBody": "{\"summary\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(code2).to(exec1).to(http2));
