return workflow('', '')
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [-180, -380], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: { options: {} }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'credential-id', name: 'serpApi Credential' }
        }, name: 'SerpAPI' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [60, -380], name: 'AI Agent' } }))