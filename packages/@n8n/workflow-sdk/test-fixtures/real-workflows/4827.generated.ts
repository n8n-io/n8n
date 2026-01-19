return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [1380, -560], name: 'When clicking "Execute Workflow"' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      operation: 'get',
      documentURL: 'https://docs.google.com/document/d/1gvgp71e9edob8WLqFIYCdzC7kUq3pLO37VKb-a-vVW4/edit?tab=t.0'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [1600, -560], name: 'Google Docs Importer' } }))
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
        }, name: 'OpenAI Embeddings Generator' } }) }, position: [1820, -560], name: 'MongoDB Vector Store Inserter' } }))
  .add(trigger({ type: 'n8n-nodes-base.whatsAppTrigger', version: 1, config: { parameters: { options: {}, updates: ['messages'] }, credentials: {
      whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' }
    }, position: [1380, 400], name: 'WhatsApp Trigger' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '38aec976-a32c-4b0e-85f4-c90adc16abc9',
            name: 'text',
            type: 'string',
            value: '={{ $json.messages[0].text.body }}'
          }
        ]
      }
    }, position: [2020, -40], name: 'Map text prompt' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $json.messages[0].audio.id}}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [2020, 160], name: 'Gets WhatsApp Voicemail Source URL' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $json.messages[0].image.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [2020, 400], name: 'Gets WhatsApp Image Source URL' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $json.messages[0].document.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [2020, 740], name: 'Gets WhatsApp Document Source URL' } })], { version: 3.2, parameters: {
      rules: {
        values: [
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
                  id: '2fc5c912-629b-4cbe-b5e3-7e3f0651c628',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.messages[0].type }}',
                  rightValue: 'text'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Audio',
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
                  id: '26a3d85c-0815-48ff-85ce-713129a1107c',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.messages[0].type }}',
                  rightValue: 'audio'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Image',
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
                  id: '840b95b8-6559-4fb7-b32c-651451d6d0d2',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.messages[0].type }}',
                  rightValue: 'image'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Document',
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
                  id: '3e7a07f9-b785-450c-8c68-f6b276838503',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.messages[0].type }}',
                  rightValue: 'document'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Route Types' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '={{ $json.text }}',
      options: { systemMessage: '' },
      promptType: 'define'
    }, subnodes: { memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '=memory_{{ $(\'WhatsApp Trigger\').item.json.contacts[0].wa_id }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas', version: 1.1, config: { parameters: {
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
        }, name: 'Embeddings OpenAI' } }) }, name: 'MongoDB Vector Search' } })] }, position: [3720, 400], name: 'Knowledge Base Agent' } }))
  .then(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '={{ $json.output }}',
      operation: 'send',
      phoneNumberId: '677680658761861',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [4080, 400], name: 'Send Response' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2240, 160], name: 'Download Voicemail' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: { options: {}, resource: 'audio', operation: 'translate' }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [2460, 160], name: 'OpenAI' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2240, 400], name: 'Download Image' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-mini',
        cachedResultName: 'GPT-4O-MINI'
      },
      options: { detail: 'auto' },
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [2460, 400], name: 'OpenAI1' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '48af2dcc-4ce9-45fc-abfc-54f803930092',
            name: 'text',
            type: 'string',
            value: '=User image description: {{ $json.content }}\n\nUser image caption: {{ $(\'Route Types\').item.json.messages[0].image.caption }}'
          }
        ]
      }
    }, position: [2680, 400], name: 'Map image prompt' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: { response: { response: {} } },
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2240, 740], name: 'Download Document' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'let requests = $("Download Document").all()\n\nrequests.forEach((request) => {\n  let mime_type = request.json.mime_type\n\n  if (\n    mime_type === "text/calendar" || \n    mime_type === "application/ics" || \n    mime_type === "text/x-calendar"\n  ) {\n    request.json.mime_type = "mapped/calendar"\n  }\n\n  if (\n    mime_type === "application/xml" || \n    mime_type === "text/xml") {\n    request.json.mime_type = "mapped/xml"\n  }\n\n  if (!mime_type) {\n    request.json.mime_type = $(\'Gets WhatsApp Document Source URL\').first().json.mime_type\n  }\n})\n\nreturn requests;'
    }, position: [2420, 740], name: 'Map file extensions' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'da68bcca-a2a6-4676-8649-6fb1b664e44c',
            name: 'text',
            type: 'string',
            value: '=Parsed text: {{ $json.text || $json.data || $json }}\n\nCaption text: {{ $(\'Route Types\').item.json.messages[0].document.caption }}\n\nMimeType: {{ $(\'Gets WhatsApp Document Source URL\').item.json.mime_type }}'
          }
        ]
      }
    }, position: [3440, 800], name: 'Map document prompt' } }), node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'pdf' }, position: [3060, 860], name: 'Extract from PDF' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '72ae0d20-616a-4a65-9b14-53bf53656091',
            name: 'data',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [3200, 980], name: 'Map JSON' } }), node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'xls' }, position: [2960, 1060], name: 'Extract from XLS' } }), node({ type: 'n8n-nodes-base.extractFromFile', version: 1, config: { parameters: { options: {}, operation: 'xlsx', binaryPropertyName: '=data' }, position: [2960, 1220], name: 'Extract from XLSX' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '=The File type you provided is unsupported.',
      operation: 'send',
      phoneNumberId: '677680658761861',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [2960, 1380], name: 'Send Unsupported Response' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'CSV',
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
                  id: '14e23243-cd44-4cb1-99bd-9e6905d511ad',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'text/csv'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'HTML',
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
                  id: '6d7616c5-6bdd-47b7-923e-639491d15a4e',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'text/html'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'Calendar',
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
                  id: 'a2174e02-378a-41ff-b269-61f4fc3f1de9',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: '=mapped/calendar'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'RTF',
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
                  id: 'f3b406d7-362d-473e-8edd-c3e5f2d9c44c',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'text/rtf'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'TXT',
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
                  id: '64dd4658-54e7-4453-adbc-7067dffcd555',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'text/plain'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'XML',
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
                  id: '7540a3ab-b48e-4bec-94e9-a5dfc3d65a4c',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'mapped/xml'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'PDF',
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
                  id: '88b618fd-9a88-491e-91dd-c5fc9efa36e3',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'application/pdf'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'JSON',
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
                  id: '9c4d90aa-b4ea-4a63-b15e-666899c8360e',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'application/json'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'XLS',
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
                  id: '9baa7c88-3950-4099-8498-99a4640b95e7',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'application/vnd.ms-excel'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'XLSX',
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
                  id: 'b83e540c-ba1e-42d0-ac83-f675e25e6aea',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'ELSE',
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
                  id: 'ea3be820-2ead-4ec2-b292-42d3c7804b55',
                  operator: { type: 'string', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.mime_type }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Route Document Types' }))
  .add(sticky('Run this workflow manually to import and index Google Docs product documentation into MongoDB with vector embeddings for fast search.', { name: 'Sticky Note', color: 5, position: [1000, -580] }))
  .add(sticky('This workflow listens for WhatsApp messages (text, audio, image, documents), converts them into embeddings, searches MongoDB, and uses GPT-4o-mini to provide context-aware answers with conversation memory.', { name: 'Sticky Note1', color: 4, position: [1000, 360], height: 280 }))
  .add(sticky('Search Index Example \n\n{\n  "mappings": {\n    "dynamic": false,\n    "fields": {\n      "_id": {\n        "type": "string"\n      },\n      "text": {\n        "type": "string"\n      },\n      "embedding": {\n        "type": "knnVector",\n        "dimensions": 1536,\n        "similarity": "cosine"\n      },\n      "source": {\n        "type": "string"\n      },\n      "doc_id": {\n        "type": "string"\n      }\n    }\n  }\n}\n', { name: 'Sticky Note2', position: [2220, -580], height: 540 }))