return workflow('pDhufDfHS9qRgtLf', 'Simple RAG', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Upload RAG PDF',
      formFields: {
        values: [
          {
            fieldType: 'file',
            fieldLabel: 'File',
            multipleFiles: false,
            requiredField: true,
            acceptFileTypes: '.pdf'
          }
        ]
      },
      formDescription: 'Upload RAG PDF'
    }, name: 'On form submission' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', version: 1.3, config: { parameters: {
      mode: 'insert',
      options: {},
      pineconeIndex: {
        __rl: true,
        mode: 'list',
        value: 'n8n',
        cachedResultName: 'n8n'
      }
    }, credentials: {
      pineconeApi: { id: 'credential-id', name: 'pineconeApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: { dimensions: 1024 } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1.1, config: { parameters: {
          options: {},
          dataType: 'binary',
          textSplittingMode: 'custom'
        }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {} }, name: 'Recursive Character Text Splitter' } }) }, name: 'Default Data Loader' } }) }, position: [320, 0], name: 'Pinecone Vector Store' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [1200, 80], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      options: {
        systemMessage: 'Hanya jawab berdasarkan data yang ada di tools "VectorDB". Kalau data disitu gak ada, jawab saja kamu tidak tahu.'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', version: 1.3, config: { parameters: {
          mode: 'retrieve-as-tool',
          topK: 20,
          options: {},
          useReranker: true,
          pineconeIndex: {
            __rl: true,
            mode: 'list',
            value: 'n8n',
            cachedResultName: 'n8n'
          },
          toolDescription: 'Ambil data dari vector database untuk knowledgebase'
        }, credentials: {
          pineconeApi: { id: 'credential-id', name: 'pineconeApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: { dimensions: 1024 } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }) }, name: 'VectorDB' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1',
            cachedResultName: 'gpt-4.1'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [1440, 80], name: 'AI Agent' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.rerankerCohere', version: 1, config: { credentials: {
      cohereApi: { id: 'credential-id', name: 'cohereApi Credential' }
    }, position: [1740, 480] } }))
  .add(sticky('## Insert Data to Pinecone', { name: 'Sticky Note', position: [-60, -80], width: 880, height: 680 }))
  .add(sticky('## Chat AI Agent', { name: 'Sticky Note1', color: 5, position: [1100, -80], width: 860, height: 680 }))
  .add(sticky('## Embedding Model', { name: 'Sticky Note2', color: 4, position: [840, 300], height: 300 }))