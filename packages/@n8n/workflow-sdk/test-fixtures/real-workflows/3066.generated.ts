return workflow('CfdF2XtXC68iJ6Hr', '✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: { buttonLabel: 'Automatically Generate Social Media Content' },
      formTitle: 'workflows.diy',
      formFields: {
        values: [
          {
            fieldLabel: 'Topic',
            placeholder: 'Provide a concise and clear title or main topic for your post (e.g., "New Product Launch," "Exciting Company Update"). This helps the AI accurately capture the focus of your content.',
            requiredField: true
          },
          {
            fieldLabel: 'Keywords or Hashtags (optional)',
            placeholder: 'Include any specific keywords or hashtags you\'d like the AI to incorporate into the post. This ensures the content aligns with your branding and campaign objectives.',
            requiredField: '={{ false }}'
          },
          {
            fieldLabel: 'Link (optional)',
            placeholder: '=Provide the URL of any product, service, form, support page, or other resource. This link will be included in the generated post to direct your audience to the relevant content.\n'
          }
        ]
      },
      responseMode: 'lastNode',
      formDescription: '=Welcome to the workflows.diy AI-Powered Assistant!\n\nThis tool is designed to streamline and enhance your social media content creation process.\n\nSimply provide key inputs like a topic or title and an optional image, and our intelligent agent will generate engaging, platform-specific post descriptions tailored to your audience. \n\nWhether you\'re a marketer, business owner, or influencer, this assistant saves you time while delivering professional-quality content optimized for maximum impact.\n\n'
    }, position: [-180, -740], name: 'Submit Social Post Details' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=You are a **content creation AI** for workflows.diy, a leading creator of **n8n workflow automation solutions and AI Agentic workflows**.\n\nYour goal is to craft **engaging, platform-specific content** for LinkedIn, Instagram, Facebook, Twitter (X), TikTok, Threads, and YouTube Shorts. Each post must align with the platform’s audience preferences, tone, and style while reflecting workflows.diy\'s expertise. The content should provide **value-driven insights**, tutorials, reviews, and discussions that resonate with tech professionals, automation enthusiasts, businesses, and n8n users.\n\n### Key Objectives:\n1. **Platform Optimization**: Tailor content format, tone, and hashtags to suit each platform’s algorithm and audience engagement patterns.\n2. **SEO & Hashtags**: Use a mix of general automation hashtags and trending platform-specific hashtags to maximize reach.\n3. **Engagement Focus**: Create content that sparks interaction through tutorials, comparisons, reviews, or thought-provoking discussions.\n4. **Consistency**: Maintain a professional yet approachable tone across all platforms while adapting to audience needs.\n5. **Data-Driven Strategy**: Analyze trends and performance data to refine content strategy and hashtag usage.\n\n### General Hashtags:\n#workflowsdiy #n8n #automation #AIWorkflows #WorkflowAutomation #TechSolutions\n\n---\n\n### Platform-Specific Guidelines:\n\n#### 1. LinkedIn\n   - **Style**: Professional and insightful.\n   - **Tone**: Business-oriented; focus on automation use cases, industry insights, and community impact.\n   - **Content Length**: 3-4 sentences; concise but detailed.\n   - **Hashtags**: #Innovation #Automation #WorkflowSolutions #DigitalTransformation #Leadership\n   - **Call to Action (CTA)**: Encourage comments or visits to workflows.diy’s website for more insights.\n\n#### 2. Instagram\n   - **Style**: Visual storytelling with creative captions.\n   - **Tone**: Inspirational and engaging; use emojis for relatability.\n   - **Content Length**: 2-3 sentences paired with eye-catching visuals (e.g., infographics or workflow demos).\n   - **Visuals**: Showcase milestones (e.g., new workflow launches), tutorials, or product highlights.\n   - **CTA**: Use phrases like "Swipe to learn more," "Tag your team," or "Check out the link below!"\n   - **Link Placement**: Add the provided link before hashtags; if no link is provided, use "Visit our website: https://workflows.diy."\n   - **Hashtags**: #AutomationLife #TechInnovation #WorkflowTips #Programming #Engineering\n\n#### 3. Facebook\n   - **Style**: Friendly and community-focused.\n   - **Tone**: Relatable; highlight user success stories or company achievements in automation.\n   - **Content Length**: 2-3 sentences; conversational yet professional.\n   - **Hashtags**: #SmallBusinessAutomation #Entrepreneurship #Leadership #WorkflowInnovation\n   - **CTA**: Encourage likes, shares, comments (e.g., “What’s your favorite automation tip?”).\n\n#### 4. Twitter (X)\n   - **Style**: Concise and impactful.\n   - **Tone**: Crisp and engaging; spark curiosity in 150 characters or less.\n   - **Hashtags**: #WorkflowTrends #AIWorkflows #AutomationTips #NoCodeSolutions\n   - **CTA**: Drive quick engagement through retweets or replies (e.g., “What’s your go-to n8n workflow?”).\n\n#### 5. TikTok\n   - **Style**: Short-form video content with trending audio or effects.\n   - **Tone**: Fun yet informative; focus on quick workflow demos or automation tips.\n   - **Content Length**: 15-60 seconds with captions summarizing the key message.\n   - **Hashtags**: Use trending tech-related hashtags relevant to TikTok’s audience (e.g., #n8nTips).\n   - **CTA**: Encourage viewers to follow workflows.diy for more automation hacks.\n\n#### 6. Threads\n   - **Style**: Conversational and community-driven posts.\n   - **Tone**: Casual yet informative; encourage discussions around automation trends or innovations.\n   - **Content Length**: 1-2 short paragraphs with a question or thought-provoking statement at the end.\n   - **Hashtags**: Similar to Instagram but tailored for trending Threads topics related to automation.\n\n#### 7. YouTube Shorts\n   - **Style**: Short-form video content showcasing quick workflow tutorials or use cases.\n   - **Tone**: Authoritative yet approachable; establish workflows.diy as a leader in n8n automation solutions.\n   - Content Length:\n     - Tutorials/Reviews (long-form): 5-10 minutes\n     - Shorts/Highlights (short-form): Under 1 minute\n   - CTA:** Encourage subscriptions**, likes, comments (e.g., “Subscribe for more workflow tips!”).\n\n---\n\n### Content Creation Workflow:\nFor every post:\n1. Use the following input fields:\n    - Topic/About the Post: {{ $json.Topic }}\n    - Keywords/Focus Areas: {{ $json.formMode }}\n    - Link (optional): {{ $json[\'Link (optional)\'] }}\n2. Adapt the tone/style based on the platform guidelines above.\n\nEnsure every post reflects workflows.diy\'s mission of delivering high-quality automation insights while maximizing engagement across platforms.\n\nFollow the provided JSON schema for your reponse.\n',
      options: {
        systemMessage: '=Use the provided tools to research the topic based on latest information.  Todays date is {{ $now }}'
      },
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolSerpApi', version: 1, config: { parameters: { options: {} }, credentials: {
          serpApi: { id: 'credential-id', name: 'serpApi Credential' }
        }, name: 'SerpAPI' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: { responseFormat: 'text' }
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'gpt-4o LLM' } }), outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.2, config: { parameters: {
          schemaType: 'manual',
          inputSchema: '{\n	"type": "object",\n	"properties": {\n		"name": {\n			"type": "string"\n		},\n		"description": {\n			"type": "string"\n		},\n		"platform_posts": {\n			"type": "object",\n			"properties": {\n				"LinkedIn": {\n					"type": "object",\n					"properties": {\n                        "image_suggestion": {\n                  			"type": "string"\n                  		},\n						"post": {\n							"type": "string"\n						},\n						"hashtags": {\n							"type": "array",\n							"items": {\n								"type": "string"\n							}\n						},\n						"call_to_action": {\n							"type": "string"\n						}\n					}\n				},\n				"Instagram": {\n					"type": "object",\n					"properties": {\n						"image_suggestion": {\n							"type": "string"\n						},\n						"caption": {\n							"type": "string"\n						},\n						"hashtags": {\n							"type": "array",\n							"items": {\n								"type": "string"\n							}\n						},\n						"emojis": {\n							"type": "array",\n							"items": {\n								"type": "string"\n							}\n						},\n						"call_to_action": {\n							"type": "string"\n						}\n					}\n				},\n				"Facebook": {\n					"type": "object",\n					"properties": {\n						"post": {\n							"type": "string"\n						},\n						"hashtags": {\n							"type": "array",\n							"items": {\n								"type": "string"\n							}\n						},\n						"call_to_action": {\n							"type": "string"\n						},\n						"image_suggestion": {\n							"type": "string"\n						}\n					}\n				},\n				"X-Twitter": {\n					"type": "object",\n					"properties": {\n                        "video_suggestion": {\n                			"type": "string"\n                		},\n                        "image_suggestion": {\n							"type": "string"\n						},\n						"post": {\n							"type": "string"\n						},\n						"hashtags": {\n							"type": "array",\n							"items": {\n								"type": "string"\n							}\n						},\n						"character_limit": {\n							"type": "integer"\n						}\n					}\n				},\n                "TikTok": {\n                	"type": "object",\n                	"properties": {\n                		"video_suggestion": {\n                			"type": "string"\n                		},\n                		"caption": {\n                			"type": "string"\n                		},\n                		"hashtags": {\n                			"type": "array",\n                			"items": {\n                				"type": "string"\n                			}\n                		},\n                		"call_to_action": {\n                			"type": "string"\n                		}\n                	}\n                },\n                "Threads": {\n                	"type": "object",\n                	"properties": {\n                       "image_suggestion": {\n							"type": "string"\n						},\n                		"text_post": {\n                			"type": "string"\n                		},\n                		"hashtags": {\n                			"type": "array",\n                			"items": {\n                				"type": "string"\n                			}\n                		},\n                		"call_to_action": {\n                			"type": "string"\n                		}\n                	}\n                },\n                "YouTube_Shorts": {\n                  	"type": "object",\n                  	"properties": {\n                  		"video_suggestion": {\n                  			"type": "string"\n                  		},\n                  		"title": {\n                  			"type": "string"\n                  		},\n                          "description": {\n                              "type": "string"\n                          },\n                          "hashtags": {\n                              "type": "array",\n                              "items": {\n                                  "type": "string"\n                              }\n                          },\n                          "call_to_action": {\n                              "type": "string"\n                          }\n                      }\n                  }\n			}\n		},\n		"additional_notes": {\n			"type": "string"\n		}\n	}\n}\n'
        }, name: 'Social Media Content' } }) }, position: [300, -740], name: 'Social Media Content Factory' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Generate clean, modern HTML email content from the provided JSON data with these requirements:\n- Use table-based layout with inline CSS for email compatibility\n- Create card sections for each platform containing:\n  • Title header (20px) \n  • Post content (16px) \n  • Video/image suggestions (italic 14px)\n  • Hashtag list (inline-block with # prefix)\n  • Emoji preservation where present\n  • Call-to-action (bold 14px)\n- Structure using:\n  • 600px max-width container\n  • 20px padding between cards\n  • Left-aligned text hierarchy\n  • Arial/sans-serif font stack\n  • Email-safe colors (#333 text, #555 secondary)\n- Include all platform-specific elements:\n  ▶ Video/image suggestions in italic\n  ▶ Hashtags as linked search terms\n  ▶ Emojis in original positions\n  ▶ Character limits for Twitter\n  ▶ Platform-specific CTAs\n  ▶ Visual quality reminders\n- Format hashtags as:\n  <span style="display: inline-block; background: #f0f0f0; padding: 2px 6px; margin: 2px; border-radius: 4px;">#tag</span>\n\nInput data: {{ $json.output.toJsonString() }}\n\nRemove ALL code blocks and comments. Output ONLY the raw HTML with:\n- Platform cards in JSON order\n- All data elements represented\n- Mobile-responsive tables\n- W3C-valid markup\n\n## Example HTML:\n<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbfcfe;border:1px solid #dbdfe7;border-radius:8px">\n		<tbody><tr>\n			<td align="center" style="padding:24px 0">\n				<table width="448" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:448px;background-color:#ffffff;border:1px solid #dbdfe7;border-radius:8px;padding:24px">\n					<tbody><tr>\n						<td style="text-align:center;padding-top:8px;font-family:Arial,sans-serif;font-size:14px;color:#7e8186">\n							<p style="white-space:pre-line"></p><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:Arial,sans-serif;color:#333"><tbody><tr><td style="padding:20px"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">LinkedIn</td></tr><tr><td style="font-size:16px;padding-bottom:10px">Discover why n8n stands out as the premier workflow automation tool. Its flexibility and open-source nature empower businesses to create custom solutions that drive efficiency and innovation.</td></tr><tr><td style="font-size:14px;font-style:italic;padding-bottom:10px">Video/Image suggestion pending</td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#Innovation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#Automation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>WorkflowSolutions</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>DigitalTransformation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>Leadership</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#WorkflowAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px"><wbr>#TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">Visit workflows.diy to explore how n8n can transform your business processes!</td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">Instagram</td></tr><tr><td style="font-size:14px;font-style:italic;padding-bottom:10px">Eye-catching infographic comparing n8n to other automation tools, highlighting its unique features.</td></tr><tr><td style="font-size:16px;padding-bottom:10px">n8n: The ultimate workflow automation tool! <img data-emoji="💡" class="an1" alt="💡" aria-label="💡" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f4a1/32.png" loading="lazy"> Unlock limitless possibilities with its open-source platform. Boost your productivity and streamline your processes. <img data-emoji="💤" class="an1" alt="💤" aria-label="💤" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f4a4/32.png" loading="lazy"></td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#AutomationLife</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#TechInnovation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px"><wbr>#WorkflowTips</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#Programming</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>Engineering</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#WorkflowAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px"><wbr>#TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">Visit our website: <a href="https://n8n.io/" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://n8n.io/&amp;source=gmail&amp;ust=1741030878129000&amp;usg=AOvVaw1Nr6ek3eGwe94zlbPaJrzT">https://n8n.io/</a> #AutomationLife #TechInnovation #WorkflowTips #Programming #Engineering</td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">Facebook</td></tr><tr><td style="font-size:16px;padding-bottom:10px">See why businesses are choosing n8n for their workflow automation needs. From its user-friendly interface to its powerful customization options, n8n is revolutionizing how companies approach automation.</td></tr><tr><td style="font-size:14px;font-style:italic;padding-bottom:10px">A visually appealing graphic showcasing n8n\'s key features and benefits.</td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#SmallBusinessAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>Entrepreneurship</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#Leadership</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>WorkflowInnovation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>WorkflowAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">What\'s your favorite automation tip? Share in the comments!</td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">Twitter</td></tr><tr><td style="font-size:16px;padding-bottom:10px">n8n: The best #WorkflowAutomation tool! Open-source, customizable, and powerful. Transform your business processes today!</td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#WorkflowTrends</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>AutomationTips</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#NoCodeSolutions</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px"><wbr>#workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>TechSolutions</span></td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">TikTok</td></tr><tr><td style="font-size:14px;font-style:italic;padding-bottom:10px">Quick demo showcasing how n8n simplifies complex workflows with its intuitive interface.</td></tr><tr><td style="font-size:16px;padding-bottom:10px">n8n: Your go-to for effortless workflow automation! <img data-emoji="✨" class="an1" alt="✨" aria-label="✨" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/2728/32.png" loading="lazy"></td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8nTips</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#WorkflowAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px"><wbr>#TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">Follow workflows.diy for more automation hacks!</td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">Threads</td></tr><tr><td style="font-size:16px;padding-bottom:10px">n8n is transforming the automation landscape. Its open-source nature and extensive integrations make it a top choice for businesses of all sizes. What are your thoughts on the future of workflow automation?</td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>WorkflowAutomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">Share your insights below!</td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;margin-bottom:20px;padding:20px;border-radius:8px"><tbody><tr><td style="font-size:20px;font-weight:bold;padding-bottom:10px">YouTube Shorts</td></tr><tr><td style="font-size:14px;font-style:italic;padding-bottom:10px">Short tutorial demonstrating how to build a simple automation workflow in n8n.</td></tr><tr><td style="font-size:16px;padding-bottom:10px">Learn why n8n is the top choice for workflow automation. Its open-source platform and powerful features make it a game-changer for businesses.</td></tr><tr><td style="padding-bottom:10px"><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#n8n</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#automation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>workflowautomation</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#nocode</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>workflowsdiy</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#AIWorkflows</span><span style="display:inline-block;background:#f0f0f0;padding:2px 6px;margin:2px;border-radius:4px">#<wbr>TechSolutions</span></td></tr><tr><td style="font-size:14px;font-weight:bold">Subscribe for more workflow tips!</td></tr></tbody></table></td></tr></tbody></table><p></p>\n						</td>\n					</tr>\n				</tbody>\n</table>\n',
      agent: 'conversationalAgent',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-mini',
            cachedResultName: 'gpt-4o-mini'
          },
          options: { responseFormat: 'text' }
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'gpt-4o-mini' } }) }, position: [1440, -740], name: 'Prepare Content Review Email' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '={{ $env.EMAIL_ADDRESS_JOE }} ',
      message: '={{ $json.output }}',
      options: {
        limitWaitTime: { values: { resumeUnit: 'minutes', resumeAmount: 45 } }
      },
      subject: '=🔥FOR APPROVAL🔥{{ $(\'Social Media Content Factory\').item.json.output.name }} - {{ $(\'Social Media Content Factory\').item.json.output.description }}',
      operation: 'sendAndWait',
      approvalOptions: { values: { approvalType: 'double' } }
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [2000, -540], name: 'Gmail User for Approval' } }))
  .then(ifBranch([node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      prompt: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Instagram.caption }}',
      options: {},
      resource: 'image'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [40, -20], name: 'OpenAI' } }), null], { version: 2.2, parameters: {
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
            id: 'e32d270f-f258-4522-94e1-2cb7ee4e8d2a',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            leftValue: '={{ $json.data.approved }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Is Content Approved?' }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.imgbb.com/1/upload',
      method: 'POST',
      options: { redirect: { redirect: {} } },
      sendBody: true,
      sendQuery: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          {
            name: 'image',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          }
        ]
      },
      queryParameters: {
        parameters: [
          { name: 'expiration', value: '0' },
          { name: 'key', value: '={{ $env.IMGBB_API_KEY}} ' }
        ]
      }
    }, position: [360, -140], name: 'Save Image to imgbb.com3' } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3, config: { parameters: {
      mode: 'combine',
      options: { includeUnpaired: true },
      combineBy: 'combineByPosition'
    }, position: [700, 20] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'f150aa79-2d20-4869-b60a-350d49a215a5',
            name: 'data',
            type: 'object',
            value: '={\n  "approved": true\n}'
          }
        ]
      }
    }, position: [980, 20], name: 'Set Default True 2' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.twitter', version: 2, config: { parameters: {
      text: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts[\'X-Twitter\'].post }}',
      additionalFields: {}
    }, credentials: {
      twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' }
    }, position: [1700, 380], name: 'X Post' } }), null], { version: 2.2, parameters: {
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
            id: 'efe337a1-63e0-4513-873d-421bf41e4868',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            leftValue: '={{ $json.data.approved }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Is Approved?' }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5c6edc76-1e3b-45b0-8baa-33a14c678150',
            name: 'X Post Result',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [2040, 380], name: 'X Result' } }))
  .then(merge([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5c6edc76-1e3b-45b0-8baa-33a14c678150',
            name: 'Instagram Post Result',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [2040, 160], name: 'Instagram Result' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5c6edc76-1e3b-45b0-8baa-33a14c678150',
            name: 'X Post Result',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [2040, 380], name: 'X Result' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5c6edc76-1e3b-45b0-8baa-33a14c678150',
            name: 'Facebook Post Result',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [2040, 600], name: 'Facebook Result' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '5c6edc76-1e3b-45b0-8baa-33a14c678150',
            name: 'LinkedIn Post Result',
            type: 'string',
            value: '={{ $json }}'
          }
        ]
      }
    }, position: [2040, 780], name: 'LinkedIn Result' } })], { version: 3, parameters: { numberInputs: 4 }, name: 'Merge Results' }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: { options: {}, aggregate: 'aggregateAllItemData' }, position: [-240, 520] } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Parse the social media post results and generate a modern single line HTML table showing platform statuses. For each entry:\n\n-Extract platform name from the JSON key\n-Identify status (Success/Error) based on statusCode or error presence\n-Capture error message if present\n-Format as responsive HTML table with professional styling\n-Ensure email client compatibility with inline CSS\n-Include error handling for invalid JSON formats\n-Remove all line breaks and \\n from response.\n-Avoid any preamble or further explanation and remove all ``` and ```html from response.\n\n## Implementation Example:\nThis solution uses the parsed results from your workflow to generate:\n<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin: 20px 0; background-color: #f9f9f9; border: 1px solid #ddd;">\n    <thead>\n        <tr style="background-color: #007bff; color: #fff;">\n            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Platform</th>\n            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Status</th>\n            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Details</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr style="background-color: #ffffff;">\n            <td style="border: 1px solid #ddd; padding: 12px;">Instagram</td>\n            <td style="border: 1px solid #ddd; padding: 12px; color: #dc3545;">✗ Error</td>\n            <td style="border: 1px solid #ddd; padding: 12px;">Unsupported post request. Object with ID \'[your-unique-id]\' does not exist, cannot be loaded due to missing permissions.</td>\n        </tr>\n        <tr style="background-color: #f8f9fa;">\n            <td style="border: 1px solid #ddd; padding: 12px;">X (Twitter)</td>\n            <td style="border: 1px solid #ddd; padding: 12px; color: #dc3545;">✗ Error</td>\n            <td style="border: 1px solid #ddd; padding: 12px;">Unable to sign without access token</td>\n        </tr>\n        <tr style="background-color: #ffffff;">\n            <td style="border: 1px solid #ddd; padding: 12px;">Facebook</td>\n            <td style="border: 1px solid #ddd; padding: 12px; color: #dc3545;">✗ Error</td>\n            <td style="border: 1px solid #ddd; padding: 12px;">Unsupported post request. Object with ID \'[your-unique-id]\' does not exist, cannot be loaded due to missing permissions.</td>\n        </tr>\n        <tr style="background-color: #f8f9fa;">\n            <td style="border: 1px solid #ddd; padding: 12px;">LinkedIn</td>\n            <td style="border: 1px solid #ddd; padding: 12px; color: #dc3545;">✗ Error</td>\n            <td style="border: 1px solid #ddd; padding: 12px;">Unable to sign without access token</td>\n        </tr>\n    </tbody>\n</table>\n\n\nThis is the social media post results: \n{{ $json.data.toJsonString() }}\n',
      agent: 'conversationalAgent',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-mini',
            cachedResultName: 'gpt-4o-mini'
          },
          options: { responseFormat: 'text' }
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'gpt-4o-mini1' } }) }, position: [0, 380], name: 'Prepare Results Email' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '={{ $env.EMAIL_ADDRESS_JOE }} ',
      message: '={{ $json.output }}',
      options: { appendAttribution: false },
      subject: '🔥RESULTS🔥 Social Media Factory'
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [360, 380], name: 'Gmail Results' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '=Parse the social media post results and generate a brief summary of the results.\n\nThis is the social media post results: \n{{ $json.data.toJsonString() }}\n\n## Example Response:\nThe social media post results indicate multiple errors when attempting to access or post content on various platforms. \n\n1. Instagram: The response shows a 400 status code with an error message indicating that the specific post request is unsupported due to missing permissions or an invalid object ID. \n\n2. X Post: Success\n\n3. Facebook: Success \n\n4. LinkedIn: Also returned an \'Unable to sign without access token\' error. \n\nOverall, access token issues and unsupported requests are frequent problems across these social media platforms.\n',
      agent: 'conversationalAgent',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o-mini',
            cachedResultName: 'gpt-4o-mini'
          },
          options: { responseFormat: 'text' }
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'gpt-4o-mini2' } }) }, position: [0, 660], name: 'Prepare Results Message' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.output }}',
      chatId: '={{ $env.TELEGRAM_CHAT_ID }}',
      additionalFields: { appendAttribution: false }
    }, credentials: {
      telegramApi: { id: 'credential-id', name: 'telegramApi Credential' }
    }, position: [360, 660], name: 'Telegram Results' } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3, config: { parameters: {
      mode: 'combine',
      options: {},
      combineBy: 'combineByPosition'
    }, position: [1440, -60], name: 'Merge1' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://graph.facebook.com/v20.0/[your-unique-id]/media',
      method: 'POST',
      options: {},
      sendQuery: true,
      authentication: 'predefinedCredentialType',
      queryParameters: {
        parameters: [
          { name: 'image_url', value: '={{ $json.data.medium.url }}' },
          {
            name: 'caption',
            value: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Instagram.caption }}'
          }
        ]
      },
      nodeCredentialType: 'facebookGraphApi'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [1700, -60], name: 'Instagram Image' } }))
  .then(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'media_publish',
      node: '[your-unique-id]',
      options: {
        queryParameters: {
          parameter: [
            { name: 'creation_id', value: '={{ $json.id }}' },
            {
              name: 'caption',
              value: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Instagram.caption }}'
            }
          ]
        }
      },
      graphApiVersion: 'v20.0',
      httpRequestMethod: 'POST'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [1700, 160], name: 'Instragram Post' } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3, config: { parameters: {
      mode: 'combine',
      options: { includeUnpaired: true },
      combineBy: 'combineByPosition'
    }, position: [1440, 680], name: 'Merge2' } }))
  .add(node({ type: 'n8n-nodes-base.facebookGraphApi', version: 1, config: { parameters: {
      edge: 'photos',
      node: '[your-unique-id]',
      options: {
        queryParameters: {
          parameter: [
            {
              name: 'message',
              value: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Facebook.post }}\n\n{{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Facebook.call_to_action }}\n'
            },
            {
              name: 'link',
              value: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.Facebook.call_to_action }}'
            }
          ]
        }
      },
      sendBinaryData: true,
      graphApiVersion: 'v20.0',
      httpRequestMethod: 'POST',
      binaryPropertyName: 'data'
    }, credentials: {
      facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' }
    }, position: [1700, 600], name: 'Facebook Post' } }))
  .add(node({ type: 'n8n-nodes-base.linkedIn', version: 1, config: { parameters: {
      text: '={{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.post }}\n{{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.call_to_action }}\n{{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.hashtags }}\n{{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.call_to_action }}',
      postAs: 'organization',
      organization: '12345678',
      additionalFields: {},
      binaryPropertyName: '=data',
      shareMediaCategory: 'IMAGE'
    }, credentials: {
      linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' }
    }, position: [1700, 780], name: 'LinkedIn Post' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: {
      options: { temperature: 0.4 },
      modelName: 'models/gemini-2.0-flash-exp'
    }, credentials: {
      googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
    }, position: [320, -540], name: 'Google Gemini LLM' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
      model: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4o',
        cachedResultName: 'gpt-4o'
      },
      options: { responseFormat: 'text' }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1500, -540], name: 'gpt-4o' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://image.pollinations.ai/prompt/{{$(\'Social Media Content Factory\').item.json.output.description.replaceAll(\' \',\'-\').replaceAll(\',\',\'\').replaceAll(\'.\',\'\') }}',
      options: {}
    }, position: [980, 780], name: 'pollinations.ai' } }))
  .add(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '={{ $env.EMAIL_ADDRESS_JOE }} ',
      message: '=<html>\n<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f5f5f5;">\n  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">\n\n    <h2 style="font-size:20px; color:#333; margin:0 0 15px 0;">LinkedIn</h2>\n      \n    <!-- LinkedIn Card -->\n    <div style="background: #ffffff; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n\n      <!-- Card Header Image -->\n      <div style="height: 200px; overflow: hidden; border-radius: 8px 8px 0 0;">\n        <img src="{{ $json.data.medium.url }}" alt="Featured Image" style="width: 100%; height: 100%; object-fit: cover;">\n      </div>\n\n      <!-- Card Content -->\n      <div style="padding: 25px;">\n\n        <p style="font-size:16px; color:#555; line-height: 1.6; margin-bottom: 15px;">\n          {{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.post }}\n        </p>\n        \n        <div style="margin: 15px 0;">\n          <span style="display: inline-block; background: #f0f0f0; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size:12px; color:#333;">\n            {{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.hashtags }}\n          </span>\n        </div>\n\n        <p style="font-size:14px; color:#1a0dab; font-weight: 600; margin:15px 0 0 0;">\n          {{ $(\'Social Media Content Factory\').item.json.output.platform_posts.LinkedIn.call_to_action }}\n        </p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n',
      options: {
        limitWaitTime: { values: { resumeUnit: 'minutes', resumeAmount: 45 } }
      },
      subject: '=🔥FOR APPROVAL🔥 New LinkedIn Post',
      operation: 'sendAndWait',
      approvalOptions: { values: { approvalType: 'double' } }
    }, credentials: {
      gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' }
    }, position: [980, 380], name: 'Approve Final Post Content' } }))
  .add(node({ type: 'n8n-nodes-base.form', version: 1, config: { parameters: {
      options: { formTitle: 'Generate Post Image', buttonLabel: 'Submit' },
      formFields: {
        values: [
          {
            fieldType: 'file',
            fieldLabel: 'Upload Image (optional)',
            multipleFiles: false,
            acceptFileTypes: '.jpg, .png, .jpeg'
          },
          {
            fieldType: 'dropdown',
            fieldLabel: 'Generate Custom Image using AI Image Generator',
            fieldOptions: { values: [{ option: 'Yes' }, { option: 'No' }] },
            requiredField: true
          }
        ]
      }
    }, position: [-620, -120], name: 'Image Choice' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '$input.first().binary.data = $input.first().binary.Upload_Image__optional_\ndelete $input.first().binary.Upload_Image__optional_\nreturn $input.first()'
    }, position: [-620, 120], name: 'Rename Binary File' } }))
  .add(sticky('# 🧑‍🦱 User Input for Social Media Posts \n💡 Unpin default data to get started', { color: 4, position: [-300, -900], width: 360, height: 360 }))
  .add(sticky('# 🛠️ Social Media Content Factory\n- LinkedIn\n- Instagram\n- Facebook\n- X\n- TikTok\n- Threads\n- YouTube Shorts\n', { name: 'Sticky Note1', color: 6, position: [100, -940], width: 640, height: 600 }))
  .add(sticky('# 👍 Approve Content Before Proceeding', { name: 'Sticky Note2', color: 4, position: [1840, -700], width: 400, height: 360 }))
  .add(sticky('# ✉️ Prepare & Format Approval Email', { name: 'Sticky Note5', color: 5, position: [1300, -900], width: 500, height: 560 }))
  .add(sticky('## Create Post Image\nhttps://pollinations.ai/\nhttps://image.pollinations.ai/prompt/[your image description]\n\n(alternative)', { name: 'Sticky Note6', position: [880, 620], width: 300, height: 340 }))
  .add(sticky('## Publish to Social Media', { name: 'Sticky Note3', color: 6, position: [1600, -140], width: 300, height: 1100 }))
  .add(sticky('## Format Results', { name: 'Sticky Note4', color: 5, position: [1940, 80], width: 300, height: 880 }))
  .add(sticky('# Step 4️⃣: Send Final Results of Social Media Factory', { name: 'Sticky Note7', color: 7, position: [-360, 240], width: 1020, height: 760 }))
  .add(sticky('## Create Post Image', { name: 'Sticky Note8', color: 3, position: [-40, -100], width: 260, height: 260 }))
  .add(sticky('## Final Approval before Publishing to Social Feeds\n(optional)', { name: 'Sticky Note9', position: [880, 240], width: 300, height: 340 }))
  .add(sticky('# Step 1️⃣: Create Social Media Written Content\nNote:  \nYou could use the output of step 1 to create your written content and manually post if required.  \nYou so not have to implement step 2.', { name: 'Sticky Note10', color: 7, position: [-360, -1060], width: 2640, height: 760 }))
  .add(sticky('# Step 2️⃣: Create Image or Upload Image for Social Post', { name: 'Sticky Note11', color: 7, position: [-360, -260], width: 1020, height: 460 }))
  .add(sticky('# Step 3️⃣: Publish Final Social Media Posts', { name: 'Sticky Note12', color: 7, position: [840, -260], width: 1680, height: 1260 }))
  .add(sticky('', { name: 'Sticky Note13', color: 4, position: [-320, 340], width: 940, height: 620 }))
  .add(sticky('## Alternative User Uploaded Image\n(optional)', { name: 'Sticky Note14', position: [-700, -260], width: 300, height: 580 }))
  .add(sticky('## Implement Additional Approval Here\n(optional)', { name: 'Sticky Note15', position: [880, -140], width: 460, height: 340 }))
  .add(sticky('### 💡Notes\n\nAdjust the Social Media Content Factory prompts to suit your personal or business requirements.\n\nUpdate Credentials for:\n- OpenAI API Key\nhttps://auth.openai.com/log-in\n\n- Google Studio API\nhttps://aistudio.google.com/app/apikey\n\n- SERP API Key\nhttps://serpapi.com/\n\n- Gmail OAuth\nhttps://docs.n8n.io/integrations/builtin/credentials/google/\n\n- Telegram Bot (Optional)\nhttps://docs.n8n.io/integrations/builtin/credentials/telegram/\n\n- imgbb\nhttps://imgbb.com/', { name: 'Sticky Note16', position: [780, -900], width: 480, height: 500 }))
  .add(sticky('💡Notes\n\nUpdate all Social Media Platform Credentials as required.\n\nAdjust parameters and content for each platform to suit your needs.', { name: 'Sticky Note17', position: [1940, -140], width: 300, height: 180 }))