const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `let status;\nreturn [{ json: { status } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.example.com/health",
    "parameters": {
      "method": "GET",
      "url": "https://api.example.com/health",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect status',
    parameters: {
      jsCode: `// @aggregate: status\nconst _raw = $('GET api.example.com/health').all().map(i => i.json);\nconst status = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { status } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const while1 = ifElse({ version: 2.2, config: { name: 'While 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Collect status').first().json.status.statusCode }}","rightValue":"200","operator":{"type":"number","operation":"notEquals"}}],"combinator":"and"} }, executeOnce: true } });

while1.to(http1, 0);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(http1).to(agg1).to(while1));
