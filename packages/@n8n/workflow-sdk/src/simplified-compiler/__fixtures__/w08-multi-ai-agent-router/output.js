const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/ai-pipeline","responseMode":"responseNode"}, pinData: [{"body":{"data":"Quarterly revenue grew 15% YoY","priority":"balanced"}}] } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json;\nconst inputData = body.data;
const priority = body.priority || 'balanced';

const complexity = inputData.length < 500 ? 1 : inputData.length < 2000 ? 2 : 3;
let provider, model;\nreturn [{ json: { inputData, priority, complexity, provider } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 2',
    parameters: {
      jsCode: `// From: Code 1\nconst complexity = $('Code 1').all().map(i => i.json);\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'groq';
model = complexity <= 2 ? 'llama-3.1-8b-instant' : 'llama-3.1-70b-versatile';\nreturn [{ json: {} }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code3 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 3',
    parameters: {
      jsCode: `// From: Code 1\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'openai';
model = 'gpt-4o';\nreturn [{ json: {} }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const code4 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 4',
    parameters: {
      jsCode: `// From: Code 1\nconst provider = $('Code 1').all().map(i => i.json);\nprovider = 'anthropic';
model = 'claude-3-5-sonnet';\nreturn [{ json: {} }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.priority }}","rightValue":"performance","operator":{"type":"string","operation":"equals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(code3)
  .onFalse(code4);

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.priority }}","rightValue":"cost","operator":{"type":"string","operation":"equals"}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(code2)
  .onFalse(if2);

const code5 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 5',
    parameters: {
      jsCode: `const startTime = Date.now();
const prompt = 'Analyze and enrich this data';\nreturn [{ json: { startTime, prompt } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const ai1 = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI: Analyze and enrich this data',
    parameters: {
      promptType: 'define',
      text: 'Analyze and enrich this data',
      options: {}
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3,
        config: { parameters: {"model":{"__rl":true,"mode":"id","value":"gpt-4o"},"options":{}} }
      })
    },
    executeOnce: true,
    pinData: [{"output":"The data shows a 15% increase in user engagement over the past quarter, driven primarily by mobile traffic."}]
  }
});

const code6 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 6',
    parameters: {
      jsCode: `// From: Code 5\nconst startTime = $('Code 5').all().map(i => i.json);\nconst processingTime = Date.now() - startTime;\nreturn [{ json: { processingTime } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const respond1 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 1",
    "parameters": {
      "respondWith": "json",
      "responseBody": "{\"enriched_data\":\"={{ $('AI: Analyze and enrich this data').first().json }}\",\"metrics\":{\"provider\":\"={{ $('Code 1').first().json.provider }}\",\"model\":\"={{ $json.model }}\",\"processing_time_ms\":\"={{ $('Code 6').first().json.processingTime }}\"}}",
      "options": {
        "responseCode": 200,
        "responseHeaders": {
          "entries": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        }
      }
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(if1).to(code5).to(ai1).to(code6).to(respond1));