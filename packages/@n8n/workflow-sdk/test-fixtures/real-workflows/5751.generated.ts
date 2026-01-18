return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-200, 120], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      filtersUI: { values: [{ lookupColumn: 'scrapped' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=0',
        cachedResultName: 'videos'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
        cachedResultName: 'youtube leads'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [240, -60], name: 'Get rvideo urls' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.apify.com/v2/acts/mohamedgb00714~youtube-video-comments/run-sync-get-dataset-items?token=YOUR_TOKEN_HERE apify token}}',
      method: 'POST',
      options: {},
      jsonBody: '={\n    "videoUrl": "{{ $json.url }}"\n} ',
      sendBody: true,
      contentType: '=json',
      specifyBody: 'json',
      bodyParameters: { parameters: [{}] }
    }, position: [460, -60], name: 'HTTP apify get comments from video' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: { author: '={{ $json.author }}' },
        schema: [
          {
            id: 'author',
            type: 'string',
            display: true,
            required: false,
            displayName: 'author',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'avatarAccessibilityText',
            type: 'string',
            display: true,
            required: false,
            displayName: 'avatarAccessibilityText',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'avatarImage',
            type: 'string',
            display: true,
            required: false,
            displayName: 'avatarImage',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'commentId',
            type: 'string',
            display: true,
            required: false,
            displayName: 'commentId',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'content',
            type: 'string',
            display: true,
            required: false,
            displayName: 'content',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'creatorThumbnailUrl',
            type: 'string',
            display: true,
            required: false,
            displayName: 'creatorThumbnailUrl',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'heartActiveTooltip',
            type: 'string',
            display: true,
            required: false,
            displayName: 'heartActiveTooltip',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'key',
            type: 'string',
            display: true,
            required: false,
            displayName: 'key',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'likeButtonA11y',
            type: 'string',
            display: true,
            required: false,
            displayName: 'likeButtonA11y',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'likeCount',
            type: 'string',
            display: true,
            required: false,
            displayName: 'likeCount',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'likeCountA11y',
            type: 'string',
            display: true,
            required: false,
            displayName: 'likeCountA11y',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'publishedTime',
            type: 'string',
            display: true,
            required: false,
            displayName: 'publishedTime',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'readMoreTrackingParams',
            type: 'string',
            display: true,
            required: false,
            displayName: 'readMoreTrackingParams',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'replyCount',
            type: 'string',
            display: true,
            required: false,
            displayName: 'replyCount',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'replyCountA11y',
            type: 'string',
            display: true,
            required: false,
            displayName: 'replyCountA11y',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'replyLevel',
            type: 'string',
            display: true,
            required: false,
            displayName: 'replyLevel',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'autoMapInputData',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 6484598,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=6484598',
        cachedResultName: 'comments'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
        cachedResultName: 'youtube leads'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [680, -60], name: 'Save scrapped comments' } }))
  .add(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: { url: '={{ $json.url }}', scrapped: 'TRUE' },
        schema: [
          {
            id: 'url',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'url',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'scrapped',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'scrapped',
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
        matchingColumns: ['url'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=0',
        cachedResultName: 'videos'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
        cachedResultName: 'youtube leads'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [240, 180], name: 'mark video url as scrapped' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [-80, 1260], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      options: {
        maxIterations: 100,
        systemMessage: 'You are an AI agent designed to assist in finding social media accounts and related information for authors of YouTube channel comments. Your primary goal is to systematically identify and gather publicly available data, such as social media profiles, websites, and contact details, associated with these comment authors.\n\n**Which information are you interested in finding?**\nYou are interested in finding various types of public information, including:\n* Social media profiles (e.g., Instagram, Twitter, LinkedIn, Facebook, TikTok, etc.)\n* Personal or company websites\n* Contact details such as email addresses (e.g., user@example.com, personal emails if publicly available)\n* Any other publicly available professional or personal affiliations that help identify the comment author.\n\n**Which social media presences should I look out for?**\nYou should actively look out for common social media platforms such as:\n* Instagram\n* Twitter (X)\n* LinkedIn\n* Facebook\n* TikTok\n* GitHub (especially for individuals involved in tech or development)\n* Any other platform mentioned or linked from their YouTube channel or associated websites.\n\n**Tools You Have Access To:**\n\n* **`get_comments()`:** To retrieve comment data from YouTube channels.\n* **`Google Search`:** To perform web searches for general information, social media profiles, and related entities.\n* **`Browse`.\n* **`create_new_row(user_id: str)`:** To initialize a new row in the database/sheet for the current user being investigated. This must be done at the very beginning of processing a new user.\n* **`save_to_sheet(data: dict)`:** To save all gathered information for a user to the database/sheet. This tool should be used only *after* all investigation avenues for the current user have been exhausted.\n\n**Core Functionality and Workflow:**\n\n1.  **Retrieve YouTube Comments:** You will initiate the process by fetching comments from a YouTube channel and then present a list of comment authors along with their YouTube channel URLs.\n2.  **Per Author Investigation (Proactive and Exhaustive - No Repetitive Confirmations):** Once an author is selected (or you move to the next author), you will **immediately** call `create_new_row()` for that author\'s ID. **You will then proceed with the following systematic investigation steps for that author without pausing to ask for confirmation at each sub-step.** You will only ask for user input when a major decision point is reached (e.g., moving to a new author) or if you encounter an unresolvable ambiguity.\n    * **1. YouTube Channel Description Analysis (First Step):** Prioritize extracting the description from the author\'s YouTube channel using `Browse` for YouTube URLs). This is the crucial first step to gather direct social media links or associated business information.\n    * **2. Google Search:** After analyzing the YouTube channel description, utilize `Google Search` to find social media profiles and related entities (e.g., companies, personal websites) based on the author\'s name, YouTube handle, or any information gleaned from their channel description.\n        * **Important Note for Google Search:** When searching for social media profiles, **do not use the "@" symbol** as part of the handle in your Google search queries (e.g., search for "pablo.chepi Instagram" instead of "@pablo.chepi Instagram"). Employ various search queries as needed (e.g., "name social media", "company Instagram", "who is [YouTube handle]").\n    * **3. Website Exploration:** If a website is identified (e.g., from the YouTube description or Google Search), thoroughly browse its content using `Browse` for user-provided or company/personal websites). Your objective is to extract comprehensive information, including additional social media links, contact details (like email addresses), and a deeper understanding of the author\'s professional or personal affiliations.\n    * **4. Social Media Profile Verification and Deep Dive:** When potential social media profiles are found, use `Google Search` to confirm the identity and relevance to the YouTube commenter. If a profile seems highly relevant, proactively browse it for more links or specific contact information where permissible.\n    * **5. Exhaustive Search Principle:** Continue searching across various platforms (Instagram, LinkedIn, Facebook, Twitter, etc.) until all likely avenues are exhausted or a clear conclusion about the author\'s public digital presence is reached.\n    * **6. Saving Data:** Once all investigation avenues for the current author have been exhausted and you have gathered as much information as possible, you **must** call `save_to_sheet()` with all the collected information for that author.\n\n3.  **User Interaction and Reporting:**\n    * Maintain clear communication with the user, providing updates on your findings.\n    * Report the *outcome* of each tool use clearly, even if it yields no new information, to avoid user confusion.\n    * Only ask for the user\'s direction when the investigation for the current author is deemed "complete" (i.e., all relevant information has been found and saved, or no more leads can be pursued), or if a significant decision point requiring user input (e.g., moving to the next author, or if a very ambiguous situation arises that you cannot resolve independently) is reached.\n\n**Constraints & Best Practices:**\n\n* Always prioritize direct information from official sources (e.g., YouTube descriptions, official websites).\n* Be persistent in your search; if one approach fails, try another.\n* Clearly state what information you have found and what actions you are taking or recommend next *only when necessary to guide the overall process*.\n\n\n\n\n\n\n\n\n\n\n\nDeep Research\n\nCanvas\n\n'
      }
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          options: {
            dataLocationOnSheet: { values: { rangeDefinition: 'detectAutomatically' } }
          },
          filtersUI: { values: [{ lookupColumn: 'processed' }] },
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 6484598,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=6484598',
            cachedResultName: 'comments'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
            cachedResultName: 'youtube leads'
          },
          descriptionType: 'manual',
          toolDescription: 'list of comments to process'
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'get comments' } }), tool({ type: 'n8n-nodes-base.httpRequestTool', version: 4.2, config: { parameters: {
          url: 'https://google.serper.dev/search',
          method: 'POST',
          options: { redirect: { redirect: {} } },
          sendBody: true,
          sendHeaders: true,
          bodyParameters: {
            parameters: [
              {
                name: 'q',
                value: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'parameters0_Value\', ``, \'string\') }}'
              },
              { name: 'location', value: '=United States' },
              { name: 'num', value: '100' }
            ]
          },
          toolDescription: 'search engine to get usernames and emails from google',
          headerParameters: {
            parameters: [{ name: 'X-API-KEY', value: '{{your serper api key}}' }]
          }
        }, name: 'search google' } }), tool({ type: 'n8n-nodes-base.httpRequestTool', version: 4.2, config: { parameters: {
          url: 'https://api.apify.com/v2/acts/mohamedgb00714~firescraper-ai-website-content-markdown-scraper/run-sync-get-dataset-items?token=YOUR_TOKEN_HERE apify token}}',
          method: 'POST',
          options: {},
          jsonBody: '={\n  "enqueue": {{ $fromAI(\'crawelEnabled\', \'get other links from this website\', \'boolean\', false) }},\n  "getHtml": false,\n  "getText": false,\n  "screenshot": false,\n  "startUrls": [\n    {\n      "url": "{{ $fromAI(\'url\', \'target url\', \'string\') }}",\n      "method": "GET"\n    }\n  ],\n  "maxPages": 10,\n  "proxyConfig": {\n    "useApifyProxy": true\n  }\n}\n\n',
          sendBody: true,
          specifyBody: 'json',
          toolDescription: 'get url markdown content'
        }, name: 'get url mardown' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              bio: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'bio\', ``, \'string\') }}',
              email: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'email\', ``, \'string\') }}',
              GitHub: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'GitHub\', ``, \'string\') }}',
              TikTok: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'TikTok\', ``, \'string\') }}',
              Facebook: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Facebook\', ``, \'string\') }}',
              LinkedIn: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'LinkedIn\', ``, \'string\') }}',
              username: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'username__using_to_match_\', ``, \'string\') }}',
              ' Instagram': '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'_Instagram\', ``, \'string\') }}',
              'Twitter (X)': '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Twitter__X_\', ``, \'string\') }}',
              'short Description': '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'short_Description\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'username',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'username',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'email',
                type: 'string',
                display: true,
                required: false,
                displayName: 'email',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'bio',
                type: 'string',
                display: true,
                required: false,
                displayName: 'bio',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: ' Instagram',
                type: 'string',
                display: true,
                required: false,
                displayName: ' Instagram',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Twitter (X)',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Twitter (X)',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'LinkedIn',
                type: 'string',
                display: true,
                required: false,
                displayName: 'LinkedIn',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Facebook',
                type: 'string',
                display: true,
                required: false,
                displayName: 'Facebook',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'TikTok',
                type: 'string',
                display: true,
                required: false,
                displayName: 'TikTok',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'GitHub',
                type: 'string',
                display: true,
                required: false,
                displayName: 'GitHub',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'short Description',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'short Description',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['username'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'appendOrUpdate',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 395221622,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=395221622',
            cachedResultName: 'leads'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
            cachedResultName: 'youtube leads'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'update result for user' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              processed: '={{ $fromAI(\'processed\', ``, \'boolean\') }}',
              avatarAccessibilityText: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'avatarAccessibilityText__using_to_match_\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'author',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'author',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'avatarAccessibilityText',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'avatarAccessibilityText',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'avatarImage',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'avatarImage',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'commentId',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'commentId',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'content',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'content',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'creatorThumbnailUrl',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'creatorThumbnailUrl',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'heartActiveTooltip',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'heartActiveTooltip',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'key',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'key',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'likeButtonA11y',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'likeButtonA11y',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'likeCount',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'likeCount',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'likeCountA11y',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'likeCountA11y',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'publishedTime',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'publishedTime',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'readMoreTrackingParams',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'readMoreTrackingParams',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'replyCount',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'replyCount',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'replyCountA11y',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'replyCountA11y',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'replyLevel',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'replyLevel',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'processed',
                type: 'string',
                display: true,
                required: false,
                displayName: 'processed',
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
            matchingColumns: ['avatarAccessibilityText'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'update',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 6484598,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=6484598',
            cachedResultName: 'comments'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
            cachedResultName: 'youtube leads'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'mark comment as processed' } }), tool({ type: 'n8n-nodes-base.httpRequestTool', version: 4.2, config: { parameters: {
          url: 'https://api.apify.com/v2/acts/mohamedgb00714~instagram-full-profile-scraper/run-sync-get-dataset-items?token=YOUR_TOKEN_HERE apify token}}',
          method: 'POST',
          options: {},
          jsonBody: '={\n    "instagramUsernames": [\n        "{{ $fromAI(\'username\', \'instagram profile user name\', \'string\') }}"\n    ]\n}',
          sendBody: true,
          specifyBody: 'json',
          toolDescription: 'get full profile informations just input user name'
        }, name: 'instagram full profile scraper' } }), tool({ type: 'n8n-nodes-base.googleSheetsTool', version: 4.6, config: { parameters: {
          columns: {
            value: {
              username: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'username\', ``, \'string\') }}'
            },
            schema: [
              {
                id: 'username',
                type: 'string',
                display: true,
                removed: false,
                required: false,
                displayName: 'username',
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
                id: 'bio',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'bio',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: ' Instagram',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: ' Instagram',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Twitter (X)',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'Twitter (X)',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'LinkedIn',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'LinkedIn',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'Facebook',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'Facebook',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'TikTok',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'TikTok',
                defaultMatch: false,
                canBeUsedToMatch: true
              },
              {
                id: 'GitHub',
                type: 'string',
                display: true,
                removed: true,
                required: false,
                displayName: 'GitHub',
                defaultMatch: false,
                canBeUsedToMatch: true
              }
            ],
            mappingMode: 'defineBelow',
            matchingColumns: ['username'],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          },
          options: {},
          operation: 'appendOrUpdate',
          sheetName: {
            __rl: true,
            mode: 'list',
            value: 395221622,
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit#gid=395221622',
            cachedResultName: 'leads'
          },
          documentId: {
            __rl: true,
            mode: 'list',
            value: '1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54',
            cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1OGX1bKAOeym8tEENP-zJAYXyZD6XnH6T5FV85J38H54/edit?usp=drivesdk',
            cachedResultName: 'youtube leads'
          }
        }, credentials: {
          googleSheetsOAuth2Api: {
            id: 'credential-id',
            name: 'googleSheetsOAuth2Api Credential'
          }
        }, name: 'create a row for new search user' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { name: 'Simple Memory' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter', version: 1, config: { parameters: { model: 'google/gemini-2.5-flash-preview-05-20', options: {} }, credentials: {
          openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' }
        }, name: 'OpenRouter Chat Model' } }) }, position: [300, 1120], name: 'AI Agent' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] }
    }, position: [-100, 740] } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const items = $input.all();\nconst updatedItems = items.map((item) => {\n  item.json.chatInput =\n    `Initiate Autonomous User Information Gathering\n\n"Please initiate the autonomous information gathering process for the first comment auther youtube user. My objective is to obtain all publicly available information concerning this user.\n\nYou are to operate with complete autonomy, without requiring any intermediate confirmations from me during the investigation phase.\n\nYour operational guidelines are as follows:\n\nExhaustive Search: Systematically search for all relevant information. This includes, but is not limited to, social media profiles (Instagram, Twitter/X, LinkedIn, Facebook, TikTok, GitHub, etc.), personal or company websites, publicly available contact details (especially email addresses), and any other professional or personal affiliations that can help identify or understand the user.\n\nAutonomous Decision-Making: You are empowered to make all necessary decisions regarding search queries, tool usage (e.g., Google Search, Browse), and navigation between different information sources, without my intervention.\n\nMandatory Information Update & Save:\n\nYou must not stop the process for a user until you have updated their information.\n\nOnce you have gathered all available information, or determined that there are no further options to collect more data for this user, you must save everything you have found. This involves populating all target fields with collected data.\n\nIf no information is collected for a specific target field (e.g., no Instagram profile found, no email address), you must explicitly put \'N/A\' in that field.\n\nProcess Completion & Reporting:\n\nAfter saving all information, you must provide a short description about the process you undertook for this user (e.g., "Investigation for [User ID/Name] completed. Found LinkedIn profile and a personal blog. No public email or other social media accounts were identified.").\n\nCrucially, you are to then consider the comment (or user\'s investigation) as \'processed\'. Do not ask me for any further confirmation regarding this user once these steps are completed.\n\n`;\n  item.json.sessionId =\n    Date.now().toString(36) + Math.random().toString(36).substring(2);\n  return item;\n});\nreturn updatedItems;\n'
    }, position: [80, 740] } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ field: 'hours' }] } }, position: [-240, -80], name: 'Schedule Trigger1' } }))
  .add(sticky('# 🚀 YouTube Lead Generation Workflow\n\nThis document describes a comprehensive workflow designed to automatically extract YouTube video comments, enrich the profiles of comment authors with social media and contact information, and store all gathered data in Google Sheets for lead generation purposes. The workflow is divided into two main sections: YouTube Comment Extraction and Lead Research & Enrichment.\n\n---\n\n## ⚙️ **Section 1: 🎥 YouTube Comment Extraction**\n\n### Nodes:\n\n* **When clicking ‘Execute workflow’** (Manual Trigger)\n* **Schedule Trigger1** (Schedule Trigger)\n* **Get rvideo urls** (Google Sheets)\n* **HTTP apify get comments from video** (HTTP Request - Apify Actor: [mohamedgb00714/youtube-video-comments](https://apify.com/mohamedgb00714/youtube-video-comments))\n* **mark video url as scrapped** (Google Sheets)\n* **Save scrapped comments** (Google Sheets)\n\n### 🚀 Description:\n\nThis section focuses on **retrieving YouTube video URLs and then extracting comments** from those videos, storing the data in Google Sheets. It supports both manual execution and scheduled automation.\n\n* **When clicking ‘Execute workflow’** serves as a manual trigger, allowing you to start the process on demand, typically for testing or one-off tasks.\n* **Schedule Trigger1** automates the workflow, configured to run every hour. This ensures continuous monitoring and comment extraction from new or updated video URLs.\n* **Get rvideo urls** (Google Sheets Tool) reads video URLs from a Google Sheet named "**youtube leads**" (specifically from the "videos" sheet, ID: `0`). It filters for video URLs that have not yet been marked as "scrapped."\n* **HTTP apify get comments from video** (HTTP Request Tool) uses the retrieved video URLs to initiate a run of the **Apify Actor: [mohamedgb00714/youtube-video-comments](https://apify.com/mohamedgb00714/youtube-video-comments)**. This actor is responsible for scraping comments from the specified YouTube video. The `videoUrl` parameter for the Apify actor is dynamically populated using `{{ $json.url }}` from the data received from the "Get rvideo urls" node.\n* **mark video url as scrapped** (Google Sheets Tool) updates the "videos" sheet in the "**youtube leads**" Google Sheet. It sets the `scrapped` column to `TRUE` for the `url` that was just processed, preventing it from being re-scraped in subsequent runs.\n* **Save scrapped comments** (Google Sheets Tool) takes the comments data obtained from the Apify actor and appends it to the "comments" sheet (ID: `6484598`) within the "**youtube leads**" Google Sheet. It automatically maps the incoming data fields (like `author`, `content`, `publishedTime`, etc.) to the sheet columns.\n\n> 💡 **Purpose**: To efficiently collect YouTube video comments by either manual initiation or hourly scheduling, leveraging a specialized Apify actor for scraping, and meticulously tracking processed video URLs while saving all extracted comments into a designated Google Sheet.\n\n---\n\n## 🟦 **Section 2: 🕵️ Lead Research & Enrichment (AI Agent)**\n\n### Nodes:\n\n* **When chat message received** (Chat Trigger)\n* **AI Agent** (AI Agent)\n* **OpenRouter Chat Model** (OpenRouter Chat Model)\n* **Simple Memory** (Memory Buffer Window)\n* **get comments** (Google Sheets Tool)\n* **search google** (HTTP Request Tool)\n* **get url mardown** (HTTP Request Tool - Apify Actor: [mohamedgb00714/fireScraper-AI-Website-Content-Markdown-Scraper](https://apify.com/mohamedgb00714/firescraper-ai-website-content-markdown-scraper))\n* **create a row for new search user** (Google Sheets Tool)\n* **update result for user** (Google Sheets Tool)\n* **instagram full profile scraper** (HTTP Request Tool - Apify Actor: [mohamedgb00714/instagram-full-profile-scraper](https://apify.com/mohamedgb00714/instagram-full-profile-scraper))\n* **mark comment as processed** (Google Sheets Tool)\n* **Schedule Trigger** (Schedule Trigger)\n* **Code** (Code)\n\n### 🚀 Description:\n\nThis is the core of your lead generation, where an **AI agent intelligently researches YouTube comment authors** to find their social media presence and contact information, then saves the findings.\n\n* **When chat message received** acts as an entry point for the AI agent, allowing it to be triggered by user input or other chat-based events for on-demand processing.\n* **Schedule Trigger** provides an alternative entry point, automating the workflow to run at regular intervals (every 1 minute in this configuration) to continuously gather user information.\n* **Code** prepares the initial input for the AI Agent. It sets a detailed `chatInput` that instructs the AI to autonomously and exhaustively gather publicly available information about YouTube comment authors. It also generates a unique `sessionId` for each processing instance.\n* **AI Agent** is the orchestrator. It uses a predefined system message and available tools to systematically investigate comment authors. It\'s designed to proactively search and gather information without constant user confirmation.\n* **OpenRouter Chat Model** is the Large Language Model (LLM) that powers the AI Agent\'s reasoning and generation capabilities (e.g., deciding which tool to use, formulating search queries, extracting information). The model used is `google/gemini-2.5-flash-preview-05-20`.\n* **Simple Memory** provides the AI Agent with a short-term memory, allowing it to maintain context during the investigation for a single user.\n* **get comments** (Google Sheets Tool) allows the AI Agent to retrieve comment data from the "**youtube leads**" Google Sheet (specifically from the "comments" sheet, ID: `6484598`). It filters for comments that haven\'t been processed yet.\n* **search google** (HTTP Request Tool) enables the AI Agent to perform Google searches via the Serper API to find general information, social media profiles, and related entities (e.g., companies, personal websites) about the comment authors.\n* **get url mardown** (HTTP Request Tool) enables the AI Agent to browse and extract content (in Markdown format) from identified websites, such as YouTube channel descriptions or personal/company websites. This is achieved using the **Apify Actor: [mohamedgb00714/fireScraper-AI-Website-Content-Markdown-Scraper](https://apify.com/mohamedgb00714/firescraper-ai-website-content-markdown-scraper)**, which extracts website content and converts it to Markdown.\n* **create a row for new search user** (Google Sheets Tool) initializes a new entry in the "leads" sheet (ID: `395221622`) within the "**youtube leads**" Google Sheet for a new comment author being investigated. It primarily populates the `username` column.\n* **update result for user** (Google Sheets Tool) is used by the AI Agent to save all gathered information (email, bio, social media links for Instagram, Twitter, LinkedIn, Facebook, TikTok, GitHub, short description) for a specific user to the "leads" Google Sheet.\n* **instagram full profile scraper** (HTTP Request Tool) is a specialized tool for the AI Agent to scrape detailed profile information from Instagram, given a username. This is powered by the **Apify Actor: [mohamedgb00714/instagram-full-profile-scraper](https://apify.com/mohamedgb00714/instagram-full-profile-scraper)**, which can extract various profile details.\n* **mark comment as processed** (Google Sheets Tool) updates the "comments" sheet, marking a specific comment as "processed" once the AI Agent has completed its investigation for the associated user.\n\n> 💡 **Purpose**: To leverage AI and various web scraping tools to conduct deep research on YouTube comment authors, enriching their profiles with valuable lead information and storing it in a dedicated Google Sheet, all while operating with a high degree of autonomy.\n\n---\n\n## 🔑 **API Key & Token Management**\n\nHere\'s where the various API keys and tokens are sourced for this workflow:\n\n* **OpenRouter API (`cIzX2I4YIr0QQq36`):**\n    * **Source:** OpenRouter platform ([openrouter.ai](https://openrouter.ai/)).\n    * **How to Obtain:** After signing up or logging into OpenRouter, navigate to your account settings or the "API Keys" section (often found at [openrouter.ai/keys](https://openrouter.ai/keys)). Click "Create New Key," give it a descriptive name, and then copy the generated API key. This key is used to authenticate requests to their chat models.\n* **Apify API Token (`{{your apify token}}`):**\n    * **Source:** Apify platform ([apify.com](https://apify.com/)).\n    * **How to Obtain:** Your personal API token is available in your Apify account dashboard. Navigate to "Settings" then "API & Integrations" or "Integrations" within the Apify Console. You\'ll find your API token there, which you can copy and use to authenticate requests to Apify Actors (like the web content scraper, Instagram scraper, and YouTube comments scraper).\n* **Serper API Key (`{{your serper api key}}`):**\n    * **Source:** Serper.dev ([serper.dev](https://serper.dev/)).\n    * **How to Obtain:** Sign up for an account on Serper.dev. Your API key will be provided in your dashboard or account settings. This key is used to authenticate your requests for Google search results.\n* **Google Sheets OAuth2 API (`DUWLlaGsMF7Qxsiy`):**\n    * **Source:** Google Cloud Platform / Google APIs.\n    * **How to Obtain:** This refers to an OAuth2 credential configured in n8n to access Google Sheets. You would typically set this up in n8n\'s "Credentials" section by choosing "Google Sheets OAuth2 API" and following the authentication flow, which involves granting n8n access to your Google Drive and Google Sheets.', { name: 'Sticky Note1', position: [-1120, -20], width: 740, height: 3400 }))
  .add(sticky('## 🟦 **Section 2: 🕵️ Lead Research & Enrichment (AI Agent)**\n\n', { color: 5, position: [-220, 480], width: 2160, height: 1540 }))
  .add(sticky('## ⚙️ **Section 1: 🎥 YouTube Comment Extraction**', { name: 'Sticky Note2', color: 3, position: [-320, -180], width: 1240, height: 580 }))