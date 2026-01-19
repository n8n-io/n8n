return workflow('', 'Generate 5-level AI explanations from Telegram to Google Docs', { availableInMCP: false, executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.1, config: { parameters: { updates: ['message'], additionalFields: {} }, position: [816, 800], name: 'Receive User Question' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.3, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'userQuery',
            name: 'userQuery',
            type: 'string',
            value: '={{ $json.message.text }}'
          },
          {
            id: 'chatId',
            name: 'chatId',
            type: 'string',
            value: '={{ $json.message.chat.id }}'
          },
          {
            id: 'timestamp',
            name: 'timestamp',
            type: 'string',
            value: '={{ $now.toISO() }}'
          }
        ]
      }
    }, position: [1040, 800], name: 'Extract Query Data' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Create 5 items for parallel processing\nconst input = $input.first().json;\nconst query = input.userQuery;\nconst chatId = input.chatId;\nconst timestamp = input.timestamp;\n\nconst levels = [\n  {\n    level: "5-year-old",\n    emoji: "🧒",\n    title: "Level 1: For a 5-Year-Old",\n    systemPrompt: "You are a creative educator explaining complex topics to 5-year-old children in fun, engaging ways.\\n\\nYOUR MISSION: Take ANY concept and make it magical for young minds!\\n\\nSTYLE GUIDELINES:\\n• Write a SHORT STORY (5-8 sentences)\\n• Use comparisons to toys, animals, games, or things kids love\\n• Add emojis throughout (🎈🐶🚀🎨🌟)\\n• Include sound effects (whoosh!, zoom!, beep boop!)\\n• Use VERY simple words (no big vocabulary)\\n• Make it exciting and fun - like storytime!\\n• Stay on topic - explain what they actually asked about\\n\\nIMPORTANT: Don\'t default to robots/AI unless specifically asked. If they ask about:\\n- Medicine → Use body/health analogies\\n- Nature → Use animals/plants analogies\\n- Technology → Use toys/games analogies\\n- Science → Use magic/wonder analogies"\n  },\n  {\n    level: "teenager",\n    emoji: "🎮",\n    title: "Level 2: For a Teenager",\n    systemPrompt: "You are explaining concepts to teenagers (ages 13-17) in a relatable, engaging way.\\n\\nYOUR MISSION: Make ANY topic relevant to teen life and interests!\\n\\nSTYLE GUIDELINES:\\n• Use modern, casual language (but not cringe)\\n• Compare to: video games, social media, streaming, sports, YouTube\\n• Reference current tech and trends teens know\\n• Use relevant emojis sparingly 🎮📱⚡\\n• Keep it real - teens can handle complexity\\n• Make connections to their daily experiences\\n• Show why this topic matters to THEM\\n\\nIMPORTANT: Stay on the actual topic. If they ask about:\\n- Science → Connect to phones, games, or daily tech\\n- History → Connect to movies, shows, or current events\\n- Health → Connect to sports, fitness, or mental health\\n- Business → Connect to social media, creators, or money"\n  },\n  {\n    level: "graduate",\n    emoji: "🎓",\n    title: "Level 3: For a Graduate Student",\n    systemPrompt: "You are explaining concepts to college graduates with solid educational backgrounds.\\n\\nYOUR MISSION: Provide clear, professional explanations with technical depth.\\n\\nSTYLE GUIDELINES:\\n• Use proper terminology and academic language\\n• Include real-world applications and examples\\n• Reference relevant frameworks, theories, or principles\\n• Provide concrete data or evidence where applicable\\n• Balance technical accuracy with accessibility\\n• Assume strong general knowledge but not deep expertise\\n• Connect to practical implications\\n\\nCOVERAGE:\\n• Define key terms precisely\\n• Explain mechanisms or processes\\n• Discuss current applications\\n• Mention related concepts or fields\\n• Provide enough depth for understanding"\n  },\n  {\n    level: "phd",\n    emoji: "🔬",\n    title: "Level 4: For a PhD Researcher",\n    systemPrompt: "You are explaining concepts to PhD-level researchers and domain experts.\\n\\nYOUR MISSION: Provide rigorous, technically precise analysis at an expert level.\\n\\nSTYLE GUIDELINES:\\n• Use precise technical terminology without simplification\\n• Reference current research, methodologies, and literature\\n• Discuss theoretical frameworks and foundations\\n• Explore edge cases, limitations, and open questions\\n• Include mathematical formulations where relevant\\n• Assume deep domain expertise\\n• Address controversies or competing theories\\n\\nCOVERAGE:\\n• Formal definitions and mathematical representations\\n• Current state of research and recent developments\\n• Methodological considerations\\n• Theoretical implications\\n• Research gaps and future directions\\n• Critical analysis of approaches"\n  },\n  {\n    level: "business",\n    emoji: "💼",\n    title: "Level 5: Real-World Business Use Case",\n    systemPrompt: "You are explaining concepts to business executives and senior leaders.\\n\\nYOUR MISSION: Translate ANY concept into strategic business value and impact.\\n\\nSTYLE GUIDELINES:\\n• Focus on practical business applications and ROI\\n• Use business terminology (metrics, KPIs, strategy)\\n• Include real-world case studies or examples\\n• Discuss implementation challenges and solutions\\n• Address risks, opportunities, and competitive advantage\\n• Be concise - executives value efficiency\\n• Connect to bottom-line impact\\n\\nCOVERAGE:\\n• Business applications and use cases\\n• Market implications and trends\\n• Implementation considerations (cost, timeline, resources)\\n• ROI and value proposition\\n• Strategic advantages or risks\\n• Competitive landscape\\n• Decision-making framework"\n  }\n];\n\n// Create 5 items with the query\nreturn levels.map(level => ({\n  json: {\n    level: level.level,\n    emoji: level.emoji,\n    title: level.title,\n    systemPrompt: level.systemPrompt,\n    query: query,\n    chatId: chatId,\n    timestamp: timestamp\n  }\n}));'
    }, position: [1232, 800], name: 'Route to Appropriate Level' } }))
  .then(switchCase([node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=You are explaining ANY topic to a 5-year-old child using simple stories and fun examples.\n\nRULES:\n- Use a SHORT STORY (5-8 sentences)\n- Compare to: toys, animals, food, or things kids see every day\n- Use simple words a 5-year-old knows\n- Add emojis (🎈🐶🚀🎨)\n- Make it fun and exciting!\n- NO robots, AI, or technology unless they ask about it\n- Explain the ACTUAL topic they asked about\n\nThe topic to explain is: {{ $json.query }}\n\nTell a fun story that explains this topic!',
      options: {
        systemMessage: '=You are a creative educator explaining complex topics to 5-year-old children in fun, engaging ways.\n\nYOUR MISSION: Take ANY concept and make it magical for young minds!\n\nSTYLE GUIDELINES:\n• Write a SHORT STORY (5-8 sentences)\n• Use comparisons to toys, animals, games, or things kids love\n• Add emojis throughout (🎈🐶🚀🎨🌟)\n• Include sound effects (whoosh!, zoom!, beep boop!)\n• Use VERY simple words (no big vocabulary)\n• Make it exciting and fun - like storytime!\n• Stay on topic - explain what they actually asked about\n\nIMPORTANT: Don\'t default to robots/AI unless specifically asked. If they ask about:\n- Medicine → Use body/health analogies\n- Nature → Use animals/plants analogies  \n- Technology → Use toys/games analogies\n- Science → Use magic/wonder analogies\n\nFORMATTING:\n- Use plain text (no ** or ### or markdown)\n- Use line breaks for paragraphs\n- Use emojis for visual interest\n\nQuestion to explain: {{ $json.query }}\n\nCreate a memorable, kid-friendly explanation! ✨\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          builtInTools: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [1696, 304], name: '5-Year-Old Story Mode' } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.query }}',
      options: {
        systemMessage: '=You are explaining concepts to teenagers (ages 13-17) in a relatable, engaging way.\n\nYOUR MISSION: Make ANY topic relevant to teen life and interests!\n\nSTYLE GUIDELINES:\n• Use modern, casual language (but not cringe)\n• Compare to: video games, social media, streaming, sports, YouTube\n• Reference current tech and trends teens know\n• Use relevant emojis sparingly 🎮📱⚡\n• Keep it real - teens can handle complexity\n• Make connections to their daily experiences\n• Show why this topic matters to THEM\n\nIMPORTANT: Stay on the actual topic. If they ask about:\n- Science → Connect to phones, games, or daily tech\n- History → Connect to movies, shows, or current events\n- Health → Connect to sports, fitness, or mental health\n- Business → Connect to social media, creators, or money\n\nFORMATTING:\n- Use plain text (no markdown)\n- Use line breaks for clarity\n- Use emojis sparingly 🎮📱\n\nQuestion to explain: {{ $json.query }}\n\nBe authentic and relatable - avoid being "teachy"!\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          builtInTools: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [1696, 512], name: 'Teenager Level' } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.query }}',
      options: {
        systemMessage: '=You are explaining concepts to college graduates with solid educational backgrounds.\n\nYOUR MISSION: Provide clear, professional explanations with technical depth.\n\nSTYLE GUIDELINES:\n• Use proper terminology and academic language\n• Include real-world applications and examples\n• Reference relevant frameworks, theories, or principles\n• Provide concrete data or evidence where applicable\n• Balance technical accuracy with accessibility\n• Assume strong general knowledge but not deep expertise\n• Connect to practical implications\n\nCOVERAGE:\n• Define key terms precisely\n• Explain mechanisms or processes\n• Discuss current applications\n• Mention related concepts or fields\n• Provide enough depth for understanding\n\nFORMATTING:\n- Use plain text (no markdown)\n- Use line breaks for sections\n- Be professional and clear\n\nQuestion to explain: {{ $json.query }}\n\nBe informative, accurate, and professionally thorough.\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          builtInTools: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [1696, 720], name: 'Graduate Level' } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.query }}',
      options: {
        systemMessage: '=You are explaining concepts to PhD-level researchers and domain experts.\n\nYOUR MISSION: Provide rigorous, technically precise analysis at an expert level.\n\nSTYLE GUIDELINES:\n• Use precise technical terminology without simplification\n• Reference current research, methodologies, and literature\n• Discuss theoretical frameworks and foundations\n• Explore edge cases, limitations, and open questions\n• Include mathematical formulations where relevant\n• Assume deep domain expertise\n• Address controversies or competing theories\n\nCOVERAGE:\n• Formal definitions and mathematical representations\n• Current state of research and recent developments\n• Methodological considerations\n• Theoretical implications\n• Research gaps and future directions\n• Critical analysis of approaches\n\nFORMATTING:\n- Use plain text (no markdown)\n- Use line breaks for structure\n- Be rigorous and detailed\n\nQuestion to explain: {{ $json.query }}\n\nProvide expert-level academic rigor and depth.\n'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          builtInTools: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [1712, 928], name: 'PhD Research Level' } }), node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $(\'Extract Query Data\').item.json.userQuery }}',
      options: {
        systemMessage: '=You are explaining concepts to business executives and senior leaders.\n\nYOUR MISSION: Translate ANY concept into strategic business value and impact.\n\nSTYLE GUIDELINES:\n• Focus on practical business applications and ROI\n• Use business terminology (metrics, KPIs, strategy)\n• Include real-world case studies or examples\n• Discuss implementation challenges and solutions\n• Address risks, opportunities, and competitive advantage\n• Be concise - executives value efficiency\n• Connect to bottom-line impact\n\nCOVERAGE:\n• Business applications and use cases\n• Market implications and trends\n• Implementation considerations (cost, timeline, resources)\n• ROI and value proposition\n• Strategic advantages or risks\n• Competitive landscape\n• Decision-making framework\n\nFORMATTING:\n- Use plain text (no markdown)\n- Use line breaks for key points\n- Be concise and actionable\n\nQuestion to explain: {{ $json.query }}\n\nBe strategic, actionable, and focused on business outcomes.'
      },
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
          options: {},
          builtInTools: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [1728, 1136], name: 'Business Executive Level' } })], { version: 3.4, parameters: {
      rules: {
        values: [
          {
            outputKey: '0',
            conditions: {
              options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'b53dfd46-4b76-43f5-8958-f5e83639f5eb',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.level }}',
                  rightValue: '5-year-old'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: '1',
            conditions: {
              options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '676acc92-0fb6-43fb-86d0-d9f114a966a3',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.level }}',
                  rightValue: 'teenager'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: '2',
            conditions: {
              options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '87121421-66e1-4792-84eb-779da0ac01d6',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.level }}',
                  rightValue: 'graduate'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: '3',
            conditions: {
              options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '6ca49aab-a4d0-49f6-a9e4-8eec1b031713',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.level }}',
                  rightValue: 'phd'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: '4',
            conditions: {
              options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '9874f1a3-459a-4fe2-9ff5-c9fb4058ef27',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.level }}',
                  rightValue: 'business'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "5-year-old"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'5-year-old - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "5-year-old",\n    emoji: "🧒",\n    title: "For a 5 Year Old",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 336], name: '5-Year-Old' } }))
  .then(merge([node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "5-year-old"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'5-year-old - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "5-year-old",\n    emoji: "🧒",\n    title: "For a 5 Year Old",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 336], name: '5-Year-Old' } }), node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "teenager"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'teenager - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "teenager",\n    emoji: "🎮",\n    title: "For a Teenager",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 544], name: 'Teenager' } })], { version: 2.1, name: 'Child + Teen' }))
  .then(merge([node({ type: 'n8n-nodes-base.merge', version: 2.1, config: { position: [2368, 528], name: 'Child + Teen' } }), node({ type: 'n8n-nodes-base.merge', version: 2.1, config: { position: [2368, 880], name: 'Grad + PhD' } })], { version: 2.1, name: 'First 4 Levels' }))
  .then(merge([node({ type: 'n8n-nodes-base.merge', version: 2.1, config: { position: [2624, 704], name: 'First 4 Levels' } }), node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "business"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'business - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "business",\n    emoji: "💼",\n    title: "Real-time Business Case",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 1168], name: 'Business' } })], { version: 2.1, name: 'All 5 Levels' }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Aggregate - Simple Version (No Token Tracking)\nconst items = $input.all();\n\nconsole.log(\'=== AGGREGATE ===\');\nconsole.log(\'Total items received:\', items.length);\n\nconst allItems = items.filter(item => item.json).map(item => item.json);\n\nif (allItems.length !== 5) {\n  throw new Error(`Expected 5 items, got ${allItems.length}`);\n}\n\n// Sort in correct order\nconst order = ["5-year-old", "teenager", "graduate", "phd", "business"];\nconst sortedItems = allItems.sort((a, b) => \n  order.indexOf(a.level) - order.indexOf(b.level)\n);\n\nconsole.log(\'Sorted items:\', sortedItems.map(i => i.level));\n\nreturn [{\n  json: {\n    responses: sortedItems,\n    chatId: sortedItems[0].chatId,\n    query: sortedItems[0].query,\n    timestamp: sortedItems[0].timestamp\n  }\n}];'
    }, position: [3008, 896], name: 'Aggregate & Structure All Responses' } }))
  .add(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Format for Telegram - NO TRUNCATION (Let Telegram handle it)\nconst input = $input.first().json;\n\nconst responses = input.responses;\nconst query = input.query;\nconst chatId = input.chatId;\nconst timestamp = input.timestamp;\n\n// Telegram\'s ACTUAL limit is 4096, but we\'ll be safer\nconst MAX_MESSAGE_LENGTH = 4000;\n\n// Clean markdown for Telegram HTML\nfunction cleanMarkdown(text) {\n  if (!text) return \'\';\n  \n  // Remove markdown formatting that Telegram HTML doesn\'t support\n  text = text.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, \'<b>$1</b>\'); // ***bold italic*** → bold\n  text = text.replace(/\\*\\*(.+?)\\*\\*/g, \'<b>$1</b>\');     // **bold** → <b>bold</b>\n  text = text.replace(/\\*(.+?)\\*/g, \'<i>$1</i>\');         // *italic* → <i>italic</i>\n  text = text.replace(/###\\s+(.+?)$/gm, \'<b>$1</b>\');     // ### Header → <b>Header</b>\n  text = text.replace(/##\\s+(.+?)$/gm, \'<b>$1</b>\');      // ## Header → <b>Header</b>\n  text = text.replace(/#\\s+(.+?)$/gm, \'<b>$1</b>\');       // # Header → <b>Header</b>\n  text = text.replace(/\\n-\\s+/g, \'\\n• \');                 // - item → • item\n  \n  return text;\n}\n\n// Escape HTML special characters\nfunction escapeHtml(text) {\n  if (!text) return \'\';\n  return text.toString()\n    .replace(/&/g, \'&amp;\')\n    .replace(/</g, \'&lt;\')\n    .replace(/>/g, \'&gt;\');\n}\n\n// Smart truncate - cut at last complete sentence\nfunction smartTruncate(text, maxLength) {\n  if (!text || text.length <= maxLength) return text;\n  \n  // Try to cut at last period before limit\n  const cutPoint = text.lastIndexOf(\'.\', maxLength);\n  if (cutPoint > maxLength - 200) { // Only if reasonably close\n    return text.substring(0, cutPoint + 1) + \'\\n\\n(Message truncated due to length)\';\n  }\n  \n  // Otherwise cut at last space\n  const spacePoint = text.lastIndexOf(\' \', maxLength);\n  return text.substring(0, spacePoint) + \'...\\n\\n(Truncated)\';\n}\n\nconst escapedQuery = escapeHtml(query);\n\n// Create header message\nconst headerText = `📊 <b>Knowledge Ladder Results</b>\\n\\n` +\n  `❓ <b>Question:</b> ${escapedQuery}\\n` +\n  `📅 <b>Date:</b> ${new Date(timestamp).toLocaleString()}\\n\\n` +\n  `━━━━━━━━━━━━━━━━━━━━━━━━━\\n` +\n  `Sending 5 responses...`;\n\nconst outputs = [];\n\n// Header\noutputs.push({\n  json: {\n    chatId: chatId,\n    text: headerText,\n    messageNumber: 1\n  }\n});\n\n// 5 Responses with markdown cleaning\nresponses.forEach((r, index) => {\n  const title = r.title || \'Unknown\';\n  const emoji = r.emoji || \'❓\';\n  let content = r.content || \'No content\';\n  \n  // Clean markdown FIRST\n  content = cleanMarkdown(content);\n  \n  // Then smart truncate if needed\n  const availableLength = MAX_MESSAGE_LENGTH - (title.length + emoji.length + 20);\n  content = smartTruncate(content, availableLength);\n  \n  // Escape HTML (AFTER markdown cleaning)\n  const escapedContent = escapeHtml(content);\n  const escapedTitle = escapeHtml(title);\n  \n  const messageText = `${emoji} <b>${escapedTitle}</b>\\n\\n${escapedContent}`;\n  \n  console.log(`Message ${index + 2}: ${messageText.length} chars`);\n  \n  outputs.push({\n    json: {\n      chatId: chatId,\n      text: messageText,\n      messageNumber: index + 2\n    }\n  });\n});\n\nconsole.log(`✅ Created ${outputs.length} messages`);\n\nreturn outputs;'
    }, position: [3248, 656], name: 'Format 6 Messages for Telegram' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.1, config: { parameters: {
      text: '={{ $json.text }}',
      chatId: '={{ $json.chatId }}',
      additionalFields: { parse_mode: 'HTML', appendAttribution: false }
    }, position: [3472, 656], name: 'Send to User via Telegram' } }))
  .add(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Format for Google Docs - Clean Text Format\nconst input = $input.first().json;\n\nconst responses = input.responses;\nconst query = input.query;\nconst timestamp = input.timestamp;\n\n// Create clean formatted text for Google Docs\nconst dateStr = new Date(timestamp).toLocaleString();\n\nlet docsContent = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n`;\ndocsContent += `📊 AI KNOWLEDGE LADDER RESULTS\\n`;\ndocsContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n`;\ndocsContent += `❓ Question: ${query}\\n`;\ndocsContent += `📅 Date: ${dateStr}\\n\\n`;\ndocsContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n`;\n\n// Add each response with clean formatting\nresponses.forEach((r, index) => {\n  const emoji = r.emoji || \'❓\';\n  const title = r.title || \'Unknown\';\n  const content = r.content || \'No content\';\n  \n  docsContent += `${emoji} ${title.toUpperCase()}\\n`;\n  docsContent += `${\'─\'.repeat(50)}\\n\\n`;\n  docsContent += `${content}\\n\\n`;\n  \n  if (index < responses.length - 1) {\n    docsContent += `\\n`;\n  }\n});\n\ndocsContent += `\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n`;\ndocsContent += `End of Response\\n`;\ndocsContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\\n\\n`;\n\nreturn [{\n  json: {\n    docsContent: docsContent\n  }\n}];'
    }, position: [3280, 1088], name: 'Format Plain Text for Docs' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      actionsUi: {
        actionFields: [{ text: '={{ $json.docsContent }}', action: 'insert' }]
      },
      operation: 'update',
      documentURL: 'REPLACE_WITH_YOUR_GOOGLE_DOC_URL'
    }, position: [3488, 1088], name: 'Archive to Google Docs' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "graduate"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'graduate - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "graduate",\n    emoji: "🎓",\n    title: "For a Graduate",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 752], name: 'Graduate' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Error Handler - Simple Content Extraction\nconst responseItem = $input.first().json;\n\n// Get original data\nconst originalItem = $("Route to Appropriate Level").all().find(item => \n  item.json.level === "phd"\n);\n\nconst chatId = originalItem?.json.chatId || "unknown";\nconst query = originalItem?.json.query || "unknown";\nconst timestamp = originalItem?.json.timestamp || new Date().toISOString();\n\n// Extract content\nconst content = responseItem.output || \n                responseItem.text || \n                responseItem.message?.content || \n                "No response generated";\n\nconsole.log(\'phd - Content extracted, length:\', content.length);\n\nreturn [{\n  json: {\n    level: "phd",\n    emoji: "🔬",\n    title: "For a Ph.D Holder",\n    content: content,\n    chatId: chatId,\n    query: query,\n    timestamp: timestamp\n  }\n}];'
    }, position: [2048, 960], name: 'PhD' } }))
  .add(sticky('## Input Layer\n\n**1. Telegram receives your question**\n**2. Extracts your chat ID and question**\n**3. Creates 5 copies (one per level)**\n\n\n\n\n\n', { name: 'Sticky Note', color: 7, position: [784, 560], width: 576, height: 448 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note2', color: 5, position: [1616, 272], width: 640, height: 208 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note3', color: 7, position: [2288, 496], height: 240 }))
  .add(sticky('## Telegram Output\n\n**Sends you 6 messages:**\n\n**1. Header (your question + date)**\n**2-6. Five explanations**\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note5', color: 7, position: [3200, 416], width: 480, height: 416 }))
  .add(sticky('## Google Doc Output  (for reference)\n\n**Sends you the final output with 5 variations:**\n\n\n', { name: 'Sticky Note6', color: 7, position: [3200, 912], width: 480, height: 416 }))
  .add(sticky('\n\n# 🚀 Try It Out\n\nSend a message to your Telegram bot with any question (e.g., "What is machine learning?"). Within seconds, you\'ll receive 6 messages: a header plus 5 AI-generated explanations tailored for different audiences.\n\n\n# 📖 Overview\n\nThe AI Knowledge Spectrum transforms complex topics into 5 comprehension levels: child-friendly stories (5-year-old), relatable teen explanations, college graduate depth, PhD-level analysis, and business-focused insights. Perfect for educators, content creators, and anyone making knowledge accessible.\n\n\n# ⚙️ How It Works\n\n1. Input: Telegram receives question → Extract chatId, query, timestamp\n2. Route: Create 5 items → Switch routes each to AI agent\n3. Process: 5 AI agents run in parallel (5YO, teen, grad, PhD, business)\n4. Handle: Error handlers ensure all responses complete\n5. Merge: Binary tree (4 merges) → Combines all 5 reliably\n6. Aggregate: Sort by level → Structure output\n7. Format: Create 6 messages (header + 5 levels) with HTML\n8. Send: Deliver to Telegram chat\n9. Archive: Append to Google Docs\n\n\n# 🔧 Setup Requirements\n\n\n1. Add Telegram bot token\n2. Add OpenAI API key  \n3. Connect Google account\n4. Create Google doc\n5. Configure Workflow \n6. Activate & Test\n\n   \n\n\n# ❓ Need Help?\n\nFor detailed notes and implementation, please leverage the README document at \nhttps://drive.google.com/file/d/19Fx-FoihL70qpOi4CnEwQ6Sud2dbUnE_/view?usp=sharing\n\nJoin the n8n community forum (https://community.n8n.io/) for support\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n**Creates 5 parallel paths.**', { name: 'Sticky Note7', position: [80, 112], width: 672, height: 1200 }))
  .add(sticky('## Routing\n\n**Routes items to AI agents by understanding level.**\n\n\n\n\n\n\n', { name: 'Sticky Note1', color: 7, position: [1376, 544], width: 208, height: 464 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note8', color: 5, position: [1616, 496], width: 640, height: 192 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note9', color: 5, position: [1616, 704], width: 640, height: 192 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note10', color: 5, position: [1616, 912], width: 640, height: 176 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note11', color: 5, position: [1616, 1120], width: 640, height: 192 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note12', color: 7, position: [2288, 816], height: 256 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note13', color: 7, position: [2560, 640], width: 208, height: 240 }))
  .add(sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note14', color: 7, position: [2768, 864], width: 160, height: 224 }))
  .add(sticky('## Collection of responses  & Formatting\n\n\n**Combines all five responses into a single result**\n\n**Organizes the data & formats it for final output**', { name: 'Sticky Note15', color: 5, position: [2960, 544], width: 224, height: 560 }))
  .add(sticky('\n## Merge Strategy\n\n**Combines responses 2 at a time:**\n**1+2 → 3+4 → Combine → Add 5th**\n\n**Why not merge all 5 at once?**\n**More reliable. Never loses responses.**\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', { name: 'Sticky Note4', color: 7, position: [2272, 272], width: 672, height: 1040 }))
  .add(sticky('\n## AI Processing & Error Handling', { name: 'Sticky Note16', color: 5, position: [1728, 176], width: 368, height: 80 }))