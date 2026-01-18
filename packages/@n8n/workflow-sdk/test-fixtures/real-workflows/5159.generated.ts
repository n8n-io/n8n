return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {
        path: 'wpcontent',
        buttonLabel: 'Next',
        appendAttribution: false
      },
      formTitle: 'Create Content',
      formFields: {
        values: [
          {
            fieldType: 'dropdown',
            fieldLabel: 'Task',
            fieldOptions: {
              values: [{ option: 'Generate Content' }, { option: 'Add Ideas' }]
            }
          }
        ]
      }
    }, position: [-1580, 580], name: 'Form Trigger: Select Action' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      options: {
        dataLocationOnSheet: { values: { rangeDefinition: 'detectAutomatically' } }
      },
      filtersUI: { values: [{ lookupValue: 'no', lookupColumn: 'Generated' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'id',
        value: '1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U'
      }
    }, position: [-980, 800], name: 'Fetch Unprocessed Ideas' } }), node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: { buttonLabel: 'NEXT' },
      formFields: { values: [{ fieldLabel: 'Topic' }] }
    }, position: [-980, 400], name: 'Form: Enter Topic for Ideas' } })], { version: 2.2, parameters: {
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
            id: '41e4b502-f201-47a2-a244-ac705528f843',
            operator: { type: 'string', operation: 'contains' },
            leftValue: '={{ $json.Task }}',
            rightValue: 'Generate Content'
          }
        ]
      },
      looseTypeValidation: true
    }, name: 'If Generate Content' }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '3e8d2523-66aa-46fe-adcc-39dc78b9161e',
            name: 'prompt',
            type: 'string',
            value: '={{ $json.Prompt }}'
          }
        ]
      }
    }, position: [-780, 800], name: 'Set Prompt' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an SEO expert. Write an article based on this topic: {{ $(\'Fetch Unprocessed Ideas\').item.json.Prompt }}\nInstructions:\n-In the introduction, present the topic that will be discussed in the rest of the text.\n-The introduction should be about 120 words.\n-The conclusion should be about 120 words.\n-In the conclusion, summarize everything said in the article and present the reader with final conclusions.\n-Write a maximum of 4-5 chapters and expand on them.\n-Chapters should maintain a logical sequence and not repeat the same concepts.\n-Chapters should be interconnected, not isolated blocks of text. The text should be fluent and follow a linear logic.\n-Do not start chapters with "Chapter 1", "Chapter 2", "Chapter 3"... just write the chapter title.\n-Use HTML for text formatting, but limit yourself to using bold, italics, paragraphs, lists, and tables.\n-Do not place the result in a ```html code block, only the text itself.\n-Do not use markdown formatting.\n-Delve into the topic you are writing about; do not provide only superficial information.\n-I expect only HTML format in the response.\nDO NOT INCLUDE ```html\nWRITE SO IT DOESN\'T LOOK LIKE AI - do not use long dashes, and in titles and subheadings, capitalize only the first word.\n\nIf possible, add data in a table.',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-1.5-flash-latest' }, name: 'Gemini Model for Article' } }) }, position: [-600, 800], name: 'Generate Article AI' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Choose an expression based on which you will find a matching graphic in Pexels API.\nTopic: {{ $(\'Fetch Unprocessed Ideas\').item.json.Prompt }} \nInstructions:\n- Choose one expression that will best match to find a graphic.\n- Use a general category to always match a graphic.\n- Do not use any HTML characters.\n- Return only a string containing the expression.\n- Do not use quotation marks. The only allowed special characters are ":" and ",".\n- Make each one unique so there are no 2 identical graphics.',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-1.5-flash-latest' }, name: 'Gemini Model for Image Keyword' } }) }, position: [-280, 800], name: 'Generate Image Keyword AI' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.pexels.com/v1/search?query={{ encodeURIComponent($(\'Generate Image Keyword AI\').item.json.output) }}&per_page=1',
      options: {},
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Authorization', value: '<YOUR_PEXELS_API_KEY>' }]
      }
    }, position: [-960, 1180], name: 'Search Pexels Image' } }))
  .then(node({ type: 'n8n-nodes-base.wordpress', version: 1, config: { parameters: {
      title: '={{ $(\'Fetch Unprocessed Ideas\').item.json.Prompt }}',
      additionalFields: {
        status: 'publish',
        content: '={{ $(\'Generate Article AI\').item.json.output }}\n\nImage by: {{ $(\'Search Pexels Image\').item.json.photos[0].photographer }}\n{{ $(\'Search Pexels Image\').item.json.photos[0].photographer_url }}'
      }
    }, position: [-760, 1180], name: 'Create WordPress Post' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $(\'Search Pexels Image\').item.json.photos[0].src.large2x }}',
      options: { response: { response: { responseFormat: 'file' } } }
    }, position: [-560, 1180], name: 'Download Pexels Image' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://<YOUR_WORDPRESS_URL>/wp-json/wp/v2/media',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'binaryData',
      sendHeaders: true,
      authentication: 'predefinedCredentialType',
      headerParameters: {
        parameters: [
          {
            name: 'Content-Disposition',
            value: '=attachment; filename="cover-{{ $(\'Create WordPress Post\').item.json.id }}.jpg"'
          }
        ]
      },
      inputDataFieldName: 'data',
      nodeCredentialType: 'wordpressApi'
    }, position: [-380, 1180], name: 'Upload Image' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://<YOUR_WORDPRESS_URL>/wp-json/wp/v2/posts/{{ $(\'Create WordPress Post\').item.json.id }}',
      method: 'POST',
      options: {},
      sendQuery: true,
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [{ name: 'featured_media', value: '={{ $json.id }}' }]
      },
      nodeCredentialType: 'wordpressApi'
    }, position: [-200, 1180], name: 'Set Featured Image' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          Date: '={{ $now.format(\'dd/LL/yyyy\') }}',
          Title: '={{ $(\'Create WordPress Post\').item.json.title.raw }}',
          'Post ID': '={{ $(\'Create WordPress Post\').item.json.id }}',
          Generated: 'yes',
          row_number: '={{ $(\'Fetch Unprocessed Ideas\').item.json.row_number }}'
        },
        schema: [
          {
            id: 'Date',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Date',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Prompt',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Post ID',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Post ID',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Generated',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Generated',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['row_number'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U/edit?usp=drivesdk',
        cachedResultName: 'n8n-wp'
      }
    }, position: [-20, 1180], name: 'Update Google Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {},
      operation: 'completion',
      completionTitle: 'END',
      completionMessage: '={{ $items().map(item => "- " + item.json.Title).join(\'\\n\') }}'
    }, position: [180, 1180], name: 'Form: End Post Generation' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=Prepare a blog topic - Make the title great for SEO.\n\nNOTE.\nGenerate 5 topics.\nIn the response, provide JSON code: \n{\n  "Topic": "Sample topic"\n}\nDo not add markdown, do not add \'\'\'json\'.\nDo not add numbers to topics.\n\nWrite about {{ $json.Topic }}',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '[\n  {\n    "Topic": "Example topic 1"\n  },\n  {\n    "Topic": "Example topic 2"\n  },\n  {\n    "Topic": "Example topic 3"\n  },\n    {\n    "Topic": "Example topic 4"\n  },\n  {\n    "Topic": "Example topic 5"\n  }\n]'
        }, name: 'Parse AI Topic Output' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-1.5-flash-latest' }, name: 'Gemini Model for Topics' } }) }, position: [-700, 400], name: 'Generate Blog Topics AI' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'output' }, position: [-300, 400], name: 'Split Topics' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: { Title: '=', Prompt: '={{ $json.Topic }}', Generated: 'no' },
        schema: [
          {
            id: 'Date',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Date',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Prompt',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Prompt',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Post ID',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Post ID',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Generated',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Generated',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U/edit#gid=0',
        cachedResultName: 'Sheet1'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1UDaTATWOnYorewjEF5-G9edgSBjc2_Rb50BZVFbAu8U/edit?usp=drivesdk',
        cachedResultName: 'n8n-wp'
      }
    }, position: [-40, 400], name: 'Add Ideas to Sheet' } }))
  .then(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {
        buttonLabel: 'NEXT',
        formDescription: '={{ $items().map(item => "- " + item.json.Prompt).join(\'\\n\') }}'
      },
      formFields: {
        values: [
          {
            fieldType: 'dropdown',
            fieldLabel: 'What next?',
            fieldOptions: { values: [{ option: 'END' }, { option: 'NEXT' }] }
          }
        ]
      }
    }, position: [240, 400], name: 'Form: Add More Topics?' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: { buttonLabel: 'NEXT' },
      formFields: { values: [{ fieldLabel: 'Topic' }] }
    }, position: [-980, 400], name: 'Form: Enter Topic for Ideas' } }), node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: {},
      operation: 'completion',
      completionTitle: 'END',
      completionMessage: '={{ $items("Generate Blog Topics AI")[0].json.output.map(item => "- " + item.Topic).join(\'\\n\') }}'
    }, position: [680, 420], name: 'Form: End Idea Generation' } })], { version: 2.2, parameters: {
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
            id: '73836e3b-ce8d-4e69-be29-82971a6bd82c',
            operator: { type: 'string', operation: 'contains' },
            leftValue: '={{ $json["What next?"] }}',
            rightValue: 'NEXT'
          }
        ]
      }
    }, name: 'If Add More Topics' }))
  .add(sticky('## Generate Topics\nWhat topics should be generated?', { name: 'Sticky Note1', color: 5, position: [-1040, 260], height: 400 }))
  .add(sticky('## Add to Sheet\nAdd as topics for which posts have not yet been generated.', { name: 'Sticky Note2', color: 5, position: [-120, 260], height: 380 }))
  .add(sticky('## Add More?\nSelect in the form to add another 5 topics.', { name: 'Sticky Note3', color: 5, position: [180, 260], width: 220, height: 380 }))
  .add(sticky('## Start Over or End\n', { name: 'Sticky Note4', color: 4, position: [440, 260], width: 220, height: 380 }))
  .add(sticky('## WordPress & Pexels API Settings\nEdit settings by entering your WordPress data and Pexels API key.\n- `Search Pexels Image` node: Add Pexels API Key in Headers -> Authorization.\n- `Upload Image` & `Set Featured Image` nodes: Update URL with your WordPress site URL.', { name: 'API Settings Note', position: [-1580, 1140], width: 960, height: 280 }))
  .add(sticky('# Workflow Instructions\n\nThis workflow automates content creation, from idea generation to publishing on WordPress.\n\n**Prerequisites:**\n1.  Google Sheets account & a sheet with columns: `Date`, `Prompt`, `Title`, `Post ID`, `Generated`, `row_number`.\n2.  WordPress site with REST API enabled.\n3.  Google Gemini API Key.\n4.  Pexels API Key.\n\n**Setup Steps:**\n1.  **Credentials:** Configure credentials for Google Sheets, WordPress, and Google Gemini in the respective n8n nodes.\n2.  **API Keys & URLs:**\n    *   In `Search Pexels Image` node: Set your Pexels API key in the `Authorization` header.\n    *   In `Upload Image` & `Set Featured Image` nodes: Replace `<YOUR_WORDPRESS_URL>` with your site\'s URL.\n3.  **Google Sheet:** Ensure `Document ID` and `Sheet Name` (e.g., `Sheet1`) are correct in all Google Sheets nodes.\n4.  **Activate Workflow.**\n\n**How it works:**\nThe workflow starts with `Form Trigger: Select Action`:\n*   **Generate Content:** Fetches ideas marked `no` in `Generated` column, creates an article, finds an image, posts to WordPress, and updates the sheet.\n*   **Add Ideas:** Prompts for a general topic, generates 5 blog ideas, adds them to the sheet, and asks if you want to generate more.', { name: 'Workflow Instructions', position: [-1640, -200], width: 500, height: 940 }))