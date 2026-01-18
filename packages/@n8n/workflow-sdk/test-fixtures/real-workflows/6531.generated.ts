return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ triggerAtHour: 5 }] } }, position: [1000, 340], name: 'Schedule' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Generate my next LinkedIn post.\n\nReturn only:\n\nabout (1-sentence summary)\n\ncopy (LinkedIn post content)\n\nimage (simple description for AI image generation)\n\nBegin:\n',
      options: {
        systemMessage: '=ROLE:\nYou are a world-class content strategist for Abdul, an agency owner who helps B2B businesses scale through smart AI automation.\n\nOBJECTIVE:\nYour mission is to write high-performing LinkedIn posts that:\n\n-Build Abdul’s authority and personal brand\n-Spark interest in his services\n-Deliver real value to startup founders, marketers, and B2B operators\n-Subtly showcase how automation is the smart growth edge of today\n\nABOUT BUILTBYABDUL:\nAbdul is the founder of BuiltByAbdul, an AI automation agency focused on helping businesses scale without burnout.\n\nHe builds & sells:\n-AI-powered personalized lead generation systems\n-Automated ClickUp CRMs and project management workflows\n-AI Content agents that repurpose and schedule high-volume content\n-Client onboarding automations (proposals, forms, contracts, etc.)\n-Other AI workflows that save founders dozens of hours per month\n\nYour content should feel valuable and entertaining—but also act like a Trojan horse for demand. Make readers go: “Damn, I should be using this.”\n\n\nAudience:\nStartup founders, marketing agency owners, B2B consultants, fractional CMOs, and solopreneurs trying to scale smarter.\n\nTone:\nSharp, clear, valuable. Feels like Hormozi meets Naval—wise, practical, and a little bold.\n\nThere are 2 CONTENT BUCKETS: \n1. Timeless Principles (Story Format)\nShare a story-driven post (not a quote dump or tweet-style list) based on a timeless principle from greats like Hormozi, Ogilvy, Naval, Munger, Housel, or Paul Graham\n• Use real examples, mini-narratives, or metaphors to make the lesson hit harder\n• Insight should relate to business, sales, leverage, brand, or growth\n\n2. Real-World AI/Automation Use Case\nTeach how smart businesses are saving time/money with automation\nExamples: AI cold outreach, ClickUp CRM builds, automated onboarding, content repurposing, proposal generation\nEmphasize time saved, hours unlocked, revenue gained\n\nMake the post:\n-Scroll-stopping from the first line\n-Easy to consume with line spacing\n-Tied to growth, marketing, or automation\n-Subtly highlight Abdul’s expertise through storytelling or lesson'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2.1, config: { parameters: {
          name: 'web_search',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'eALld0YaOZuUCU5q',
            cachedResultName: 'Perplexity Research'
          },
          description: 'Call this tool to make a web search query using Perplexity AI. It will automatically look at multiple relevant websites and combine all the valuable information in one clean response.',
          workflowInputs: {
            value: {},
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
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['query'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'Perplexity Research' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-3-7-sonnet-20250219',
            cachedResultName: 'Claude 3.7 Sonnet'
          },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          jsonSchemaExample: '{\n  "about": "One-sentence summary of what the post is about",\n  "copy": "Full LinkedIn post in story format. Strong hook, clear pacing, valuable insight. Use spacing for readability.",\n  "image": "Renaissance-style visual metaphor of the idea. Simple, clear, symbolic."\n}'
        }, name: 'Structured Output Parser' } }) }, position: [1420, 180], name: 'LinkedIn Creator Agent' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'url',
        value: '=https://drive.google.com/file/d/1Bt2wh1a3IkWrf8VRIMJL4sRwiKDbWfhC/view?usp=sharing'
      },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1860, 260], name: 'Image Style' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          { name: 'model', value: 'gpt-image-1' },
          {
            name: 'image',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          },
          {
            name: 'prompt',
            value: '=You\'re a professional artist/designer.\n\nMake a new image in the style very very similar to the reference.\n\nCopy the art style, theme, painting look, etc.\n\nMake it vertical 3x4.\n\nIt will be an image for a LinkedIn post.\n\nHere is the description of the new image:\n{{ $(\'LinkedIn Creator Agent\').item.json.output.image }}'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [2080, 260], name: 'OpenAI Image1' } }))
  .then(node({ type: 'n8n-nodes-base.convertToFile', version: 1.1, config: { parameters: {
      options: {},
      operation: 'toBinary',
      sourceProperty: 'data[0].b64_json',
      binaryPropertyName: '=data'
    }, position: [2280, 260], name: 'Convert to File' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $(\'LinkedIn Creator Agent\').item.json.output.name }}',
      driveId: {
        __rl: true,
        mode: 'list',
        value: 'My Drive',
        cachedResultUrl: 'https://drive.google.com/drive/my-drive',
        cachedResultName: 'My Drive'
      },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1e1USeEsOByu-n5cR5o1IeyzJFfkf8O4i',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1e1USeEsOByu-n5cR5o1IeyzJFfkf8O4i',
        cachedResultName: 'LinkedIn AI Posts'
      },
      inputDataFieldName: '=data'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [2500, 260], name: 'Save Image' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          text: '={{ $(\'LinkedIn Creator Agent\').item.json.output.copy }}',
          about: '={{ $(\'LinkedIn Creator Agent\').item.json.output.about }}',
          image: '={{ $json.webViewLink.replace(/usp=[^&]+/, \'usp=sharing\') }}',
          status: 'review'
        },
        schema: [
          {
            id: 'about',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'about',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'text',
            type: 'string',
            display: true,
            required: false,
            displayName: 'text',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image',
            type: 'string',
            display: true,
            required: false,
            displayName: 'image',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'status',
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
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit#gid=0',
        cachedResultName: 'LinkedIn Posts'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit?usp=drivesdk',
        cachedResultName: 'AI Content Database'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [2700, 260], name: 'Save Post' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ daysInterval: 3, triggerAtHour: 14 }] }
    }, position: [880, 680], name: 'Schedule 2' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupValue: 'ready', lookupColumn: 'status' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit#gid=0',
        cachedResultName: 'LinkedIn Posts'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit?usp=drivesdk',
        cachedResultName: 'AI Content Database'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1060, 680], name: 'Get Ready Posts' } }))
  .then(node({ type: 'n8n-nodes-base.limit', version: 1, config: { position: [1240, 680], name: 'Pick One' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'url', value: '={{ $json.image }}' },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1440, 680], name: 'Download Image' } }))
  .then(node({ type: 'n8n-nodes-base.linkedIn', version: 1, config: { parameters: {
      text: '={{ $json.text }}',
      person: 'rBxbEv1ziJ',
      additionalFields: { visibility: 'PUBLIC' },
      shareMediaCategory: 'IMAGE'
    }, credentials: {
      linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' }
    }, position: [1640, 680], name: 'Publish Post' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {
          about: '={{ $(\'Pick One\').item.json.about }}',
          status: 'posted'
        },
        schema: [
          {
            id: 'about',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'about',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'text',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'text',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'image',
            type: 'string',
            display: true,
            removed: true,
            required: false,
            displayName: 'image',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['about'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit#gid=0',
        cachedResultName: 'LinkedIn Posts'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit?usp=drivesdk',
        cachedResultName: 'AI Content Database'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [1840, 680], name: 'Update Status' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit#gid=0',
        cachedResultName: 'LinkedIn Posts'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1S3vi0R9cjbB1A7ZXFz7jCwrBbBjn-lqEVP78QsfMS_A/edit?usp=drivesdk',
        cachedResultName: 'AI Content Database'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [960, 180], name: 'Get Past Ideas' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get all incoming items\nconst items = $input.all();\n\n// Extract the text field from each item\nconst texts = items.map(item => item.json.idea);\n\n// Concatenate them (adjust the separator as needed)\nconst concatenated = texts.join(", ");\n\n// Return a single item with the concatenated text\nreturn [{ json: { mergedText: concatenated } }];'
    }, position: [1140, 180], name: 'Join Ideas' } }))
  .add(sticky('## Generate a New Post Idea and All Materials', { name: 'Sticky Note7', color: 6, position: [800, 80], width: 980, height: 480 }))
  .add(sticky('## Generate an Image and Save', { name: 'Sticky Note8', color: 6, position: [1800, 80], width: 1140, height: 480 }))
  .add(sticky('## Auto Posting', { name: 'Sticky Note1', color: 4, position: [800, 580], width: 1340, height: 300 }))
  .add(sticky('# Create and auto-post branded LinkedIn content with AI and Perplexity\n\n## Overview \nAutomate your entire LinkedIn content machine — from research and image generation to scheduling and posting — with this AI-powered workflow.\n\nThis workflow pulls in past content ideas, researches new ones using Perplexity, generates a new post (with image) using your brand\'s voice and style, saves the output to Google Sheets, and auto-posts twice a week to LinkedIn. It’s perfect for founders, creators, and marketers who want to stay consistent on LinkedIn without manually writing or designing every post.\n\n### Who’s it for\n- Solo founders or marketers building a LinkedIn presence  \n- Content creators growing their audience  \n- Agencies managing client content calendars  \n- Anyone who wants to post consistently without spending hours on content  \n\n### How it works\n- Pulls old ideas from a Google Sheet  \n- Schedules content creation using n8n’s cron node  \n- Uses Perplexity to research current topics and trends  \n- Feeds the data into an AI agent (like Claude or GPT) to generate post copy  \n- Creates a branded image using a reference style and OpenAI’s image model  \n- Saves post content + image URL into Google Sheets  \n- Twice a week, selects one ready post, downloads the image, and publishes it to LinkedIn\n\n### How to set up\n1. Add your Google Sheet ID and column names for posts  \n2. Connect your OpenAI (or Claude) and Perplexity API keys  \n3. Upload a brand-style reference image to Google Drive  \n4. Configure your LinkedIn account and connect the node  \n5. Adjust the cron schedule for both post creation and auto-posting  \n6. (Optional) Edit the AI prompt to match your personal voice or niche  \n\n### Requirements\n- Google Drive & Sheets access  \n- OpenAI or Claude API key  \n- Perplexity API key  \n- LinkedIn credentials (via n8n’s LinkedIn integration)\n\n### How to customize\n- Change the prompt for the AI to fit your voice or audience  \n- Swap out Perplexity for another research method  \n- Adjust how often you want posts scheduled or published  \n- Swap LinkedIn for Twitter, Slack, or another platform  \n- Add Notion or Airtable as your CMS backend\n', { position: [120, 80], width: 660, height: 1180 }))
  .add(sticky('## Hey, I\'m Abdul 👋\n### I build growth systems for consultants & agencies. If you want to work together or need help automating your business, check out my website: \n### **https://www.builtbyabdul.com/**\n### Or email me at **abdul@buildabdul.com**\n### Have a lovely day ;)`', { name: 'Sticky Note4', color: 5, position: [820, 940], width: 440, height: 240 }))