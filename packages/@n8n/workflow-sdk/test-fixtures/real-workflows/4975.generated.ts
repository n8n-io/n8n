return workflow('GGBZPOcvm844DgAy', 'n8n HR agent', { callerPolicy: 'any', executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.whatsAppTrigger', version: 1, config: { parameters: { options: {}, updates: ['messages'] }, credentials: {
      whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' }
    }, position: [-40, -220], name: 'WhatsApp Trigger' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.7, config: { parameters: {
      text: '=You are given a message object with the structure:\n\ntype: {{ $json.messages[0].type }}\n\ntext body (if applicable): {{ $json.messages[0].text.body }}\n\nYour task is to analyze the message and classify it into exactly one category, returning only the corresponding number, based on the detailed rules below.\n\n📩 If the type is "text":\nAnalyze the content in {{ $json.messages[0].text.body }} and classify based on the user\'s intent:\n\n✅ Output 1 → Leave Request\nUse this only if the message is about applying for leave, informing absence, or time off.\nExamples:\n\n“I need leave for tomorrow.”\n\n“I won’t be coming in today.”\n\n“Apply leave from 12th to 14th.”\n\n✅ Output 2 → HR Chatbot (FAQ or Policy Queries)\nUse this for any general queries about HR policies, benefits, leave balances, holidays, or onboarding.\nExamples:\n\n“How many leaves do I have left?”\n\n“What is the dress code policy?”\n\n“Where can I get my salary slip?”\n\n✅ Output 5 → Shortlisting Request\nUse this if the user is instructing to filter, rank, or shortlist candidates for a particular job or JD.\nExamples:\n\n“Shortlist candidates for backend role.”\n\n“Filter CVs for the UI designer position.”\n\n✅ Output 4 → Request or Complaint for Department Head\nUse this if the user is requesting to send an email to or escalate an issue to a department head or authority.\nExamples:\n\n“Raise a complaint to admin.”\n\n“Send a mail to IT about my laptop.”\n\n“Escalate this matter to HR.”\n\n📍 If the type is "location":\nThis indicates attendance marking via GPS.\n\n✅ Output 3\n🎙️ If the type is "audio" or "image":\nAssume this is a general HR query via media. For example, a voice message asking for policy info or a photo of a document.\n\n✅ Output 2\n🔴 Final & Strict Instruction:\nYou must return only one of the following numbers:\n1, 2, 3, 4, or 5\nNo text. No description. No formatting. Only the number.\n\n',
      batching: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model7' } }) }, position: [120, -80], name: 'Delegatory LLM' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: { mode: 'chooseBranch' }, position: [1720, -420], name: 'Merge2' } }), node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: { mode: 'chooseBranch' }, position: [1720, -180], name: 'Merge1' } }), node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: { mode: 'chooseBranch', useDataOfInput: 2 }, position: [1720, 40] } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=based on {{ $(\'WhatsApp Trigger\').item.json.messages[0].text.body }} , you need to generate an email for the users dept head from the google sheets tool and generate a mail based on whats in the whatspp message body \nitll be to the dept head email from the sheet and cc the user email.\nmatch using {{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}\nand generate a proper mail and send it with the gmail tool \n',
      options: {},
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To\', ``, \'string\') }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          emailType: 'text'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Gmail2' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 1608741360,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1608741360',
            cachedResultName: 'leaves'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'dept head email' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model6' } }) }, position: [3340, 1120], name: 'Email Agent' } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.messages[0].text.body }} is the user input.\nuse the JD sheet tool to extract the respective JD for the given poistion in the user input.\nuse the applicants sheets tool to extract applicant data , only name, email phone, you have a filter for returning only rows matching the required "applied for" role\nuse n8n tool to get cv text and compare with jd and make reaons for required output parser content\nalways return a new output with proper reasoning\ngive a score 1-10 based on exp, relevance of projects and listed skills\n',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.2, config: { parameters: {
          source: 'parameter',
          description: 'call this tool to get downloaded and extracted cv',
          workflowJson: '={\n  "name": "My workflow 3",\n  "nodes": [\n    {\n      "parameters": {\n        "operation": "download",\n        "fileId": {\n          "__rl": true,\n          "value": "=https://drive.google.com/file/d/1_lAwQBG7BITidr8DPXclZSxWp_2ZPJ3H/view?usp=sharing",\n          "mode": "url"\n        },\n        "options": {}\n      },\n      "id": "9feaa5fc-b85a-41d5-8e37-4c52fd0fddee",\n      "name": "download CV",\n      "type": "n8n-nodes-base.googleDrive",\n      "position": [\n        -1520,\n        160\n      ],\n      "typeVersion": 3,\n      "credentials": {\n        "googleDriveOAuth2Api": {\n          "id": "LQx4eK8lTDnFORcL",\n          "name": "Google Drive account 3"\n        }\n      }\n    },\n    {\n      "parameters": {\n        "operation": "pdf",\n        "options": {}\n      },\n      "id": "18774bfe-6a10-4a3f-a12b-ae374ad9d928",\n      "name": "Extract from File",\n      "type": "n8n-nodes-base.extractFromFile",\n      "position": [\n        -1060,\n        160\n      ],\n      "typeVersion": 1\n    },\n    {\n      "parameters": {\n        "documentId": {\n          "__rl": true,\n          "value": "1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc",\n          "mode": "list",\n          "cachedResultName": "Untitled spreadsheet",\n          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk"\n        },\n        "sheetName": {\n          "__rl": true,\n          "value": 1214220799,\n          "mode": "list",\n          "cachedResultName": "applicants",\n          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1214220799"\n        },\n        "options": {}\n      },\n      "type": "n8n-nodes-base.googleSheets",\n      "typeVersion": 4.6,\n      "position": [\n        -1800,\n        160\n      ],\n      "id": "88198974-6f9a-4a4c-a400-1efe61634584",\n      "name": "Google Sheets",\n      "credentials": {\n        "googleSheetsOAuth2Api": {\n          "id": "U3oQStbFsePTfOCg",\n          "name": "Google Sheets account 3"\n        }\n      }\n    },\n    {\n      "parameters": {},\n      "type": "n8n-nodes-base.manualTrigger",\n      "typeVersion": 1,\n      "position": [\n        -2040,\n        160\n      ],\n      "id": "444d8fb5-f167-4228-8870-cc8c6ee5d2e7",\n      "name": "When clicking ‘Execute workflow’"\n    }\n  ],\n  "pinData": {},\n  "connections": {\n    "download CV": {\n      "main": [\n        [\n          {\n            "node": "Extract from File",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    },\n    "Extract from File": {\n      "main": [\n        []\n      ]\n    },\n    "Google Sheets": {\n      "main": [\n        [\n          {\n            "node": "download CV",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    },\n    "When clicking ‘Execute workflow’": {\n      "main": [\n        [\n          {\n            "node": "Google Sheets",\n            "type": "main",\n            "index": 0\n          }\n        ]\n      ]\n    }\n  },\n  "active": false,\n  "settings": {\n    "executionOrder": "v1"\n  },\n  "versionId": "b83a5fe1-8ad2-48cc-8d2a-778c0131c618",\n  "meta": {\n    "templateCredsSetupCompleted": true,\n    "instanceId": "60ec675227f8b8ddf9f06a67b49cab3340ac72df709fd0ce0a5249b51b99f4fe"\n  },\n  "id": "ljyzZaJUlYFCG9go",\n  "tags": [\n    {\n      "createdAt": "2025-06-06T05:05:58.931Z",\n      "updatedAt": "2025-06-06T05:05:58.931Z",\n      "id": "cGamkQygZH77eaiZ",\n      "name": "AI Assistant"\n    }\n  ]\n}'
        }, name: 'n8n' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 1467426312,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1467426312',
            cachedResultName: 'jd sheet'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'JD tool' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          filtersUI: {
            values: [
              {
                lookupValue: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'values0_Value\', ``, \'string\') }}',
                lookupColumn: 'Applying for'
              }
            ]
          },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 1214220799,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1214220799',
            cachedResultName: 'applicants'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'applicants' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model4' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "name": "tanay",\n  "email" : "user@example.com",\n  "score": 0.8,\n  "shortlist" : "yes",\n  "reason": "Does not meet required number of experience in years",\n  "missing skills": "list of missing skills"\n}'
        }, name: 'Structured Output Parser' } }) }, position: [3200, 1780], name: 'Shortlist Agent' } })], { version: 3.2, parameters: {
      rules: {
        values: [
          {
            outputKey: 'leave req',
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
                  id: '8d2f59b4-24d3-43ea-823d-da3941f56489',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.text }}',
                  rightValue: '1'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'hr chatbot',
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
                  id: 'b21768f6-90b5-4d17-ae4a-614133fd7ec5',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.text }}',
                  rightValue: '2'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'attendance',
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
                  id: '7fec0d2d-2415-409a-9ee9-428ff93528de',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.text }}',
                  rightValue: '3'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'req/complaint mail',
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
                  id: '295cf88b-ea09-49fe-8290-56b9bb08d555',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.text }}',
                  rightValue: '4'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'shortlist ',
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
                  id: 'fdd43ca7-f523-4583-8346-54364c039e79',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.text }}',
                  rightValue: '5'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'd34884e2-97b4-47da-86c9-cddcfdb8c23f',
            name: 'messages[0].text.body',
            type: 'string',
            value: '={{ $json.messages[0].text.body }}'
          }
        ]
      }
    }, position: [2400, -1460], name: 'Edit Fields3' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an autonomous leave request assistant for ICICI\'s internal HR system.\nYou receive leave requests from employees through WhatsApp in plain text \n{{ $json.messages[0].text.body }}- this is the leave request text and details use the above \n- “I need a sick leave on 11th June”\n- “I\'m applying for medical leave from 11th to 14th June”\n- “Can I take a personal leave tomorrow?”\nYour goal is to process each leave request correctly based on live employee data and respond with the appropriate action.\nTools You Can Use:\n1. **Google Sheets – Get Rows Tool**\n   - Use this to retrieve employee records\n   - Sheet contains the following columns:\n     - `name`, `email`, `department head email`, `available leaves`, `last leave`, `attendance`, `department`\n2. **Google Sheets – Append or Update Rows Tool**\n   - Use this to log any leave taken or updates if needed\n3. **Gmail Tool**\n   - Use this to send emails (e.g. approvals, forwarding to department heads)\nInput Format:\n- Each leave request comes from WhatsApp and contains:\n  - **Text** of the request (e.g. “I need a sick leave on 11th June”)\n  - **Name** of the requester, from WhatsApp contact:\n    `{{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}`\nYour Step-by-Step Logic:\n1. **Extract the following from the message:*{{ $json.messages[0].text.body }}*\n   - Dates requested (single or range)\n2. **Match the WhatsApp user’s name** {{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}with the **name** column in the Google Sheet using the `Get Rows` tool.\n3. **Check the employee’s available leaves.**\n   - If available leaves ≥ 1:\n     - ✅ **Sick leave for 1 day**:\n       - Compose an approval email to the employee’s email\n       - CC the department head\n       - Email body should include the leave date and confirmation\n       - Use Gmail Tool to send\n       - Send WhatsApp message:  \n         > “Your sick leave has been approved. Please check your email.”\n     - ✅ **Multi-day or non-sick leave**:\n       - Compose a **leave request email to the department head**\n       - Include reason, dates, and requester’s name\n       - CC the employee\n       - Send WhatsApp message:  \n         > “Your leave request has been forwarded to your department head for approval.”\n\n   - ❌ If no available leaves:\n     - Do not send email\n     - Send WhatsApp message:  \n       > “You currently have no available leaves. Please contact HR if you believe this is an error.”\n- Hallucinate any leave status\n- Invent dates or assume approval\n- Reply with personal opinions',
      options: {},
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To\', ``, \'string\') }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {
            ccList: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'CC\', ``, \'string\') }}',
            senderName: 'AI HR '
          },
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          emailType: 'text'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Gmail' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 1608741360,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1608741360',
            cachedResultName: 'leaves'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'get leaves' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: { name: '={{ $json.contacts[0].profile.name }}' },
            schema: [
              {
                id: 'name',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'name',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'email',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'email',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'department head  email',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'department head  email',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'available leaves',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'available leaves',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'last leave ',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'last leave ',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'attendance ',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'attendance ',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'department',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'department',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['name'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'appendOrUpdate',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 1608741360,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1608741360',
            cachedResultName: 'leaves'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'update leaves' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-nano',
            cachedResultName: 'gpt-4.1-nano'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model2' } }) }, position: [2760, -1460], name: 'Leave Agent' } }))
  .then(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      textBody: '={{ $json.output.message }}\n{{ $json.output }}',
      operation: 'send',
      phoneNumberId: '635212696350193',
      additionalFields: {},
      recipientPhoneNumber: '={{ $(\'WhatsApp Trigger\').item.json.messages[0].from }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [5100, 660], name: 'WhatsApp Responder' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '1b053bb4-ee13-478f-a254-e2c0873bfe3f',
            name: 'messages[0].text.body',
            type: 'string',
            value: '={{ $json.messages[0].text.body }}'
          }
        ]
      },
      includeOtherFields: true
    }, position: [4640, -1000], name: 'Edit Fields' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $json.messages[0].audio.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [4720, -680], name: 'download media1' } }), node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      resource: 'media',
      operation: 'mediaUrlGet',
      mediaGetId: '={{ $json.messages[0].image.id }}'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [4720, -440], name: 'download media' } })], { version: 3.2, parameters: {
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
                  id: '94481a64-b102-4088-b336-cbd1cfbd2485',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].text }}',
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
                  id: 'd16eb899-cccb-41b6-921e-172c525ff92c',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].audio }}',
                  rightValue: 'voice'
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
                  id: 'b297dfe7-ce3c-47c5-bb4b-e37a6aed73e0',
                  operator: { type: 'object', operation: 'exists', singleValue: true },
                  leftValue: '={{ $json.messages[0].image }}',
                  rightValue: ''
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    }, name: 'Verify Message Type' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.text }}\n{{ $json.messages[0].text.body }}\n{{ $json.content }}',
      options: {
        systemMessage: 'You are an autonomous HR assistant chatbot for ICICI employees.\n\nYou support inputs from text, audio, and image transcription.\n\nYou have access to a tool called `icici_policy_vector_store` that lets you retrieve official ICICI HR policies and documents.\n\nWhen answering **any HR policy-related question** (e.g., about leave, holidays, code of conduct, dress code, hybrid policy), always use this tool internally to retrieve information and guide your response. Do not mention that you are using the tool, vector search, or any database. Simply respond as if you already know the answer.\n\nIf the tool does not return any documents, respond clearly:\n> “I couldn’t find an official document for this, but here’s what I can share based on general HR practices.”\n\nYou also have access to a Google Sheet containing employee attendance. When a user asks about their attendance:\n- Count how many rows match their name\n- Each row is a day present\n- Count how many of those have Entry Time ≤ 09:15 and Exit Time > 17:15 for overtime\nRespond like: “You were present for 20 days this month, with 5 days of overtime.”\n\nIf a user thanks you or ends the conversation, close politely.\n\nKeep all responses professional, friendly, helpful, and aligned with ICICI’s HR voice.\n',
        returnIntermediateSteps: true
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=0',
            cachedResultName: 'rec shortlist sheet'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'read sheets' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolVectorStore', version: 1.1, config: { parameters: {
          description: '"toolDescription": " policy document search tool"\n'
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4.1-nano',
            cachedResultName: 'gpt-4.1-nano'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }), vectorStore: vectorStore({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.2, config: { parameters: {
          options: {},
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'data',
            cachedResultName: 'data'
          }
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }) }, name: 'Supabase Vector Store' } }) }, name: 'policy_vector_store' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4.1-nano', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [5600, -1000], name: 'HR Chatbot' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [5000, -740] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      options: {},
      resource: 'audio',
      operation: 'transcribe',
      binaryPropertyName: '=data'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [5240, -660], name: 'OpenAI' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '2275a69d-d125-46f2-ae25-c438859b0042',
            name: 'text',
            type: 'string',
            value: '={{ $json.text }}'
          }
        ]
      }
    }, position: [4920, -1000], name: 'Edit Fields1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.url }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [5000, -420], name: 'HTTP Request1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-mini',
        cachedResultName: 'GPT-4O-MINI'
      },
      options: {},
      resource: 'image',
      inputType: 'base64',
      operation: 'analyze'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [5400, -420], name: 'OpenAI1' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '759240be-4cc1-44de-8644-f62631553a09',
            name: 'content',
            type: 'string',
            value: '={{ $json.content }}'
          }
        ]
      }
    }, position: [5200, -1000], name: 'Edit Fields2' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Earth radius in meters\nconst R = 6371000;\n\n// Convert degrees to radians\nconst toRad = deg => deg * Math.PI / 180;\n\n// Extract coordinates from the input JSON safely\nconst inputJson = $input.first().json;\nlet lat, lon;\nif (inputJson.messages && Array.isArray(inputJson.messages) && inputJson.messages[0] && inputJson.messages[0].location) {\n  lat = inputJson.messages[0].location.latitude;\n  lon = inputJson.messages[0].location.longitude;\n} else {\n  // Handle missing data as needed; here, we return an error object\n  return [{\n    json: {\n      error: "Missing location data in input"\n    }\n  }];\n}\n\n// Office polygon vertices [longitude, latitude]\nconst officePolygon = [\n  \n];\n\n// Set distance threshold (increase for more leeway)\nconst distanceThreshold = 2500;\n\nlet isNearby = false;\n\n// Haversine distance function\nfunction haversine(lat1, lon1, lat2, lon2) {\n  const dLat = toRad(lat2 - lat1);\n  const dLon = toRad(lon2 - lon1);\n  const a = Math.sin(dLat / 2) ** 2 +\n            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *\n            Math.sin(dLon / 2) ** 2;\n  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n  return R * c;\n}\n\n// Check if user is within threshold distance of any polygon point\nfor (const [polyLon, polyLat] of officePolygon) {\n  const distance = haversine(lat, lon, polyLat, polyLon);\n  if (distance <= distanceThreshold) {\n    isNearby = true;\n    break;\n  }\n}\n\n// Output result with user\'s location and isInsideOffice flag\nreturn [{\n  json: {\n    ...$input.first().json,\n    latitude: lat,\n    longitude: lon,\n    isInsideOffice: isNearby\n  }\n}];'
    }, position: [3060, 420], name: 'Code1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Follow the steps below precisely:\n\nStep 1: Location Check\nthe value is true\n\nIf false, output only this exact message:\n"not in office please resend loc when inside the building"\n\nIf true, proceed to Step 2.\n\nStep 2: Extract User Info\nExtract the following:\n\nUser Name → {{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}\n\nCurrent DateTime → {{ $now }}\n\nFormat it as: hh:mm, DD-MM-YYYY\n\nStep 3: Google Sheet Attendance Logic\nuse the getrows tool and search for a row where:\n\nName equals {{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}\n\n\nDate equals today (based on formatted {{ $now }})\n\nThen:\n\nCase A: No matching row found\n➕ Create a new row with the following: using putrows tool\nName: {{ $(\'WhatsApp Trigger\').item.json.contacts[0].profile.name }}\n\n\nDate: today\nName : {{ $json.contacts[0].profile.name }}\nEntry Time: current time (hh:mm), Date ( eg: 11th june, 10am)\n\nExit Time: (leave blank)\n\nCase B: Matching row exists & Exit Time is blank using getrows and putrows tool\n\n🕓 Update the existing row’s Exit Time with current time.\n\nCase C: Matching row exists & Exit Time is already filled\n✅ Do nothing or optionally return: using google sheet 5 tool\n"You have already logged both entry and exit for today."\n\nOutput Format:\nReturn a message like:\n"Entry time logged: 09:45, 11-06-2025"\n"Exit time updated: 18:10, 11-06-2025"\nOr, if already marked:\n"You have already logged both entry and exit for today."\n\n🔁 Summary:\nOnly proceed if user is inside the office using {{ $json.isInsideOffice }}\nUse Google Sheets to track attendance per name per day.\n\nLog times in hh:mm, DD-MM-YYYY format.\n\nAvoid duplicate exit entries.',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          filtersUI: {
            values: [
              {
                lookupValue: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'values0_Value\', ``, \'string\') }}',
                lookupColumn: 'Name'
              },
              {
                lookupValue: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'values1_Value\', ``, \'string\') }}',
                lookupColumn: 'Entry Time'
              }
            ]
          },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=0',
            cachedResultName: 'rec shortlist sheet'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'getrows' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              Name: '={{ $json.contacts[0].profile.name }}',
              'Exit Time': '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Exit_Time\', ``, \'string\') }}',
              'Entry Time': '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Entry_Time\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'Name',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'Name',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Entry Time',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Entry Time',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Exit Time',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Exit Time',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['Name'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'appendOrUpdate',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=0',
            cachedResultName: 'rec shortlist sheet'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          },
          descriptionType: 'manual',
          toolDescription: 'Append or update row in sheet in Google Sheets'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'putrows' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model3' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n	"message" : "Exit time updated: 18:10, 11-06-202"\n}'
        }, name: 'Structured Output Parser2' } }) }, position: [3300, 420], name: 'Attendance Agent' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Name: '={{ $json.output.name }}',
          Score: '={{ $json.output.score }}',
          Reason: '={{ $json.output.reason }}',
          Shortlist: '={{ $json.output.shortlist }}',
          'MIssing Skills': '={{ $json.output[\'missing skills\'] }}'
        },
        schema: [
          {
            id: 'Name',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Name',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Phone',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Applying for',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'Applying for',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'CV link',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'CV link',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Score',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Score',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Shortlist',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Shortlist',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Reason',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Reason',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'MIssing Skills',
            type: 'string',
            display: true,
            required: false,
            displayName: 'MIssing Skills',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Name'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 1214220799,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=1214220799',
        cachedResultName: 'applicants'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
        cachedResultName: 'Untitled spreadsheet'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [3780, 1780], name: 'Google Sheets2' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=create a meeting for the user based on google calendar tool. meeting should be 2 days after {{ $today }} and between 11 and 12pm and 30 mins long.\ndont forget to output time and date in the message with human readable formatting\n\n',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleCalendarTool', version: 1.2, config: { parameters: {
          end: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'End\', `The end time for the meeting`, \'string\') }}',
          start: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Start\', `The start time for the meeting`, \'string\') }}',
          calendar: {
            __rl: true,
            mode: 'list',
            value: 'user@example.com',
            cachedResultName: 'user@example.com'
          },
          additionalFields: { location: '=Online' }
        }, credentials: {
          googleCalendarOAuth2Api: {
            id: 'credential-id',
            name: 'googleCalendarOAuth2Api Credential'
          }
        }, name: 'Google Calendar' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model5' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n	"message" : "meeting has been scheduled from 11am to 11.30 am on 13th june 26 using google calendar.",\n  "link" :"This is the meeting link - hdawodianwdawd.com"\n}'
        }, name: 'Structured Output Parser1' } }) }, position: [4000, 1780], name: 'Book Meeting' } }))
  .then(node({ type: 'n8n-nodes-base.whatsApp', version: 1, config: { parameters: {
      message: '={{ $json.output.message }}\n\n{{ $json.output.link }}',
      options: {},
      operation: 'sendAndWait',
      phoneNumberId: '635212696350193',
      recipientPhoneNumber: '919108281677'
    }, credentials: {
      whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' }
    }, position: [4440, 1760], name: 'WhatsApp Approval' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.7, config: { parameters: {
      modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
      options: {},
      messages: {
        values: [
          {
            role: 'assistant',
            content: '=You are an HR assistant generating personalized recruitment emails based on candidate data for ICICI bank (mention in subject and content). Below is a candidate’s information:\nthe input instructions are {{ $(\'WhatsApp Trigger\').item.json.messages[0].text.body }}. extract number of candidates and poistion from this \n\nName: {{ $(\'Google Sheets2\').item.json.Name }}\nEmail:{{ $(\'Shortlist Agent\').item.json.output.email }}\nShortlist Status:  {{ $(\'Google Sheets2\').item.json.Shortlist }}\nmessage {{ $(\'Book Meeting\').item.json.output.message }}\nWrite a professional email:\n\n- If the candidate is shortlisted (`Shortlist` is "yes"):\n    - Congratulate the candidate on being shortlisted.\n    - Mention the position and the interview timings. mention in normal date time format\n    - Be encouraging and appreciative.\n\n- If the candidate is not shortlisted (`Shortlist` is "no"):\n    - Politely inform them they have not been selected.\n    - \n    - Thank them for applying and encourage future applications if appropriate.\n\nThe email should be polite, human-sounding, clear, and well-formatted.\n\nOutput as \nto: \nsubject: "make this more detailed"\ncontent\nsend the email using gmail node and write a whatsapp message confirming it \n\n'
          }
        ]
      },
      jsonOutput: true
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To\', ``, \'string\') }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}',
          emailType: 'text'
        }, credentials: {
          gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
        }, name: 'Gmail1' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {},
          filtersUI: { values: [{ lookupColumn: 'Name' }] },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 'gid=0',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit#gid=0',
            cachedResultName: 'rec shortlist sheet'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1cV4GluXOU9d1xXON9yW80ZYPFEhQfizzDjcc8xwpeNc/edit?usp=drivesdk',
            cachedResultName: 'Untitled spreadsheet'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'get mail' } })] }, position: [4980, 1920], name: 'Personalize email' } }), null], { version: 2.2, parameters: {
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
            id: 'd2c8cfaf-67f3-4936-8aa2-950ff58eaf27',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            leftValue: '={{ $json.data.approved }}',
            rightValue: 'true'
          }
        ]
      }
    }, name: 'If' }))
  .add(sticky('LLM Message Classifier (WhatsApp Trigger)\nClassifies incoming WhatsApp messages into 5 categories using message.type and text.body\n\nRules:\nIf type = "text":\n1 = Leave request (e.g. "I need leave tomorrow")\n2 = HR query/policy/FAQ (e.g. "How many leaves left?")\n5 = Shortlist candidates (e.g. "Filter CVs for backend")\n4 = Escalation/complaint to dept head (e.g. "Mail to IT")\n\nIf type = "location":\n3 = Attendance via GPS\n\nIf type = "audio" or "image":\n2 = HR query via media\n\nStrict output: only return one number (1, 2, 3, 4, or 5) with no text or formatting\n', { name: 'Sticky Note', position: [-760, -320], width: 1260, height: 660 }))
  .add(sticky('Switch Router (Based on LLM Output)\nTakes number output from LLM (1–5) and routes flow accordingly:\n\n1 → Route to Leave Agent\n2 → Route to HR FAQ Agent\n3 → Route to Attendance Marking\n4 → Route to Escalation Agent\n5 → Route to Shortlisting Agent\n\nUse Merge node after each path to bring back original WhatsApp data from trigger for agent processing.\n', { name: 'Sticky Note1', color: 5, position: [1040, -640], width: 920, height: 860 }))
  .add(sticky('Leave Agent\nIf leave duration < 2 days → auto-approve\nIf ≥ 2 days → escalate to dept head\n\nDept head email is fetched from Google Sheets based on employee data\nUse IF node to compare duration, then route accordingly\n', { name: 'Sticky Note2', position: [2260, -1700], width: 1040, height: 640 }))
  .add(sticky('Attendance Handler\nCode node defines office polygon (geo boundary)\nChecks if location is inside polygon = present\n\nAI Agent:\nIf no entry for name → write date & time as entry\nIf entry exists → add time as exit\nIf user requests OT → calculate & add overtime entry\n', { name: 'Sticky Note3', color: 3, position: [2860, 240], width: 1220, height: 580 }))
  .add(sticky('Shortlisting Agent\nUses JD + applicants sheet to filter candidates (count from WhatsApp)\nWrites: score, reason, missing skills → to sheet\n\nSchedules meeting via calendar\nIf user confirms on WhatsApp → sends email to shortlisted candidate\n', { name: 'Sticky Note4', color: 5, position: [2120, 1700], width: 3220, height: 660 }))
  .add(sticky('Final WhatsApp Responder\nCollects responses from all agents\nFormats final message to user with relevant updates\n\nSupports interactive reply options for next steps\n(e.g. confirm, ask more, request edit)\n', { name: 'Sticky Note5', position: [5080, 420], width: 720, height: 620 }))
  .add(sticky('Request/Complaint Agent\nGenerates email content from WhatsApp message\nFetches dept head email from Google Sheets\nSends email to dept head with complaint/request details\n', { name: 'Sticky Note6', position: [3060, 960], width: 780, height: 580 }))
  .add(sticky('FAQ / Chatbot Agent\nSwitch checks message type: text, audio, or image\nUses OpenAI to transcribe audio/image if needed\n\nAgent answers general FAQs\nIf policy-related → searches embeddings from vector store (preloaded with company policy docs)\nReturns closest match as reference in reply\n', { name: 'Sticky Note7', color: 6, position: [4300, -1220], width: 2120, height: 1120 }))