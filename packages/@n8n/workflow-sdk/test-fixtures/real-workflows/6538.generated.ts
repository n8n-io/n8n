return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileCreated',
      options: {},
      pollTimes: { item: [{}] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: '1UHQhCrwZg_ZEzBIKv4LR_RWtAyHbxZsg',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1UHQhCrwZg_ZEzBIKv4LR_RWtAyHbxZsg',
        cachedResultName: 'Marketing Ladder Knowledge Base'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [560, 760], name: 'New File' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e556566e-20a1-48b4-b01e-197a402b5a5f',
            name: 'id',
            type: 'string',
            value: '={{ $json.id }}'
          }
        ]
      }
    }, position: [860, 760], name: 'Set ID' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {
        googleFileConversion: { conversion: { docsToFormat: 'text/plain' } }
      },
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1100, 760], name: 'Download File' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'text' }, position: [1280, 760], name: 'Extract from File' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1, config: { parameters: {
      mode: 'insert',
      options: { queryName: 'match_documents' },
      tableName: {
        __rl: true,
        mode: 'list',
        value: 'documents',
        cachedResultName: 'documents'
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.1, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: {
          options: {
            metadata: {
              metadataValues: [
                {
                  name: '=file_id',
                  value: '={{ $(\'Set ID\').item.json.id }}'
                }
              ]
            }
          }
        }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {}, chunkSize: 500, chunkOverlap: 100 }, name: 'Recursive Character Text Splitter' } }) }, name: 'Default Data Loader' } }) }, position: [1600, 760], name: 'Supabase Vector Store' } }))
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileUpdated',
      options: {},
      pollTimes: { item: [{}] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: '1UHQhCrwZg_ZEzBIKv4LR_RWtAyHbxZsg',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1UHQhCrwZg_ZEzBIKv4LR_RWtAyHbxZsg',
        cachedResultName: 'Marketing Ladder Knowledge Base'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [560, 1500], name: 'File Updated' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      tableId: 'documents',
      operation: 'delete',
      filterType: 'string',
      filterString: '=metadata->>file_id=like.*{{ $json.id }}*'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [840, 1500], name: 'Delete Row(s)' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b4433ac7-0b70-4405-a564-f3f78f784470',
            name: 'file_id',
            type: 'string',
            value: '={{ $(\'File Updated\').item.json.id }}'
          }
        ]
      }
    }, position: [1120, 1500], name: 'Get FIle ID' } }))
  .then(node({ type: 'n8n-nodes-base.limit', version: 1, config: { position: [1320, 1500], name: 'Reformat' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'id',
        value: '={{ $(\'Get FIle ID\').item.json.file_id }}'
      },
      options: {
        googleFileConversion: { conversion: { docsToFormat: 'text/plain' } }
      },
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1520, 1500], name: 'Download File1' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'text' }, position: [1700, 1500], name: 'Extract from File1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1, config: { parameters: {
      mode: 'insert',
      options: { queryName: 'match_documents' },
      tableName: {
        __rl: true,
        mode: 'list',
        value: 'documents',
        cachedResultName: 'documents'
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.1, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI1' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: {
          options: {
            metadata: {
              metadataValues: [
                {
                  name: 'file_id',
                  value: '={{ $(\'Reformat\').item.json.file_id }}'
                }
              ]
            }
          }
        }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {}, chunkSize: 300, chunkOverlap: 50 }, name: 'Recursive Character Text Splitter1' } }) }, name: 'Default Data Loader1' } }) }, position: [2060, 1500], name: 'Supabase Vector Store1' } }))
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-1700, 980] } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      fileId: '={{ $json.message.voice.file_id }}',
      resource: 'file'
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-1240, 840], name: 'Download File2' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'fe7ecc99-e1e8-4a5e-bdd6-6fce9757b234',
            name: 'text',
            type: 'string',
            value: '={{ $json.message.text }}'
          }
        ]
      }
    }, position: [-1160, 1040], name: 'Text' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'voice',
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
                  id: '281588e5-cab1-47c7-b42a-f75b8e7b659e',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.message.voice.file_id }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Text',
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
                  id: '8c844924-b2ed-48b0-935c-c66a8fd0c778',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.message.text }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Voice or Text' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.6, config: { parameters: { options: {}, resource: 'audio', operation: 'transcribe' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-1060, 840], name: 'Transcribe' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.text }}',
      options: {
        systemMessage: '=# Overview\nYou are a RAG assistant. Your job is to search for queries from a vector database and pass on the search results.\n\n# Tools\n**MarketingLadder**  \n- This is the vector store that you must query to find answers. \n- Use the search findings from the vector store to create an answer to the input query.\n\n## Final Notes\n- If you can\'t find an answer from the database, then just say you couldn\'t find an answer. Never use your own knowledge. '
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolVectorStore', version: 1, config: { parameters: {
          name: 'MarketingLadder',
          description: 'This vector store holds information about Marketing Ladder agency'
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model2' } }), vectorStore: vectorStore({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1, config: { parameters: {
          options: { queryName: 'match_documents' },
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'documents',
            cachedResultName: 'documents'
          }
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI3' } }) }, name: 'Supabase Vector Store3' } }) }, name: 'MarketingLadder' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model3' } }), memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'Telegram Trigger\').item.json.message.chat.id }}',
          sessionIdType: 'customKey'
        }, name: 'Window Buffer Memory1' } }) }, position: [-640, 960], name: 'RAG Agent' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.output }}',
      chatId: '={{ $(\'Telegram Trigger\').item.json.message.chat.id }}',
      additionalFields: { appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-20, 960], name: 'Response' } }))
  .add(sticky('# Upload New File into Knowledge Base\n\n', { name: 'Sticky Note', color: 4, position: [500, 560], width: 820, height: 80 }))
  .add(sticky('## Fix Formatting\n', { name: 'Sticky Note4', color: 5, position: [800, 680], height: 260 }))
  .add(sticky('## Extract File Text\n\n', { name: 'Sticky Note5', color: 5, position: [1060, 680], width: 420, height: 260 }))
  .add(sticky('## Update Vector Database\n\n', { name: 'Sticky Note6', color: 5, position: [1500, 680], width: 560, height: 580 }))
  .add(sticky('# Update File in Knowledge Base \n', { name: 'Sticky Note1', color: 4, position: [480, 1280], width: 640, height: 80 }))
  .add(sticky('## Get File to Update\n \n', { name: 'Sticky Note7', color: 5, position: [480, 1400], width: 280, height: 260 }))
  .add(sticky('## Fix Formatting\n', { name: 'Sticky Note8', color: 5, position: [1040, 1400], width: 400, height: 260 }))
  .add(sticky('## Extract File Text\n\n', { name: 'Sticky Note9', color: 5, position: [1460, 1400], width: 420, height: 260 }))
  .add(sticky('## Update Vector Database\n\n', { name: 'Sticky Note10', color: 5, position: [1920, 1400], width: 600, height: 580 }))
  .add(sticky('## Get New File \n', { name: 'Sticky Note2', color: 5, position: [500, 680], width: 280, height: 260 }))
  .add(sticky('## Delete Rows\n \n', { name: 'Sticky Note11', color: 5, position: [760, 1400], width: 280, height: 260 }))
  .add(sticky('## Convert Message to Text\n\n', { name: 'Sticky Note3', color: 5, position: [-1520, 800], width: 680, height: 460 }))
  .add(sticky('# RAG Chatbot\n', { name: 'Sticky Note12', color: 4, position: [-1800, 700], width: 280, height: 80 }))
  .add(sticky('## Get New Message\n', { name: 'Sticky Note13', color: 5, position: [-1820, 920], width: 280, height: 260 }))
  .add(sticky('## RAG System\n\n', { name: 'Sticky Note14', color: 5, position: [-820, 800], width: 720, height: 860 }))
  .add(sticky('## Send Output as Message\n', { name: 'Sticky Note15', color: 5, position: [-80, 900], width: 320, height: 260 }))
  .add(sticky('## Hey, I\'m Abdul 👋\n### I build growth systems for consultants & agencies. If you want to work together or need help automating your business, check out my website: \n### **https://www.builtbyabdul.com/**\n### Or email me at **abdul@buildabdul.com**\n### Have a lovely day ;)`', { name: 'Sticky Note16', color: 5, position: [-2320, 1900], width: 440, height: 240 }))
  .add(sticky('# Company RAG Knowledge Base Agent\n## Overview\nTurn your docs into an AI-powered internal or public-facing assistant. This chatbot workflow uses RAG (Retrieval-Augmented Generation) with Supabase vector search to answer employee or customer questions based on your company documents—automatically updated via Google Drive.\n\nWhether it’s deployed in Telegram or embedded on your website, this agent supports voice and text input, transcribes voice messages, pulls relevant context from your internal files, and responds with a helpful, AI-generated answer. Two additional workflows listen for file changes in a shared Google Drive folder, convert them into embeddings using OpenAI, and sync them with your Supabase vector DB—so your knowledge base is always up to date.\n\n### Who’s it for\n- Startups building an internal ops or HR assistant  \n- SaaS companies deploying help bots on their websites  \n- Customer support teams reducing repetitive questions  \n- Knowledge-driven teams needing internal AI assistants  \n\n### How it works\n- Triggered via Telegram bot (or easily swapped for website chatbot or “on chat message”)  \n- If user sends a voice message, it’s transcribed to text using OpenAI Whisper  \n- Input is passed to a RAG agent that:\n  - Searches a Supabase vector store for relevant docs  \n  - Pulls context from matching chunks using OpenAI embeddings  \n  - Responds with an LLM-powered answer  \n- The response is sent back as a Telegram message  \n- Two separate workflows:\n  - **New File Workflow**: Listens for file uploads in Google Drive, extracts and splits text, then sends to Supabase with embeddings  \n  - **Update File Workflow**: Detects file edits, deletes old rows, and updates embeddings for the revised file  \n\n### Example use case\n> You upload your internal policy docs and client FAQs into a Google Drive folder.  \n>  \n> Employees or customers can now ask:  \n> - “What’s the refund policy for annual plans?”  \n> - “How do I request a day off?”  \n> - “What tools are approved for use by the engineering team?”  \n>  \n> The chatbot instantly pulls up the right section and responds with a smart, confident answer.\n\n### How to set up\n1. Connect a Telegram bot or use n8n’s webchat / chatbot widget  \n2. Hook up OpenAI for transcription, embeddings, and completion  \n3. Set up a Supabase project and connect it as a vector store  \n4. Upload your internal docs to Google Drive  \n5. Deploy the “Add File” and “Update File” automations to manage embedding sync  \n6. Customize the chatbot’s tone and personality with prompt tweaks  \n\n### Requirements\n- Telegram bot (or n8n Chat widget)  \n- Google Drive integration  \n- Supabase with pgvector or similar enabled  \n- OpenAI API key (Whisper, Embeddings, ChatGPT)  \n- Two folders: one for raw documents and one for tracking updates  \n\n### How to customize\n- Swap Supabase for Pinecone, Weaviate, or Qdrant  \n- Replace Telegram with web chat, Slack, Intercom, or Discord  \n- Add logic to handle fallback answers or escalate to human  \n- Embed the chat widget on your site for public customer use  \n- Add filters (e.g. department, date, author) to narrow down context\n', { name: 'Sticky Note17', position: [-2660, 420], width: 780, height: 1420 }))