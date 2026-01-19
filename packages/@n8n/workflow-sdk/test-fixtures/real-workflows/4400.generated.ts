return workflow('IwtOfHq5pZQNDAF0', 'Complete RAG from PDF with Mistral OCR', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-480, -300], name: 'When clicking ‘Test workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'http:/YOUR_AWS_SECRET_KEY_HERE/delete',
      method: 'POST',
      options: {},
      jsonBody: '{\n  "filter": {}\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-140, -300], name: 'Refresh collection' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      filter: {
        folderId: {
          __rl: true,
          mode: 'list',
          value: '1LWVo3yn_1bWQJsLskBIbWTGwlfObvtUK',
          cachedResultUrl: 'https://drive.google.com/drive/folders/1LWVo3yn_1bWQJsLskBIbWTGwlfObvtUK',
          cachedResultName: 'PDFs'
        }
      },
      options: {},
      resource: 'fileFolder'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [200, -300], name: 'Search PDFs' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [540, -300], name: 'Loop Over Items1' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ca7c30f2-444d-4551-988d-0f513e5ee4b1',
            name: 'file_id',
            type: 'string',
            value: '={{ $json.id }}'
          }
        ]
      }
    }, position: [860, -280], name: 'Edit Fields1' } }))
  .then(node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { parameters: {
      mode: 'each',
      options: { waitForSubWorkflow: true },
      workflowId: {
        __rl: true,
        mode: 'list',
        value: 'AdVUaHTE9Jk1KO72',
        cachedResultName: 'Mistral OCR_subworkflow'
      },
      workflowInputs: {
        value: {},
        schema: [],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      }
    }, position: [1160, -280] } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [-480, 960], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainRetrievalQa', version: 1.5, config: { parameters: { options: {} }, subnodes: { retriever: retriever({ type: '@n8n/n8n-nodes-langchain.retrieverVectorStore', version: 1, config: { subnodes: { vectorStore: vectorStore({ type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant', version: 1.1, config: { parameters: {
          options: {},
          qdrantCollection: {
            __rl: true,
            mode: 'list',
            value: 'ocr_mistral_test',
            cachedResultName: 'ocr_mistral_test'
          }
        }, credentials: {
          qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI1' } }) }, name: 'Qdrant Vector Store1' } }) }, name: 'Vector Store Retriever' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-1.5-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [-160, 960], name: 'Question and Answer Chain' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' }, position: [-460, 520], name: 'When Executed by Another Workflow' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.file_id }}' },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [-140, 520], name: 'Get PDF' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.mistral.ai/v1/files',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'predefinedCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'purpose', value: 'ocr' },
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      nodeCredentialType: 'mistralCloudApi'
    }, credentials: {
      mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' }
    }, position: [180, 520], name: 'Mistral Upload' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.mistral.ai/v1/files/{{ $json.id }}/url',
      options: {},
      sendQuery: true,
      sendHeaders: true,
      authentication: 'predefinedCredentialType',
      queryParameters: { parameters: [{ name: 'expiry', value: '24' }] },
      headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
      nodeCredentialType: 'mistralCloudApi'
    }, credentials: {
      mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' }
    }, position: [500, 520], name: 'Mistral Signed URL' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.mistral.ai/v1/ocr',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "mistral-ocr-latest",\n  "document": {\n    "type": "document_url",\n    "document_url": "{{ $json.url }}"\n  },\n  "include_image_base64": true\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'mistralCloudApi'
    }, credentials: {
      mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' }
    }, position: [820, 520], name: 'Mistral DOC OCR' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const data = $json.pages;\n\nreturn data.map(entry => ({\n  json: {\n    markdown: entry.markdown\n  }\n}));'
    }, position: [1140, 520] } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [1540, 520], name: 'Loop Over Items' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '189f4944-a692-423c-bc6d-76747e1d04df',
            name: 'text',
            type: 'string',
            value: '={{ $json.markdown }}'
          }
        ]
      }
    }, position: [2000, 540], name: 'Set page' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant', version: 1.1, config: { parameters: {
      mode: 'insert',
      options: { collectionConfig: '' },
      qdrantCollection: {
        __rl: true,
        mode: 'list',
        value: 'ocr_mistral_test',
        cachedResultName: 'ocr_mistral_test'
      }
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.1, config: { parameters: { options: { stripNewLines: false } }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: { options: {} }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter', version: 1, config: { parameters: { chunkSize: 400, chunkOverlap: 40 }, name: 'Token Splitter' } }) }, name: 'Default Data Loader' } }) }, position: [2380, 540], name: 'Qdrant Vector Store' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [2860, 540] } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'http://QDRANTURL/collections/COLLECTION',
      method: 'PUT',
      options: {},
      jsonBody: '{\n  "vectors": {\n    "size": 1536,\n    "distance": "Cosine"  \n  },\n  "shard_number": 1,  \n  "replication_factor": 1,  \n  "write_consistency_factor": 1 \n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-480, -760], name: 'Create collection' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.chainSummarization', version: 2, config: { parameters: {
      options: {
        summarizationMethodAndPrompts: {
          values: {
            prompt: 'Write a concise summary of the following (in italiano):\n\n\n"{text}"\n\n\nCONCISE SUMMARY:',
            combineMapPrompt: 'Write a concise summary of the following (in italiano):\n\n\n"{text}"\n\n\nCONCISE SUMMARY:'
          }
        }
      }
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash-exp' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model1' } }) }, position: [1820, 140], name: 'Summarization Chain' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '189f4944-a692-423c-bc6d-76747e1d04df',
            name: 'text',
            type: 'string',
            value: '={{ $json.response.text }}'
          }
        ]
      }
    }, position: [2180, 140], name: 'Set summary' } }))
  .add(sticky('# STEP 1\n\n## Create Qdrant Collection\nChange:\n- QDRANTURL\n- COLLECTION', { name: 'Sticky Note3', color: 6, position: [-280, -820], width: 880, height: 220 }))
  .add(sticky('# STEP 2\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Documents vectorization with Qdrant and Google Drive\nChange:\n- QDRANTURL\n- COLLECTION', { name: 'Sticky Note4', color: 4, position: [-540, -400], width: 620, height: 520 }))
  .add(sticky('## STEP 3\nIf you want a "light" and faster rag with the main contents replace the "Set page" node with "Summarization Chain"', { name: 'Sticky Note', position: [1760, 20], width: 600, height: 680 }))
  .add(sticky('## STEP 4\nTest the RAG', { name: 'Sticky Note1', color: 2, position: [320, 960], width: 500, height: 120 }))
  .add(sticky('## Complete RAG system from PDF Documents with Mistral OCR, Qdrant and Gemini AI\n\nThis workflow is designed to process PDF documents using Mistral\'s OCR capabilities, store the extracted text in a Qdrant vector database, and enable Retrieval-Augmented Generation (RAG) for answering questions. ', { name: 'Sticky Note2', position: [-540, -1080], width: 1140, height: 140 }))