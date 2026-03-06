const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/telegram-bot"}, pinData: [{"body":{"message":{"chat":{"id":123456},"text":"Hello bot","voice":null}}}] } });

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json;\nconst msg = body;\nreturn [{ json: { msg } }];`,
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
      "jsonBody": "{\"chat_id\":\"={{ $('Code 1').first().json.msg.message.chat.id }}\",\"text\":\"={{ $('Code 1').first().json.msg.message.text }}\"}"
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

const agg1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect file',
    parameters: {
      jsCode: `// @aggregate: file\nconst _raw = $('GET api.telegram.org/bot/getFile').all().map(i => i.json);\nconst file = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { file } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
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
      "jsonBody": "{\"file\":\"={{ $('Collect file').first().json.file.result.file_path }}\",\"model\":\"whisper-1\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth"
    },
    "executeOnce": true
  , credentials: { httpHeaderAuth: { name: 'OpenAI API', id: '' } }
}
});

const agg2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Collect transcription 2',
    parameters: {
      jsCode: `// @aggregate: transcription\nconst _raw = $('POST api.openai.com/v1/audio/transcri...').all().map(i => i.json);\nconst transcription = _raw.length === 1 ? _raw[0] : _raw;\nreturn [{ json: { transcription } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
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
      "jsonBody": "{\"chat_id\":\"={{ $('Code 1').first().json.msg.message.chat.id }}\",\"text\":\"={{ $('Collect transcription 2').first().json.transcription.text }}\"}"
    },
    "executeOnce": true
  }
});

const if2 = ifElse({ version: 2.2, config: { name: 'IF 2', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.msg.message.voice }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http2.to(agg1).to(http3).to(agg2).to(http4));

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.msg.message.text }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http1)
  .onFalse(if2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(code1).to(if1));
