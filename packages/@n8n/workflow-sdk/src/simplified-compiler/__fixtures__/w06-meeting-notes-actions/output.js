const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/google-meet-automation","responseMode":"responseNode"} } });

const respond1 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 1",
    "parameters": {
      "respondWith": "json",
      "responseCode": 400,
      "responseBody": "{\"status\":\"error\",\"message\":\"Missing required fields\"}"
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"options":{"caseSensitive":true,"leftValue":""},"conditions":[{"leftValue":"={{ $('Start').first().json.meetingTitle }}","rightValue":"","operator":{"type":"string","operation":"notExists","singleValue":true}},{"leftValue":"={{ $('Start').first().json.meetingNotes }}","rightValue":"","operator":{"type":"string","operation":"notExists","singleValue":true}}],"combinator":"or"} }, executeOnce: true } })
  .onTrue(respond1);

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Start\nconst body = $('Start').all().map(i => i.json);\nconst meeting = {
		notes: body.meetingNotes,
		title: body.meetingTitle,
	};\nreturn [{ json: { meeting } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const ai1 = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI: Analyze these meeting notes',
    parameters: {
      promptType: 'define',
      text: 'Analyze these meeting notes',
      options: {}
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1,
        config: { parameters: { model: { __rl: true, mode: 'id', value: 'gemini-pro' }, options: {} } }
      }),
      outputParser: outputParser({
        type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1,
        config: { parameters: {"schema":{"action_items":"array","follow_up_emails":"array","summary":"string"}} }
      })
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST docs.googleapis.com/v1/documents",
    "parameters": {
      "method": "POST",
      "url": "https://docs.googleapis.com/v1/documents",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"Meeting Summary\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Google Docs', id: '' } }
}
});

const respond2 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 2",
    "parameters": {
      "respondWith": "json",
      "responseCode": 200,
      "responseBody": "{\"status\":\"success\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(if1).to(code1).to(ai1).to(http2).to(respond2));