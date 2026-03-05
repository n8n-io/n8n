// --- Sub-workflow: enrichData ---
const fn_enrichData_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_enrichData_http1 = node({
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

const enrichDataWorkflow = workflow('enrichData', 'enrichData')
  .add(fn_enrichData_t0.to(fn_enrichData_http1));

// --- Sub-workflow: processAndNotify ---
const fn_processAndNotify_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_processAndNotify_set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set enrichData params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "id",
            "type": "string",
            "value": "={{ $('When Executed by Another Workflow').first().json.itemId }}"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const fn_processAndNotify_exec1 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'enrichData',
    parameters: {
      source: 'parameter',
      workflowJson: enrichDataWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

const fn_processAndNotify_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST slack.com/notify",
    "parameters": {
      "method": "POST",
      "url": "https://slack.com/notify",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"data\":\"={{ $('enrichData').first().json }}\"}"
    },
    "executeOnce": true
  }
});

const processAndNotifyWorkflow = workflow('processAndNotify', 'processAndNotify')
  .add(fn_processAndNotify_t0.to(fn_processAndNotify_set1).to(fn_processAndNotify_exec1).to(fn_processAndNotify_http1));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { pinData: [{"triggered":true}] } });

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set processAndNotify params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "itemId",
            "type": "string",
            "value": "item1"
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
    name: 'processAndNotify',
    parameters: {
      source: 'parameter',
      workflowJson: processAndNotifyWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(set1).to(exec1));