// --- Sub-workflow: processOrder ---
const fn_processOrder_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' } } });

const fn_processOrder_http1 = node({
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

const fn_processOrder_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.com/crm",
    "parameters": {
      "method": "POST",
      "url": "https://api.com/crm",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ $('GET Request').first().json }}"
    },
    "executeOnce": true
  }
});

const processOrderWorkflow = workflow('processOrder', 'processOrder')
  .add(fn_processOrder_t0.to(fn_processOrder_http1).to(fn_processOrder_http2));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/orders"}, pinData: [{"body":{"id":"ORD-123","product":"Widget Pro","quantity":5}}] } });

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set processOrder params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "orderId",
            "type": "string",
            "value": "={{ $('Start').first().json.id }}"
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
    name: 'processOrder',
    parameters: {
      source: 'parameter',
      workflowJson: processOrderWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST notify.com/done",
    "parameters": {
      "method": "POST",
      "url": "https://notify.com/done",
      "options": {}
    },
    "executeOnce": true
  }
});

const t4 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":1}]}} } });

const http5 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.com/pending",
    "parameters": {
      "method": "GET",
      "url": "https://api.com/pending",
      "options": {}
    },
    "executeOnce": true,
    "pinData": [
      {
        "orderId": "ORD-456",
        "status": "pending"
      }
    ]
  }
});

const set5 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set processOrder params",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "orderId",
            "type": "string",
            "value": "={{ $('GET api.com/pending').first().json.orderId }}"
          }
        ]
      }
    },
    "executeOnce": true
  }
});

const exec5 = node({
  type: 'n8n-nodes-base.executeWorkflow', version: 1.3,
  config: {
    name: 'processOrder',
    parameters: {
      source: 'parameter',
      workflowJson: processOrderWorkflow,
      options: {}
    },
    executeOnce: true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(set1).to(exec1).to(http1))
  .add(t4.to(http5).to(set5).to(exec5));