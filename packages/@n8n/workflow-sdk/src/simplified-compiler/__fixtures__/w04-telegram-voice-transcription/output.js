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
      "jsonBody": "{\"chat_id\":\"={{ $json.msg.message.chat.id }}\",\"text\":\"={{ $json.msg.message.text }}\"}"
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
  },
  metadata: { varName: 'file' }
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
      "jsonBody": "{\"file\":\"={{ $json.file.result.file_path }}\",\"model\":\"whisper-1\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'OpenAI API', id: '' } }
},
  metadata: { varName: 'transcription' }
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
      "jsonBody": "{\"chat_id\":\"={{ $json.msg.message.chat.id }}\",\"text\":\"={{ $json.transcription.text }}\"}"
    },
    "executeOnce": true
  }
});

const if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('Code 1').first().json.msg.message.voice }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http2.to(http3).to(http4));

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('Code 1').first().json.msg.message.text }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http1)
  .onFalse(if2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(if1));