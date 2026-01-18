return workflow('', '')
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.3, config: { parameters: { options: {} }, position: [-384, -96], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      options: {
        systemMessage: '=You are a helpful Meta ads assistant.\n\nCurrent date is: {{ $today.format(\'yyyy-MM-dd\') }}'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1, config: { name: 'Calculator' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { parameters: {
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'UXdblREvbkvy3WSs',
            cachedResultName: 'Meta Ads Agent'
          },
          description: 'List ad details for a given ad account. Use account id (regexp act_\\d+) instead of account name.',
          workflowInputs: {
            value: {
              id: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'id\', `Account id (regexp act_\\\\d+)`, \'string\') }}',
              since: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'since\', ``, \'string\') }}',
              until: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'until\', ``, \'string\') }}',
              command: 'list_ads'
            },
            schema: [
              {
                id: 'command',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'command',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'id',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'id',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'since',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'since',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'until',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'until',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['command'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'ad details' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { parameters: {
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'UXdblREvbkvy3WSs',
            cachedResultName: 'Meta Ads Agent'
          },
          description: 'List ad accounts',
          workflowInputs: {
            value: { command: 'list_accounts' },
            schema: [
              {
                id: 'command',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'command',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'id',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'id',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'since',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'since',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'until',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'until',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['command'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'list accounts' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { parameters: {
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'UXdblREvbkvy3WSs',
            cachedResultName: 'Meta Ads Agent'
          },
          description: 'List ad accounts',
          workflowInputs: {
            value: {
              id: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'id\', `Account id (regexp act_\\\\d+)`, \'string\') }}',
              since: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'since\', `Starting date (YYYY-MM-DD)`, \'string\') }}',
              until: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'until\', `End date (YYYY-MM-DD)`, \'string\') }}',
              command: 'account'
            },
            schema: [
              {
                id: 'command',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'command',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'id',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'id',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'since',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'since',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'until',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'until',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['command'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'account details' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-5-mini',
            cachedResultName: 'gpt-5-mini'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [88, -96], name: 'AI Agent' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: {
      workflowInputs: {
        values: [
          { name: 'command' },
          { name: 'id' },
          { name: 'since' },
          { name: 'until' }
        ]
      }
    }, position: [-384, 504], name: 'When Executed by Another Workflow' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ff699971-c2bb-4e24-96c1-a246cdd3f87b',
            name: 'since',
            type: 'string',
            value: '={{ $json.since ?? $today.startOf(\'month\') }}'
          },
          {
            id: '76e8ddf3-e35c-4f4a-bcd6-db751d4443e2',
            name: 'until',
            type: 'string',
            value: '={{ $json.until ?? $today.endOf(\'month\') }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [-160, 504], name: 'since, until' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'adaccounts',
      node: 'me',
      options: { fields: { field: [{ name: 'name' }] } },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [288, 312], name: 'graph: adaccounts' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '481319e1-d562-415d-aa04-4063421bc9b1',
            name: 'id',
            type: 'string',
            value: '={{ $json.id.startsWith(\'act\') ? $json.id : \'act_\'+$json.id }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [288, 504], name: 'fix missing act_' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '481319e1-d562-415d-aa04-4063421bc9b1',
            name: 'id',
            type: 'string',
            value: '={{ $json.id.startsWith(\'act\') ? $json.id : \'act_\'+$json.id }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [288, 1000], name: 'Edit Fields' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'list_accounts',
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
                  id: '6890448a-74f3-497b-8996-0edc456ef140',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.command }}',
                  rightValue: 'list_accounts'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'account',
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
                  id: 'e8c7ff7a-abae-4a60-996f-b57322c513f2',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.command }}',
                  rightValue: 'account'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'list_ads',
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
                  id: 'dc723584-5403-443b-b770-820f561e801b',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.command }}',
                  rightValue: 'list_ads'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    } }))
  .then(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [512, 504], name: 'No Operation, do nothing' } }))
  .then(merge([node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'campaigns',
      node: '={{ $json.id }}',
      options: {
        fields: { field: [{ name: 'id,name,status' }] },
        queryParameters: {
          parameter: [{ name: 'effective_status', value: '=["ACTIVE"]' }]
        }
      },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [736, 232], name: 'account: campaigns' } }), node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'adsets',
      node: '={{ $json.id }}',
      options: {
        fields: { field: [{ name: 'id,name,status,campaign' }] },
        queryParameters: {
          parameter: [{ name: 'effective_status', value: '=["ACTIVE"]' }]
        }
      },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [736, 424], name: 'account: adsets' } }), node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'ads',
      node: '={{ $json.id }}',
      options: {
        fields: {
          field: [{ name: 'id,name,status,campaign{id,name},adset{id,name}' }]
        },
        queryParameters: {
          parameter: [{ name: 'effective_status', value: '=["ACTIVE"]' }]
        }
      },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [736, 616], name: 'account: ads' } }), node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'insights',
      node: '={{ $json.id }}',
      options: {
        fields: {
          field: [
            {
              name: 'attribution_setting,conversion_values,conversions,cost_per_conversion,cpc,cpm,ctr,frequency,impressions,inline_post_engagement,purchase_roas,reach,result_rate,results,spend'
            }
          ]
        },
        queryParameters: {
          parameter: [
            {
              name: 'time_range[since]',
              value: '={{ $json.since.replace(/T.*/,\'\') }}'
            },
            {
              name: 'time_range[until]',
              value: '={{ $json.until.replace(/T.*/,\'\') }}'
            }
          ]
        }
      },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [736, 808], name: 'account insights' } })], { version: 3.2, parameters: {
      mode: 'combine',
      options: { includeUnpaired: true },
      combineBy: 'combineByPosition',
      numberInputs: 4
    } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      mode: 'runOnceForEachItem',
      jsCode: 'return {\n  campaigns: $(\'account: campaigns\').item.json.data,\n  adsets: $(\'account: adsets\').item.json.data,\n  ads:   $(\'account: ads\').item.json.data,\n  account_insights: $(\'account insights\').item.json.data\n}'
    }, position: [1184, 616] } }))
  .then(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [512, 1000], name: 'No Operation, do nothing1' } }))
  .then(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: '=',
      node: '={{ $json.id }}',
      options: {
        fields: {
          field: [
            {
              name: '=ads{id,status,name,insights{clicks,impressions,purchase_roas,conversion_values,conversions},campaign{id,name},adset{id,name}}'
            }
          ]
        },
        queryParameters: {
          parameter: [{ name: 'effective_status', value: '=["ACTIVE"]' }]
        }
      },
      graphApiVersion: 'v23.0'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [736, 1000], name: 'ads: insights' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      mode: 'runOnceForEachItem',
      jsCode: 'return {\n  ads:   $(\'ads: insights\').item.json.ads.data,\n}'
    }, position: [960, 1000], name: 'Code1' } }))