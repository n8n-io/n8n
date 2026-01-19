return workflow('qjLD1os0l5ISHRFO', 'Agent AI Anthropic Opus 4 and Sonnet 4', { executionOrder: 'v1' })
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [20, 60], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      options: {
        systemMessage: '=You are a **Routing Agent**.\n\nYour task is to analyze user queries and determine the most appropriate model to handle each specific use case.\n\n## Available Models\n\nYou have access to the following models:\n\n1. **claude-sonnet-4-20250514**\n2. **claude-opus-4-20250514**\n\n## Model Strengths\n\n### 1. claude-sonnet-4-20250514\n- Standard decision-making tasks\n- Real-time workflow routing\n- Data validation and processing\n- Pattern recognition in structured data\n- Routine business logic evaluation\n\n### 2. claude-sonnet-4-20250514\n- Complex multi-factor decision scenarios\n- Advanced data analysis requiring deep reasoning\n- Critical business decisions with high impact\n- Complex pattern recognition in unstructured data\n- Strategic workflow optimization\n\n## Output Format\n\nYour output must always be a valid JSON object in the following format:\n\n```json\n{\n  "prompt": "user query goes here",\n  "model": "selected-model-name"\n}\n```\n\n- The **"prompt"** field should contain the exact query to be sent to the selected model.\n- The **"model"** field should contain the model name (one of: claude-sonnet-4-20250514, claude-opus-4-20250514).\n\n**Important:** Only return the JSON object. Do not include any explanations or additional text.'
      },
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-3-7-sonnet-20250219',
            cachedResultName: 'Claude Sonnet 3.7'
          },
          options: { maxTokensToSample: 1024 }
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Sonnet 3.7' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n	"type": "object",\n	"properties": {\n		"prompt": {\n			"type": "string"\n		},\n		"model": {\n			"type": "string"\n		}\n	}\n}'
        }, name: 'Structured Output Parser' } }) }, position: [240, 60], name: 'Anthropic Routing Agent' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.9, config: { parameters: {
      text: '={{ $json.output.prompt }}',
      options: {
        systemMessage: '=You have access to a web_search tool that allows you to browse the internet for up-to-date information. Here\'s how you should operate:\n\n1. Website Information:\nFamiliarize yourself with this information about the website you\'re assisting. Use this as context for user interactions.\n\n2. Web Search Tool:\nYou have access to a web_search tool that can browse the internet. To use it, write the variable {web_search_question}. The tool will return relevant search results. Set the variable {model} to {{ $json.output.model }}.\n\n3. Handling User Queries:\nWhen a user asks a question, follow these steps:\na) Analyze the query to determine if it\'s related to the website or requires external information.\nb) If the query is about the website, use the provided website information to answer.\nc) If external information is needed, use the web_search tool to find relevant data.\n\n4. Using web_search:\n- Use web_search for factual, current information that isn\'t provided in the website info.\n- Formulate clear, concise search queries.\n- If the first search doesn\'t yield useful results, refine your query and search again.\n- Limit searches to a maximum of three per user query to maintain efficiency.\n\n5. Using Think:\n- Using Think tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.\n\n6. Formulating Responses:\n- Begin with information from the website if relevant.\n- Incorporate web search results to provide up-to-date, accurate information.\n- Summarize findings concisely and coherently.\n- If you\'re unsure or can\'t find reliable information, be honest about limitations.\n\n7. Ethical Considerations:\n- Respect user privacy. Don\'t ask for or store personal information.\n- Provide factual information. Avoid speculation or unverified claims.\n- If asked about controversial topics, strive for a balanced, neutral response.\n- Don\'t engage in or encourage illegal activities.\n\n8. Output Format:\nDo not include your thought process, web searches, or any other tags in the final output.\n'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolThink', version: 1, config: { name: 'Think' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1, config: { name: 'Calculator' } }), tool({ type: 'n8n-nodes-base.httpRequestTool', version: 4.2, config: { parameters: {
          url: 'https://api.anthropic.com/v1/messages',
          method: 'POST',
          options: {},
          jsonBody: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'JSON\', `{\n  "model": "{model}",\n  "max_tokens": 1024,\n  "messages": [\n    {\n      "role": "user",\n      "content": "{web_search_question}"\n    }\n  ],\n  "tools": [\n    {\n      "type": "web_search_20250305",\n      "name": "web_search",\n      "max_uses": 5\n    }\n  ]\n}\n`, \'json\') }}',
          sendBody: true,
          sendHeaders: true,
          specifyBody: 'json',
          authentication: 'predefinedCredentialType',
          toolDescription: 'Use this tool to search on the web',
          headerParameters: {
            parameters: [
              { name: 'anthropic-version', value: '=2023-06-01' },
              { name: 'content-type', value: 'application/json' }
            ]
          },
          nodeCredentialType: 'anthropicApi'
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'web_search' } })], memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'When chat message received\').item.json.sessionId }}',
          sessionIdType: 'customKey'
        }, name: 'Simple Memory1' } }), model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: '={{ $json.output.model }}' },
          options: {}
        }, credentials: {
          anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' }
        }, name: 'Sonnet 4 or Opus 4' } }) }, position: [600, 60], name: 'AI Agent' } }))
  .add(sticky('## Dynamic Model Selector for Optimal AI Responses\n\nThe **New Anthropic Agent Decisioner** is a dynamic, AI-powered routing system that automatically selects the most appropriate large language model (Anthropic Sonnet 4 or Opus 4) to respond to a user\'s query based on the query’s content and purpose.\n\nThis workflow ensures **dynamic, optimized AI responses** by intelligently routing queries to the best-suited model.', { name: 'Sticky Note', position: [20, -180], width: 840, height: 180 }))