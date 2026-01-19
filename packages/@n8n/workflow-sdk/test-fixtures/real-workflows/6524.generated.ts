return workflow('E4pFNNNIatazgVPI', 'Automated AI News Video Creation and Social Media Publishing With Postiz', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-624, 784], name: 'When clicking \'Test workflow\'' } }))
  .then(node({ type: 'n8n-nodes-base.rssFeedRead', version: 1, config: { parameters: { url: 'http://rss.cnn.com/rss/edition.rss', options: {} }, position: [-400, 784], name: 'RSS Read' } }))
  .then(node({ type: 'n8n-nodes-base.limit', version: 1, config: { position: [16, 784], name: 'Limit1' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      columns: {
        value: {
          Guid: '={{ $json.guid }}',
          Link: '={{ $json.link }}',
          Title: '={{ $json.title }}',
          Content: '={{ $json.content }}',
          IsoDate: '={{ $json.isoDate }}',
          pubDate: '={{ $json.pubDate }}'
        },
        mappingMode: 'defineBelow'
      },
      options: {},
      operation: 'append',
      sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1UdfAbMMkJssMVu2qJy2swscL-dETUbjkervC08TYgFo'
      }
    }, position: [624, 784], name: 'Log news to sheets' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1, config: { parameters: {
      text: '=Generate a short, engaging caption (30–60 words) based on this news:\nTitle: {{ $json.Title }}\nContent: {{ $json.Content }}\n\nPlease provide just one caption that is concise and suitable for social media.',
      options: {}
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1, config: { parameters: { options: {} }, name: 'write script' } }) }, position: [-608, 1040], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const items = $input.all();\nconst scripts = items.map((item) => item.json.output);\nreturn [{ json: { scripts } }];'
    }, position: [-224, 1040], name: 'Parse Caption' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3, config: { parameters: { options: {} }, position: [16, 1040], name: 'Setup Heygen Parameters' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://api.heygen.com/v2/video/generate',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "video_inputs": [\n    {\n      "character": {\n        "type": "avatar",\n        "avatar_id": "{{ $json.avatar_id }}",\n        "avatar_style": "normal"\n      },\n      "voice": {\n        "type": "text",\n        "input_text": "{{ $json.caption }}",\n        "voice_id": "{{ $json.voice_id }}",\n        "speed": 1.1\n      }\n    }\n  ],\n  "dimension": {\n    "width": 1280,\n    "height": 720\n  }\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      headerParameters: {
        parameters: [{ name: 'X-Api-Key', value: '={{ $json.heygen_api_key }}' }]
      }
    }, position: [272, 1040], name: 'Create Avatar Video (HeyGen)' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1, config: { parameters: { unit: 'minutes', amount: 2 }, position: [480, 1040], name: 'Wait for Video (HeyGen)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://api.heygen.com/v1/video_status.get',
      options: {},
      sendQuery: true,
      sendHeaders: true,
      queryParameters: {
        parameters: [
          {
            name: 'video_id',
            value: '={{ $(\'Create Avatar Video (HeyGen)\').item.json.data.video_id }}'
          }
        ]
      },
      headerParameters: {
        parameters: [
          {
            name: 'X-Api-Key',
            value: '={{ $(\'Setup Heygen Parameters\').item.json.heygen_api_key }}'
          }
        ]
      }
    }, position: [784, 1040], name: 'Get Avatar Video Status (HeyGen)' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: { url: '={{ $json.data.video_url }}', options: {} }, position: [-592, 1536], name: 'Download Video' } }))
  .add(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: { __rl: true, mode: 'list', value: 'root' }
    }, position: [-304, 1536], name: 'Upload to Google Drive' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4, config: { parameters: {
      columns: {
        value: {
          Title: '={{ $(\'Setup Heygen Parameters\').item.json.news_title }}',
          'video caption': '={{ $(\'Setup Heygen Parameters\').item.json.caption }}',
          'Heygen video url': '={{ $(\'Get Avatar Video Status (HeyGen)\').item.json.data.video_url }}',
          'Google Drive File ID': '={{ $(\'Upload to Google Drive\').item.json.id }}'
        },
        mappingMode: 'defineBelow'
      },
      options: {},
      operation: 'append',
      sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1oA-YOUR_AWS_SECRET_KEY_HERE'
      }
    }, position: [16, 1536], name: 'Log Video Details to Sheets' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://postiz.yourdomain.com/api/public/v1/upload',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, position: [-688, 2000], name: 'Upload Video to Postiz' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://postiz.yourdomain.com/api/public/v1/integrations',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [-464, 2000], name: 'Get Postiz Integrations' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'let content = $(\'Setup Heygen Parameters\').item.json.caption;\n\nif (content) {\n  content = content\n    .replace(/[\\n\\r\\t]+/g, \' \')\n    .replace(/\\s{2,}/g, \' \')\n    .replace(/[\\\\\'"]/g, (match) => match === \'"\' ? \'\\\\"\' : "\'")\n    .replace(/[\\\\]/g, \'\\\\\\\\\')\n    .trim();\n\n  const limit = 2200;\n  if (content.length > limit) {\n    content = content.substring(0, limit - 3) + \'...\';\n  }\n}\n\nreturn [{\n  json: {\n    ...items[0].json,\n    instagram_reel_caption: content\n  }\n}];'
    }, position: [-16, 1808], name: 'Clean Instagram Caption' } }), node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'let content = $(\'Setup Heygen Parameters\').item.json.caption;\n\nif (content) {\n  content = content\n    .replace(/[\\n\\r\\t]+/g, \' \')\n    .replace(/\\s{2,}/g, \' \')\n    .replace(/[\\\\\'"]/g, (match) => match === \'"\' ? \'\\\\"\' : "\'")\n    .replace(/[\\\\]/g, \'\\\\\\\\\')\n    .trim();\n\n  const limit = 63206;\n  if (content.length > limit) {\n    content = content.substring(0, limit - 3) + \'...\';\n  }\n}\n\nreturn [{\n  json: {\n    ...items[0].json,\n    facebook_video_caption: content\n  }\n}];'
    }, position: [-16, 2000], name: 'Clean Facebook Video Caption' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://postiz.yourdomain.com/api/public/v1/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n "type": "now",\n "date": "{{ $now.plus(1, \'minute\').toISO() }}",\n "order": "",\n "shortLink": true,\n "inter": 0,\n "tags": [],\n "posts": [\n   {\n     "integration": {\n       "id": "{{ $json.id }}"\n     },\n     "value": [\n       {\n         "content": "{{ $(\'Setup Heygen Parameters\').item.json.caption }}",\n         "video": [\n           {\n             "id": "1",\n             "path": "{{ $(\'Upload Video to Postiz\').item.json.path }}"\n           }\n         ]\n       }\n     ],\n     "settings": {\n       "__type": "youtube",\n       "title": "{{ $(\'Setup Heygen Parameters\').item.json.news_title }}",\n       "type": "public",\n       "tags": ["news", "AI"],\n       "categoryId": "22",\n       "madeForKids": false\n     }\n   }\n ]\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [-16, 2192], name: 'YouTube Video Publisher' } })], { version: 3, parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: {
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              conditions: [
                {
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.identifier }}',
                  rightValue: 'instagram'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              conditions: [
                {
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.identifier }}',
                  rightValue: 'facebook'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              conditions: [
                {
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.identifier }}',
                  rightValue: 'youtube'
                }
              ]
            }
          }
        ]
      },
      options: {}
    }, name: 'Video Platform Router' }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://postiz.yourdomain.com/api/public/v1/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "type": "now",\n  "date": "{{ $now.plus(1, \'minute\').toISO() }}",\n  "shortLink": true,\n  "tags": [\n    { "value": "instagram", "label": "Instagram" }\n  ],\n  "posts": [\n    {\n      "integration": {\n        "id": "{{ $json.id }}"\n      },\n      "value": [\n        {\n          "content": "{{ $(\'Clean Instagram Caption\').item.json.instagram_reel_caption }}",\n          "video": [\n            {\n              "id": "1",\n              "path": "{{ $(\'Upload Video to Postiz\').item.json.path }}"\n            }\n          ]\n        }\n      ],\n      "settings": {\n        "type": "post"\n      }\n    }\n  ]\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [208, 1808], name: 'Instagram Video Publisher' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4, config: { parameters: {
      url: 'https://postiz.yourdomain.com/api/public/v1/posts',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "type": "now",\n  "date": "{{ $now.plus(1, \'minute\').toISO() }}",\n  "order": "",\n  "shortLink": true,\n  "inter": 0,\n  "tags": [],\n  "posts": [\n    {\n      "integration": {\n        "id": "{{ $json.id }}"\n      },\n      "value": [\n        {\n          "content": "{{ $(\'Clean Facebook Video Caption\').item.json.facebook_video_caption }}",\n          "video": [\n            {\n              "id": "1",\n              "path": "{{ $(\'Upload Video to Postiz\').item.json.path }}"\n            }\n          ]\n        }\n      ],\n      "settings": {\n        "type": "post"\n      }\n    }\n  ]\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, position: [208, 2000], name: 'Facebook Video Publisher' } }))
  .add(sticky('🚀 **Workflow Trigger:**\nThis node acts as the manual trigger for the entire workflow. When you click \'Execute Workflow\' in n8n, this node initiates the process, fetching the latest news and starting the video generation and social media publishing pipeline. Ideal for testing and manual runs.', { name: 'Sticky Note', position: [-864, 880], width: 176, height: 128 }))
  .add(sticky('📰 **News Feed Source:**\nConnects to the CNN Edition RSS feed (`http://rss.cnn.com/rss/edition.rss`) to pull the latest news articles. It extracts key information like the title, link, content, and publication date, serving as the raw data input for our AI content generation.', { name: 'Sticky Note1', color: 4, position: [-464, 528], height: 384 }))
  .add(sticky('⬆️ **Postiz Video Upload:**\nThis node is responsible for uploading the actual binary video file (received from \'Download Video\') to your Postiz instance\'s internal storage (`https://postiz.yourdomain.com/api/public/v1/upload`). Postiz requires media to be hosted on its platform before it can be included in social media posts. The successful output of this node will provide a `path` to the uploaded video, which is crucial for subsequent publishing steps. Ensure your \'Postiz\' HTTP Header Auth credential is correctly configured with your Postiz API key.', { name: 'Sticky Note3', position: [-1056, 1712], width: 448, height: 416 }))
  .add(sticky('📊 **News Article Logger (Google Sheets):**\nAppends the fetched news article details (Title, Link, Guid, pubDate, Content, IsoDate) to a specified Google Sheet (\'RSS FEEDS\' spreadsheet, \'Sheet1\'). This provides a historical record and centralizes all news items processed by the workflow.', { name: 'Sticky Note4', color: 4, position: [544, 560], height: 384 }))
  .add(sticky('⚡ **Data Limiter (For Testing/Control):**\nThis node is configured to limit the number of items processed from the RSS feed, typically to 1. This is crucial during development and testing to prevent processing too many news articles at once, saving API credits and execution time. Set `executeOnce` to true for single item processing.', { name: 'Sticky Note5', color: 5, position: [-80, 528], height: 384 }))
  .add(sticky('📊 **Video Details Logger (Google Sheets):**\\nAppends a new row to your designated Google Sheet (\'Avatar video\' spreadsheet, \'Sheet1\') with comprehensive details about the generated video. This includes the original HeyGen URL, the AI-generated caption, the news title, and the Google Drive File ID, creating a valuable record for tracking and auditing. Ensure your \'Google Sheets account 2\' credential is valid.', { name: 'Sticky Note6', color: 3, position: [128, 1600], width: 496, height: 176 }))
  .add(sticky('🎯 **Dynamic Platform Routing (Video):**\nThis intelligent switch node dynamically routes the workflow to specific publishing branches based on the `identifier` of each social media integration fetched from Postiz. It directs the video content to the correct platform\'s dedicated cleaning and publishing logic (Instagram, Facebook, or YouTube), ensuring the right content goes to the right place.', { name: 'Sticky Note7', color: 4, position: [-576, 1744], width: 368, height: 352 }))
  .add(sticky('🧼 **Instagram Caption Cleaner (Video):**\nThis crucial code node sanitizes and formats the AI-generated caption specifically for Instagram video posts (Reels or regular videos). It performs essential cleaning by:\n- Replacing all line breaks, carriage returns, and tabs with single spaces.\n- Consolidating multiple spaces into single spaces.\n- **Escaping single and double quotes** (`\'` and `"`) and **backslashes** (`\\`) to prevent JSON parsing errors.\n- Trimming leading/trailing whitespace.\n- Enforcing **Instagram\'s 2200 character limit**, truncating the caption and adding \'...\' if exceeded. This prevents API errors and ensures your caption displays cleanly on Instagram.', { name: 'Sticky Note8', color: 7, position: [512, 1840], width: 368, height: 128 }))
  .add(sticky('🧹 **Caption Extractor:**\nThis small code node processes the output from the \'AI Agent\' to extract just the generated caption text. It simplifies the data structure, making it easier to reference the caption in subsequent nodes, particularly for passing it to HeyGen.', { name: 'Sticky Note9', position: [-288, 1184] }))
  .add(sticky('✍️ **Caption Generation AI:**\nUtilizes an AI agent (powered by the \'write script\' node) to generate a short, engaging caption (30-60 words) for the news video. The prompt uses the news article\'s title and content to create relevant and concise text, essential for social media engagement.', { name: 'Sticky Note10', color: 4, position: [-960, 1056] }))
  .add(sticky('🔧 **HeyGen Configuration:**\nSets up the necessary parameters for the HeyGen video creation API call. This includes your HeyGen API key, the `avatar_id`, `voice_id`, the AI-generated `caption`, and the `news_title`. Remember to **replace the placeholder values** with your actual HeyGen credentials and desired avatar/voice IDs.', { name: 'Sticky Note11', position: [32, 1184] }))
  .add(sticky('🎬 **Video Generation (HeyGen API):**\nCalls the HeyGen API to generate a video using the specified avatar, voice, and the AI-generated caption. It sets the video dimensions and provides your HeyGen API key for authentication. This is where the news content is transformed into a visual format.\n\n⏳ **Video Processing Delay:**\nThis node introduces a deliberate wait period (2 minutes by default) to allow HeyGen to process and generate the video. Video generation can take time, so this pause is crucial to ensure the video is ready before attempting to download its status or the video itself. Adjust the duration as needed based on your video length and HeyGen\'s processing times.\n\n🔍 **Video Status Check (HeyGen):**\nPolls the HeyGen API to check the status of the generated video using its `video_id`. This is important to ensure the video generation is complete and successful (\'completed\' status) before attempting to download the actual video file. You can implement conditional logic after this node to retry or handle errors if the video is not yet ready or failed.', { name: 'Sticky Note12', color: 3, position: [976, 960], width: 544, height: 336 }))
  .add(sticky('📸 **Publish to Instagram (Video):**\nThis node uses the Postiz API (`https://postiz.yourdomain.com/api/public/v1/posts`) to publish the video content to Instagram. It sends the cleaned caption from \'Clean Instagram Caption\' and the `path` to the video previously uploaded to Postiz. It\'s configured for immediate posting (\'now\' type) and includes a generic \'instagram\' tag for tracking. Ensure the correct Postiz credential is linked.', { name: 'Sticky Note13', color: 4, position: [-576, 2192], width: 368, height: 208 }))
  .add(sticky('📺 **Publish to YouTube (Video):**\nThis node is responsible for publishing the generated video to YouTube via the Postiz API. It uses the `news_title` from \'Setup Heygen Parameters\' as the YouTube video title and the original AI-generated `caption` as the video description. It directly references the Postiz `path` for the video (from \'Upload Video to Postiz\') and sets YouTube-specific metadata such as `categoryId` (e.g., \'22\' for People & Blogs) and `tags` (e.g., \'news\', \'AI\'). It\'s set to \'public\' visibility. Uses the \'Postiz\' HTTP Header Auth credential.', { name: 'Sticky Note14', color: 7, position: [400, 2064], width: 448, height: 144 }))
  .add(sticky('## 🤖 Automated AI News Video Creation and Social Media Publishing Workflow\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 **PURPOSE:**\nThis workflow fully automates the creation and social media distribution of AI-generated news videos. It fetches news, crafts captions, generates avatar videos via HeyGen, stores them, and publishes them across Instagram, Facebook, and YouTube via Postiz.\n\n🔄 **WORKFLOW PROCESS:**\n1.  **News Fetching:** Reads the latest news from an RSS feed.\n2.  **AI Captioning:** Generates concise, engaging captions using an AI agent (GPT-4o-mini).\n3.  **Video Generation:** Creates an AI avatar video using HeyGen with the generated caption.\n4.  **Video Storage:** Downloads the video and uploads it to Google Drive for archival.\n5.  **Data Logging:** Records all news and video metadata into Google Sheets.\n6.  **Postiz Upload:** Uploads the video to Postiz\'s internal storage for publishing.\n7.  **Social Publishing:** Fetches Postiz integrations and routes the video to Instagram, Facebook, and YouTube after platform-specific content cleaning.\n\n⚙️ **KEY TECHNOLOGIES:**\n-   **RSS Feeds:** News source.\n-   **LangChain (n8n nodes):** AI Agent and Chat OpenAI for caption generation.\n-   **HeyGen API:** AI avatar video creation.\n-   **Google Drive:** Video file storage.\n-   **Google Sheets:** Data logging and tracking.\n-   **Postiz API:** Unified social media publishing platform.\n\n⚠️ **CRITICAL CONFIGURATIONS:**\n-   **API Keys:** Ensure HeyGen and Postiz API keys are correctly set in credentials and the \'Setup Heygen Parameters\' node.\n-   **HeyGen IDs:** Verify `avatar_id` and `voice_id` in \'Setup Heygen Parameters\'.\n-   **Postiz URL:** Confirm `https://postiz.yourdomain.com` is your correct Postiz instance URL across all HTTP Request nodes.\n-   **Credentials:** All Google, OpenAI, and Postiz credentials must be properly linked.\n\n📈 **BENEFITS:**\n-   Automated content creation and distribution, saving significant time.\n-   Consistent branding and messaging across multiple platforms.\n-   Centralized logging for tracking and performance analysis.\n-   Scalable solution for high-volume content demands.\n\n---', { name: 'Sticky Note15', color: 7, position: [-1840, 832], width: 704, height: 1136 }))