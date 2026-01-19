return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'When clicking \'Test workflow\'' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      assignments: {
        assignments: [
          {
            id: 'id-1',
            name: 'researchTopic',
            value: '<__PLACEHOLDER_VALUE__Research topic to investigate__>',
            type: 'string'
          },
          {
            id: 'id-2',
            name: 'recipientEmail',
            value: '<__PLACEHOLDER_VALUE__Email address to send the report to__>',
            type: 'string'
          }
        ]
      },
      includeOtherFields: true,
      options: {}
    }, position: [224, 0], name: 'Workflow Configuration' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 3.1, config: { parameters: {
      promptType: 'define',
      text: '=The research topic is: {{ $json.researchTopic }}',
      hasOutputParser: true,
      options: {
        systemMessage: 'You are an orchestrator that coordinates specialized AI agents to research topics and generate professional reports.\n\nYour task is to:\n1. Call the Research Agent Tool to gather recent, credible information about the topic\n2. Call the Fact-Check Agent Tool to verify the findings (require 2+ independent sources for verification)\n3. Call the Report Writer Agent Tool to create a clear, well-written report under 1,000 words\n4. Call the HTML Editor Agent Tool to format the report as clean, professional HTML\n5. Call the Gmail Send Tool to send the HTML report to the recipient\n6. Return ONLY the final result\n\nCoordinate the agents in sequence and ensure each step completes before proceeding to the next.'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.agentTool', version: 3, config: { parameters: {
          toolDescription: 'Gathers recent, credible information about a research topic using web search',
          text: '={{ $fromAI(\'topic\', \'The research topic to investigate\', \'string\') }}',
          hasOutputParser: true,
          options: {
            systemMessage: 'You are a research specialist focused on gathering recent, credible information.\n\nYour task is to:\n1. Use the SerpAPI Search Tool to find recent, credible sources about the topic\n2. Focus on authoritative sources (news outlets, academic publications, official websites)\n3. Gather key facts, statistics, and findings\n4. Note the source for each piece of information\n5. Return structured research findings with sources cited\n\nPrioritize quality over quantity and ensure information is current and from reputable sources.'
          }
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'gpt-4.1-mini' },
          builtInTools: {},
          options: {}
        }, credentials: {
          openAiApi: { id: 'Mn8T0CdaEGFddJYV', name: ' OpenAi account (David)' }
        }, name: 'OpenAI Chat Model - Research' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'xadwMPBeZtcl35nb', name: 'jesper\'s SerpAPI account' }
        }, name: 'SerpAPI Search Tool' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "findings": {\n      "type": "array",\n      "items": {\n        "type": "object",\n        "properties": {\n          "fact": {"type": "string"},\n          "source": {"type": "string"},\n          "url": {"type": "string"}\n        }\n      },\n      "description": "Array of research findings with sources"\n    }\n  }\n}'
        }, name: 'Research Output Parser' } }) }, name: 'Research Agent Tool' } }), tool({ type: '@n8n/n8n-nodes-langchain.agentTool', version: 3, config: { parameters: {
          toolDescription: 'Verifies research findings by checking facts against multiple independent sources (requires 2+ sources for verification)',
          text: '={{ $fromAI(\'researchFindings\', \'Research findings to fact-check\', \'json\') }}',
          hasOutputParser: true,
          options: {
            systemMessage: 'You are a fact-checking specialist who verifies information rigorously.\n\nYour task is to:\n1. Review the research findings provided\n2. Use the SerpAPI Search Tool to verify each major claim\n3. Mark a fact as "verified" ONLY if it appears in at least 2 independent sources\n4. Document which sources confirm each fact\n5. Flag any claims that cannot be verified with 2+ sources\n6. Return structured verification results with source citations\n\nBe strict: require 2+ independent sources for verification. If you cannot find 2 sources, mark as unverified.'
          }
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'gpt-4.1-mini' },
          builtInTools: {},
          options: {}
        }, credentials: {
          openAiApi: { id: 'Mn8T0CdaEGFddJYV', name: ' OpenAi account (David)' }
        }, name: 'OpenAI Chat Model - Fact-Check' } }), tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'xadwMPBeZtcl35nb', name: 'jesper\'s SerpAPI account' }
        }, name: 'SerpAPI Search Tool' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "verifiedFacts": {\n      "type": "array",\n      "items": {\n        "type": "object",\n        "properties": {\n          "fact": {"type": "string"},\n          "verified": {"type": "boolean"},\n          "sources": {\n            "type": "array",\n            "items": {"type": "string"}\n          },\n          "sourceCount": {"type": "number"}\n        }\n      },\n      "description": "Array of facts with verification status and sources"\n    }\n  }\n}'
        }, name: 'Fact-Check Output Parser' } }) }, name: 'Fact-Check Agent Tool' } }), tool({ type: '@n8n/n8n-nodes-langchain.agentTool', version: 3, config: { parameters: {
          toolDescription: 'Writes a clear, well-structured report under 1,000 words based on verified research findings',
          text: '={{ $fromAI(\'verifiedFindings\', \'Verified research findings to write about\', \'json\') }}',
          hasOutputParser: true,
          options: {
            systemMessage: 'You are a professional report writer who creates clear, well-structured content.\n\nYour task is to:\n1. Review the verified research findings\n2. Write a comprehensive report under 1,000 words\n3. Structure the report with: introduction, key findings (organized by theme), and conclusion\n4. Use only verified information\n5. Write in a clear, professional tone\n6. Include source citations where appropriate\n7. Return the report as plain text (no HTML formatting)\n\nKeep the report concise, informative, and well-organized. Stay under 1,000 words.'
          }
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'gpt-4.1-mini' },
          builtInTools: {},
          options: {}
        }, credentials: {
          openAiApi: { id: 'Mn8T0CdaEGFddJYV', name: ' OpenAi account (David)' }
        }, name: 'OpenAI Chat Model - Writer' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "reportText": {\n      "type": "string",\n      "description": "The complete report text under 1,000 words"\n    },\n    "wordCount": {\n      "type": "number",\n      "description": "Number of words in the report"\n    }\n  }\n}'
        }, name: 'Report Writer Output Parser' } }) }, name: 'Report Writer Agent Tool' } }), tool({ type: '@n8n/n8n-nodes-langchain.agentTool', version: 3, config: { parameters: {
          toolDescription: 'Formats a plain text report as clean, professional HTML suitable for email',
          text: '={{ $fromAI(\'reportText\', \'Plain text report to format as HTML\', \'string\') }}',
          hasOutputParser: true,
          options: {
            systemMessage: 'You are an HTML formatting specialist who creates clean, professional email-ready HTML.\n\nYour task is to:\n1. Take the plain text report provided\n2. Format it as professional HTML suitable for email body\n3. Use proper HTML structure: headings (h1, h2), paragraphs (p), lists (ul/ol) where appropriate\n4. Apply clean, minimal styling (use inline CSS for email compatibility)\n5. Ensure the HTML is well-formatted and easy to read\n6. Return ONLY the HTML content (no explanations)\n\nCreate a polished, professional appearance suitable for business email.'
          }
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'gpt-4.1-mini' },
          builtInTools: {},
          options: {}
        }, credentials: {
          openAiApi: { id: 'Mn8T0CdaEGFddJYV', name: ' OpenAi account (David)' }
        }, name: 'OpenAI Chat Model - HTML Editor' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "htmlContent": {\n      "type": "string",\n      "description": "The HTML formatted report content"\n    }\n  }\n}'
        }, name: 'HTML Editor Output Parser' } }) }, name: 'HTML Editor Agent Tool' } }), tool({ type: 'n8n-nodes-base.gmailTool', version: 2.2, config: { parameters: {
          authentication: 'serviceAccount',
          sendTo: '={{ $(\'Workflow Configuration\').first().json.recipientEmail }}',
          subject: '={{ $fromAI(\'emailSubject\', \'Email subject line for the report\', \'string\') }}',
          message: '={{ $fromAI(\'htmlContent\', \'HTML formatted report content\', \'string\') }}',
          options: {}
        }, credentials: {
          googleApi: {
            id: 'MWjVFHH14uZAy0SM',
            name: 'Cornelius TESTING - to be deleted'
          }
        }, name: 'Gmail Send Tool' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'id', value: 'gpt-4.1-mini' },
          builtInTools: {},
          options: {}
        }, credentials: {
          openAiApi: { id: 'Mn8T0CdaEGFddJYV', name: ' OpenAi account (David)' }
        }, name: 'OpenAI Chat Model - Orchestrator' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n  "type": "object",\n  "properties": {\n    "status": {\n      "type": "string",\n      "description": "Overall workflow status"\n    },\n    "emailSent": {\n      "type": "boolean",\n      "description": "Whether the email was successfully sent"\n    },\n    "summary": {\n      "type": "string",\n      "description": "Brief summary of what was accomplished"\n    }\n  }\n}'
        }, name: 'Orchestrator Output Parser' } }) }, position: [1176, 0], name: 'Orchestrator Agent' } }))