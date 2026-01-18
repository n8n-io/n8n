return workflow('', '')
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.3, config: { parameters: { options: {} }, position: [1392, 64], name: 'When chat message received' } }))
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
    }, position: [1616, 64], name: 'Embend User Message' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://enter-your-supabase-host/rest/v1/rpc/matchembeddings1',
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
    }, position: [1840, 64], name: 'Search Embeddings' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'chunk' }] }
    }, position: [2064, 64] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '=You are a helpful and professional customer support agent. Use the following context to answer the user\'s question. \n\nHandle greetings without the need of the context...\n\nContext:\n{{ $json.chunk }}\n\nUser\'s message:\n{{ $(\'When chat message received\').item.json.chatInput }}\n\nFormat your reply in WhatsApp style:\n- Use _italics_ for emphasis\n- Use *bold* for key points\n- Use • for bullet lists (no markdown dashes or hashes)\n- Keep responses short, clear, and conversational, like real WhatsApp support\n- Avoid markdown headers or code blocks\n\nGive a clear, accurate, and friendly response based only on the context.  \nIf the answer cannot be found in the context, reply: _"I don\'t know based on the provided information."_\n',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {} }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [2272, 64], name: 'AI Agent' } }))
  .add(trigger({ type: 'n8n-nodes-base.jotFormTrigger', version: 1, config: { parameters: { form: '252862840518058', onlyAnswers: false }, credentials: {
      jotFormApi: { id: 'credential-id', name: 'jotFormApi Credential' }
    }, position: [1376, -496], name: 'JotForm Trigger' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.jotform.com/submission/{{ $json.submissionID }}?apiKey=enter-your-jotfomr-api',
      options: {}
    }, position: [1584, -496], name: 'Grab New knowledgebase' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.content.answers[\'6\'].answer[0] }}',
      options: { response: { response: { responseFormat: 'file' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'APIKEY', value: 'enter-your-jotfomr-api' }]
      }
    }, position: [1792, -496], name: 'Grab the uploaded knowledgebase file link' } }))
  .then(node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'pdf' }, position: [2000, -496], name: 'Extract Text from PDF File' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const text = $input.first().json.text;\nconst chunkSize = 1000;\n\nlet chunks = [];\nfor (let i = 0; i < text.length; i += chunkSize) {\n  chunks.push({\n    json: { chunk: text.slice(i, i + chunkSize) }\n  });\n}\n\nreturn chunks;\n\n'
    }, position: [2192, -496], name: 'Splitting into Chunks' } }))
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
    }, position: [2416, -496], name: 'Embedding Uploaded document' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      tableId: 'RAG',
      fieldsUi: {
        fieldValues: [
          {
            fieldId: 'chunk',
            fieldValue: '={{ $(\'Splitting into Chunks\').item.json.chunk }}'
          },
          {
            fieldId: 'embeddings',
            fieldValue: '={{ JSON.stringify($json.data[0].embedding) }}'
          }
        ]
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [2624, -496], name: 'Save the embedding in DB' } }))
  .add(sticky('### Part 1: Feeding the AI Knowledge (The "Librarian" part)\n\nThis part of the workflow runs whenever someone uploads a new PDF contract using your Jotform form. Its only job is to read, understand, and store the information from that document.\n\n* A user uploads a PDF contract through a JotForm, which is then downloaded.\n* The system extracts the raw text and splits it into smaller, more manageable chunks.\n* Each text chunk is converted into a numerical representation, called an embedding, that captures its semantic meaning.\n* These embeddings and their original text are stored in a Supabase vector database, effectively creating a searchable knowledge library.\n', { position: [1296, -768], width: 1584, height: 512 }))
  .add(sticky('---\n\n### Part 2: Asking the AI a Question (The "Researcher" part)\n\nThis part of the workflow runs whenever a user sends a message in a chat interface. Its job is to find the right information from the library and generate an answer.\n\n* A user asks a question, which the system converts into a numerical embedding to understand its meaning.\n* This embedding is used to search a vector database, retrieving the most relevant chunks of text from the stored documents.\n* The retrieved text chunks are then provided to an AI agent as the sole context for answering the question.\n* The AI generates a precise and accurate answer based only on the provided context, ensuring it doesn\'t invent information.', { name: 'Sticky Note1', position: [1296, -208], width: 1600, height: 656 }))