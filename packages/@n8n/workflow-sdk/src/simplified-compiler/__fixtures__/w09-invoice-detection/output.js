const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"hours","hoursInterval":1}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET gmail.googleapis.com/gmail/v1/use...",
    "parameters": {
      "method": "GET",
      "url": "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread",
      "options": {},
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Gmail', id: '' } }
}
});

const ai2 = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI: Determine if this email is inv',
    parameters: {
      promptType: 'define',
      text: 'Determine if this email is invoice-related. Return valid JSON.',
      options: {},
      hasOutputParser: true
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2,
        config: { parameters: { model: { __rl: true, mode: 'id', value: 'gpt-4o' }, options: {} } }
      }),
      outputParser: outputParser({
        type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1,
        config: { parameters: {"schema":{"is_invoice":"boolean","due_date":"string","amount_due":"number","sender":"string","subject":"string"}} }
      })
    },
    executeOnce: true,
    onError: 'continueRegularOutput'
  }
});

const http3 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST slack.com/api/chat.postMessage",
    "parameters": {
      "method": "POST",
      "url": "https://slack.com/api/chat.postMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"text\":\"Invoice detected\",\"channel\":\"@user\"}",
      "authentication": "genericCredentialType",
      "genericAuthType": "oAuth2Api"
    },
    "executeOnce": true
  , credentials: { oAuth2Api: { name: 'Slack', id: '' } }
}
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('AI: Determine if this email is inv').first().json.is_invoice }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http3);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(ai2).to(if1));