return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [976, -144], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '69b2f1d8-061e-4821-8a63-d4562bb8aa7e',
            name: 'RapidAPI-Key',
            type: 'string',
            value: 'XXXXXXXXXXX'
          }
        ]
      }
    }, position: [1136, -144], name: 'RapidAPI-Key' } }))
  .then(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      filters: {
        conditions: [{ keyName: 'email_subject', condition: 'isEmpty' }]
      },
      operation: 'get',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [1312, -144], name: 'Get row(s)1' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/company_url',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [{ name: 'url', value: '={{ $json.Linkedin_URL }}' }]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1616, -336], name: 'Linkedin_URL' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes' }, position: [1808, -336] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/results',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [
          {
            name: 'task_id',
            value: '={{ $(\'Linkedin_URL\').item.json.task_id }}'
          }
        ]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1968, -336], name: 'results' } }))
  .then(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      columns: {
        value: {
          linkedin_profile_scrape: '={{ $json.results.toJsonString() }}'
        },
        schema: [
          {
            id: 'First_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'First_name',
            defaultMatch: false
          },
          {
            id: 'Last_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Last_name',
            defaultMatch: false
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false
          },
          {
            id: 'Location',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Location',
            defaultMatch: false
          },
          {
            id: 'Company_Name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_Name',
            defaultMatch: false
          },
          {
            id: 'Company_site',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_site',
            defaultMatch: false
          },
          {
            id: 'Crunchbase_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Crunchbase_URL',
            defaultMatch: false
          },
          {
            id: 'Linkedin_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Linkedin_URL',
            defaultMatch: false
          },
          {
            id: 'email_subject',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_subject',
            defaultMatch: false
          },
          {
            id: 'email_body',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_body',
            defaultMatch: false
          },
          {
            id: 'linkedin_profile_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_profile_scrape',
            defaultMatch: false
          },
          {
            id: 'linkedin_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_company_scrape',
            defaultMatch: false
          },
          {
            id: 'crunchbase_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'crunchbase_company_scrape',
            defaultMatch: false
          },
          {
            id: 'email',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email',
            defaultMatch: false
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      filters: {
        conditions: [
          {
            keyName: 'email',
            keyValue: '={{ $(\'Get row(s)1\').item.json.email }}'
          }
        ]
      },
      options: {},
      operation: 'update',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [2176, -336], name: 'Update row(s)1' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/company_url',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [{ name: 'url', value: '={{ $json.company_linkedin }}' }]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1616, -96], name: 'Linkedin_URL_COMPANY' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes' }, position: [1808, -96], name: 'Wait1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/results',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [
          {
            name: 'task_id',
            value: '={{ $(\'Linkedin_URL_COMPANY\').item.json.task_id }}'
          }
        ]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1968, -96], name: 'results1' } }))
  .then(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      columns: {
        value: {
          linkedin_company_scrape: '={{ $json.results.toJsonString() }}',
          linkedin_profile_scrape: '='
        },
        schema: [
          {
            id: 'First_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'First_name',
            defaultMatch: false
          },
          {
            id: 'Last_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Last_name',
            defaultMatch: false
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false
          },
          {
            id: 'Location',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Location',
            defaultMatch: false
          },
          {
            id: 'Company_Name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_Name',
            defaultMatch: false
          },
          {
            id: 'Company_site',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_site',
            defaultMatch: false
          },
          {
            id: 'Crunchbase_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Crunchbase_URL',
            defaultMatch: false
          },
          {
            id: 'Linkedin_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Linkedin_URL',
            defaultMatch: false
          },
          {
            id: 'email_subject',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_subject',
            defaultMatch: false
          },
          {
            id: 'email_body',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_body',
            defaultMatch: false
          },
          {
            id: 'linkedin_profile_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_profile_scrape',
            defaultMatch: false
          },
          {
            id: 'linkedin_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_company_scrape',
            defaultMatch: false
          },
          {
            id: 'crunchbase_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'crunchbase_company_scrape',
            defaultMatch: false
          },
          {
            id: 'email',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email',
            defaultMatch: false
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      filters: {
        conditions: [
          {
            keyName: 'email',
            keyValue: '={{ $(\'Get row(s)1\').item.json.email }}'
          }
        ]
      },
      options: {},
      operation: 'update',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [2176, -96], name: 'Update row(s)2' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/url_search',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [{ name: 'url', value: '={{ $json.Crunchbase_URL }}' }]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1632, 144], name: 'Crunchbase_URL' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { unit: 'minutes' }, position: [1824, 144], name: 'Wait2' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://cold-outreach-enrichment-scraper.p.rapidapi.com/results',
      options: { batching: { batch: { batchSize: 1 } } },
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [
          {
            name: 'task_id',
            value: '={{ $(\'Crunchbase_URL\').item.json.task_id }}'
          }
        ]
      },
      headerParameters: {
        parameters: [
          {
            name: 'x-rapidapi-host',
            value: 'cold-outreach-enrichment-scraper.p.rapidapi.com'
          },
          {
            name: 'x-rapidapi-key',
            value: '={{ $(\'RapidAPI-Key\').item.json[\'RapidAPI-Key\'] }}'
          }
        ]
      }
    }, position: [1984, 144], name: 'results2' } }))
  .then(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      columns: {
        value: {
          linkedin_company_scrape: '=',
          linkedin_profile_scrape: '=',
          crunchbase_company_scrape: '={{ $json.results.toJsonString() }}'
        },
        schema: [
          {
            id: 'First_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'First_name',
            defaultMatch: false
          },
          {
            id: 'Last_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Last_name',
            defaultMatch: false
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false
          },
          {
            id: 'Location',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Location',
            defaultMatch: false
          },
          {
            id: 'Company_Name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_Name',
            defaultMatch: false
          },
          {
            id: 'Company_site',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_site',
            defaultMatch: false
          },
          {
            id: 'Crunchbase_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Crunchbase_URL',
            defaultMatch: false
          },
          {
            id: 'Linkedin_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Linkedin_URL',
            defaultMatch: false
          },
          {
            id: 'email_subject',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_subject',
            defaultMatch: false
          },
          {
            id: 'email_body',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email_body',
            defaultMatch: false
          },
          {
            id: 'linkedin_profile_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_profile_scrape',
            defaultMatch: false
          },
          {
            id: 'linkedin_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'linkedin_company_scrape',
            defaultMatch: false
          },
          {
            id: 'crunchbase_company_scrape',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'crunchbase_company_scrape',
            defaultMatch: false
          },
          {
            id: 'email',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email',
            defaultMatch: false
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      filters: {
        conditions: [
          {
            keyName: 'email',
            keyValue: '={{ $(\'Get row(s)1\').item.json.email }}'
          }
        ]
      },
      options: {},
      operation: 'update',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [2192, 144], name: 'Update row(s)3' } }))
  .add(node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.3, config: { parameters: {
      options: { waitForSubWorkflow: false },
      workflowId: {
        __rl: true,
        mode: 'list',
        value: '8PMrSTmEahhkUV53',
        cachedResultUrl: '/workflow/8PMrSTmEahhkUV53',
        cachedResultName: 'My workflow'
      },
      workflowInputs: { value: {}, mappingMode: 'defineBelow' }
    }, position: [1328, 144], name: 'Call \'My workflow\'' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' }, position: [672, 448], name: 'When Executed by Another Workflow' } }))
  .then(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      filters: {
        conditions: [{ keyName: 'email_subject', condition: 'isEmpty' }]
      },
      operation: 'get',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [912, 432], name: 'Get row(s)' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [1104, 432], name: 'Main Loop' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=COMPANY INFORMATION BELOW THIS LINE\n——————————————————————————————————————\nFirst_name: {{ $json.First_name }}\nLast_name: {{ $json.Last_name }}\nTitle: {{ $json.Title }}\nLocation (City, State, Country); {{ $json.Location }}\nCompany_Name: {{ $json.Company_Name }}\nCompany_site: {{ $json.Company_site }}\nCrunchbase_Data: {{ $json.crunchbase_company_scrape }}\nLinkedin_Personal: {{ $json.linkedin_profile_scrape }}\nLinkedin_Company: {{ $json.linkedin_company_scrape }}\n——————————————————————————————————————\n\nABOUT ME: USE FOR EMAIL CONTENT AS ME\n——————————————————————————————————————\nName: James\nTitle: CEO\nCompany: Company Sample\nIndustry: AI Automations\n——————————————————————————————————————\n',
      options: {
        maxIterations: 10,
        systemMessage: '=# Role and Objective\nYou are a **Creative Outreach Agent** — a relationship-focused specialist who crafts personalized, research-driven outreach emails that establish authentic connections with prospects.  \nYour primary objective is to **identify meaningful insights**, reference them naturally, and deliver concise, value-oriented messages that open conversations — not push sales.\n\n# Instructions & Rules / Task\n1. Use all available information to understand:\n   - Recent posts or likes  \n   - Company updates, keywords, or milestones  \n   - Interests, intent signals, or opportunities  \n   - Funding rounds, new hires, or partnerships  \n   - ABOUT ME section is the person sending the email, use that as your base\n\n2. **Email Crafting Guidelines**\n   - **Start strong:** Open with a relevant fact, post, or milestone about the person or their company.  \n   - **Be conversational:** Write in a warm, friendly, and natural tone — as if reaching out peer-to-peer.  \n   - **Provide value:** Focus on solving a potential problem, sharing insight, or aligning with their goals — not selling a product.  \n   - **Be concise:** Keep the body under ~120 words.  \n   - **Include a light CTA:** Suggest a simple next step like exchanging ideas, hopping on a short chat, or sharing feedback — not a hard pitch.  \n   - **Avoid fluff:** No filler phrases, overused sales language, or unnecessary compliments.  \n   - **Always personalize:** Ensure every sentence feels directly written for that specific person.  \n\n3. **Output Requirements**\n   - Return the final result in **JSON format** with the following keys only:\n     ```json\n     {\n       "subject": "string",\n       "email_body": "string"\n     }\n     ```\n   - Do **not** include reasoning steps, analysis, or tool outputs in the final message — only the JSON response.\n\n# Context\nYour mission is to help a business build genuine connections with prospects through thoughtful, insight-driven outreach.  \nEach message should demonstrate clear understanding of who the prospect is, what they care about, and how you can provide relevant value or perspective.  \nPrioritize curiosity and helpfulness over persuasion.  \nYou are not writing sales emails — you are starting meaningful conversations.\n',
        returnIntermediateSteps: true
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {} }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n	"email_subject": "text",\n	"email_content": "text"\n}'
        }, name: 'Structured Output Parser' } }) }, position: [1264, 448], name: 'Agent One' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '543eb3a4-b33a-4531-897a-c1d448782b35',
            name: 'email_subject',
            type: 'string',
            value: '={{ $json.output.email_subject }}'
          },
          {
            id: '10a30bf0-ea91-487e-bfc7-115fbf083614',
            name: 'email_content',
            type: 'string',
            value: '={{ $json.output.email_content }}'
          },
          {
            id: '6140b31b-0545-4acb-98b7-49214b504ea5',
            name: 'email',
            type: 'string',
            value: '={{ $(\'Main Loop\').item.json.email }}'
          }
        ]
      }
    }, position: [1552, 448], name: 'Email Context' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=email_subject: {{ $json.email_subject }}\nemail_content: {{ $json.email_content }}',
      options: {
        maxIterations: 20,
        systemMessage: '=# Role and Objective\nYou are the **Outreach Email Judge** — an impartial evaluator whose sole purpose is to assess the quality and personalization of outreach emails created by the Creative Outreach Agent.  \nYour job is to determine whether the email feels genuinely personalized, relevant, and conversational — not generic or sales-driven.\n\n# Instructions & Rules / Task\n1. **Input**\n   You will receive a JSON object from the outreach agent in the format:\n   ```json\n   {\n     "subject": "string",\n     "email_body": "string"\n   }\nEvaluation Criteria\nEvaluate the email using the following key dimensions:\n\nA. Personalization Check\n\nDoes the email mention a specific fact, event, or achievement related to the recipient or their company?\n\nDoes it clearly reflect data-driven insights (e.g., LinkedIn post, company update, funding news, or role-specific challenge)?\n\nDoes it sound like it was written for this exact person, not a segment or template?\n\nB. Relevance & Value\n\nDoes the message provide relevant value, perspective, or problem-solving insight instead of a sales pitch?\n\nIs the message connected logically to the recipient’s role, company, or current context?\n\nC. Tone & Engagement\n\nIs the tone warm, conversational, and human (not overly formal or robotic)?\n\nIs it under ~120 words and easy to read?\n\nDoes it include a clear but light call to action (e.g., ask for feedback, offer help, or suggest a chat)?\n\nD. Authenticity & Flow\n\nDoes the email sound like it was written by a real person who did research?\n\nDoes it flow naturally without awkward phrasing or filler content?\n\nDecision Logic\n\nIf the email meets all key criteria above → respond with:\nAPPROVED\nIf the email fails any of the checks (personalization, tone, value, or clarity) → respond with:\nREVISE\nFeedback (Optional Enhancement)\n\nIf returning REVISE, you may include a brief explanation (1–2 sentences max) outlining what needs improvement, such as:\n\nMissing personalization detail\n\nToo generic or salesy\n\nWeak value proposition\n\nUnclear or missing call to action\n\nOutput Format\n\nAlways return one of the following:\nAPPROVED\n\nor\nREVISE: [short feedback here]\nContext\n\nYou are not writing or editing the email — only evaluating.\nYour judgment ensures every outreach email maintains a high standard of authenticity, relevance, and personalization before it reaches a prospect.\n'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {} }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n	"approval": "APPROVED OR REVISE",\n	"feedback": "Context"\n}'
        }, name: 'Structured Output Parser1' } }) }, position: [1728, 448], name: 'Judge Agent' } }))
  .add(node({ type: 'n8n-nodes-base.if', version: 2.2, config: { parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'loose'
        },
        combinator: 'and',
        conditions: [
          {
            id: '21d24406-386b-4360-879c-8a1d56354b40',
            operator: { type: 'string', operation: 'contains' },
            leftValue: '={{ $json.output }}',
            rightValue: 'APPROVED'
          }
        ]
      },
      looseTypeValidation: true
    }, position: [2064, 432], name: 'Approval Route' } }))
  .add(node({ type: 'n8n-nodes-base.dataTable', version: 1, config: { parameters: {
      columns: {
        value: {
          email_body: '={{ $(\'Email Context\').item.json.email_content }}',
          email_subject: '={{ $(\'Email Context\').item.json.email_subject }}'
        },
        schema: [
          {
            id: 'First_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'First_name',
            defaultMatch: false
          },
          {
            id: 'Last_name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Last_name',
            defaultMatch: false
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false
          },
          {
            id: 'Location',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Location',
            defaultMatch: false
          },
          {
            id: 'Company_Name',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_Name',
            defaultMatch: false
          },
          {
            id: 'Company_site',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Company_site',
            defaultMatch: false
          },
          {
            id: 'Crunchbase_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Crunchbase_URL',
            defaultMatch: false
          },
          {
            id: 'Linkedin_URL',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Linkedin_URL',
            defaultMatch: false
          },
          {
            id: 'email_subject',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'email_subject',
            defaultMatch: false
          },
          {
            id: 'email_body',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'email_body',
            defaultMatch: false
          },
          {
            id: 'linkedin_profile_scrape',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'linkedin_profile_scrape',
            defaultMatch: false
          },
          {
            id: 'linkedin_company_scrape',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'linkedin_company_scrape',
            defaultMatch: false
          },
          {
            id: 'crunchbase_company_scrape',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'crunchbase_company_scrape',
            defaultMatch: false
          },
          {
            id: 'email',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'email',
            defaultMatch: false
          },
          {
            id: 'company_linkedin',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'company_linkedin',
            defaultMatch: false
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      filters: {
        conditions: [
          {
            keyName: 'email',
            keyValue: '={{ $(\'Main Loop\').item.json.email }}'
          }
        ]
      },
      options: {},
      operation: 'update',
      dataTableId: {
        __rl: true,
        mode: 'list',
        value: '6XegBPA9Om69hRLz',
        cachedResultUrl: '/projects/sLfRUA3B2xKNo0Sc/datatables/6XegBPA9Om69hRLz',
        cachedResultName: 'email_linkedin_list'
      }
    }, position: [2256, 416], name: 'Update row(s)' } }))
  .add(sticky('## Creative Outreach Agent - A dedicated agent designated for creativity and equipped with enriched data for a creative personalized email', { name: 'Sticky Note', color: 4, position: [560, 352], width: 1872, height: 528 }))
  .add(sticky('## Data Enrichment - Step 1; Fetch person details from local table, scrap data from multiple resources to enrich the user profile', { name: 'Sticky Note1', position: [928, -448], width: 1504, height: 768 }))
  .add(sticky('## Prerequisites\n\n- This workflow is designed to enrich outreach with up-to-date data also generate a personalized outreach emails\n\n\n- **Subscript to RapidAPI Scraper:** [HERE](https://rapidapi.com/ikemo-ikemo-default/api/cold-outreach-enrichment-scraper)\n\n- **Table headers;**\n"First_name",\n"Last_name",\n"email",\n"Title",\n"Location",\n"Company_Name",\n"Company_site",\n"Crunchbase_URL",\n"Linkedin_URL",\n"linkedin_profile_scrape",\n"linkedin_company_scrape",\n"crunchbase_company_scrape",\n"company_linkedin",\n"email_subject",\n"email_body"\n', { name: 'Sticky Note2', color: 3, position: [560, -448], width: 352, height: 768 }))
  .add(sticky('## Enrich personal LinkedIn data', { name: 'Sticky Note3', color: 6, position: [1568, -400], width: 800, height: 224 }))
  .add(sticky('## Enrich Company\'s LinkedIn data', { name: 'Sticky Note4', color: 6, position: [1568, -160], width: 800, height: 224 }))
  .add(sticky('## Enrich Company\'s Crunchbase data', { name: 'Sticky Note5', color: 6, position: [1568, 80], width: 800, height: 224 }))