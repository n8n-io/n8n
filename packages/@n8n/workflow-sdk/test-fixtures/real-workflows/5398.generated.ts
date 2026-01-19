return workflow('', '')
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      options: {
        systemMessage: 'You are a helpful assistant\n\nYou answer questions about MCP (Model Context Protocol). You have access to two MCP servers:\n\n- The RAG MCP Server which answers general questions about MCP\n- The Search Engine MCP Server which allows you to use a Search Engine in realtime.\n\nThe Search Engine MCP Server has two tools;\n- list tool - which shows all the available tools\n- execute tool - which allows you to execute a search query on a search engine.\n\nYou DO NOT answer questions with your internal knowledge, you ONLY use the knowledge provided by the two MCP servers to answer questions.'
      }
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-mcp.mcpClientTool', version: 1, config: { credentials: {
          mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' }
        }, name: 'MCP Client' } }), tool({ type: '@n8n/n8n-nodes-langchain.mcpClientTool', version: 1, config: { parameters: {
          sseEndpoint: 'http://localhost:5678/mcp/f88b9b77-40f2-4fad-8e14-0fc7faed7a0b'
        }, name: 'RAG MCP Server' } }), tool({ type: 'n8n-nodes-mcp.mcpClientTool', version: 1, config: { credentials: {
          mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' }
        }, name: 'MCP_Search_List_Tools' } }), tool({ type: 'n8n-nodes-mcp.mcpClientTool', version: 1, config: { parameters: {
          toolName: 'search_engine',
          operation: 'executeTool',
          toolParameters: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Tool_Parameters\', ``, \'json\') }}'
        }, credentials: {
          mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' }
        }, name: 'MCP_Search_Search_Engine' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: { contextWindowLength: 15 }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [220, 0], name: 'AI Agent' } }))
  .add(sticky('## RAG MCP Server', { name: 'Sticky Note', color: 3, position: [320, 220], width: 280, height: 220 }))
  .add(sticky('## Search Engine MCP Server', { name: 'Sticky Note1', color: 5, position: [620, 220], width: 360, height: 220 }))