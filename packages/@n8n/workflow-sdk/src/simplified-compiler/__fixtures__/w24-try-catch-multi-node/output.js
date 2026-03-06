// --- Try/catch sub-workflow ---
const tc_tryCatch_1_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const tc_tryCatch_1_http1 = node({
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

const tc_tryCatch_1_http2 = node({
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

const __tryCatch_1Workflow = workflow('__tryCatch_1', '__tryCatch_1')
  .add(tc_tryCatch_1_t0.to(tc_tryCatch_1_http1).to(tc_tryCatch_1_http2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const exec1 = node({
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

const http1 = node({
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
      "jsonBody": "{\"msg\":\"pipeline failed\"}"
    },
    "executeOnce": true
  }
});

exec1.onError(http1);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(exec1));