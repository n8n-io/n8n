return workflow('SIDZ9gnOf5yEftvX', 'chat', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: {
      public: true,
      options: { allowFileUploads: true },
      initialMessages: ''
    }, position: [-1400, -420], name: 'chat' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      text: '=Describe the content of the image or pdf in detail then wait for questions about it. Based on what is in the content, suggest 3 questions the user may ask',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'GPT-4O'
      },
      options: { detail: 'high' },
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze',
      binaryPropertyName: 'data0'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-882, -620], name: 'OpenAI' } }), node({ type: '@n8n/n8n-nodes-langchain.memoryManager', version: 1.1, config: { parameters: { options: {}, simplifyOutput: false }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $("chat").item.json.sessionId }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory2' } }) }, position: [-960, -20], name: 'chatmem1' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'c9a2577d-0589-41ca-9480-2feda2dfbd9b',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            leftValue: '={{ $json.files[0].fileName }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'If' }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.7, config: { parameters: {
      text: '=Describe `{{ $json.content }}`\n\nUse the text from the chat to focus the response:\n`{{ $(\'chat\').item.json.chatInput }}`',
      batching: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [-584, -520], name: 'Basic LLM Chain' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.memoryManager', version: 1.1, config: { parameters: {
      mode: 'insert',
      messages: {
        messageValues: [{ type: 'ai', message: '={{ $json.content }}' }]
      }
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $("chat").item.json.sessionId }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory1' } }) }, position: [-584, -920], name: 'chatmem' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an expert and will help the user with their query `{{ $("chat").item.json.chatInput }}` about\n{{ $json.messages[$json.messages.length - 1].kwargs.content }}\n',
      options: {},
      promptType: 'define'
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'chat\').item.json.sessionId }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }) }, position: [-584, -20], name: 'AI Agent' } }))
  .add(sticky('## Chat with thing\n\nThis n8n template lets you build a smart AI chat assistant that can handle text, images, and PDFs — using OpenAI\'s GPT-4o multimodal model. It supports dynamic conversations and file analysis, making it great for AI-driven support bots, personal assistants, or embedded chat widgets.', { position: [-1520, -740], width: 340, height: 480 }))
  .add(sticky('This route runs when an image/file/pdf is attached. It saves what it sees in the chatmem', { name: 'Sticky Note1', position: [-1100, -740] }))
  .add(sticky('Use this node to set the conversation', { name: 'Sticky Note2', position: [-360, -640] }))
  .add(sticky('This runs after the upload, it retrieves the initial content from the memory\n', { name: 'Sticky Note3', position: [-960, -160] }))
  .add(sticky('This is the main chat, adjust the prompt to match your use case.', { name: 'Sticky Note4', position: [-360, -140] }))