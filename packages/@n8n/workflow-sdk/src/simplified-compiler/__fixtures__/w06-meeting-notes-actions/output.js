const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/google-meet-automation","responseMode":"responseNode"}, pinData: [{"body":{"meetingTitle":"Q3 Planning","meetingNotes":"Discussed roadmap priorities and budget allocation"}}] } });

const respond1 = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: {
    "name": "Respond 1",
    "parameters": {
      "respondWith": "json",
      "responseBody": "{\"status\":\"error\",\"message\":\"Missing required fields\"}",
      "options": {
        "responseCode": 400
      }
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Webhook').first().json.meetingTitle }}","rightValue":"","operator":{"type":"string","operation":"notExists","singleValue":true}},{"leftValue":"={{ $('Webhook').first().json.meetingNotes }}","rightValue":"","operator":{"type":"string","operation":"notExists","singleValue":true}}],"combinator":"or"} }, executeOnce: true } })
  .onTrue(respond1);

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: Webhook\nconst body = $('Webhook').first().json;\nconst meeting = {
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
      options: {},
      hasOutputParser: true
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1,
        config: { parameters: {"modelName":"gemini-pro","options":{}} }
      }),
      outputParser: outputParser({
        type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3,
        config: { parameters: {"schemaType":"fromJson","jsonSchemaExample":"{\"action_items\":\"array\",\"follow_up_emails\":\"array\",\"summary\":\"string\"}"} }
      })
    },
    executeOnce: true,
    pinData: [{"action_items":[{"description":"Review Q3 budget"},{"description":"Update roadmap"}],"follow_up_emails":[{"recipient":"team@company.com","subject":"Meeting Action Items"}],"summary":"Discussed Q3 priorities and roadmap updates"}]
  }
});

const code2 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split items',
    parameters: {
      jsCode: `const analysis = $('AI: Analyze these meeting notes').all().map(i => i.json);
return analysis.action_items.map(item => ({ json: item }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST tasks.googleapis.com/tasks/v1/li...",
    "parameters": {
      "method": "POST",
      "url": "https://tasks.googleapis.com/tasks/v1/lists/TASKLIST/tasks",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"title\":\"={{ $('Split items').first().json.description }}\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    }
  , credentials: { oAuth2Api: { name: 'Google Tasks', id: '' } }
}
});

const code3 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Split emails',
    parameters: {
      jsCode: `const analysis = $('AI: Analyze these meeting notes').all().map(i => i.json);
return analysis.follow_up_emails.map(email => ({ json: email }));`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST gmail.googleapis.com/gmail/v1/us...",
    "parameters": {
      "method": "POST",
      "url": "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"to\":\"={{ $('Split emails').first().json.recipient }}\",\"subject\":\"={{ $('Split emails').first().json.subject }}\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    }
  , credentials: { oAuth2Api: { name: 'Gmail', id: '' } }
}
});

const http4 = node({
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
      "responseBody": "{\"status\":\"success\"}",
      "options": {
        "responseCode": 200
      }
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(if1).to(code1).to(ai1).to(code2).to(http2).to(code3).to(http3).to(http4).to(respond2));