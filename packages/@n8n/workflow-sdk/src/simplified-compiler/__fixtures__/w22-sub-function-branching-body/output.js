// --- Sub-workflow: classify ---
const fn_classify_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_classify_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.com/urgent",
    "parameters": {
      "method": "POST",
      "url": "https://api.com/urgent",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"priority\":\"={{ $('When Executed by Another Workflow').first().json.priority }}\"}"
    },
    "executeOnce": true
  }
});

const fn_classify_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.com/normal",
    "parameters": {
      "method": "POST",
      "url": "https://api.com/normal",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"priority\":\"={{ $('When Executed by Another Workflow').first().json.priority }}\"}"
    },
    "executeOnce": true
  }
});

const fn_classify_if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('When Executed by Another Workflow').first().json.priority }}","rightValue":"high","operator":{"type":"string","operation":"equals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(fn_classify_http1)
  .onFalse(fn_classify_http2);

const classifyWorkflow = workflow('classify', 'classify')
  .add(fn_classify_t0.to(fn_classify_if1));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.com/item",
    "parameters": {
      "method": "GET",
      "url": "https://api.com/item",
      "options": {}
    },
    "executeOnce": true
  }
});

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set classify params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "priority",
            "type": "string",
            "value": "={{ $('GET api.com/item').first().json.priority }}"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'classify',
    parameters: {
      source: 'parameter',
      workflowJson: classifyWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(set1).to(exec1));