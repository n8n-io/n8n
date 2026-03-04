const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/telegram-bot"} } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Start\nconst body = $('Start').all().map(i => i.json);\nconst msg = body;\nreturn [{ json: { msg } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.telegram.org/bot/sendMessage",
    "parameters": {
      "method": "POST",
      "url": "https://api.telegram.org/bot/sendMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"chat_id\":\"={{$json}}\",\"text\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.telegram.org/bot/getFile",
    "parameters": {
      "method": "GET",
      "url": "https://api.telegram.org/bot/getFile",
      "options": {}
    },
    "executeOnce": true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.openai.com/v1/audio/transcri...",
    "parameters": {
      "method": "POST",
      "url": "https://api.openai.com/v1/audio/transcriptions",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"file\":\"={{$json}}\",\"model\":\"whisper-1\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'OpenAI API', id: '' } }
}
});

const http4 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.telegram.org/bot/sendMessage",
    "parameters": {
      "method": "POST",
      "url": "https://api.telegram.org/bot/sendMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"chat_id\":\"={{$json}}\",\"text\":\"={{$json}}\"}"
    },
    "executeOnce": true
  }
});

const if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('Code 1').item.json.msg.message.voice }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http2.to(http3).to(http4));

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('Code 1').item.json.msg.message.text }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http1)
  .onFalse(if2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(if1));