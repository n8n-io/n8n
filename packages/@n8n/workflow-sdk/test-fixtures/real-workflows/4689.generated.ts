return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [0, -520], name: 'When clicking "Execute Workflow"' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      operation: 'get',
      documentURL: 'https://docs.google.com/document/d/1gvgp71e9edob8WLqFIYCdzC7kUq3pLO37VKb-a-vVW4/edit?tab=t.0'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [220, -520], name: 'Google Docs Importer' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
      mode: 'insert',
      options: {},
      mongoCollection: {
        __rl: true,
        mode: 'list',
        value: 'n8n-template',
        cachedResultName: 'n8n-template'
      },
      vectorIndexName: 'data_index'
    }, credentials: {
      mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
    }, subnodes: { documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: {
          options: {
            metadata: {
              metadataValues: [{ name: 'doc_id', value: '={{ $json.documentId }}' }]
            }
          },
          jsonData: '={{ $json.content }}',
          jsonMode: 'expressionData'
        }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: {
          options: { splitCode: 'markdown' },
          chunkSize: 3000,
          chunkOverlap: 200
        }, name: 'Document Chunker' } }) }, name: 'Document Section Loader' } }), embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Embeddings Generator' } }) }, position: [440, -520], name: 'MongoDB Documentation Inserter' } }))
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, name: 'Receive Message on Telegram' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '={{ $json.message.text }}',
      options: {
        systemMessage: 'You are the AI assistant for a company specializing in advanced technology solutions. Your task is to help internal users by consulting the official product documentation for the company’s platforms.\n\nAvailable References:\n\nproductDocs: Step-by-step guides, technical configurations, and official manuals from the developer documentation.\n\nfeedbackPositive: Previous responses rated positively by users, useful as examples for generating high-quality answers.\n\nfeedbackNegative: Previous responses rated negatively by users. Use this tool to avoid making similar mistakes in your replies.\n\nCurrently, there are no use cases or update history documented in the available materials.\n\nBehavior Rules\n\nSearch & Response:\n\nAlways consult the official documentation first using the productDocs tool.\n\nAlso search feedbackPositive for highly rated previous responses to similar questions.\n\nCheck feedbackNegative to see if similar answers were poorly rated, and avoid repeating those mistakes.\n\nIf multiple tools return relevant results, combine the information to provide the best answer. If only one tool returns relevant content, use that as your source.\n\nRespond directly and clearly, explaining exactly how to perform the requested task.\n\nDo not filter by category unless the user explicitly asks.\n\nLanguage (Strict Per-Message Rule):\n\nDetect the language of each incoming message individually.\n\nRespond in the same language as the most recent message.\n\nDo not use the language of previous messages or conversation history to decide the language.\n\nLinks (Not Allowed):\n\nNever provide links, even if the user requests them.\n\nIf a user asks for a link, respond with:\n“I cannot provide links. If you need specific information, let me know and I will help with the details.”\n\nResponse Style:\n\nUse a professional, direct, and human tone.\n\nKeep responses between 2 and 4 lines unless the user asks for more detail.\n\nDo not make up information that isn’t in MongoDB.\n\nIf your answer contains numbered steps or lists, always number them sequentially (1, 2, 3...) without skipping or repeating numbers, even if the original content uses a different numbering style.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryMongoDbChat', version: 1, config: { parameters: {
          sessionKey: '={{ $(\'Receive Message on Telegram\').item.json.message.chat.id }}',
          sessionIdType: 'customKey',
          collectionName: 'n8n-template-chat-history'
        }, credentials: {
          mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
        }, name: 'MongoDB Chat Memory' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          options: {},
          toolName: 'productDocs',
          mongoCollection: {
            __rl: true,
            mode: 'list',
            value: 'n8n-template',
            cachedResultName: 'n8n-template'
          },
          toolDescription: 'retreive documentation',
          vectorIndexName: 'data_index'
        }, credentials: {
          mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }) }, name: 'Search Documentation' } }), tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          options: {
            metadata: { metadataValues: [{ name: 'feedback', value: 'negative' }] }
          },
          toolName: 'feedbackNegative',
          mongoCollection: {
            __rl: true,
            mode: 'list',
            value: 'n8n-template-feedback',
            cachedResultName: 'n8n-template-feedback'
          },
          toolDescription: 'Retrieve previous examples of similar questions that were rated negatively by users. Use this tool before responding to avoid generating answers similar to those that did not work well in the past.',
          vectorIndexName: 'template-feedback-search'
        }, credentials: {
          mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI3' } }) }, name: 'Search Negative Interactions' } }), tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          options: {
            metadata: { metadataValues: [{ name: 'feedback', value: 'positive' }] }
          },
          toolName: 'feedbackPositive',
          mongoCollection: {
            __rl: true,
            mode: 'list',
            value: 'n8n-template-feedback',
            cachedResultName: 'n8n-template-feedback'
          },
          toolDescription: 'Retrieve previous examples of similar questions that were rated positively by users. Use this tool before responding to improve your answer based on those approved examples.',
          vectorIndexName: 'template-feedback-search'
        }, credentials: {
          mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI1' } }) }, name: 'Search Positive Interactions' } })] }, position: [220, 0], name: 'Knowledge Base Agent' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      chatId: '={{ $(\'Receive Message on Telegram\').item.json.message.chat.id }}',
      message: '={{ $json.output }}',
      options: { appendAttribution: false },
      operation: 'sendAndWait',
      approvalOptions: { values: { approvalType: 'double' } }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [600, 0], name: 'Send Message on Telegram, Wait for Feedback' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'let response;\n\nif ($input.first().json.data.approved) {\n  response = "positive"\n} \nelse {\n  response = "negative"\n}\n\nreturn {\n  feedback: response\n}\n'
    }, position: [820, 0], name: 'Map feedback data' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 1, config: { parameters: {
      values: {
        string: [
          {
            name: 'prompt',
            value: '={{ $(\'Receive Message on Telegram\').item.json.message.text }}'
          },
          {
            name: 'response',
            value: '={{ $(\'Knowledge Base Agent\').item.json.output }}'
          },
          {
            name: 'text',
            value: '=Prompt: {{ $(\'Receive Message on Telegram\').item.json.message.text }}. Completion: {{ $(\'Knowledge Base Agent\').item.json.output }}'
          },
          { name: 'feedback', value: '={{ $json.feedback }}' }
        ]
      },
      options: {},
      keepOnlySet: true
    }, position: [1040, 0], name: 'Set feedback fields for collection storage' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
      mode: 'insert',
      options: {},
      mongoCollection: {
        __rl: true,
        mode: 'list',
        value: 'n8n-template-feedback',
        cachedResultName: 'n8n-template-feedback'
      },
      vectorIndexName: 'template-feedback-search',
      embeddingBatchSize: 1
    }, credentials: {
      mongoDb: { id: 'credential-id', name: 'mongoDb Credential' }
    }, subnodes: { documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: {
          options: {
            metadata: {
              metadataValues: [
                { name: 'prompt', value: '={{ $json.prompt }}' },
                { name: 'response', value: '={{ $json.response }}' },
                { name: 'feedback', value: '={{ $json.feedback }}' }
              ]
            }
          },
          jsonData: '={{ $json.text }}',
          jsonMode: 'expressionData'
        }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {}, chunkSize: 4000 }, name: 'Recursive Character Text Splitter' } }) }, name: 'Default Data Loader' } }), embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Embeddings Generator1' } }) }, position: [1260, 0], name: 'Submit embedded chat feedback' } }))
  .add(sticky('Run this workflow manually to import and index Google Docs product documentation into MongoDB with vector embeddings for fast search.', { name: 'Sticky Note', color: 5, position: [-420, -500] }))
  .add(sticky('This workflow uses retrieval-augmented generation (RAG) to answer user questions by searching the MongoDB vector store and generating AI responses enhanced with Telegram-based RLHF feedback.', { name: 'Sticky Note1', color: 4, position: [-420, 40], height: 180 }))
  .add(sticky('Documentation Search Index\n\n{\n  "mappings": {\n    "dynamic": false,\n    "fields": {\n      "_id": {\n        "type": "string"\n      },\n      "text": {\n        "type": "string"\n      },\n      "embedding": {\n        "type": "knnVector",\n        "dimensions": 1536,\n        "similarity": "cosine"\n      },\n      "source": {\n        "type": "string"\n      },\n      "doc_id": {\n        "type": "string"\n      }\n    }\n  }\n}\n\n\nFeedback Search Index\n\n{\n  "mappings": {\n    "dynamic": false,\n    "fields": {\n      "prompt": {\n        "type": "string"\n      },\n      "response": {\n        "type": "string"\n      },\n      "text": {\n        "type": "string"\n      },\n      "embedding": {\n        "type": "knnVector",\n        "dimensions": 1536,\n        "similarity": "cosine"\n      },\n      "feedback": {\n        "type": "token"\n      }\n    }\n  }\n}\n', { name: 'Sticky Note2', position: [1800, -480], width: 520, height: 1040 }))