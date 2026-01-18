return workflow('6BWdxf2GdoYg7sSo', 'Blog Writing', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: {
      path: '9c054bb1-4446-4502-be98-ffd3c8ca1f2d',
      options: {},
      httpMethod: 'POST'
    }, position: [-1456, -112] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '9838f724-a2ac-4875-8de4-0513bab64ede',
            name: 'airtable_base_id',
            type: 'string',
            value: 'apprrQ0Dv1cJOfMi9'
          },
          {
            id: '2b2143fe-f247-4585-bf89-e9967bc7f1a0',
            name: 'airtable_record_id',
            type: 'string',
            value: '={{ $(\'Webhook\').item.json.body.recordID }}'
          },
          {
            id: 'b10395bd-1f04-4f0b-b04e-5baf9099c630',
            name: 'primary_keywords_table_id',
            type: 'string',
            value: 'tblewTSMwBdGQKUuZ'
          },
          {
            id: 'c3515f7b-299b-4028-a367-4d77f7fe4e1a',
            name: 'article_writer_table_id',
            type: 'string',
            value: 'tblVTpv8JG5lZRiF2'
          },
          {
            id: '1270cecf-2f83-4d26-918c-4b8375c7167f',
            name: 'brand_guidelines_table_id',
            type: 'string',
            value: 'tblLLfZPMNRJxUmge'
          },
          {
            id: '7b5e26a8-f1a9-488c-b262-4593bb189797',
            name: 'master_kw_variations_table_id',
            type: 'string',
            value: 'tblHz4bwclrB24afu'
          },
          {
            id: '54d5e18f-5efe-4153-9822-397a1c5c3962',
            name: 'keyword_content_table_id',
            type: 'string',
            value: 'tblRDR7uE4b73ZpRt'
          },
          {
            id: '52241dca-0859-4eda-86b7-68a4dc6c9660',
            name: 'clusters_content_table_id',
            type: 'string',
            value: 'tbl7trYCu9sSGdRTJ'
          },
          {
            id: '40f0c007-119b-4573-8475-0da76f00f0f7',
            name: 'serp_results_table_id',
            type: 'string',
            value: 'tbl3V1Zz2nGtlc5xI'
          },
          {
            id: 'e104b7cb-9994-4cd1-92cf-b7c99f1730e9',
            name: 'keyword_categories_table_id',
            type: 'string',
            value: 'tblD8sMi6W4EikkN4'
          },
          {
            id: '80466248-ff78-4034-bea9-141d0b189836',
            name: 'clusters_table_id',
            type: 'string',
            value: 'tblDRGVjI1vPuJxvm'
          },
          {
            id: '41828ec1-afdd-4df2-91fd-5280f1e8cb66',
            name: 'primary_keyword',
            type: 'string',
            value: ''
          },
          {
            id: 'ba2903be-1a4b-4a08-a4fd-ed5f2bb3259f',
            name: 'type',
            type: 'string',
            value: ''
          }
        ]
      }
    }, position: [-1264, -112], name: 'Set Airtable Fields' } }))
  .then(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      id: '={{ $(\'Webhook\').item.json.body.recordID }}',
      base: {
        __rl: true,
        mode: 'list',
        value: 'apprrQ0Dv1cJOfMi9',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9',
        cachedResultName: 'KW Research The Bucket Hat'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'tblVTpv8JG5lZRiF2',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9/tblVTpv8JG5lZRiF2',
        cachedResultName: 'Article Writer'
      },
      options: {}
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [-1072, -112], name: 'Airtable Get Article Data' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '=https://thebuckethat.nl/sitemap.xml', options: {} }, position: [-2320, 336] } }))
  .then(node({ type: 'n8n-nodes-base.xml', version: 1, config: { parameters: { options: {} }, position: [-2144, 336] } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'sitemapindex.sitemap' }, position: [-1968, 336] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '={{$("Split Out").item.json.loc}}', options: {} }, position: [-1792, 336], name: 'HTTP Request1' } }))
  .then(node({ type: 'n8n-nodes-base.xml', version: 1, config: { parameters: { options: {} }, position: [-1616, 336], name: 'XML1' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      aggregate: '={{ $json.urlset }}',
      fieldsToAggregate: { fieldToAggregate: [{}] }
    }, position: [-1392, 336] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '512ccff6-fae1-4e6b-81dd-5e15a9225fe8',
            name: 'urls',
            type: 'string',
            value: '={{ $json["data"][0]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][1]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][2]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][3]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][4]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][5]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][6]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][7]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][8]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][9]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][10]["urlset"]["url"].map(u => u.loc) }}\n\n{{ $json["data"][11]["urlset"]["url"].map(u => u.loc) }}\n\n'
          }
        ]
      }
    }, position: [-1184, 336], name: 'Set list URLs' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '3cc01dbf-7718-49ae-a463-c0e848a78cc6',
            name: 'id',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.id }}'
          },
          {
            id: '7dbd7d60-2454-47ee-b02a-3ffddd588009',
            name: 'Title',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Title }}'
          },
          {
            id: 'bf205dfc-ce10-40fe-b868-0bebd4de3d33',
            name: 'Description',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Description }}'
          },
          {
            id: 'ccce37af-f230-4d5d-bf74-9e69d965be08',
            name: 'Keyword',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Keyword }}'
          },
          {
            id: 'ad2f76a5-b7cd-4fdf-b719-875ac88ccdeb',
            name: 'urls',
            type: 'string',
            value: '={{ $json.urls }}'
          }
        ]
      }
    }, position: [-976, 336], name: 'Set Airtable Fields for Agent' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2.2, config: { parameters: {
      text: '=Use the given:\nBlog title: {{ $json.Title }}\nBlog description: {{ $json.Description }}\nMain keyword: {{ $json.Keyword }}\nURL list: {{ $json.urls }}\nFormat your response as a JSON object:\nIMPORTANT: Do not include extra text, introduction messages, line breaks \\n, or any additional characters.\nJSON Output',
      options: {
        systemMessage: 'You are an AI assistant that selects the most relevant internal links for Shopify blog posts. \nYour task is to filter a provided list of URLs from a single website and return only the most relevant ones. \n\nRules:\n- Always include the homepage URL: https://thebuckethat.nl/\nand https://thebuckethat.nl/collections/bucket-hat-dames\nand https://thebuckethat.nl/collections/bucket-hat-heren\n- Select between 8 and 13 URLs in total.\n- Prioritize collection pages, but also include 2 to 7 product pages.\nonly add collection pages link to the toic. for example: title: Best Corduroy Bucket Hat Styles for Easy Outfit Wins\n\nAdd collection: Corduroy Bucket Hats: https://thebuckethat.nl/collections/corduroy-bucket-hat\n\n- Relevance is determined by matching the blog topic’s title, description, and main keyword with the URL text.\n- Only use the provided URLs. Never invent or modify URLs.\n- Output only a JSON array of the selected URLs, no explanations, no text.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4.1-mini', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Open AI1' } }) }, position: [-784, 336], name: 'URLs Selection' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '6fa723b7-c57e-4b55-9d84-ddfe97adaaf4',
            name: 'best matching urls',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [-464, 336], name: 'Set best urls' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '3cc01dbf-7718-49ae-a463-c0e848a78cc6',
            name: 'id',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.id }}'
          },
          {
            id: '7dbd7d60-2454-47ee-b02a-3ffddd588009',
            name: 'Title',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Title }}'
          },
          {
            id: 'bf205dfc-ce10-40fe-b868-0bebd4de3d33',
            name: 'Description',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Description }}'
          },
          {
            id: 'ccce37af-f230-4d5d-bf74-9e69d965be08',
            name: 'Keyword',
            type: 'string',
            value: '={{ $(\'Airtable Get Article Data\').item.json.Keyword }}'
          },
          {
            id: '88bcf3a6-b18b-4b66-85ca-170b32202cfa',
            name: 'URL list',
            type: 'string',
            value: '={{ $json["best matching urls"] }}'
          }
        ]
      }
    }, position: [-224, 336], name: 'Set Airtable Fields for Agents' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Use the given:\nTitle: {{ $json.Title }}\nDescription: {{ $json.Description }}\nURL List for hyperlinks: {{ $json["URL list"] }}\nAnd the Tavily SERP Results tool to perform research for the primary keyword, {{ $(\'Airtable Get Article Data\').item.json.Keyword }}. \nFormat your response as a JSON object:\nIMPORTANT: Do not include extra text, introduction messages, line breaks \\n, or any additional characters.\nJSON Output\n{\n  "search_intent": "<string: informational | transactional | navigational | commercial>",\n  "writing_style": "<string: concise and professional | engaging and storytelling | data-driven and technical | etc.>",\n  "writing_tone": "<string: friendly and conversational | formal and authoritative | persuasive and compelling | etc.>",\n  "hidden_insight": "<string: unique insight if found, otherwise \'No significant insights detected beyond existing content trends.\'>",\n  "target_audience": "<string: who this article is for, e.g., small business owners, tech enthusiasts, marketers, etc.>",\n  "goal_of_article": "<string: main objective of the article based on search results and insights>",\n  "semantic_analysis": {\n    "common_subtopics": [\n      "<string: subtopic 1>",\n      "<string: subtopic 2>",\n      "<string: subtopic 3>"\n    ],\n    "related_questions": [\n      "<string: question 1>",\n      "<string: question 2>",\n      "<string: question 3>"\n    ]\n  },\n  "keywords": {\n    "primary_keyword": "<string: main focus keyword>",\n    "secondary_keywords": [\n      "<string: related keyword 1>",\n      "<string: related keyword 2>",\n      "<string: related keyword 3>"\n    ],\n    "semantic_keywords": [\n      "<string: semantic keyword 1>",\n      "<string: semantic keyword 2>",\n      "<string: semantic keyword 3>"\n    ],\n    "long_tail_keywords": [\n      "<string: long-tail keyword 1>",\n      "<string: long-tail keyword 2>",\n      "<string: long-tail keyword 3>"\n    ]\n  }\n}\n\n\nExample JSON Output with Hidden Insight\n{\n  "search_intent": "informational",\n  "writing_style": "engaging and storytelling",\n  "writing_tone": "friendly and conversational",\n  "hidden_insight": "Most content focuses on efficiency and cost savings, but small business owners struggle with decision fatigue. AI automation is not just a time-saver—it helps reduce stress by eliminating repetitive decisions.",\n  "target_audience": "small business owners, solopreneurs, and startup founders",\n  "goal_of_article": "Educate small business owners on how AI automation reduces decision fatigue while increasing efficiency and revenue.",\n  "semantic_analysis": {\n    "common_subtopics": [\n      "What is AI automation?",\n      "How small businesses can use AI",\n      "Best AI tools for business automation",\n      "Cost vs. benefit analysis of AI automation"\n    ],\n    "related_questions": [\n      "How does AI reduce decision fatigue?",\n      "What’s the easiest way for small businesses to start using AI?",\n      "Is AI automation worth the cost for small businesses?"\n    ]\n  },\n  "keywords": {\n    "primary_keyword": "AI automation for small businesses",\n    "secondary_keywords": [\n      "AI-powered automation tools",\n      "best AI software for small businesses",\n      "workflow automation for entrepreneurs"\n    ],\n    "semantic_keywords": [\n      "business process automation",\n      "machine learning in small business",\n      "how AI helps efficiency"\n    ],\n    "long_tail_keywords": [\n      "how can AI help small businesses save time?",\n      "best AI automation tools for startups",\n      "AI vs manual workflow optimization"\n    ]\n  }\n}\n\n\nExample JSON Output No Hidden Insight\n{\n  "search_intent": "commercial",\n  "writing_style": "concise and professional",\n  "writing_tone": "informative and trustworthy",\n  "hidden_insight": "No significant insights detected beyond existing content trends.",\n  "target_audience": "cycling enthusiasts, winter sport athletes, and outdoor adventurers",\n  "goal_of_article": "Provide an in-depth comparison of the best winter cycling gear and help cyclists choose the right products based on weather conditions.",\n  "semantic_analysis": {\n    "common_subtopics": [\n      "What to look for in winter cycling gear",\n      "Top-rated winter cycling jackets and gloves",\n      "How to layer clothing for winter rides",\n      "Cycling safety tips for cold-weather conditions"\n    ],\n    "related_questions": [\n      "What is the warmest winter cycling jacket?",\n      "Are insulated cycling gloves worth it?",\n      "How do I stay warm on long winter bike rides?"\n    ]\n  },\n  "keywords": {\n    "primary_keyword": "best winter gear for cyclists",\n    "secondary_keywords": [\n      "winter cycling jackets",\n      "best gloves for cold weather cycling",\n      "waterproof cycling gear"\n    ],\n    "semantic_keywords": [\n      "insulated bike clothing",\n      "cold-weather cycling apparel",\n      "bike safety in winter"\n    ],\n    "long_tail_keywords": [\n      "how to choose winter cycling gloves?",\n      "best winter cycling gear for long-distance rides",\n      "how to keep hands warm while biking in winter"\n    ]\n  }\n}\n\n',
      options: {
        systemMessage: 'You are an advanced AI content strategist trained to analyze search results and generate precise writing guidelines for an SEO-optimized blog post for the website The Bucket Hat. Your goal is to ensure that the article aligns with **search intent**, **semantic relevance**, and **audience expectations** while also uncovering **hidden insights** that may provide a unique angle. Write in Dutch.\n\n### **Your Task:**\nYou will be given:\n- A **working title**\n- An **article description**\n- A **primary keyword**\n- A **set of search results** (retrieved via the Tavily search results tool)\n- All the links of the website The Bucket Hat (products, collections, blog posts etc.)\n\nYour job is to analyze the data and generate **optimized writing guidelines** with the following structured JSON output:\n\n### **1️⃣ Search Intent Detection**  \nDetermine whether the primary intent of the keyword is:  \n- **informational** (learning about a topic)  \n- **transactional** (considering a purchase or service)  \n- **navigational** (finding a specific brand/website)  \n- **commercial** (comparing options before making a decision)  \n\n### **2️⃣ Writing Style & Tone**  \n- Identify the best **writing style** based on search results (e.g., “concise and professional,” “engaging and storytelling,” “data-driven and technical,” etc.).  \n- Identify the **appropriate tone** (e.g., “friendly and conversational,” “formal and authoritative,” “persuasive and compelling,” etc.).  \n\n### **3️⃣ Hidden Insight Extraction**  \n- Analyze **patterns in competitor content** to identify **an insight that is not immediately obvious** but could provide a unique angle.  \n- If no meaningful insight is found, return `"hidden_insight": "No significant insights detected beyond existing content trends."`  \n- If an insight is found, clearly explain it.  \n- **Do NOT modify writing style or tone based on the insight**—insights should be separate observations, not tone/style adjustments.  \n\n### **4️⃣ Semantic Analysis (Content Structuring)**  \n- Extract the **common subtopics** frequently covered in top-ranking pages.  \n- Identify **related questions** users ask.  \n\n### **5️⃣ Keyword Extraction**  \n- Categorize keywords based on **how they should be used** later in the workflow.  \n- Format them as follows:  \n  - **Primary Keyword** → The main topic focus.  \n  - **Secondary Keywords** → Variations of the primary keyword that should be used naturally in the content.  \n  - **Semantic Keywords** → Contextually related terms that improve topic relevance.  \n  - **Long-Tail Keywords** → Natural search queries and phrases that match user questions.  \n\n\n### **Format your response strictly in valid JSON. Divide the sections**\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.2, config: { parameters: { model: 'claude-3-5-sonnet-20241022', options: {} }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Anthropic Chat Model' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolHttpRequest', version: 1.1, config: { parameters: {
          url: 'https://api.tavily.com/search',
          method: 'POST',
          sendBody: true,
          authentication: 'genericCredentialType',
          parametersBody: {
            values: [
              {
                name: 'api_key',
                value: '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',
                valueProvider: 'fieldValue'
              },
              {
                name: 'query',
                value: '={{ $json.Keyword }}',
                valueProvider: 'fieldValue'
              }
            ]
          },
          genericAuthType: 'httpHeaderAuth',
          toolDescription: 'Tavily SERP Results Tool'
        }, credentials: {
          httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' },
          httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
        }, name: 'Tavily search results' } })] }, position: [-32, 336], name: 'SERPs, Writing, KWs, Insights' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const parsed = JSON.parse($json.output);\nreturn [{ ...$json, ...parsed }];'
    }, position: [304, 336], name: 'Code in JavaScript' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '7e444c83-3d2b-4bd3-a23b-6fb5ca68e670',
            name: 'writing_style',
            type: 'string',
            value: '={{ $json.writing_style }}'
          },
          {
            id: 'e16b5d65-587d-49d8-af5d-4ff1930633a8',
            name: 'writing_tone',
            type: 'string',
            value: '={{ $json.writing_tone }}'
          },
          {
            id: 'ab756373-0186-454a-8e98-d5a5f96cba87',
            name: 'search_intent',
            type: 'string',
            value: '={{ $json.search_intent }}'
          },
          {
            id: 'a14b7657-038a-4b08-911d-314336261a0c',
            name: 'hidden_insight',
            type: 'string',
            value: '={{ $json.hidden_insight }}'
          },
          {
            id: '19ef4221-5a5d-4321-8a07-4e04f5dcaf44',
            name: 'target_audience',
            type: 'string',
            value: '={{ $json.target_audience }}'
          },
          {
            id: '0ab17e84-4a2e-4df3-b0a3-91e9ce26cb72',
            name: 'article_goal',
            type: 'string',
            value: '={{ $json.goal_of_article }}'
          },
          {
            id: '84e7f6a4-48b2-43b2-92cc-7e0337311661',
            name: 'semantic_analysis',
            type: 'string',
            value: '={{ $json.semantic_analysis }}'
          },
          {
            id: '5e943a46-bb03-438d-b6da-2a6ec414f5af',
            name: 'keywords',
            type: 'string',
            value: '={{ $json.keywords }}'
          }
        ]
      }
    }, position: [480, 336], name: 'Set KWs and Insights fields' } }))
  .then(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      base: {
        __rl: true,
        mode: 'list',
        value: 'apprrQ0Dv1cJOfMi9',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9',
        cachedResultName: 'KW Research The Bucket Hat'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'tblVTpv8JG5lZRiF2',
        cachedResultUrl: 'https://airtable.com/appuvbLPrnVBj88Eb/tblVTpv8JG5lZRiF2',
        cachedResultName: 'Article Writer'
      },
      columns: {
        value: {
          id: '={{ $(\'Airtable Get Article Data\').item.json.id }}',
          Tone: '={{ $json.writing_tone }}',
          Keyword: '={{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}',
          'Search Intent': '={{ $json.search_intent }}',
          'Writing Style': '={{ $json.writing_style }}',
          'Hidden Insight': '={{ $json.hidden_insight }}',
          'Goal of Article': '={{ $json.article_goal }}',
          'Primary Keyword': '={{ $(\'Set Airtable Fields for Agents\').item.json.Primary.Keyword }}',
          'Target Audience': '={{ $json.target_audience }}',
          'Semantic Analysis': '={{ $json.semantic_analysis }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'id',
            defaultMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Final Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Final Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Create Article',
            type: 'options',
            display: true,
            options: [
              { name: 'Write Article', value: 'Write Article' },
              { name: 'Keep', value: 'Keep' }
            ],
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Create Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Primary Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Primary Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Google Doc URL',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Google Doc URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Writing Style',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Writing Style',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Tone',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Tone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Target Audience',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Target Audience',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Goal of Article',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Goal of Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Search Intent',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Search Intent',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hidden Insight',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Hidden Insight',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Semantic Analysis',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Semantic Analysis',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keywords',
            type: 'string',
            display: true,
            removed: true,
            readOnly: false,
            required: false,
            displayName: 'Keywords',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['id'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update'
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [656, 336], name: 'Update Article Writer table' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Revise the blog post title. Consider:\nPrimary Keyword: {{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}\nWorking title: {{ $(\'Set Airtable Fields for Agents\').item.json.Title }}\nSearch intent: {{ $(\'Set KWs and Insights fields\').item.json.search_intent }}\nSemantic analysis: {{ $(\'Set KWs and Insights fields\').item.json.semantic_analysis }}\nSecondary keywords: {{ $(\'Set KWs and Insights fields\').item.json.keywords }}\nWriting style: {{ $(\'Set KWs and Insights fields\').item.json.writing_style }}\nWriting tone: {{ $(\'Set KWs and Insights fields\').item.json.writing_tone }}\nArticle goal: {{ $(\'Set KWs and Insights fields\').item.json.article_goal }}\n\n\nOutput only JSON\nIMPORTANT: Do not add extra spaces, extra characters or include any additional text.\n',
      options: {
        systemMessage: 'You are an expert in crafting highly engaging, SEO-optimized article titles that drive clicks and rank well in search engines like Google. Write in Dutch.\n\nYour goal is to refine the **initial working title** into a **clear, compelling, and search-friendly title** that aligns with:\n- **Primary and Secondary Keywords** → Ensure relevance for search engines.\n- **Search Intent** → Match the intent behind the keyword (informational, transactional, navigational, or commercial).\n- **Common Subtopics & Related Questions** → Reflect what users want to learn.\n- **Writing Style & Tone** → Ensure consistency with the article\'s voice.\n- **Click-Worthiness** → Make the title engaging and appealing for readers.\n\n### **Your Task:**\n1. **Analyze the given input data**, including the working title, primary keyword, and supporting data.\n2. **Refine the title** to be more **SEO-friendly, engaging, and aligned with search intent**.\n3. **Incorporate relevant keywords naturally**, without keyword stuffing.\n4. **Ensure clarity and readability**—avoid overly complex or vague titles.\n5. **Return only the final refined title as a plain text string.**\n\n---\n### **Title Guidelines:**\n- Keep it **between 50-60 characters** (ideal for SEO).\n- Use **power words** or numbers when appropriate (e.g., "10 Proven Ways," "Ultimate Guide").\n- Avoid unnecessary words or fluff.\n- Ensure it **reads naturally** and **appeals to human curiosity**.\n\n---\n### **Example Inputs & Outputs:**\n\n#### **Example 1**\n**Working Title:** "Hoe draag je een Bucket Hat ?"  \n**Primary Keyword:** "Hoe draag je een bucket hat"  \n**Search Intent:** Informational  \n**Refined Title Output:** **Hoe draag je een Bucket Hat ? Zó draag je de bucket hat**\n\n---\n#### **Example 2**\n**Working Title:** "Vissershoedjes zijn trendy"  \n**Primary Keyword:** "zijn vissershoedjes trendy?"  \n**Search Intent:** Commercial  \n**Refined Title Output:** **6 Redenen Waarom Vissershoedjes Een Must-Have Zijn**\n\n---\n### **Output Format:**\nReturn only the value of "refined_title" as plain text. Do not include JSON, quotes, braces, or any other formatting. Output the title exactly as a string.\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Open AI' } }) }, position: [848, 336], name: 'Refine the Title' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '438738d8-d610-47e3-9ddf-efcfb97d3701',
            name: 'new_title',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [1216, 336], name: 'Sets New Title Field' } }))
  .then(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      base: {
        __rl: true,
        mode: 'list',
        value: 'apprrQ0Dv1cJOfMi9',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9',
        cachedResultName: 'KW Research The Bucket Hat'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'tblVTpv8JG5lZRiF2',
        cachedResultUrl: 'https://airtable.com/appuvbLPrnVBj88Eb/tblVTpv8JG5lZRiF2',
        cachedResultName: 'Article Writer'
      },
      columns: {
        value: {
          Tone: '={{ $json.writing_tone }}',
          Keyword: '={{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}',
          Keywords: '={{ $json.keywords }}',
          'Final Title': '={{ $json.new_title }}',
          'Search Intent': '={{ $json.search_intent }}',
          'Writing Style': '={{ $json.writing_style }}',
          'Hidden Insight': '={{ $json.hidden_insight }}',
          'Goal of Article': '={{ $json.article_goal }}',
          'Target Audience': '={{ $json.target_audience }}',
          'Semantic Analysis': '={{ $json.semantic_analysis }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'id',
            defaultMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Final Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Final Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Create Article',
            type: 'options',
            display: true,
            options: [
              { name: 'Write Article', value: 'Write Article' },
              { name: 'Keep', value: 'Keep' }
            ],
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Create Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Primary Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Primary Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Google Doc URL',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Google Doc URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Writing Style',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Writing Style',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Tone',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Tone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Target Audience',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Target Audience',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Goal of Article',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Goal of Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Search Intent',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Search Intent',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hidden Insight',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Hidden Insight',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Semantic Analysis',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Semantic Analysis',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keywords',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keywords',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Keyword'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update'
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [1424, 336], name: 'Update Article Title' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Create Key Takeaways using:\n\n- **Title**: {{ $(\'Sets New Title Field\').item.json.new_title }}\nPrimary Keyword: {{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}\nTitle: {{ $(\'Set Airtable Fields for Agents\').item.json.Title }}\nHidden Insight: {{ $json.fields[\'Hidden Insight\'] }}\nSearch intent: {{ $(\'Set KWs and Insights fields\').item.json.search_intent }}\nSemantic analysis: {{ $(\'Set KWs and Insights fields\').item.json.semantic_analysis }}\nSecondary keywords: {{ $(\'Set KWs and Insights fields\').item.json.keywords }}\nWriting style: {{ $(\'Set KWs and Insights fields\').item.json.writing_style }}\nWriting tone: {{ $(\'Set KWs and Insights fields\').item.json.writing_tone }}\nArticle goal: {{ $(\'Set KWs and Insights fields\').item.json.article_goal }}\n\n\n\n\n',
      options: {
        systemMessage: 'You are an expert content strategist specializing in crafting structured, insightful, and engaging **key takeaways** for articles. Your goal is to summarize the most important information while ensuring the takeaways are **concise, impactful, and easy to digest**. Write in Dutch.\n\n### **Your Task:**\n1. **Generate an introductory paragraph** that sets up the key takeaways and provides context for the reader.\n2. **Extract the most valuable takeaways** from the provided data:\n   - **Key concepts** covered in the article.\n   - **Relevant semantic subtopics** that align with the topic.\n   - **Hidden insights** (if applicable) that add unique value.\n3. **Format each takeaway in markdown** as:\n[Action-driven bolded heading]: Concise explanation inline.\n- The **bolded heading** should be **engaging and impactful** (not generic).  \n- The **explanation should be concise and inline with the heading**.  \n- **No section headers, extra spaces, or dividers**.  \n4. **Ensure takeaways provide substantial knowledge** but are not overwhelming:\n- If the **hidden insight** adds value, incorporate it as a **dedicated takeaway** or **enhance an existing one**.\n- If the **hidden insight does not fit naturally**, exclude it.\n5. **Write an outro paragraph** that smoothly leads into the main body of the article.\n\n### **Formatting & Style Guidelines**\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n\n✅ **Use bold H2 for main sections, H3 for subsections and make important keywords bold**  \n✅ **Bullet points with inline bolded headings**  \n✅ **No extra section headers, dividers, or spaces**  \n✅ **Use engaging, action-driven takeaway headers** (e.g., "Beyond fixed rules: AI adapts in real time" instead of "A paradigm shift from traditional automation")  \n✅ **Ensure takeaways are concise yet informative**  \n✅ The whole blog post will be at least 2900 words and maximum 3500 words.\n\n\n### **Example Inputs & Outputs**\n---\n#### **Input Example**\n**Article Title:** `"AI Automation for Small Businesses: How to Save Time & Boost Revenue"`  \n**Primary Keyword:** `"AI automation for small businesses"`  \n**Hidden Insight:** `"Most AI automation content focuses on efficiency, but a major benefit is reducing decision fatigue."`  \n**Common Subtopics:** `["What is AI automation?", "How small businesses can use AI", "Best AI tools for automation"]`\n\n---\n#### **Output Example**\n```markdown\nAI automation is transforming small businesses by optimizing workflows, improving efficiency, and enhancing decision-making. Below are the key takeaways highlighting its potential.\n\n- **AI enables true autonomy through adaptive learning:** Unlike traditional systems, AI learns and evolves over time, reducing human supervision by refining its decision-making processes independently.  \n- **Beyond fixed rules: AI adapts in real time:** Traditional AI follows static rules, whereas AI-driven automation dynamically adjusts to changing environments, solving complex, unsupervised tasks.  \n- **AI agents optimize complex workflows effortlessly:** These intelligent systems manage intricate processes with greater efficiency, improving operations like customer support, supply chain management, and fraud detection.  \n- **Seamless integration into business operations:** AI integrates with existing systems like CRMs and ERP platforms, allowing businesses to modernize workflows without overhauling infrastructure.  \n- **Scalability without added complexity:** AI systems manage process complexity and expand capabilities, enabling businesses to scale efficiently without requiring proportional increases in resources.  \n- **AI minimizes decision fatigue, maximizing human focus:** By handling routine and complex decisions autonomously, AI reduces cognitive load on human teams, allowing them to focus on high-value tasks.  \n- **AI ensures resilience through continuous optimization:** Through machine learning, AI refines its models over time, ensuring consistent performance even in dynamic and unpredictable environments.  \n- **AI innovation transforming industries:** Sectors like manufacturing, healthcare, and finance leverage AI for predictive maintenance, personalized care, and risk assessment.  \n\nAI-driven automation offers a new frontier for workflow innovation by replacing static rule-based automation with intelligent, adaptive systems. In the sections ahead, we’ll explore its core components, industry applications, and strategies for seamless business integration.\n\nOutput Format:\nReturn the final takeaways in HTML format and in dutch, structured as:\n\nIntro paragraph\nBullet points with inline bolded headings and concise explanations\nOutro paragraph\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Key Takeaways' } }) }, position: [1648, 336], name: 'Key Takeaways AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'eafbe44d-f811-4660-9f89-0ebe61febdcc',
            name: 'key_takeaways',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [2048, 336], name: 'Set Key Takeaways' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Write an engaging introduction for a blog post with the following details:\n\n- **Title**: {{ $(\'Sets New Title Field\').item.json.new_title }}\n- **Key Takeaways**: {{ $json.key_takeaways }} \nPrimary Keyword: {{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}\nTitle: {{ $(\'Set Airtable Fields for Agents\').item.json.Title }}\nSearch intent: {{ $(\'Set KWs and Insights fields\').item.json.search_intent }}\nSemantic analysis: {{ $(\'Set KWs and Insights fields\').item.json.semantic_analysis }}\nSecondary keywords: {{ $(\'Set KWs and Insights fields\').item.json.keywords }}\nWriting style: {{ $(\'Set KWs and Insights fields\').item.json.writing_style }}\nWriting tone: {{ $(\'Set KWs and Insights fields\').item.json.writing_tone }}\nArticle goal: {{ $(\'Set KWs and Insights fields\').item.json.article_goal }}\nURL List for hyperlinks: {{ $(\'Set best urls\').item.json["best matching urls"] }}\n\n\nThe introduction should:\n- Hook the reader with a surprising fact, question, or statement.\n- Explain why the topic matters and how it benefits the reader.\n- Transition naturally into the body of the article.\n- Use keywords naturally but sparingly.\n- Be between 400 and 450 words long\n\nExample Introduction:\nImagine having an extra pair of hands to handle your business\'s repetitive tasks while you focus on the big picture—growing your company. It might sound like a luxury, but AI agents are making it a reality for small businesses everywhere.\n\nSmall business owners often juggle countless responsibilities, from managing operations to engaging customers. AI agents provide a way to streamline routine tasks, improve productivity, and even elevate customer experiences, all while saving time and resources.\n\nThis article dives into how AI agents can transform your business, helping you scale operations, save time, and stay competitive. Whether you’re seeking efficiency or growth, you’ll discover how this powerful technology can work for you.\n\nFormatting Instructions:\n\nOutput must be in Markdown format and structured correctly.\nDo NOT add any commentary, explanations, or extra text about what the agent did.\nDo NOT include dividers (---), line breaks (\\n), or unnecessary whitespace.\nOnly return the required Markdown content—nothing more.',
      options: {
        systemMessage: 'You are an expert content writer specializing in crafting compelling introductions for articles. Your goal is to **hook the reader, set expectations, and establish relevance** while maintaining clarity and engagement. Write in Dutch.\n\n### **Your Task:**\n1. **Analyze the provided inputs**, including the article title, primary keyword, key takeaways, and target audience.\n2. **Write a compelling introduction** that:\n   - **Opens with a direct, concise statement** that immediately presents the topic.\n   - **Avoids generic phrases** like *"In today’s fast-paced world..."* or *"Businesses are constantly evolving..."*.\n   - **Clearly states the article’s purpose** and what the reader will learn.\n   - **Flows naturally into the main body** without being overly long.\n3. **Match the article’s writing style and tone** to ensure consistency.\n4. **Incorporate the primary keyword naturally** for SEO without forcing it.\n5. **Ensure readability and engagement**:\n   - Keep the introduction concise (2-3 short paragraphs).\n   - Avoid fluff—make every sentence valuable.\n   - **Use streamlined transition sentences** (e.g., *"Let’s explore how..."* instead of *"In this article, we will explore..."*).\n\n### **Formatting & Style Guidelines**\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n✅ **Use HTML formatting.**  \n✅ **Start with a direct, engaging opening sentence.**  \n✅ **Avoid generic phrases or overused business clichés.**  \n✅ **Keep it concise yet informative (2-3 paragraphs).**  \n✅ **Ensure a smooth transition into the main body.**  \n✅ **Maintain a natural, compelling flow that matches the writing tone & style.**  \n✅ **Hyperlinks**  \nAdd links related to the topic to promote collections, blog posts and products from The Bucket Hat.\n\n\n### **Example Inputs & Outputs**\n---\n#### **Input Example**\n**Article Title:** `"Hoe draag je een Bucket Hat ? Zó draag je de bucket hat"`  \n**Primary Keyword:** `"Bucket Hat stylen"`  \n**Key Takeaways:** `["De Bucket Hat is een veelzijdig mode-icoon dat terug is van weggeweest.", "Je kunt hem dragen in verschillende stijlen: casual, sportief, bohemian of edgy streetwear.", "Onderhoud en seizoensgebonden keuzes zorgen ervoor dat je hoed langer meegaat en altijd stijlvol blijft."]`  \n**Writing Style:** `"Engaging and storytelling"`  \n**Writing Tone:** `"Friendly and conversational"`  \n\n---\n#### **Output Example** markdown\n<h2>De Bucket Hat: Tijdloos Stijlicoon</h2>\n\n<p>De Bucket Hat is veel meer dan een simpele hoed; het is een stukje modegeschiedenis dat opnieuw zijn plek heeft veroverd in de garderobes van trendsetters wereldwijd. Ooit begonnen als vissershoedje in de jaren ’40, is dit tijdloze accessoire uitgegroeid tot een stijlstatement dat veelzijdigheid en persoonlijkheid uitstraalt.</p>\n\n<h3>Veelzijdigheid en Aanpassingsvermogen</h3>\n<p>Wat de Bucket Hat zo bijzonder maakt, is zijn aanpassingsvermogen. Of je nu kiest voor een casual chic look met mom jeans en sneakers, een sportieve flair met een trainingspak, bohemian vibes met een flowy jurk, of edgy streetwear met leer en distressed denim—deze hoed past zich moeiteloos aan jouw stijl aan.</p>\n\n<h3>Geschikt voor Elk Seizoen</h3>\n<p>Bovendien is hij geschikt voor elk seizoen. In de zomer biedt hij bescherming tegen de zon met lichte stoffen zoals katoen of linnen, terwijl je in herfst en winter kunt kiezen voor waterbestendige of gevoerde varianten. Met de juiste zorg—zoals voorzichtig wassen en correct opbergen—gaat je Bucket Hat jarenlang mee.</p>\n\n<h3>Een Blijvend Stijlicoon</h3>\n<p>Geïnspireerd door beroemdheden en streetstyle, blijft de Bucket Hat een blijvend stijlicoon dat steeds opnieuw wordt heruitgevonden met nieuwe materialen, prints en duurzame ontwerpen. Het is een accessoire dat niet alleen je outfit compleet maakt, maar ook een stukje van je persoonlijkheid laat zien.</p>\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI' } }) }, position: [2272, 336], name: 'Introduction Agent' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'fe43bcff-a163-4cac-aca8-cf97241b834b',
            name: 'introduction',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [2608, 336], name: 'Set Introduction Field' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Generate a detailed outline for a blog postof 3000 - 3500 words with the following details:\n\n- **Title**: {{ $(\'Sets New Title Field\').item.json.new_title }}\n- **Key Takeaways**: {{ $(\'Set Key Takeaways\').item.json.key_takeaways }}\n- **Introduction**: {{ $json.introduction }}\nPrimary Keyword: {{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}\nTitle: {{ $(\'Set Airtable Fields for Agents\').item.json.Title }}\nSearch intent: {{ $(\'Set KWs and Insights fields\').item.json.search_intent }}\nSemantic analysis: {{ $(\'Set KWs and Insights fields\').item.json.semantic_analysis }}\nSecondary keywords: {{ $(\'Set KWs and Insights fields\').item.json.keywords }}\nWriting style: {{ $(\'Set KWs and Insights fields\').item.json.writing_style }}\nWriting tone: {{ $(\'Set KWs and Insights fields\').item.json.writing_tone }}\nArticle goal: {{ $(\'Set KWs and Insights fields\').item.json.article_goal }}\nURL List for hyperlinks: {{ $(\'Set best urls\').item.json["best matching urls"] }}\n\nFormatting Instructions:\n\nOutput must be in Markdown format and structured correctly.\nDo NOT add any commentary, explanations, or extra text about what the agent did.\nDo NOT include dividers (---), line breaks (\\n), or unnecessary whitespace.\nOnly return the required Markdown content—nothing more.\n',
      options: {
        systemMessage: 'You are an expert content strategist specializing in structuring articles for clarity, engagement, and SEO effectiveness. Your goal is to generate a **detailed, logical outline** that ensures a smooth reading experience and maximizes content relevance. Write in Dutch.\n\n### **Your Task:**\n1. **Analyze the provided inputs**, including the article title, primary keyword, key takeaways, semantic analysis, secondary keywords, and hidden insights (if applicable).\n2. **Generate an optimized outline** by:\n   - Structuring the article with a **clear hierarchy of sections**.\n   - Aligning with **SEO best practices** and **user intent**.\n   - Ensuring **logical progression** from start to finish.\n   - Incorporating **hidden insights** if they enhance the content.\n   - **Using secondary keywords and semantic elements (common subtopics & related questions) naturally in headings/subheadings** for SEO.\n3. **Ensure the outline includes:**\n   - **Main sections covering key aspects of the topic**\n   - **Logical sub-sections** that break down complex ideas\n4. **The article title, introduction, and conclusion should be used as references but NOT included in the outline.**\n\n### **Formatting & Style Guidelines**\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n✅ **Ensure a logical, structured progression from start to finish.**  \n✅ **Incorporate hidden insights if they enhance the outline.**  \n✅ **Use secondary keywords and semantic elements naturally in headings.**  \n✅ **Exclude the article title, introduction, and conclusion from the final outline.**  \n✅ **Use concise but descriptive section explanations.**  \n✅ **Hyperlinks**  \nAdd links related to the topic to promote collections, blog posts and products from The Bucket Hat.\n\n\n### **Example Inputs & Outputs**\n---\n#### **Input Example**\n**Article Title:** `"AI Automation for Small Businesses: How to Save Time & Boost Revenue"`  \n**Primary Keyword:** `"AI automation for small businesses"`  \n**Secondary Keywords:** `["AI workflow automation", "small business AI tools", "automating business operations"]`  \n**Key Takeaways:** `["AI automation reduces decision fatigue.", "It improves operational efficiency and workflow management.", "Small businesses can implement AI affordably."]`  \n**Hidden Insight:** `"Most discussions on AI automation focus on efficiency, but its real impact is on business adaptability—helping companies pivot faster in changing markets."`  \n**Semantic Analysis:**  \n- **Common Subtopics:** `["What is AI automation?", "How small businesses can use AI", "Best AI tools for automation"]`  \n- **Related Questions:** `["What are the best AI automation tools for small businesses?", "How does AI improve small business efficiency?"]`  \n\n---\n#### **Output Example** markdown\n## What is AI Automation?  \n### Understanding AI-powered business automation *(Secondary Keyword Applied)*  \n- Definition of AI automation and its key components.  \n- How AI-powered automation differs from traditional workflow automation.  \n\n### Why small businesses need AI workflow automation *(Semantic & SEO Applied)*  \n- How AI helps small businesses optimize time and improve operations.  \n- Examples of industries benefiting from AI-driven efficiency.  \n\n## Key Benefits of AI in Small Business Operations  \n### Reducing decision fatigue in business owners *(Key Takeaway Applied)*  \n- How AI automation minimizes repetitive decision-making.  \n- Freeing up business owners to focus on strategy and innovation.  \n\n### Boosting efficiency with small business AI tools *(Secondary Keyword Applied)*  \n- The role of AI in automating workflows, customer interactions, and task management.  \n- How automation tools improve productivity.  \n\n### Improving business adaptability with AI *(Hidden Insight Applied)*  \n- How AI enables businesses to pivot quickly in response to market changes.  \n- Case studies on AI-driven adaptability.  \n\n## Implementing AI for Small Business Growth  \n### Choosing the best AI automation tools *(Semantic & SEO Applied)*  \n- Factors to consider when selecting AI-powered solutions.  \n- Overview of top AI tools for small businesses.  \n\n### Automating business operations without disrupting workflows *(Secondary Keyword Applied)*  \n- Best practices for integrating AI seamlessly into existing processes.  \n- How to ensure a smooth transition without disrupting operations.  \n\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }) }, position: [-1120, 912], name: 'Outline Agent' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5b6a40be-b640-4caf-a531-50a45df07be8',
            name: 'outline',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [-752, 912], name: 'Set Outline Fields' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Create a comprehensive, SEO-optimized prompt for an AI article writer using the data below.\n\nPrimary Keyword: {{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}\nTitle: {{ $(\'Set Airtable Fields for Agents\').item.json.Title }}\nHidden insight: {{ $(\'Set KWs and Insights fields\').item.json.hidden_insight }}\nSearch intent: {{ $(\'Set KWs and Insights fields\').item.json.search_intent }}\nSemantic analysis: {{ $(\'Set KWs and Insights fields\').item.json.semantic_analysis }}\nSecondary keywords: {{ $(\'Set KWs and Insights fields\').item.json.keywords }}\nWriting style: {{ $(\'Set KWs and Insights fields\').item.json.writing_style }}\nWriting tone: {{ $(\'Set KWs and Insights fields\').item.json.writing_tone }}\nArticle goal: {{ $(\'Set KWs and Insights fields\').item.json.article_goal }}\nOutline: {{ $json.outline }}\nURL List for hyperlinks: {{ $(\'Set best urls\').item.json["best matching urls"] }}',
      options: {
        systemMessage: 'Your Role & Task\nYou are an AI prompt engineering specialist with expertise in crafting structured, SEO-optimized, and adaptable writing prompts.\nYour job is to generate a concise yet effective prompt that will guide an AI writing agent in producing a high-quality, well-structured article body based on the provided inputs. Write in Dutch.\n\nPrompt Requirements\nYour generated prompt should:\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n✅ Guide the AI writing agent to write only the main body sections—the introduction, key takeaways, and conclusion are handled separately.\n✅ Follow the article’s outline as a guiding framework, ensuring natural flow and logical transitions between sections.\n✅ Encourage informative, engaging, and well-structured writing, tailored to the topic and audience.\n✅ Incorporate SEO best practices naturally, ensuring primary and secondary keywords are used in relevant sections without forced placement.\n✅ Evaluate the relevance of hidden insights—if useful, include them as a core argument or supporting detail; if not, leave them out.\n✅ Use semantic analysis, related questions, and common subtopics to strengthen content depth.\n✅ Ensure flexibility—allow the AI writing agent to expand on ideas, incorporate examples, and maintain logical coherence.\n✅ This part should be at least 1900 words and maximum 2400 words.\n✅ Hyperlinks \nAdd links related to the topic to promote collections, blog posts and products from The Bucket Hat.\n\n\n\nExample Inputs & Outputs\nExample Inputs\nTitle: "The Best Fishing Destinations in North America"\nPrimary Keyword: "best fishing destinations"\nSecondary Keywords: "top fishing spots, fishing in North America, best places for fishing"\nSearch Intent: "Informational"\nWriting Style: "Engaging and expert-driven"\nWriting Tone: "Conversational yet authoritative"\nArticle Goal: "Provide anglers with a comprehensive guide to the best fishing destinations, key factors to consider, and seasonal variations."\nSemantic Analysis (Common Subtopics & Related Questions):\n{\n  "common_subtopics": [\n    "Freshwater vs. saltwater fishing: Key differences",\n    "Best fishing seasons for different regions",\n    "Gear recommendations based on fishing style"\n  ],\n  "related_questions": [\n    "What are the best fishing spots in North America?",\n    "Where can I find great deep-sea fishing locations?",\n    "What’s the best time of year to go fishing?"\n  ]\n}\nHidden Insight (if applicable): "Many top-ranked fishing destinations have conservation programs that impact seasonal availability, which most travel guides overlook."\nOutline:\n## Best Freshwater Fishing Spots  \nExploring the top lakes and rivers for freshwater fishing.  \n\nBest Deep-Sea Fishing Destinations  \nHighlighting prime locations for saltwater and offshore fishing.  \n\nSeasonal Considerations  \nHow different seasons affect fishing opportunities.  \n\nEssential Gear & Preparation Tips  \nWhat to bring for a successful fishing trip.  \n\nexample Output (Generated Writing Prompt for the AI Writing Agent)\nWriting Prompt: The Best Fishing Destinations in North America\nObjective:\nCraft a well-structured, SEO-optimized, and engaging article body focusing on fishing destinations in North America. The article should provide actionable insights, expert recommendations, and real-world considerations to help anglers choose the best locations.\n\nTarget Audience:\nRecreational and professional anglers looking for detailed guidance on fishing locations, seasonal factors, and essential gear.\n\nGuidelines for the AI Writing Agent\n1. Follow the Outline for Logical Structure & Expansion\nUse the provided outline as a structural blueprint, ensuring smooth transitions between sections.\nExpand each section with relevant insights, expert opinions, and practical examples rather than merely summarizing.\nDO NOT include an introduction or conclusion—focus strictly on main body sections.\n2. Natural Integration of Keywords (SEO-Optimized)\nPrimary Keyword: "{{Primary Keyword}}" should appear organically in relevant sections.\nSecondary Keywords: "{{Secondary Keywords}}" should be integrated contextually to enhance SEO without overuse.\nLong-Tail & Semantic Keywords: Use these strategically in discussions, answering key questions where applicable.\nAvoid forced keyword placement—prioritize readability and clarity.\n3. Adapt Writing Style & Tone Based on Topic\nFor technical/business content: Maintain a formal, authoritative, and data-driven approach.\nFor consumer, lifestyle, or travel content: Use an engaging, expert-guide tone with practical insights.\nEnsure clear, well-researched content that suits the target audience.\n4. Expand on Semantic Insights & Related Questions\nAddress common subtopics where relevant, such as:\nDefining key concepts to establish clarity.\nComparing approaches, tools, or strategies for deeper understanding.\nExploring industry-specific challenges & solutions where applicable.\nIntegrate related questions naturally—e.g., "What are the best fishing spots in North America?" or "How does AI automation impact business efficiency?"\n5. Use Hidden Insights Only If Relevant\nEvaluate whether the hidden insight adds value to the article.\nIf applicable, incorporate it as a key supporting argument to enrich the content.\nIf not relevant, omit it rather than forcing inclusion.\n6. Provide Real-World Applications & Actionable Advice\nOffer examples, case studies, or industry applications to enhance reader engagement.\nProvide actionable steps where applicable (e.g., how to implement AI tools, how to choose the right fishing destination, best practices for content marketing).\n7. Formatting for Readability & Engagement\nUse subheadings, bullet points, and short paragraphs for easy scanning.\nInclude lists, tips, or expert recommendations where useful.\nEnsure logical section transitions while maintaining engagement. Write in HTML\n8. No Introduction or Conclusion—Only Write Main Body Sections\nDO NOT include an introduction or conclusion—focus strictly on the main body content as structured in the outline.\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-2024-11-20',
            cachedResultName: 'gpt-4o-2024-11-20'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model1' } }) }, position: [-528, 912], name: 'Main Body Prompt Writer' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.output }}\nURL List for hyperlinks: {{ $(\'Set best urls\').item.json["best matching urls"] }}',
      options: {
        systemMessage: 'You are an AI writing agent responsible for generating only the main body of an article based on a structured prompt. Your writing must be well-formatted in HTML, insightful, logically structured, and engaging for the target audience. Write in Dutch.\n\nGuidelines\n✅ Follow the provided prompt exactly. Ensure adherence to the user-provided outline and structure.\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n✅ Ensure smooth transitions between sections.\nEnd sections with a transition sentence that leads into the next topic.\nAvoid abrupt shifts—maintain logical flow.\n✅ Enhance depth with real-world case studies.\nProvide real measurable outcomes (e.g., "A 20% efficiency gain led to $5M in annual savings").\nDetail implementation challenges, solutions, and business results.\n✅ Balance readability with a mix of paragraphs & lists.\nUse bullet points sparingly—convert them into mini-paragraphs where needed.\nLists should highlight key takeaways, not dominate sections.\n✅ Ensure keyword optimization.\nNaturally integrate primary and secondary keywords within the article.\nAvoid overuse—prioritize readability over keyword stuffing.\n✅ Fact-driven & logically structured.\nAvoid redundant explanations—each section should introduce new insights.\nEnsure distinctions between related topics (e.g., “Managing Complexity” should not repeat “Adaptive Learning”).\n✅ No introduction or conclusion.\nFocus only on the main body sections based on the structured prompt.\n✅ This part should be at least 1800 words and maximum 2400 words. If you can\'t write this many words in one message, write the first 1000-1200 words in a message followed by a second message with 1000-1400 words.\n✅ Hyperlinks \nAdd links related to the topic to promote collections, blog posts and products from The Bucket Hat.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-2024-11-20',
            cachedResultName: 'gpt-4o-2024-11-20'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model5' } }) }, position: [-112, 912], name: 'Content Writer Agent' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '7c282be5-3020-44b9-bf77-61639e3dd763',
            name: 'main body',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [288, 912], name: 'Edit Fields1' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Use the main body content of an article to write a conclusion. Output markdown format.\n\nMain Body\n{{ $json[\'main body\'] }}\nURL List for hyperlinks: {{ $(\'Set best urls\').item.json["best matching urls"] }}',
      options: {
        systemMessage: 'You are an expert writing assistant specializing in crafting concise, insightful, and impactful conclusions for articles across various topics. Your goal is to summarize the key takeaways, reinforce the article’s value, and leave the reader with a lasting impression. Write in Dutch. The Conclusion will be at least 450 words.\n\nGuidelines for Generating the Conclusion:\n\n✅ Summarize Key Takeaways Without Repetition\n\nIdentify the most essential points from the article without repeating entire sentences from the main body.\n\nHighlight core insights, trends, or findings in a concise manner.\n\n✅ Reinforce the Article’s Value & Relevance\n\nEmphasize why the information matters in the broader context of the topic.\n\nAlign with the article’s purpose—whether it’s to educate, inform, persuade, or provide solutions.\n\n✅ Deliver a Strong Final Thought\n\nEnd with a compelling, forward-looking, or actionable statement.\n\nConsider:\n\nA thought-provoking question\n\nA call to action (if relevant)\n\nA statement on future implications or ongoing developments\n\nAvoid generic phrases (e.g., “This is just the beginning” or “The future looks bright”).\n\nFormatting & Style:\n\n✅ Write the blog text in clean HTML format, ready to paste into Shopify. \n- Use <h2> for main sections and <h3> for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists. \n- Add <a href="URL">anchor text</a> links naturally inside the text whenever a product or collection is mentioned. \n- Anchor text should match the product or collection name. \n- Use only the URLs provided; do not invent new URLs. \n- Do not use Markdown (##, **, -) or raw line breaks (\\n). \n- Make sure all paragraphs are wrapped in <p> tags, headings in <h2> or <h3>, lists in <ul><li>, and bold text in <strong>. \n- Output clean, valid, minimal HTML, ready to paste into Shopify.\n\nthe conclusion should be around 500-550 words.\n\nUse clear, authoritative, and engaging language.\n\nAdapt tone and style to match the article (technical, Fashion-conscious, aspirational, etc.).\n\nHyperlinks\nAdd links related to the topic to promote collections, blog posts and products from The Bucket Hat.\n\nInput:\n\nThe main body of the article (excluding introduction & key takeaways)\n\nThe article\'s title (for context)\n\nOutput:A well-structured conclusion that effectively summarizes key points, reinforces relevance, and ends with a compelling thought.\n\n\nExample Conclusion for a Style Guide\n\n(Title: "Hoe draag je een Bucket Hat ? Zó draag je de bucket hat")\n<h2>Een Bucket Hat Met Persoonlijkheid</h2>\n\n<p>Nu je bekend bent met alle aspecten van het dragen van een <strong>Bucket Hat</strong>, is het duidelijk dat deze hoed veel meer is dan een modieus accessoire. Het is een uiting van je <strong>persoonlijkheid</strong>, <strong>stijl</strong> en <strong>creativiteit</strong>. In deze conclusie zullen we nogmaals de belangrijkste punten benadrukken en je inspireren om je eigen stijl te omarmen met de Bucket Hat.</p>\n\n<h2>Vertrouwen in je keuze</h2>\n<h3>Het begin van je stijlreis</h3>\n<p>Het kiezen van de perfecte <strong>Bucket Hat</strong> is het begin van je stijlreis. Deze hoed komt in verschillende stijlen, kleuren en materialen, dus neem de tijd om er een te vinden die perfect bij je past. Of je nu een damesmodel zoekt, of een herenmodel wilt, er is een hoed voor iedereen. Laat je persoonlijke smaak en voorkeur de leidraad zijn bij je keuze.</p>\n\n<h2>Creatief zijn met je stijl</h2>\n<p>De <strong>Bucket Hat</strong> biedt eindeloze mogelijkheden voor creatieve styling. Of je nu de voorkeur geeft aan een <strong>casual chic look</strong>, <strong>sportieve flair</strong>, <strong>bohemian vibes</strong> of <strong>edgy streetwear</strong>, deze hoed past zich moeiteloos aan jouw stijl aan. Laat je inspireren door beroemdheden en streetstyle foto\'s om nieuwe ideeën op te doen. Durf te experimenteren en je eigen unieke stijl te creëren.</p>\n\n<h2>Seizoensgebonden veelzijdigheid</h2>\n<p>Een van de opvallende kenmerken van de <strong>Bucket Hat</strong> is zijn seizoensgebonden veelzijdigheid. Of het nu zomer is en je bescherming tegen de zon nodig hebt, of de herfst en winter waarin je warmte en stijl wilt combineren, deze hoed is geschikt voor alle seizoenen. Overweeg de seizoensgebonden overwegingen om ervoor te zorgen dat je de juiste keuze maakt voor het weer.</p>\n\n<h2>Onderhoud en zorg</h2>\n<p>Het onderhouden van je <strong>Bucket Hat</strong> is essentieel om ervoor te zorgen dat deze er altijd fris en stijlvol uitziet. Het wassen en opbergen van je hoed vereist aandacht voor detail. Met zorg en de juiste procedures kun je de levensduur van je hoed aanzienlijk verlengen.</p>\n\n<h2>Iconische voorbeelden en inspiratie</h2>\n<p>Laat je inspireren door beroemdheden, streetstyle foto\'s, en modemagazines. Deze bronnen bieden inzicht in hoe anderen hun <strong>Bucket Hats</strong> dragen en kunnen je helpen nieuwe stijlideeën op te doen. Creativiteit kent geen grenzen, dus wees niet bang om te experimenteren en je eigen stijl te ontwikkelen.</p>\n\n<h2>De Toekomst van de Bucket Hat</h2>\n<p>Met de modewereld die voortdurend evolueert, is de <strong>Bucket Hat</strong> een blijvend stijlicoon geworden. In de toekomst kunnen we spannende ontwikkelingen verwachten, zoals duurzaamheid en nieuwe ontwerpen. Dit vissershoedje blijft relevant en past zich aan de veranderende tijden aan, waardoor je altijd een stijlvolle keuze hebt.</p>\n\n<h2>Conclusie</h2>\n<p>De <strong>Bucket Hat</strong> is meer dan een hoed; het is een statement van je <strong>persoonlijkheid</strong> en <strong>stijl</strong>. Of je nu de voorkeur geeft aan een klassieke uitstraling of graag experimenteert met nieuwe stijltrends, deze vissershoedje is een veelzijdige metgezel. Kies met vertrouwen de perfecte <strong>Bucket Hat</strong> die bij jou past, en laat je creativiteit de vrije loop bij het stylen. Blijf op de hoogte van de laatste ontwikkelingen en ontdek nieuwe ontwerpen op <strong>The Bucket Hat</strong>, waar je een uitgebreide collectie Bucket Hats voor zowel dames als heren vindt. De Bucket Hat is jouw kans\n\n\nOutput Requirements\nWrite the blog text in clean HTML format, ready to paste into Shopify. Use <h2> for main sections and <h3> tags for subsections, <p> for paragraphs, <strong> for bold text, <ul><li> for lists, and <a href="URL"> for links. Do not use Markdown (##, **, -). Make sure the HTML is valid and minimal.\nEnsure clean and structured formatting without unnecessary dividers or extra line breaks.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model2' } }) }, position: [528, 912], name: 'AI Agent Conclusion Writer' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '7e24bb1b-7f69-4a4b-a414-d4acf444313e',
            name: 'conclusion',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [896, 912], name: 'Set Conclusion' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '1147921e-1342-41a9-8642-ac1884324362',
            name: 'final_article',
            type: 'string',
            value: '={{$("Set Introduction Field").item.json.introduction}}\n\n{{$("Set Key Takeaways").item.json.key_takeaways}}\n\n{{$("Set Outline Fields").item.json.outline}}\n\n{{$("Edit Fields1").item.json["main body"]}}\n\n{{$("Set Conclusion").item.json.conclusion}}'
          }
        ]
      }
    }, position: [1184, 912], name: 'Final Article' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $(\'Sets New Title Field\').item.json.new_title }}',
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
        mode: 'id',
        value: '1AViQ9PVYtVdrC68iImpTr0kl1pEtS6aR'
      },
      resource: 'folder'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [-1168, 1376], name: 'Create Article Folder' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      title: '={{ $(\'Sets New Title Field\').item.json.new_title }}',
      folderId: '={{ $json.id }}'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [-960, 1376], name: 'Create Doc Filename is title' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      actionsUi: {
        actionFields: [
          {
            text: '={{ $(\'Final Article\').item.json.final_article }}',
            action: 'insert'
          }
        ]
      },
      operation: 'update',
      documentURL: '={{ $json.id }}'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [-736, 1376], name: 'Add Final Article' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-2024-11-20',
        cachedResultName: 'GPT-4O-2024-11-20'
      },
      options: {},
      messages: {
        values: [
          {
            role: 'system',
            content: 'You are an SEO-optimized Meta Description Generator. Your task is to generate a compelling, keyword-rich meta description for the provided article. The description should be concise, engaging, and optimized for search engines while accurately summarizing the article’s core value.\n\nGuidelines:\n✅ Length: Keep the meta description between 150–160 characters to ensure full visibility in search results.\n✅ Keyword Optimization: Incorporate primary and secondary keywords naturally, focusing on high-impact phrases relevant to the article.\n✅ Engagement & Clarity:\n\nWrite in an active voice with a clear and compelling hook.\nSummarize the key benefit of the article—why should someone read it?\nAvoid vague statements—be specific about what the article covers.\n✅ Call to Action (Optional, but Preferred): Where possible, include a soft CTA to encourage clicks (e.g., “Discover how…”, “Learn the best strategies…”).\n✅ Formatting:\nUse Markdown format with an ## Meta Description heading.\nNo extra spacing or unnecessary formatting—the output should be clean and ready to use.\nExamples:\nBefore (Weak Example):\n"De Bucket Hat is een eenvoudig accessoire dat opnieuw populair is geworden. In dit artikel lees je meer over de geschiedenis, stijlen en manieren om hem te dragen." ❌ Too vague, lacks engagement.\n\nAfter (Optimized Example):\n## Meta Description  \n"Stap in de wereld van de mode en ontdek de veelzijdigheid van de iconische Bucket Hat. Deze onderschatte accessoire is de laatste jaren weer helemaal terug."\n'
          },
          {
            content: '=Generate an SEO-optimized meta description for the following article. Ensure it is concise (150-160 characters), engaging, and includes high-impact keywords. Write in Dutch.\n{{ $(\'Final Article\').item.json.final_article }}\nFormat the output in Markdown as follows:'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-512, 1376], name: 'OpenAI Meta' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      actionsUi: {
        actionFields: [
          { text: '=\n{{ $json.message.content }}', action: 'insert' }
        ]
      },
      operation: 'update',
      documentURL: '={{ $(\'Add Final Article\').item.json.documentId }}'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [-128, 1376], name: 'Add Meta Description' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.documentId }}' },
      options: {},
      operation: 'share',
      permissionsUi: { permissionsValues: { role: 'writer', type: 'anyone' } }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [144, 1376] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b5d2b743-090c-4432-a7e7-c25b2e4bd76f',
            name: 'url',
            type: 'string',
            value: '=https://docs.google.com/document/d/{{ $(\'Add Final Article\').item.json.documentId }}/edit'
          }
        ]
      }
    }, position: [336, 1376], name: 'Edit Fields' } }))
  .then(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      base: {
        __rl: true,
        mode: 'list',
        value: 'apprrQ0Dv1cJOfMi9',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9',
        cachedResultName: 'KW Research The Bucket Hat'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'tblVTpv8JG5lZRiF2',
        cachedResultUrl: 'https://airtable.com/appuvbLPrnVBj88Eb/tblVTpv8JG5lZRiF2',
        cachedResultName: 'Article Writer'
      },
      columns: {
        value: {
          id: '={{ $(\'Webhook\').item.json.body.recordID }}',
          'Google Doc URL': '={{ $json.url }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'id',
            defaultMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Create Article',
            type: 'options',
            display: true,
            options: [
              { name: 'Write Article', value: 'Write Article' },
              { name: 'Keep', value: 'Keep' }
            ],
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Create Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Primary Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Primary Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Google Doc URL',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Google Doc URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Writing Style',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Writing Style',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Tone',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Tone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Target Audience',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Target Audience',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Goal of Article',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Goal of Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Title Options',
            type: 'options',
            display: true,
            options: [{ name: 'Original Title', value: 'Original Title' }],
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Title Options',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['id'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update'
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [560, 1376], name: 'Airtable' } }))
  .add(node({ type: 'n8n-nodes-base.airtable', version: 2.1, config: { parameters: {
      base: {
        __rl: true,
        mode: 'list',
        value: 'apprrQ0Dv1cJOfMi9',
        cachedResultUrl: 'https://airtable.com/apprrQ0Dv1cJOfMi9',
        cachedResultName: 'KW Research The Bucket Hat'
      },
      table: {
        __rl: true,
        mode: 'list',
        value: 'tblVTpv8JG5lZRiF2',
        cachedResultUrl: 'https://airtable.com/appuvbLPrnVBj88Eb/tblVTpv8JG5lZRiF2',
        cachedResultName: 'Article Writer'
      },
      columns: {
        value: {
          Tone: '={{ $json.writing_tone }}',
          Keyword: '={{ $(\'Set Airtable Fields for Agents\').item.json.Keyword }}',
          Keywords: '={{ $json.keywords }}',
          'Search Intent': '={{ $json.search_intent }}',
          'Writing Style': '={{ $json.writing_style }}',
          'Hidden Insight': '={{ $json.hidden_insight }}',
          'Goal of Article': '={{ $json.article_goal }}',
          'Target Audience': '={{ $json.target_audience }}',
          'Semantic Analysis': '={{ $json.semantic_analysis }}'
        },
        schema: [
          {
            id: 'id',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'id',
            defaultMatch: true
          },
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Final Title',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Final Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Create Article',
            type: 'options',
            display: true,
            options: [
              { name: 'Write Article', value: 'Write Article' },
              { name: 'Keep', value: 'Keep' }
            ],
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Create Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Primary Keyword',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Primary Keyword',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Google Doc URL',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Google Doc URL',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Writing Style',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Writing Style',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Tone',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Tone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Target Audience',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Target Audience',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Goal of Article',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Goal of Article',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Search Intent',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Search Intent',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hidden Insight',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Hidden Insight',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Semantic Analysis',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Semantic Analysis',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keywords',
            type: 'string',
            display: true,
            removed: false,
            readOnly: false,
            required: false,
            displayName: 'Keywords',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Keyword'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update'
    }, credentials: {
      airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' }
    }, position: [576, 528], name: 'Update Article Writer table1' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o-mini',
        cachedResultName: 'GPT-4O-MINI'
      },
      options: {},
      messages: {
        values: [
          {
            role: 'system',
            content: 'You are an AI-powered Image Prompt Generator. Your task is to generate a detailed, visually engaging image prompt for an AI image-generation model. The image should serve as the featured image for the article, representing its key themes and attracting user attention.\n\nGuidelines:\n✅ Visual Representation of the Article:\n\nThe image should capture the essence of the topic in a compelling, high-quality way.\nAvoid overly generic imagery—ensure the image aligns with the article\'s subject matter and industry (e.g., AI automation, business processes, workflow management, etc.).\n✅ Descriptive Detail for Image Generation:\n\nUse rich visual descriptions that include:\nScene setting (e.g., futuristic cityscape, high-tech office, dynamic team collaboration).\nElements & objects (e.g., digital interfaces, robots, data visualizations, business professionals).\nMood & lighting (e.g., cinematic lighting, energetic atmosphere, professional and modern tone).\nPerspective (e.g., wide-angle, close-up, action shot, aerial view).\n✅ Consistency & Formatting:\n\nOutput must be in Markdown format with an ## Image Prompt heading.\nEnd the image prompt with --ar 16:9 to specify the 16:9 aspect ratio for better compatibility.\nExamples:\nBefore (Weak Example):\n"An image of AI and business automation." ❌ Too vague, lacks engagement.\n\nAfter (Optimized Example):## Image Prompt  \nA futuristic digital workspace with AI-powered automation interfaces, holographic data charts, and robotic assistants collaborating with business professionals. The environment is sleek and modern, illuminated by ambient blue neon lighting, symbolizing innovation and efficiency. --ar 16:9  \n'
          },
          {
            content: '=Generate an AI image prompt that visually represents the following article. Ensure the description is detailed, engaging, and optimized for an eye-catching featured image.\n\n {{ $(\'Final Article\').item.json.final_article }}\n\n## Image Prompt  \n[Your detailed AI image prompt here] --ar 16:9\n'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [-720, 1648], name: 'OpenAI Image Prompt1' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      actionsUi: {
        actionFields: [
          { text: '=\n{{ $json.message.content }}', action: 'insert' }
        ]
      },
      operation: 'update',
      documentURL: '={{ $(\'Add Meta Description\').item.json.documentId }}'
    }, credentials: {
      googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' }
    }, position: [-336, 1648], name: 'Add Image Prompt1' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '7e444c83-3d2b-4bd3-a23b-6fb5ca68e670',
            name: 'writing_style',
            type: 'string',
            value: '={{ $json.writing_style }}'
          },
          {
            id: 'e16b5d65-587d-49d8-af5d-4ff1930633a8',
            name: 'writing_tone',
            type: 'string',
            value: '={{ $json.output.parseJson().writing_tone }}'
          },
          {
            id: 'ab756373-0186-454a-8e98-d5a5f96cba87',
            name: 'search_intent',
            type: 'string',
            value: '={{ $json.output.parseJson().search_intent }}'
          },
          {
            id: 'a14b7657-038a-4b08-911d-314336261a0c',
            name: 'hidden_insight',
            type: 'string',
            value: '={{ $json.output.parseJson().hidden_insight }}'
          },
          {
            id: '19ef4221-5a5d-4321-8a07-4e04f5dcaf44',
            name: 'target_audience',
            type: 'string',
            value: '={{ $json.output.parseJson().target_audience }}'
          },
          {
            id: '0ab17e84-4a2e-4df3-b0a3-91e9ce26cb72',
            name: 'article_goal',
            type: 'string',
            value: '={{ $json.output.parseJson().goal_of_article }}'
          },
          {
            id: '84e7f6a4-48b2-43b2-92cc-7e0337311661',
            name: 'semantic_analysis',
            type: 'string',
            value: '={{ $json.output.parseJson().semantic_analysis }}'
          },
          {
            id: '5e943a46-bb03-438d-b6da-2a6ec414f5af',
            name: 'keywords',
            type: 'string',
            value: '={{ $json.output.parseJson().keywords }}'
          },
          {
            id: '57d4d085-54df-414b-9fd0-ddfa42fba688',
            name: 'language',
            type: 'string',
            value: ''
          }
        ]
      }
    }, position: [336, 528], name: 'Set KWs and Insights fields1' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Assemble the article from the following components into a single cohesive output formatted in Markdown:\n\n- **Key Takeaways**: {{ $(\'Set Key Takeaways\').item.json.key_takeaways }}\n- **Introduction**: {{ $(\'Introduction Agent\').item.json.output }}\n- **Main Content**: {{ $(\'Edit Fields1\').item.json[\'main body\'] }}\n- **Conclusion**: {{ $json.conclusion }}\n\n### Output Format:\n- Use `##` for main section headings like Key Takeaways, Introduction, and Conclusion.\n- Use `##` for primary headings (H2s) in the main content.\n- Use `###` for subheadings (H3s) under those primary headings.\n- Format lists as bulleted lists using `-`.\n- Write paragraphs in plain text, separated by line breaks.\n\nExample Output:\n\n## Key Takeaways\n- AI automation reduces costs and improves efficiency for SMBs.\n- Examples show how AI streamlines workflows and enhances customer service.\n- Step-by-step advice helps SMBs adopt AI effectively.\n\n## Introduction\nAI automation is a transformative tool for small businesses, offering improved efficiency, cost reduction, and scalability.\n\n## How Intelligent Process Automation Works\nIntelligent process automation (IPA) isn’t just about speed—it’s about working smarter.\n\n### Reducing Manual Work and Process Errors with Automation\nAutomating manual tasks like payroll processing slashes error rates by up to 90%.\n\n### Boosting Process Efficiency Across Business Functions\nFrom HR to sales, IPA ensures consistency and efficiency.\n\n## Conclusion\nAI automation is a pathway to transforming how small businesses operate and grow. By streamlining workflows, enhancing customer experiences, and enabling smarter decision-making, AI empowers businesses to achieve more with less effort.\n\n\n',
      options: {
        systemMessage: 'You are an expert content assembler. Your task is to take separate elements of an article—key takeaways, introduction, main content (including subheadings), and conclusion—and assemble them into a single cohesive output. The final output should be formatted in Markdown for a CMS blog post field. Write in Dutch. The whole post will be between 2900 and 3500 words. Anything below that size is inrelevant\n\nGuidelines:\n\n1. Use `H2` for section headings (Key Takeaways, Introduction, and Conclusion).\n2. Use `H2` for primary headings (H2s) from the main content.\n3. Use `H3` for subheadings (H3s) under those primary headings.\n4. Write paragraphs as plain text, separated by line breaks.\n5. Ensure the output is clean and properly formatted in Markdown without unnecessary placeholders like "Main Content."\n6. Do not include triple backticks (\'\'\') or any additional spaces or text outside of the conclusion itself.\nEnsure clean and structured formatting without unnecessary dividers or extra line breaks.\n\n\n\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.1, config: { parameters: { model: 'gpt-4o-2024-11-20', options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model3' } }) }, position: [1344, 1792], name: 'Article Assembly Agent1' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Perform the final edit on:\n {{ $json.output }}',
      options: {
        systemMessage: 'You are an expert SEO-optimized content final editor.\n\nYour task is to enhance and expand the provided article to near-perfect quality (9.5+/10) while maintaining clarity, logical flow, and readability. The final article should be well-structured, engaging, and adaptable to any topic, including (but not limited to) business, healthcare, technology, education, finance, environmental science, legal, consumer guides, and marketing. Write in Dutch. The whole post will be between 2900 and 3500 words.\n\n\n✅ General Refinement Guidelines\n1️⃣ Expand, Don’t Cut\nPreserve all valuable content while adding depth where necessary.\nDo not shorten or remove sections unless redundant or unclear.\nIf something feels incomplete, expand rather than delete it.\n2️⃣ Strengthen Section Transitions for Seamless Flow\nEnsure smooth transitions between sections by adding brief lead-ins before introducing a new concept.\nEach section should naturally build on the previous one—avoiding abrupt shifts.\nImplementation:\nIf a new section introduces a major topic, insert a transition sentence summarizing why the previous section matters.\nExample:\nBefore (Abrupt Shift):\n"While automation improves efficiency, its true power emerges when integrated with existing systems."\nAfter (Smoother Transition):\n"Efficiency gains are only part of the equation—true business impact comes from seamlessly integrating automation with existing workflows to ensure sustainable improvements."\n✅ Ensures smoother flow between ideas.\n\n3️⃣ Diversify Real-World Applications Across More Industries\nDo NOT over-focus on one industry or domain (e.g., AI, tech, or automation).\nWhere applicable, ensure varied examples in fields like:\nHealthcare (diagnostic automation, patient management)\nFinance (risk assessment, fraud detection, portfolio management)\nEducation (personalized learning, curriculum adaptation)\nLegal (contract automation, compliance monitoring)\nMarketing (data-driven campaigns, customer behavior analysis)\nRetail & E-commerce (inventory optimization, demand forecasting)\nConsumer Behavior (product recommendations, pricing strategies)\nEnvironmental Science (climate impact modeling, resource allocation)\nImplementation:\nIf the article lacks industry diversity, add 1–2 additional sector applications.\nExample:\nBefore (Too Narrow):\n"Predictive analytics is transforming logistics and finance."\nAfter (Expanded with More Fields):\n"Predictive analytics is transforming industries beyond logistics and finance. In healthcare, it enhances diagnostic accuracy; in education, it customizes learning paths; in marketing, it optimizes ad spend by predicting customer behavior."\n✅ Expands article relevance to a broader audience.\n\n4️⃣ Strengthen the Conclusion with a Future-Focused Perspective\nAvoid generic wrap-ups—end with a compelling strategic takeaway or challenge.\nEnsure future trends, competitive implications, and thought-provoking insights are included.\nImplementation:\nInstead of simply summarizing, pose a challenge or future opportunity.\nExample:\nBefore (Weak Ending):\n"The question remains: How will businesses use this technology to redefine operations? The time to act is now."\nAfter (More Forward-Thinking):\n"Looking ahead, businesses that embrace adaptable strategies and data-driven decision-making will lead in an increasingly competitive landscape. Whether through emerging technologies, customer-first innovation, or operational agility, the next era of success will belong to those who can not just adapt—but anticipate change. The real question isn’t if you’ll adopt these advancements—but how effectively you’ll use them to gain a competitive edge."\n✅ Leaves the reader with a clear action step or thought-provoking challenge.\n\n\n5️⃣ Expand Instead of Reduce Content\nDO NOT cut content unless it is redundant or weakens clarity.\nIf a section feels too brief or lacks depth, expand it by:\nProviding real-world examples\nAdding practical applications\nElaborating on key insights\nStrengthening data-backed statements\nExample Fix:\nBefore (Overly brief):\n"Sustainable practices benefit businesses."\nAfter (More informative & engaging):\n"Sustainable practices provide both environmental and financial advantages. Businesses that invest in renewable energy, reduce waste, and optimize resource consumption see long-term cost savings and increased brand loyalty."\n\n6. Do not add any commentary on what improvements you made. Just output the refined article.\n7. Do not add dividing lines between sections ("---") or any extra spacing or line breaks.\n\nMake every article a 9.5+/10 by refining structure, depth, and industry relevance while keeping it universally applicable across topics.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-2024-11-20',
            cachedResultName: 'gpt-4o-2024-11-20'
          },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model6' } }) }, position: [1728, 1792], name: 'Final Edit Agent1' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '4d5ae86e-7aec-4a4c-9256-7042d2e32497',
            name: 'final_article',
            type: 'string',
            value: '={{ $json.output }}'
          }
        ]
      }
    }, position: [2064, 1792], name: 'Final Article1' } }))
  .add(sticky('## Good Opportunity for Human in the loop\nCreate 5 titles and have the human pick one.', { color: 3, position: [528, -144], width: 420 }))
  .add(sticky('## Get Working Title, Description, Keywords from Airtable Article Writer\n\nGet\'s this data for use in the first agent that creates the writing style, tone, target audience/persona and goal.\n\nTriggered by status field in the Article Writer table. Create Article = Write Article', { name: 'Sticky Note2', position: [-2160, 112], width: 1620, height: 480 }))
  .add(sticky('## Dynamic Writing Guidelines and Hidden Insights\nBased on real-world search results and competitor analysis, ensuring that your AI-generated articles align with user intent better than static SEO methods.\n\nUses working title, description (both from keyword categorization), and top 5 search results to generate writing style and tone, goal of the article, hidden insights from AI analysis, semantic insights and keywords. All for use throughout the workflow. ', { name: 'Sticky Note3', position: [-496, 96], width: 780, height: 600 }))
  .add(sticky('## Refine the Working Title - Set New Title in Airtable\nUses all the input and generated info to create an SEO optimized title.\n\nThe airtable record is updated.', { name: 'Sticky Note4', position: [320, 96], width: 800, height: 600 }))
  .add(sticky('## Create Key Takeaways with Intro, bullet points, and Outro\n\nBrings in hidden insights if applicable which will drive the outline and main body content.', { name: 'Sticky Note5', position: [1168, 96], width: 744, height: 600 }))
  .add(sticky('## Revisit prompts to make sure they work for different types of topics. AI Automation vs Mountain Bike Suspensions', { name: 'Sticky Note1', color: 3, position: [1232, -144], width: 420 }))
  .add(sticky('## Create Engaging Introduction\n', { name: 'Sticky Note6', position: [1984, 96], width: 808, height: 600 }))
  .add(sticky('## Create Outline\n\n', { name: 'Sticky Note7', position: [-1168, 736], width: 560, height: 540 }))
  .add(sticky('## Create Main Body Prompt\n', { name: 'Sticky Note8', position: [-592, 736], width: 400, height: 540 }))
  .add(sticky('## Write Main Body\n', { name: 'Sticky Note9', position: [-176, 736], width: 600, height: 540 }))
  .add(sticky('## Write Conclusion\n', { name: 'Sticky Note10', position: [448, 736], width: 560, height: 540 }))
  .add(sticky('## Assemble Entire Article\n', { name: 'Sticky Note11', position: [1296, 1632], width: 380, height: 540 }))
  .add(sticky('## Perform Final Editor and Quality Check', { name: 'Sticky Note12', position: [1696, 1632], width: 560, height: 540 }))
  .add(sticky('## Add Your Tavily API key', { name: 'Sticky Note13', color: 3, position: [-112, 496], height: 200 }))
  .add(sticky('# Set up\n## Copy this Airtable base: [KW Research Content Ideation](https://airtable.com/apphzhR0wI16xjJJs/shrsojqqzGpgMJq9y)\n**Important: There is a copy base button in the top left of the base. Please copy this base. Do not request access.**\n## Adjust the Airtable Trigger\nModify the automation script to include your n8n webhook url. Here is the script in case it does not copy.\nlet params = input.config();\nlet recordID = params.recordID;\nlet n8nWebhookURL = params.n8nWebhookURL\nconst webhook = (n8nWebhookURL + "?recordID=" + recordID);\nconsole.log(webhook);\nawait fetch(webhook, {\n    method: \'POST\'\n});\n### Set script input variables\nName: recordID\nValue: Airtable record ID\n\nName: n8nWebhookURL\nValue: Your n8n webhook url\n\n## Add Your Credentials and Make Connections\nAdd your credentials and make connections for Tavily, Google Drive, Google Docs, and the LLM model you want to use with the AI Agents.\n\n', { name: 'Sticky Note14', color: 3, position: [-3104, 96], width: 560, height: 860 }))