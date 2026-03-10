// --- Sub-workflow: processOrder ---
const fn_processOrder_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { name: 'When Executed by Another Workflow', parameters: { inputSource: 'passthrough' } } });

const fn_processOrder_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET Request",
    "parameters": {
      "method": "GET",
      "url": "={{ 'https://api.com/orders/' + $('When Executed by Another Workflow').first().json.orderId }}",
      "options": {}
    },
    "executeOnce": true
  }
});

const fn_processOrder_agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect enriched',
    parameters: {
      jsCode: `// @aggregate: enriched\nconst _raw = $('GET Request').all().map(i => i.json);\nconst enriched = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { enriched } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
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
      "jsonBody": "={{ $('Collect enriched').first().json.enriched }}"
    },
    "executeOnce": true
  }
});

const processOrderWorkflow = workflow('processOrder', 'processOrder')
  .add(fn_processOrder_t0.to(fn_processOrder_http1).to(fn_processOrder_agg1).to(fn_processOrder_http2));

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
            "value": "={{ $('Webhook').first().json.body.id }}"
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
    "executeOnce": true
  }
});

const agg5 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect orders 5',
    parameters: {
      jsCode: `// @aggregate: orders\nconst _raw = $('GET api.com/pending').all().map(i => i.json);\nconst orders = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { orders } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
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
            "value": "={{ $('Collect orders 5').first().json.orders.orderId }}"
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
  .add(t4.to(http5).to(agg5).to(set5).to(exec5));
