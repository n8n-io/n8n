return workflow('vPkPxcHDEdL6FNZi', '🤖 SUPERVISOR AVA', {
    timezone: 'America/Toronto',
    callerPolicy: 'workflowsFromSameOwner',
    executionOrder: 'v1',
    timeSavedPerExecution: 4
  })
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.1, config: { parameters: { updates: ['message'], additionalFields: { download: true } }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [120, 20], name: 'Telegram Trigger1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.8, config: { parameters: {
      text: '={{ $(\'Telegram Trigger1\').item.json.message.text }}',
      options: {
        systemMessage: '=# ROLE\n\nYou are an AI agent called Ava.\n\nYour job is to orchestrate the activities between different agents and then formulate a friendly response back to the user.\n\nYou should never write emails, create contacts, create content, create calendar events, create summaries yourself. Your job is to call agents and tools in the correct sequence.\n\nThink carefully about the sequence of events. Some tools might first require you to call another tool in order to pass it the correct information.\n\n\nThe tools are:\n- Calendar\n- Contacts\n- Gmail\n- Google Search \n- Calculator\n\n\n# ADDITIONAL INFORMATION\n- You are talking to Jordan\n- The current date and time is {{  $now.toString() }}\n- Time zone is EST (Ottawa)\n\n\n\n# RULES',
        returnIntermediateSteps: true
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'Gmail',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'mh7GGdzmesTrHGxU',
            cachedResultName: '🤖 Gmail Agent'
          },
          description: 'Use this tool for any email related actions.',
          workflowInputs: {
            value: {},
            schema: [],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Gmail' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'Calendar',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'tC8OSGmmiBE9kvnt',
            cachedResultName: '🤖 Calendar Agent'
          },
          description: 'Use this tool for any Calendar related actions.',
          workflowInputs: {
            value: {},
            schema: [],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Calendar' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'Contacts',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'ydXdT3mvOkaFRYKS',
            cachedResultName: '🤖 Contacts Agent'
          },
          description: 'Use this tool for any contacts related actions.',
          workflowInputs: {
            value: { aNumber: 0 },
            schema: [
              {
                id: 'query',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'query',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'aNumber',
                type: 'number',
                display: true,
                removed: false,
                required: false,
                displayName: 'aNumber',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Contacts' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1, config: { name: 'Calculator' } }), tool({ type: 'n8n-nodes-base.perplexityTool', version: 1, config: { parameters: {
          model: 'sonar',
          options: {},
          messages: {
            message: [
              {
                content: '={{ $(\'Telegram Trigger1\').item.json.message.text }}'
              }
            ]
          },
          requestOptions: {}
        }, credentials: {
          perplexityApi: { id: 'credential-id', name: 'perplexityApi Credential' }
        }, name: 'Perplexity' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'credential-id', name: 'serpApi Credential' }
        }, name: 'Google Search' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { parameters: {
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'a3bvZDBy1bGKYKXt',
            cachedResultName: 'LinkedIn Comment Agent'
          },
          description: 'Use this tool for any LinkedIn Comment related action.',
          workflowInputs: {
            value: {
              query: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'query\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'query',
                type: 'string',
                display: true,
                required: false,
                displayName: 'query',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'aNumber',
                type: 'number',
                display: true,
                removed: true,
                required: false,
                displayName: 'aNumber',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'LinkedIn Comment Agent' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'Telegram Trigger1\').item.json.message.chat.id }}',
          sessionIdType: 'customKey',
          contextWindowLength: 7
        }, name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'openai/gpt-4o', options: {} }, credentials: {
          openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' }
        }, name: 'OpenRouter Chat Model' } }) }, position: [340, 20], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.output }}',
      chatId: '={{ $(\'Telegram Trigger1\').item.json.message.chat.id }}',
      additionalFields: { appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [820, 20], name: 'Response' } }))