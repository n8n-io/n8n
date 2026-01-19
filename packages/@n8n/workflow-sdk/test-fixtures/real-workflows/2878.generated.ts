return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {
        path: 'deep_research',
        ignoreBots: true,
        buttonLabel: 'Next'
      },
      formTitle: ' DeepResearcher',
      formFields: { values: [{ fieldType: 'html' }] },
      formDescription: '=DeepResearcher is a multi-step, recursive approach using the internet to solve complex research tasks, accomplishing in tens of minutes what a human would take many hours.\n\nTo use, provide a short summary of what the research and how "deep" you\'d like the workflow to investigate. Note, the higher the numbers the more time and cost will occur for the research.\n\nThe workflow is designed to complete independently and when finished, a report will be saved in a designated Notion Database.'
    }, position: [-1760, -460], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {
        formTitle: 'DeepResearcher',
        formDescription: '=<img\n  src="https://res.cloudinary.com/daglih2g8/image/upload/f_auto,q_auto/v1/n8n-workflows/o4wqztloz3j6okfxpeyw"\n  width="100%"\n  style="border:1px solid #ccc"\n/>'
      },
      formFields: {
        values: [
          {
            fieldType: 'textarea',
            fieldLabel: 'What would you like to research?',
            requiredField: true
          },
          {
            html: '<video\n    style="display:none"\n    src="/when_will_n8n_support_range_sliders.mp4"\n    onerror=\'\n  this.insertAdjacentHTML(`afterend`,\n  `<div class="form-group" style="margin-bottom:16px;">\n    <label class="form-label" for="breadth">\n      Enter research depth (Default 1)\n    </label>\n    <p style="font-size:12px;color:#666;text-align:left">\n      This value determines how many sub-queries to generate.\n    </p>\n    <input\n      class="form-input"\n      type="range"\n      id="depth"\n      name="field-1"\n      value="1"\n      step="1"\n      max="5"\n      min="1"\n      list="depth-markers"\n    >\n    <datalist\n      id="depth-markers"\n      style="display: flex;\n      flex-direction: row;\n      justify-content: space-between;\n      writing-mode: horizontal-tb;\n      margin-top: -10px;\n      text-align: center;\n      font-size: 10px;\n      margin-left: 16px;\n      margin-right: 16px;"\n    >\n      <option value="1" label="1"></option>\n      <option value="2" label="2"></option>\n      <option value="3" label="3"></option>\n      <option value="4" label="4"></option>\n      <option value="5" label="5"></option>\n    </datalist>\n  </div>`)\n  \'\n/>',
            fieldType: 'html',
            elementName: 'input-depth'
          },
          {
            html: '<video\n    style="display:none"\n    src="/when_will_n8n_support_range_sliders.mp4"\n    onerror=\'\n  this.insertAdjacentHTML(`afterend`,\n  `<div class="form-group" style="margin-bottom:16px;">\n    <label class="form-label" for="breadth">\n      Enter research breadth (Default 2)\n    </label>\n    <p style="font-size:12px;color:#666;text-align:left">\n      This value determines how many sources to explore.\n    </p>\n    <input\n      class="form-input"\n      type="range"\n      id="breadth"\n      name="field-2"\n      value="2"\n      step="1"\n      max="5"\n      min="1"\n      list="breadth-markers"\n    >\n    <datalist\n      id="breadth-markers"\n      style="display: flex;\n      flex-direction: row;\n      justify-content: space-between;\n      writing-mode: horizontal-tb;\n      margin-top: -10px;\n      text-align: center;\n      font-size: 10px;\n      margin-left: 16px;\n      margin-right: 16px;"\n    >\n      <option value="1" label="1"></option>\n      <option value="2" label="2"></option>\n      <option value="3" label="3"></option>\n      <option value="4" label="4"></option>\n      <option value="5" label="5"></option>\n    </datalist>\n  </div>`)\n  \'\n/>\n',
            fieldType: 'html',
            elementName: 'input-breadth'
          },
          {
            fieldType: 'dropdown',
            fieldLabel: '={{ "" }}',
            multiselect: true,
            fieldOptions: {
              values: [
                {
                  option: '=I understand higher depth and breath values I\'ve selected may incur longer wait times and higher costs. I acknowledging this and wish to proceed with the research request.'
                }
              ]
            },
            requiredField: true
          }
        ]
      }
    }, position: [-1560, -460], name: 'Research Request' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'df28b12e-7c20-4ff5-b5b8-dc773aa14d4b',
            name: 'request_id',
            type: 'string',
            value: '={{ $execution.id }}'
          },
          {
            id: '9362c1e7-717d-444a-8ea2-6b5f958c9f3f',
            name: 'prompt',
            type: 'string',
            value: '={{ $json[\'What would you like to research?\'] }}'
          },
          {
            id: '09094be4-7844-4a9e-af82-cc8e39322398',
            name: 'depth',
            type: 'number',
            value: '={{\n!isNaN($json[\'input-depth\'][0].toNumber())\n  ? $json[\'input-depth\'][0].toNumber()\n  : 1\n}}'
          },
          {
            id: '3fc30a30-7806-4013-835d-97e27ddd7ae1',
            name: 'breadth',
            type: 'number',
            value: '={{\n!isNaN($json[\'input-breadth\'][0].toNumber())\n  ? $json[\'input-breadth\'][0].toNumber()\n  : 1\n}}'
          }
        ]
      }
    }, position: [-1360, -460], name: 'Set Variables' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '=Given the following query from the user, ask some follow up questions to clarify the research direction. Return a maximum of 3 questions, but feel free to return less if the original query is clear: <query>{{ $json.prompt }}</query>`',
      messages: {
        messageValues: [
          {
            type: 'HumanMessagePromptTemplate',
            message: '=You are an expert researcher. Today is {{ $now.toLocaleString() }}. Follow these instructions when responding:\n  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.\n  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.\n  - Be highly organized.\n  - Suggest solutions that I didn\'t think about.\n  - Be proactive and anticipate my needs.\n  - Treat me as an expert in all subject matter.\n  - Mistakes erode my trust, so be accurate and thorough.\n  - Provide detailed explanations, I\'m comfortable with lots of detail.\n  - Value good arguments over authorities, the source is irrelevant.\n  - Consider new technologies and contrarian ideas, not just the conventional wisdom.\n  - You may use high levels of speculation or prediction, just flag it for me.'
          }
        ]
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'o3-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model2' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "questions": {\n      "type": "array",\n      "description": "Follow up questions to clarify the research direction, max of 3.",\n      "items": {\n          "type": "string"\n      }\n    }\n  }\n}'
        }, name: 'Structured Output Parser1' } }) }, position: [-1040, -460], name: 'Clarifying Questions' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'output.questions' }, position: [-720, -460], name: 'Feedback to Items' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [-540, -460], name: 'For Each Question...' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '14b77741-c3c3-4bd2-be6e-37bd09fcea2b',
            name: 'query',
            type: 'string',
            value: '=Initial query: {{ $(\'Set Variables\').first().json.prompt }}\nFollow-up Questions and Answers:\n{{\n$input.all()\n  .map(item => {\n    const q = Object.keys(item.json)[0];\n    const a = item.json[q];\n    return `question: ${q}\\nanswer: ${a}`;\n  })\n  .join(\'\\n\')\n}}'
          }
        ]
      }
    }, position: [-360, -540], name: 'Get Initial Query' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '=Create a suitable title for the research report which will be created from the user\'s query.\n<query>{{ $json.query }}</query>',
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'o3-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model4' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "title": {\n      "type": "string",\n      "description":" A short title summarising the research topic"\n    },\n    "description": {\n      "type": "string",\n      "description": "A short description to summarise the research topic"\n    }\n  }\n}'
        }, name: 'Structured Output Parser4' } }) }, position: [-20, -420], name: 'Report Page Generator' } }))
  .then(node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { parameters: {
      title: '={{ $json.output.title }}',
      options: {},
      resource: 'databasePage',
      databaseId: {
        __rl: true,
        mode: 'list',
        value: '19486dd6-0c0c-80da-9cb7-eb1468ea9afd',
        cachedResultUrl: 'https://www.notion.so/19486dd60c0c80da9cb7eb1468ea9afd',
        cachedResultName: 'n8n DeepResearch'
      },
      propertiesUi: {
        propertyValues: [
          {
            key: 'Description|rich_text',
            textContent: '={{ $json.output.description }}'
          },
          { key: 'Status|status', statusValue: 'Not started' },
          {
            key: 'Request ID|rich_text',
            textContent: '={{ $(\'Set Variables\').first().json.request_id }}'
          },
          { key: 'Name|title', title: '={{ $json.output.title }}' }
        ]
      }
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [300, -420], name: 'Create Row' } }))
  .then(node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { parameters: {
      mode: 'each',
      options: { waitForSubWorkflow: false },
      workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
      workflowInputs: {
        value: {
          data: '={{\n{\n  "query": $(\'Get Initial Query\').first().json.query,\n  "learnings": [],\n  "depth": $(\'Set Variables\').first().json.depth,\n  "breadth": $(\'Set Variables\').first().json.breadth,\n}\n}}',
          jobType: 'deepresearch_initiate',
          requestId: '={{ $(\'Set Variables\').first().json.request_id }}'
        },
        schema: [
          {
            id: 'requestId',
            display: true,
            removed: false,
            required: false,
            displayName: 'requestId',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'jobType',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'jobType',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'data',
            type: 'object',
            display: true,
            removed: false,
            required: false,
            displayName: 'data',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      }
    }, position: [600, -420], name: 'Initiate DeepResearch' } }))
  .then(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {
        formTitle: 'DeepResearcher',
        buttonLabel: 'Done',
        formDescription: '=<img\n  src="https://res.cloudinary.com/daglih2g8/image/upload/f_auto,q_auto/v1/n8n-workflows/o4wqztloz3j6okfxpeyw"\n  width="100%"\n  style="border:1px solid #ccc"\n/>\n<p style="text-align:left">\n<strong style="display:block;font-family:sans-serif;font-weight:700;font-size:16px;margin-top:12px;margin-bottom:0;">Your Report Is On Its Way!</strong>\n<br/>\nDeepResearcher will now work independently to conduct the research and the compiled report will be uploaded to the following Notion page below when finished.\n<br/><br/>\nPlease click the "Done" button to complete the form.\n</p>\n<hr style="display:block;margin-top:16px;margin-bottom:0" />'
      },
      formFields: {
        values: [
          {
            html: '=<a href="{{ $json.url }}" style="text-decoration:none" target="_blank">\n<div style="display:flex;text-align:left;font-family:sans-serif;">\n  <div style="width:150px;height:150px;padding:12px;">\n    <img src="https://res.cloudinary.com/daglih2g8/image/upload/f_auto,q_auto/v1/n8n-workflows/cajjymprexcoesu4gg9g" width="100%" />\n  </div>\n  <div style="width:100%;padding:12px;">\n    <div style="font-size:14px;font-weight:700">{{ $json.name }}</div>\n    <div style="font-size:12px;color:#666">\n      {{ $json.property_description }}\n    </div>\n  </div>\n</div>\n</a>',
            fieldType: 'html'
          }
        ]
      }
    }, position: [780, -420], name: 'Confirmation' } }))
  .then(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {},
      operation: 'completion',
      completionTitle: '=Thank you for using DeepResearcher.',
      completionMessage: '=You may now close this window.'
    }, position: [960, -420], name: 'End Form' } }))
  .add(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {
        formTitle: 'DeepResearcher',
        buttonLabel: 'Answer',
        formDescription: '=<img\n  src="https://res.cloudinary.com/daglih2g8/image/upload/f_auto,q_auto/v1/n8n-workflows/o4wqztloz3j6okfxpeyw"\n  width="100%"\n  style="border:1px solid #ccc"\n/>\n<p style="text-align:left">\nAnswer the following clarification questions to assist the DeepResearcher better under the research topic.\n</p>\n<hr style="display:block;margin-top:16px;margin-bottom:0" />\n<p style="text-align:left;font-family:sans-serif;font-weight:700;">\nTotal {{ $(\'Feedback to Items\').all().length }} questions.\n</p>'
      },
      formFields: {
        values: [
          {
            fieldType: 'textarea',
            fieldLabel: '={{ $json["output.questions"] }}',
            placeholder: '=',
            requiredField: true
          }
        ]
      }
    }, position: [-360, -380], name: 'Ask Clarity Questions' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: {
      workflowInputs: {
        values: [
          { name: 'requestId', type: 'any' },
          { name: 'jobType' },
          { name: 'data', type: 'object' }
        ]
      }
    }, position: [-1880, 820], name: 'DeepResearch Subworkflow' } }))
  .then(node({ type: 'n8n-nodes-base.executionData', version: 1, config: { parameters: {
      dataToSave: {
        values: [
          { key: 'requestId', value: '={{ $json.requestId }}' },
          { key: '=jobType', value: '={{ $json.jobType }}' }
        ]
      }
    }, position: [-1700, 820] } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { parameters: {
      limit: 1,
      filters: {
        conditions: [
          {
            key: 'Request ID|rich_text',
            condition: 'equals',
            richTextValue: '={{ $json.requestId.toString() }}'
          }
        ]
      },
      options: {},
      resource: 'databasePage',
      matchType: 'allFilters',
      operation: 'getAll',
      databaseId: {
        __rl: true,
        mode: 'list',
        value: '19486dd6-0c0c-80da-9cb7-eb1468ea9afd',
        cachedResultUrl: 'https://www.notion.so/19486dd60c0c80da9cb7eb1468ea9afd',
        cachedResultName: 'n8n DeepResearch'
      },
      filterType: 'manual'
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [-1040, 180], name: 'Get Existing Row' } }), node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '=Given the following prompt from the user, generate a list of SERP queries to research the topic.\nReduce the number of words in each query to its keywords only.\nReturn a maximum of {{ $(\'JobType Router\').first().json.data.breadth }} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>{{ $(\'JobType Router\').first().json.data.query.trim() }}</prompt>\n\n{{\n$(\'JobType Router\').first().json.data.learnings.length\n  ? `Here are some learnings from previous research, use them to generate more specific queries:\\n${$(\'JobType Router\').first().json.data.learnings.map(text => `* ${text}`).join(\'\\n\')}`\n  : \'\'\n}}',
      messages: {
        messageValues: [
          {
            type: 'HumanMessagePromptTemplate',
            message: '=You are an expert researcher. Today is {{ $now.toLocaleString() }}. Follow these instructions when responding:\n  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.\n  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.\n  - Be highly organized.\n  - Suggest solutions that I didn\'t think about.\n  - Be proactive and anticipate my needs.\n  - Treat me as an expert in all subject matter.\n  - Mistakes erode my trust, so be accurate and thorough.\n  - Provide detailed explanations, I\'m comfortable with lots of detail.\n  - Value good arguments over authorities, the source is irrelevant.\n  - Consider new technologies and contrarian ideas, not just the conventional wisdom.\n  - You may use high levels of speculation or prediction, just flag it for me.'
          }
        ]
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'o3-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model3' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "queries": {\n      "type": "array",\n      "items": {\n        "type": "object",\n        "properties": {\n          "query": {\n            "type": "string",\n            "description": "The SERP query"\n          },\n          "researchGoal": {\n            "type": "string",\n            "description": "First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions."\n          }\n        }\n      }\n    }\n  }\n}'
        }, name: 'Structured Output Parser2' } }) }, position: [-1040, 820], name: 'Generate SERP Queries' } }), node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { parameters: {
      limit: 1,
      filters: {
        conditions: [
          {
            key: 'Request ID|rich_text',
            condition: 'equals',
            richTextValue: '={{ $json.requestId.toString() }}'
          }
        ]
      },
      options: {},
      resource: 'databasePage',
      matchType: 'allFilters',
      operation: 'getAll',
      databaseId: {
        __rl: true,
        mode: 'list',
        value: '19486dd6-0c0c-80da-9cb7-eb1468ea9afd',
        cachedResultUrl: 'https://www.notion.so/19486dd60c0c80da9cb7eb1468ea9afd',
        cachedResultName: 'n8n DeepResearch'
      },
      filterType: 'manual'
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [-1020, 1600], name: 'Get Existing Row1' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'initiate',
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
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.jobType }}',
                  rightValue: 'deepresearch_initiate'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'learnings',
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
                  id: 'ecbfa54d-fc97-48c5-8d3d-f0538b8d727b',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.jobType }}',
                  rightValue: 'deepresearch_learnings'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'report',
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
                  id: '392f9a98-ec22-4e57-9c8e-0e1ed6b7dafa',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.jobType }}',
                  rightValue: 'deepresearch_report'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'JobType Router' }))
  .then(node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { parameters: {
      pageId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {},
      resource: 'databasePage',
      operation: 'update',
      propertiesUi: {
        propertyValues: [{ key: 'Status|status', statusValue: 'In progress' }]
      }
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [-840, 180], name: 'Set In-Progress' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'acb41e93-70c6-41a3-be0f-e5a74ec3ec88',
            name: 'query',
            type: 'string',
            value: '={{ $(\'JobType Router\').first().json.data.query }}'
          },
          {
            id: '7fc54063-b610-42bc-a250-b1e8847c4d1e',
            name: 'learnings',
            type: 'array',
            value: '={{ $(\'JobType Router\').first().json.data.learnings }}'
          },
          {
            id: 'e8f1c158-56fb-41c8-8d86-96add16289bb',
            name: 'breadth',
            type: 'number',
            value: '={{ $(\'JobType Router\').first().json.data.breadth }}'
          }
        ]
      }
    }, position: [-580, 180], name: 'Set Initial Query' } }))
  .then(node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { parameters: {
      mode: 'each',
      options: { waitForSubWorkflow: true },
      workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
      workflowInputs: {
        value: {
          data: '={{ $json }}',
          jobType: 'deepresearch_learnings',
          requestId: '={{ $(\'JobType Router\').first().json.requestId }}'
        },
        schema: [
          {
            id: 'requestId',
            display: true,
            removed: false,
            required: false,
            displayName: 'requestId',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'jobType',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'jobType',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'data',
            type: 'object',
            display: true,
            removed: false,
            required: false,
            displayName: 'data',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      }
    }, position: [-380, 180], name: 'Generate Learnings' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'db509e90-9a86-431f-8149-4094d22666cc',
            name: 'should_stop',
            type: 'boolean',
            value: '={{\n$runIndex >= ($(\'JobType Router\').first().json.data.depth)\n}}'
          },
          {
            id: '90986e2b-8aca-4a22-a9db-ed8809d6284d',
            name: 'all_learnings',
            type: 'array',
            value: '={{\nArray($runIndex+1)\n  .fill(0)\n  .flatMap((_,idx) => {\n    try {\n      return $(\'Generate Learnings\')\n        .all(0,idx)\n        .flatMap(item => item.json.data.flatMap(d => d.learnings))\n    } catch (e) {\n      return []\n    }\n  })\n}}'
          },
          {
            id: '3eade958-e8ab-4975-aac4-f4a4a983c163',
            name: 'all_urls',
            type: 'array',
            value: '={{\nArray($runIndex+1)\n  .fill(0)\n  .flatMap((_,idx) => {\n    try {\n      return $(\'Generate Learnings\')\n        .all(0,idx)\n        .flatMap(item => item.json.data.flatMap(d => d.urls))\n    } catch (e) {\n      return []\n    }\n  })\n}}'
          }
        ]
      }
    }, position: [-200, 180], name: 'Accumulate Results' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '90b3da00-dcd5-4289-bd45-953146a3b0ba',
            name: 'all_learnings',
            type: 'array',
            value: '={{ $json.all_learnings }}'
          },
          {
            id: '623dbb3d-83a1-44a9-8ad3-48d92bc42811',
            name: 'all_urls',
            type: 'array',
            value: '={{ $json.all_urls }}'
          }
        ]
      }
    }, position: [160, 180], name: 'Get Research Results' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      mode: 'raw',
      options: {},
      jsonOutput: '={{ $(\'Generate Learnings\').item.json }}'
    }, position: [160, 360], name: 'DeepResearch Results' } })], { version: 2.2, parameters: {
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
            id: '75d18d88-6ba6-43df-bef7-3e8ad99ad8bd',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            leftValue: '={{ $json.should_stop }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Is Depth Reached?' }))
  .then(node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { parameters: {
      options: { waitForSubWorkflow: false },
      workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
      workflowInputs: {
        value: {
          data: '={{\n{\n  ...Object.assign({}, $json),\n  query: $(\'JobType Router\').first().json.data.query\n}\n}}',
          jobType: 'deepresearch_report',
          requestId: '={{ $(\'JobType Router\').first().json.requestId }}'
        },
        schema: [
          {
            id: 'requestId',
            display: true,
            required: false,
            displayName: 'requestId',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'jobType',
            type: 'string',
            display: true,
            required: false,
            displayName: 'jobType',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'data',
            type: 'object',
            display: true,
            required: false,
            displayName: 'data',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      }
    }, position: [480, 180], name: 'Generate Report' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'data' }, position: [320, 360], name: 'Results to Items' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'd88bfe95-9e73-4d25-b45c-9f164b940b0e',
            name: 'query',
            type: 'string',
            value: '=Previous research goal: {{ $json.researchGoal }}\nFollow-up research directions: {{ $json.followUpQuestions.map(q => `\\n${q}`).join(\'\') }}'
          },
          {
            id: '4aa20690-d998-458a-b1e4-0d72e6a68e6b',
            name: 'learnings',
            type: 'array',
            value: '={{ $(\'Accumulate Results\').item.json.all_learnings }}'
          },
          {
            id: '89acafae-b04a-4d5d-b08b-656e715654e4',
            name: 'breadth',
            type: 'number',
            value: '={{ $(\'JobType Router\').first().json.data.breadth }}'
          }
        ]
      }
    }, position: [480, 360], name: 'Set Next Queries' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'output.queries' }, position: [-700, 820], name: 'SERP to Items' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [-420, 860], name: 'For Each Query...' } }))
  .add(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [-220, 860], name: 'Combine & Send back to Loop' } }))
  .add(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [-220, 1020], name: 'Item Ref' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items',
      method: 'POST',
      options: {},
      sendBody: true,
      sendQuery: true,
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'query',
            value: '={{\n`${$json.query} -filetype:pdf (-site:tiktok.com OR -site:instagram.com OR -site:youtube.com OR -site:linkedin.com OR -site:reddit.com)`\n}}'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth',
      queryParameters: {
        parameters: [
          { name: 'memory', value: '4096' },
          { name: 'timeout', value: '180' }
        ]
      }
    }, credentials: {
      httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-40, 1020], name: 'RAG Web Browser' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.stopAndError', version: 1, config: { parameters: {
      errorMessage: '=Apify Auth Error! Check your API token is valid and make sure you put "Bearer <api_key>" if using HeaderAuth.'
    }, position: [300, 860], name: 'Stop and Error' } }), node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { parameters: {
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
            id: 'f44691e4-f753-47b0-b66a-068a723b6beb',
            operator: { type: 'string', operation: 'equals' },
            leftValue: '={{ $json.crawl.requestStatus }}',
            rightValue: 'handled'
          },
          {
            id: '8e05df2b-0d4a-47da-9aab-da7e8907cbca',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            leftValue: '={{ $json.markdown }}',
            rightValue: ''
          }
        ]
      }
    }, position: [300, 1020], name: 'Valid Results' } })], { version: 2.2, parameters: {
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
            id: '8722e13a-d788-4145-8bea-5bc0ce0a83f8',
            operator: { type: 'number', operation: 'equals' },
            leftValue: '={{ $json.error.status }}',
            rightValue: 401
          }
        ]
      }
    }, name: 'Is Apify Auth Error?' }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'c41592db-f9f0-4228-b6d8-0514c9a21fca',
            name: 'markdown',
            type: 'string',
            value: '={{ $json.markdown }}'
          },
          {
            id: '5579a411-94dc-4b10-a276-24adf775be1d',
            name: 'url',
            type: 'string',
            value: '={{ $json.searchResult.url }}'
          }
        ]
      }
    }, position: [940, 1020], name: 'Get Markdown + URL' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '1de40158-338b-4db3-9e22-6fd63b21f825',
            name: 'ResearchGoal',
            type: 'string',
            value: '={{ $(\'Item Ref\').first().json.researchGoal }}'
          },
          {
            id: '9f59a2d4-5e5a-4d0b-8adf-2832ce746f0f',
            name: 'learnings',
            type: 'array',
            value: '={{ [] }}'
          },
          {
            id: '972ab5f5-0537-4755-afcb-d1db4f09ad60',
            name: 'followUpQuestions',
            type: 'array',
            value: '={{ [] }}'
          },
          {
            id: '90cef471-76b0-465d-91a4-a0e256335cd3',
            name: 'urls',
            type: 'array',
            value: '={{ [] }}'
          }
        ]
      }
    }, position: [640, 1160], name: 'Empty Response' } })], { version: 2.2, parameters: {
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
            id: '1ef1039a-4792-47f9-860b-d2ffcffd7129',
            operator: { type: 'object', operation: 'notEmpty', singleValue: true },
            leftValue: '={{ $json }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Has Content?' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '=Given the following contents from a SERP search for the query <query>{{ $(\'Item Ref\').first().json.query }}</query>, generate a list of learnings from the contents. Return a maximum of 3 learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and infromation dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>\n{{\n$input\n  .all()\n  .map(item =>`<content>\\n${item.json.markdown.substr(0, 25_000)}\\n</content>`)\n  .join(\'\\n\')\n}}\n</contents>',
      messages: {
        messageValues: [
          {
            type: 'HumanMessagePromptTemplate',
            message: '=You are an expert researcher. Today is {{ $now.toLocaleString() }}. Follow these instructions when responding:\n  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.\n  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.\n  - Be highly organized.\n  - Suggest solutions that I didn\'t think about.\n  - Be proactive and anticipate my needs.\n  - Treat me as an expert in all subject matter.\n  - Mistakes erode my trust, so be accurate and thorough.\n  - Provide detailed explanations, I\'m comfortable with lots of detail.\n  - Value good arguments over authorities, the source is irrelevant.\n  - Consider new technologies and contrarian ideas, not just the conventional wisdom.\n  - You may use high levels of speculation or prediction, just flag it for me.'
          }
        ]
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'o3-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "learnings": {\n      "type": "array",\n      "description": "List of learnings, max of 3.",\n      "items": { "type": "string" }\n    },\n    "followUpQuestions": {\n      "type": "array",\n      "items": {\n        "type": "string",\n        "description": "List of follow-up questions to research the topic further, max of 3."\n      }\n    }\n  }\n}'
        }, name: 'Structured Output Parser' } }) }, position: [1120, 1020], name: 'DeepResearch Learnings' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '9acec2cc-64c8-4e62-bed4-c3d9ffab1379',
            name: 'researchGoal',
            type: 'string',
            value: '={{ $(\'Item Ref\').first().json.researchGoal }}'
          },
          {
            id: '1b2d2dad-429b-4fc9-96c5-498f572a85c3',
            name: 'learnings',
            type: 'array',
            value: '={{ $json.output.learnings }}'
          },
          {
            id: '7025f533-02ab-4031-9413-43390fb61f05',
            name: 'followUpQuestions',
            type: 'string',
            value: '={{ $json.output.followUpQuestions }}'
          },
          {
            id: 'c9e34ea4-5606-46d6-8d66-cb42d772a8b4',
            name: 'urls',
            type: 'array',
            value: '={{\n$(\'Get Markdown + URL\')\n  .all()\n  .map(item => item.json.url)\n}}'
          }
        ]
      }
    }, position: [1460, 1160], name: 'Research Goal + Learnings' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '=You are are an expert and insightful researcher.\n* Given the following prompt from the user, write a final report on the topic using the learnings from research.\n* Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research.\n* Format the report in markdown. Use headings, lists and tables only and where appropriate.\n\n<prompt>{{ $(\'JobType Router\').first().json.data.query }}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n{{\n$(\'JobType Router\').first().json.data\n  .all_learnings\n  .map(item => `<learning>${item}</learning>`)  \n  .join(\'\\n\')\n}}\n</learnings>',
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'o3-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }) }, position: [-860, 1600], name: 'DeepResearch Report' } }))
  .then(node({ type: 'n8n-nodes-base.markdown', version: 1, config: { parameters: {
      mode: 'markdownToHtml',
      options: { tables: true },
      markdown: '={{ $json.text }}'
    }, position: [-380, 1600], name: 'Convert to HTML' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '851b8a3f-c2d3-41ad-bf60-4e0e667f6c58',
            name: 'tag',
            type: 'array',
            value: '={{ $json.data.match(/<table[\\s\\S]*?<\\/table>|<ul[\\s\\S]*?<\\/ul>|<[^>]+>[^<]*<\\/[^>]+>/g) }}'
          }
        ]
      }
    }, position: [-220, 1600], name: 'HTML to Array' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'tag' }, position: [-60, 1600], name: 'Tags to Items' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      text: '={{ $json.tag.trim() }}',
      messages: {
        messageValues: [
          {
            message: '=Convert the following html into its equivalent Notion Block as per Notion\'s API schema.\n* Ensure the content is always included and remains the same.\n* Return only a json response.\n* Generate child-level blocks. Should not define "parent" or "children" property.\n* Strongly prefer headings, paragraphs, tables and lists type blocks.\n* available headings are heading_1, heading_2 and heading_3 - h4,h5,h6 should use heading_3 type instead. ensure headings use the rich text definition.\n* ensure lists blocks include all list items.\n\n## Examples\n\n1. headings\n```\n<h3 id="references">References</h3>\n```\nwould convert to \n```\n{"object":  "block", "type": "heading_3", "heading_3": { "rich_text": [{"type": "text","text": {"content": "References"}}]}}\n```\n\n2. lists\n```\n<ul><li>hello</li><li>world</li></ul>\n```\nwould convert to\n```\n[\n{\n  "object": "block",\n  "type": "bulleted_list_item",\n  "bulleted_list_item": {"rich_text": [{"type": "text","text": {"content": "hello"}}]}\n},\n{\n  "object": "block",\n  "type": "bulleted_list_item",\n  "bulleted_list_item": {"rich_text": [{"type": "text","text": {"content": "world"}}]}\n}\n]\n```\n\n3. tables\n```\n<table>\n  <thead>\n    <tr><th>Technology</th><th>Potential Impact</th></tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>5G Connectivity</td><td>Enables faster data speeds and advanced apps</td>\n    </tr>\n  </tbody>\n</table>\n```\nwould convert to\n```\n{\n  "object": "block",\n  "type": "table",\n  "table": {\n    "table_width": 2,\n    "has_column_header": true,\n    "has_row_header": false,\n    "children": [\n      {\n        "object": "block",\n        "type": "table_row",\n        "table_row": {\n          "cells": [\n            [\n              {\n                "type": "text",\n                "text": {\n                  "content": "Technology",\n                  "link": null\n                }\n              },\n              {\n                "type": "text",\n                "text": {\n                  "content": "Potential Impact",\n                  "link": null\n                }\n              }\n            ],\n            [\n              {\n                "type": "text",\n                "text": {\n                  "content": "5G Connectivity",\n                  "link": null\n                }\n              },\n              {\n                "type": "text",\n                "text": {\n                  "content": "Enables faster data speeds and advanced apps",\n                  "link": null\n                }\n              }\n            ]\n          ]\n        }\n      }\n    ]\n  }\n}\n```\n4. anchor links\nSince Notion doesn\'t support anchor links, just convert them to rich text blocks instead.\n```\n<a href="#module-0-pre-course-setup-and-learning-principles">Module 0: Pre-Course Setup and Learning Principles</a>\n```\nconverts to\n```\n{\n  "object": "block",\n  "type": "paragraph",\n  "paragraph": {\n    "rich_text": [\n      {\n        "type": "text",\n        "text": {\n          "content": "Module 0: Pre-Course Setup and Learning Principles"\n        }\n      }\n    ]\n  }\n}\n```\n5. Invalid html parts\nWhen the html is not syntax valid eg. orphaned closing tags, then just skip the conversion and use an empty rich text block.\n```\n</li>\\n</ol>\n```\ncan be substituted with\n```\n{\n  "object": "block",\n  "type": "paragraph",\n  "paragraph": {\n    "rich_text": [\n      {\n        "type": "text",\n        "text": {\n          "content": " "\n        }\n      }\n    ]\n  }\n}\n```'
          }
        ]
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [100, 1600], name: 'Notion Block Generator' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '73fcb8a0-2672-4bd5-86de-8075e1e02baf',
            name: '=block',
            type: 'array',
            value: '={{\n(function(){\n  const block = $json.text\n    .replace(\'```json\', \'\')\n    .replace(\'```\', \'\')\n    .trim()\n    .parseJson();\n  if (Array.isArray(block)) return block;\n  if (block.type.startsWith(\'heading_\')) {\n    const prev = Number(block.type.split(\'_\')[1]);\n    const next = Math.max(1, prev - 1);\n    if (next !== prev) {\n      block.type = `heading_${next}`;\n      block[`heading_${next}`] = Object.assign({}, block[`heading_${prev}`]);\n      block[`heading_${prev}`] = undefined;\n    }\n  }\n  return [block];\n})()\n}}'
          }
        ]
      }
    }, position: [420, 1600], name: 'Parse JSON blocks' } }))
  .then(merge([node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { parameters: {
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
            id: 'f68cefe0-e109-4d41-9aa3-043f3bc6c449',
            operator: { type: 'string', operation: 'notExists', singleValue: true },
            leftValue: '={{ $json.error }}',
            rightValue: ''
          }
        ]
      }
    }, position: [740, 1600], name: 'Valid Blocks' } }), node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const urls = Object.values($(\'JobType Router\').first().json.data.all_urls\n  .reduce((acc, url) => ({ ...acc, [url]: url }),{}));\nconst chunksize = 50;\nconst splits = Math.max(1, Math.floor(urls.length/chunksize));\n\nconst blocks = Array(splits).fill(0)\n  .map((_, idx) => {\n    const block = urls\n      .slice(\n        idx * chunksize, \n        (idx * chunksize) + chunksize - 1\n      )\n      .map(url => {\n        return {\n          object: "block",\n          type: "bulleted_list_item",\n          bulleted_list_item: {\n            rich_text: [\n              { type: "text", text: { content: url } }\n            ]\n          }\n        }\n      });\n    return { json: { block } }\n  });\n\nreturn [\n  { json: {\n    block:[{\n      "object": "block",\n      "type": "heading_2",\n      "heading_2": {\n        "rich_text": [\n          {\n            "type": "text",\n            "text": {\n              "content": "Sources"\n            }\n          }\n        ]\n      }\n    }]\n  } },\n  ...blocks\n];'
    }, position: [740, 1760], name: 'URL Sources to Lists' } })], { version: 3, name: 'Append Blocks' }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [1440, 1600], name: 'For Each Block...' } }))
  .add(node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { parameters: {
      pageId: {
        __rl: true,
        mode: 'id',
        value: '={{ $(\'Get Existing Row1\').first().json.id }}'
      },
      options: {},
      resource: 'databasePage',
      operation: 'update',
      propertiesUi: {
        propertyValues: [
          { key: 'Status|status', statusValue: 'Done' },
          { key: 'Last Updated|date', date: '={{ $now.toISO() }}' }
        ]
      }
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [1680, 1600], name: 'Set Done' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.notion.com/v1/blocks/{{ $(\'Get Existing Row1\').first().json.id }}/children',
      method: 'PATCH',
      options: { timeout: '={{ 1000 * 60 }}' },
      jsonBody: '={{\n{\n  "children": $json.block\n}\n}}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'predefinedCredentialType',
      headerParameters: {
        parameters: [{ name: 'Notion-Version', value: '2022-06-28' }]
      },
      nodeCredentialType: 'notionApi'
    }, credentials: {
      notionApi: { id: 'credential-id', name: 'notionApi Credential' }
    }, position: [1680, 1760], name: 'Upload to Notion Page' } }))
  .add(sticky('## 2. Ask Clarifying Questions\n[Read more about form nodes](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/)\n\nTo handle the clarification questions generated by the LLM, I used the same technique found in my "AI Interviewer" template ([link](https://n8n.io/workflows/2566-conversational-interviews-with-ai-agents-and-n8n-forms/)).\nThis involves a looping of dynamically generated forms to collect answers from the user.', { name: 'Sticky Note', color: 7, position: [-1140, -680], width: 1000, height: 560 }))
  .add(sticky('## 6. Perform DeepSearch Loop\n[Learn more about the Looping in n8n](https://docs.n8n.io/flow-logic/looping/#creating-loops)\n\nThe key of the Deep Research flow is its extensive data collection capability. In this implementation, this capability is represented by a recursive web search & scrape loop which starts with the original query and extended by AI-generated subqueries. How many subqueries to generate are determined the depth and breadth parameters specified.\n\n"Learnings" are generated for each subquery and accumulate on each iteration of the loop. When the loop finishes when depth limit is reached, all learnings are collected and it\'s these learnings are what we use to generate the report.', { name: 'Sticky Note1', color: 7, position: [-660, -60], width: 1360, height: 640 }))
  .add(sticky('## 3. Create Empty Report Page in Notion\n[Read more about the Notion node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.notion/)\n\nSome thought was given where to upload the final report and Notion was selected due to familiarity. This can be easily changed to whatever wiki tools you prefer.\n\nIf you\'re following along however, here\'s the Notion database you need to replicate - [Jim\'s n8n DeepResearcher Database](https://jimleuk.notion.site/19486dd60c0c80da9cb7eb1468ea9afd?v=19486dd60c0c805c8e0c000ce8c87acf).', { name: 'Sticky Note2', color: 7, position: [-120, -680], width: 600, height: 560 }))
  .add(sticky('## 4. Trigger DeepResearch Asynchronously\n[Learn more about the Execute Trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)\n\nn8n handles asynchronous jobs by spinning them off as separate executions. This basically means the user doesn\'t have to wait or keep their browser window open for our researcher to do its job.\n\nOnce we initiate the Deepresearcher job, we can close out the onboarding journey for a nice user experience.', { name: 'Sticky Note3', color: 7, position: [500, -680], width: 640, height: 560 }))
  .add(sticky('## 7. Generate Search Queries\n[Learn more about the Basic LLM node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/)\n\nMuch like a human researcher, the DeepResearcher will rely on web search and content as the preferred source of information. To ensure it can cover a wide range of sources, the AI can first generate relevant research queries of which each can be explored separately.', { name: 'Sticky Note4', color: 7, position: [-1160, 620], width: 620, height: 540 }))
  .add(sticky('## 8. Web Search and Extracting Web Page Contents using [APIFY.com](https://www.apify.com?fpr=414q6)\n[Read more about the HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)\n\nHere is where I deviated a little from the reference implementation. I opted not to use Firecrawl.ai due to (1) high cost of the service and (2) a regular non-ai crawler would work just as well and probably quicker. Instead I\'m using [APIFY.com](https://www.apify.com?fpr=414q6) which is a more performant, cost-effective and reliable web scraper service. If you don\'t want to use Apify, feel free to swap this out with your preferred service.\n\nThis step is the most exciting in terms of improvements and optimisations eg. mix in internal data sources! Add in Perplexity.ai or Jina.ai! Possibilities are endless.', { name: 'Sticky Note5', color: 7, position: [-520, 620], width: 1340, height: 740 }))
  .add(sticky('## 5. Set Report to In-Progress\n[Read more about the Notion node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.notion/)', { name: 'Sticky Note6', color: 7, position: [-1140, 60], width: 460, height: 360 }))
  .add(sticky('## 9. Compile Learnings with Reasoning Model\n[Read more about the Basic LLM node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/)\n\nWith our gathered sources, it\'s now just a case of giving it to our LLM to compile a list of "learnings" from them. For our DeepResearcher, we\'ll use OpenAI\'s o3-mini which is the latest reasoning model at time of writing. Reasoning perform better than regular chat models due their chain-of-thought or "thinking" process that they perform.\n\nThe "Learnings" are then combined with the generated research goal to complete one loop.', { name: 'Sticky Note7', color: 7, position: [860, 780], width: 800, height: 580 }))
  .add(sticky('## 10. Generate DeepSearch Report using Learnings\n[Read more about the Basic LLM node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/)\n\nFinally! After all learnings have been gathered - which may have taken up to an hour or more on the higher settings! - they are given to our LLM to generate the final research report in markdown format. Technically, the DeepResearch ends here but for this template, we need to push the output to Notion. If you\'re not using Notion, feel free to ignore the last few steps.', { name: 'Sticky Note8', color: 7, position: [-1140, 1400], width: 660, height: 540 }))
  .add(sticky('## 11. Reformat Report as Notion Blocks\n[Learn more about the Markdown node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.markdown/)\n\nTo write our report to our Notion page, we\'ll have to convert it to Notion "blocks" - these are specialised json objects which are required by the Notion API. There are quite a number of ways to do this conversion not involving the use of AI but for kicks, I decided to do so anyway. In this step, we first convert to HTML as it allows us to split the report semantically and makes for easier parsing for the LLM.', { name: 'Sticky Note9', color: 7, position: [-460, 1400], width: 1060, height: 540 }))
  .add(sticky('## 13. Update Report in Notion\n[Read more about the HTTP request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)\n\nIn this step, we can use the Notion API to add the blocks to our page sequentially. A loop is used due to the unstable Notion API - the loop allows retries for blocks that require it.', { name: 'Sticky Note10', color: 7, position: [1220, 1400], width: 800, height: 580 }))
  .add(sticky('## 1. Let\'s Research!\n[Learn more about the form trigger node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.formtrigger)\n\nn8n forms are a really nice way to get our frontend up and running quickly and compared to chat, offers a superior user interface for user input. I\'ve gone perhaps a little extra with the custom html fields but I do enjoy adding a little customisation now and then.', { name: 'Sticky Note11', color: 7, position: [-1840, -680], width: 680, height: 560 }))
  .add(sticky('## 12. Append URL Sources List\n[Read more about the Code node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code)\n\nFor our source URLs, we\'ll manually compose the Notion blocks for them - this is because there\'s usually a lot of them! We\'ll then append to the end of the other blocks.', { name: 'Sticky Note12', color: 7, position: [620, 1400], width: 580, height: 580 }))
  .add(sticky('### Not using forms?\nFeel free ot swap this out for chat or even webhooks to fit your existing workflows.', { name: 'Sticky Note13', color: 5, position: [-1820, -240], width: 300, height: 100 }))
  .add(sticky('### 🚏 The Subworkflow Event Pattern \nIf you\'re new to n8n, this advanced technique might need some explaining but in gist, we\'re using subworkflows to run different parts of our DeepResearcher workflow as separate executions.\n\n* Necessary to implement the recursive loop mechanism needed to enable this workflow.\n* Negates the need to split this workflow into multiple templates.\n* Great generally for building high performance n8n workflows (a topic for a future post!)', { name: 'Sticky Note14', color: 5, position: [-1880, 540], width: 460, height: 240 }))
  .add(sticky('### Recursive Looping\nThe recursive looping implemented for this workflow is an advanced item-linking technique. It works by specifically controlling which nodes "execute once" vs" execute for each item" because of this becareful of ermoving nodes! Always check the settings of the node you\'re replacing and ensure the settings match. ', { name: 'Sticky Note15', color: 5, position: [720, -60], width: 340, height: 200 }))
  .add(sticky('## n8n DeepResearcher\n### This template attempts to replicate OpenAI\'s DeepResearch feature which, at time of writing, is only available to their pro subscribers.\n\nThough the inner workings of DeepResearch have not been made public, it is presumed the feature relies on the ability to deep search the web, scrape web content and invoking reasoning models to generate reports. All of which n8n is really good at!\n\n### How it works\n* A form is used to first capture the user\'s research query and how deep they\'d like the researcher to go.\n* Once submitted, a blank Notion page is created which will later hold the final report and the researcher gets to work.\n* The user\'s query goes through a recursive series of web serches and web scraping to collect data on the research topic to generate partial learnings.\n* Once complete, all learnings are combined and given to a reasoning LLM to generate the final report.\n* The report is then written to the placeholder Notion page created earlier. \n\n### How to use\n* Duplicate this Notion database to use with this template: https://jimleuk.notion.site/19486dd60c0c80da9cb7eb1468ea9afd?v=19486dd60c0c805c8e0c000ce8c87acf\n* Sign-up for [APIFY.com](https://www.apify.com?fpr=414q6) API Key for web search and scraping services.\n* Ensure you have access to OpenAI\'s o3-mini model. Alternatively, switch this out for o1 series.\n* You must publish this workflow and ensure the form url is publically accessible.\n\n### On Depth & Breadth Configuration\nFor more detailed reports, increase depth and breadth but be warned the workflow will take a exponentially more time and money to complete. The defaults are usually good enough.\n\nDepth=1 & Breadth=2 - will take about 5 - 10mins.\nDepth=1 & Breadth=3 - will take about 15 - 20mins.\nDpeth=3 & Breadth=5 - will take about 2+ hours!\n\n### Need Help?\nJoin the [Discord](https://discord.com/invite/XPKeKXeB7d) or ask in the [Forum](https://community.n8n.io/)!\n\nHappy Hacking!', { name: 'Sticky Note16', position: [-2420, -920], width: 520, height: 1060 }))
  .add(sticky('![](https://res.cloudinary.com/daglih2g8/image/upload/f_auto,q_auto/v1/n8n-workflows/o4wqztloz3j6okfxpeyw#full-width)', { name: 'Sticky Note17', color: 7, position: [-2420, -1180], width: 520, height: 240 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n### UPDATE APIFY CREDENTIAL HERE!', { name: 'Sticky Note18', position: [-80, 1000], width: 180, height: 260 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n### UPDATE NOTION CREDENTIAL HERE!', { name: 'Sticky Note20', position: [1640, 1740], width: 180, height: 260 }))
  .add(sticky('### Self-hosting n8n? Consider using one of these to upload to Notion!\nThis template uses an LLM to convert markdown to Notion which isn\'t the most efficient but it\'s "easier" because doesn\'t require installing other software. To speed this up and reduce errors in the conversation, consider the following options to replace this flow if you\'re able to install them yourself.\n\n* [Notion ⇄ Markdown Conversion Community Node](https://community.n8n.io/t/now-available-notion-markdown-conversion-community-node/59087)\n* [tryfabric/martian: Markdown to Notion: Convert Markdown and GitHub Flavoured Markdown to Notion API Blocks and RichText 🔀📝](https://github.com/tryfabric/martian)\n* [brittonhayes/notionmd: 🪄 Convert Markdown into Notion Blocks](https://github.com/brittonhayes/notionmd)\n\n\n**Note**: Recommendation onl, requires due diligence and use at your own risk!', { name: 'Sticky Note19', color: 5, position: [-460, 1960], width: 560, height: 300 }))