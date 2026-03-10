const t0 = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

const set1 = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: {
    "name": "Set cursor",
    "parameters": {
      "options": {},
      "assignments": {
        "assignments": [
          {
            "id": "assign_0",
            "name": "cursor",
            "type": "string",
            "value": "start"
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
    "name": "GET Request",
    "parameters": {
      "method": "GET",
      "url": "={{ 'https://api.example.com/data?cursor=' + $('Set cursor').first().json.cursor }}",
      "options": {}
    },
    "executeOnce": true
  }
});

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect page',
    parameters: {
      jsCode: `// @aggregate: page\nconst _raw = $('GET Request').all().map(i => i.json);\nconst page = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { page } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Set cursor\nconst cursor = $('Set cursor').all().map(i => i.json);\nconst page = $('Collect page').first().json.page;\ncursor = page.nextCursor;\nreturn [{ json: {} }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const while1 = ifElse({ version: 2.2, config: { name: 'While 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Set cursor').first().json.cursor }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http1.to(agg1).to(code1));

code1.to(while1);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(set1).to(while1));
