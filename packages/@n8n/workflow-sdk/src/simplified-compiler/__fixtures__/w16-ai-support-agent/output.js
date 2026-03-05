const t0 = trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {"httpMethod":"POST","path":"/support","responseMode":"responseNode"} } });

const ai1 = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI: Answer the support question',
    parameters: {
      promptType: 'define',
      text: 'Answer the support question',
      options: {}
    },
    subnodes: {
      model: languageModel({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2,
        config: { parameters: { model: { __rl: true, mode: 'id', value: 'gpt-4o' }, options: {} } }
      }),
      tools: [tool({
          type: '@n8n/n8n-nodes-langchain.toolHttpRequest', version: 1,
          config: { parameters: {"name":"Knowledge Base","url":"https://api.kb.com/search"} }
        }), tool({
          type: '@n8n/n8n-nodes-langchain.toolCode', version: 1,
          config: { parameters: {"name":"Ticket Lookup","jsCode":"return lookupTicket(query)"} }
        })],
      memory: memory({
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1,
        config: { parameters: {"contextWindowLength":10} }
      })
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
      "responseCode": 200,
      "responseBody": "{\"answer\":\"response sent\"}"
    },
    "executeOnce": true
  }
});

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(ai1).to(respond1));