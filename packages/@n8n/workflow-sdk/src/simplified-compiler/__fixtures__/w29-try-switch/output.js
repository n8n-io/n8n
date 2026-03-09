// --- Try/catch sub-workflow ---
const tc_tryCatch_1_t0 = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { name: 'When Executed by Another Workflow', parameters: { inputSource: 'passthrough' } } });

const tc_tryCatch_1_http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/data",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/data",
      "options": {}
    },
    "executeOnce": true
  }
});

const tc_tryCatch_1_agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect data',
    parameters: {
      jsCode: `// @aggregate: data\nconst _raw = $('GET api.example.com/data').all().map(i => i.json);\nconst data = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { data } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const tc_tryCatch_1_http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/email",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/email",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"to\": $('Collect data').first().json.data.recipient } }}"
    },
    "executeOnce": true
  }
});

const tc_tryCatch_1_http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/sms",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/sms",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "={{ { \"phone\": $('Collect data').first().json.data.phone } }}"
    },
    "executeOnce": true
  }
});

const tc_tryCatch_1_http4 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.example.com/log",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/log",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"message\":\"Unknown type\"}"
    },
    "executeOnce": true
  }
});

const tc_tryCatch_1_sw1 = switchCase({ version: 3.2, config: { name: 'Switch 1', parameters: { mode: 'rules', rules: {"values":[{"conditions":{"conditions":[{"leftValue":"={{ $('Collect data').first().json.data.type }}","rightValue":"email","operator":{"type":"string","operation":"equals"}}],"combinator":"and"}},{"conditions":{"conditions":[{"leftValue":"={{ $('Collect data').first().json.data.type }}","rightValue":"sms","operator":{"type":"string","operation":"equals"}}],"combinator":"and"}}]}, options: {"fallbackOutput":"extra"} }, executeOnce: true } })
  .onCase(0, tc_tryCatch_1_http2)
  .onCase(1, tc_tryCatch_1_http3)
  .onCase(2, tc_tryCatch_1_http4);

const __tryCatch_1Workflow = workflow('__tryCatch_1', '__tryCatch_1')
  .add(tc_tryCatch_1_t0.to(tc_tryCatch_1_http1).to(tc_tryCatch_1_agg1).to(tc_tryCatch_1_sw1));

// --- Main workflow ---
const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/process"} } });

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
    "name": "POST api.example.com/errors",
    "parameters": {
      "method": "POST",
      "url": "https://api.example.com/errors",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"error\":\"Processing failed\"}"
    },
    "executeOnce": true
  }
});

exec1.onError(http1);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(exec1));
