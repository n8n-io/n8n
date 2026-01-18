return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [-2160, -100] } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      operation: 'get',
      documentURL: '1shUBSb2aEFZrOWOROcCeG9glxi7u205p4lEopNt1e7E',
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [-1880, -100], name: 'Content for the Training' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const text = $input.first().json.content;\nconst chunkSize = 1000;\n\nlet chunks = [];\nfor (let i = 0; i < text.length; i += chunkSize) {\n  chunks.push({\n    json: { chunk: text.slice(i, i + chunkSize) }\n  });\n}\n\nreturn chunks;\n\n'
    }, position: [-1660, -100], name: 'Splitting into Chunks' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.together.xyz/v1/embeddings',
      method: 'POST',
      options: {},
      sendBody: true,
      sendHeaders: true,
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'model', value: 'BAAI/bge-large-en-v1.5' },
          { name: 'input', value: '={{ $json.chunk }}' }
        ]
      },
      genericAuthType: 'httpBearerAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' }
    }, position: [-1440, -100], name: 'Embedding Uploaded document' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      tableId: 'embed',
      fieldsUi: {
        fieldValues: [
          {
            fieldId: 'chunk',
            fieldValue: '={{ $(\'Splitting into Chunks\').item.json.chunk }}'
          },
          {
            fieldId: 'embedding',
            fieldValue: '={{ JSON.stringify($json.data[0].embedding) }}'
          }
        ]
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [-1220, -100], name: 'Save the embedding in DB' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: {
      public: true,
      options: {},
      initialMessages: 'Hi there! 👋\nTest the basic RAG chat with Supabase '
    }, position: [-300, -140], name: 'When chat message received' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.together.xyz/v1/embeddings',
      method: 'POST',
      options: {},
      sendBody: true,
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'model', value: 'BAAI/bge-large-en-v1.5' },
          { name: 'input', value: '={{ $json.chatInput }}' }
        ]
      },
      genericAuthType: 'httpBearerAuth'
    }, credentials: {
      httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' }
    }, position: [-80, -140], name: 'Embend User Message' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://fqdttboovkcezrxizkpw.supabase.co/rest/v1/rpc/matchembeddings1',
      method: 'POST',
      options: {},
      sendBody: true,
      authentication: 'predefinedCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: '=query_embedding',
            value: '={{ $json.data[0].embedding }}'
          },
          { name: 'match_count', value: '5' }
        ]
      },
      nodeCredentialType: 'supabaseApi'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [140, -140], name: 'Search Embeddings' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'chunk' }] }
    }, position: [360, -140] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.7, config: { parameters: {
      text: '=You are an AI assistant. Use the following context to answer the user\'s question.\n\nContext:\n{{ $json.chunk }}\n\nUser\'s message:\n{{ $(\'When chat message received\').item.json.chatInput }}\n\nProvide a helpful and detailed answer based *only* on the context. If the answer is not in the context, say "I don\'t know based on the provided information."\n',
      batching: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'qwen/qwen3-8b:free', options: {} }, credentials: {
          openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' }
        }, name: 'OpenRouter Chat Model' } }) }, position: [680, -140], name: 'Basic LLM Chain' } }))
  .add(sticky('## ⚠️ RUN THIS FIRST & RUN IT FOR ONLY ONCE \n(as it will convert your content in Embedding format and save it in DB and is ready for the RAG Chat)\n\n## 📌 Telegram Trigger\n\n* **Type:** `telegramTrigger`\n* **Purpose:** Waits for new Telegram messages to trigger the workflow.\n* **Note:** Currently disabled.\n\n---\n\n## 📄 Content for the Training\n\n* **Type:** `googleDocs`\n* **Purpose:** Fetches document content from Google Docs using its URL.\n* **Details:** Uses Service Account authentication.\n\n---\n\n## ✂️ Splitting into Chunks\n\n* **Type:** `code`\n* **Purpose:** Splits the fetched document text into smaller chunks (1000 chars each) for processing.\n* **Logic:** Loops over text and slices it.\n\n---\n\n## 🧠 Embedding Uploaded Document\n\n* **Type:** `httpRequest`\n* **Purpose:** Calls Together AI embedding API to get vector embeddings for each text chunk.\n* **Details:** Sends JSON with model name and chunk as input.\n\n---\n\n## 🛢 Save the embedding in DB\n\n* **Type:** `supabase`\n* **Purpose:** Saves each text chunk and its embedding vector into the Supabase `embed` table.', { position: [-2900, -300], width: 1900, height: 1080 }))
  .add(sticky('## 💬 When chat message received\n\n* **Type:** `chatTrigger`\n* **Purpose:** Starts the workflow when a user sends a chat message.\n* **Details:** Sends an initial greeting message to the user.\n\n---\n\n## 🧩 Embend User Message\n\n* **Type:** `httpRequest`\n* **Purpose:** Generates embedding for the user’s input message.\n* **Details:** Calls Together AI embeddings API.\n\n---\n\n## 🔍 Search Embeddings\n\n* **Type:** `httpRequest`\n* **Purpose:** Searches Supabase DB for the top 5 most similar text chunks based on the generated embedding.\n* **Details:** Calls Supabase RPC function `matchembeddings1`.\n\n---\n\n## 📦 Aggregate\n\n* **Type:** `aggregate`\n* **Purpose:** Combines all retrieved text chunks into a single aggregated context for the LLM.\n\n---\n\n## 🧠 Basic LLM Chain\n\n* **Type:** `chainLlm`\n* **Purpose:** Passes the user\'s question + aggregated context to the LLM to generate a detailed answer.\n* **Details:** Contains prompt instructing the LLM to answer only based on context.\n\n---\n\n## 🤖 OpenRouter Chat Model\n\n* **Type:** `lmChatOpenRouter`\n* **Purpose:** Provides the actual AI language model that processes the prompt.\n* **Details:** Uses `qwen/qwen3-8b:free` model via OpenRouter.', { name: 'Sticky Note1', position: [-900, -300], width: 1900, height: 1080 }))