const wf = workflow(
	'vJw8YoQhdA5CXGeB',
	'Social_media_post _automation_from_google_trends_and _perplexity copy',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: { interval: [{ triggerAtHour: 6 }, { triggerAtHour: 18 }] },
				},
				position: [-3420, -200],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://serpapi.com/search',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'q', value: '=ai agents' },
							{ name: 'geo', value: 'US' },
							{ name: 'hl', value: 'en' },
							{
								name: 'date',
								value:
									"={{ $now.minus({ days: 3 }).format('yyyy-MM-dd') }} {{ $now.format('yyyy-MM-dd') }}",
							},
							{ name: 'data_type', value: 'RELATED_QUERIES' },
							{ name: 'engine', value: 'google_trends' },
							{ name: 'api_key', value: '[YOUR_SERPAPI_KEY]' },
						],
					},
				},
				position: [-3200, -200],
				name: 'Google Trends',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					mode: 'raw',
					options: {},
					jsonOutput:
						'={\n  "most-trending": {\n\n    "#1": { \n\n      "query":"{{ $json.related_queries.rising[0].query }}",\n      "score":"{{ $json.related_queries.rising[0].extracted_value }}"\n\n    },\n\n\n    "#2": { \n\n      "query":"{{ $json.related_queries.rising[1].query }}",\n      "score":"{{ $json.related_queries.rising[1].extracted_value }}"\n\n    }\n  }\n}',
				},
				position: [-2980, -200],
				name: '2 Most Trending',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Get the top array from your JSON\nconst topItems = $('Google Trends').first().json.related_queries.top;\n\n// Filter the items to only include those with extracted_value > 30\nconst filtered = topItems.filter(item => item.extracted_value > 30);\n\n// Map the filtered items to their query values and join them with commas\nconst resultString = filtered.map(item => item.query).join(', ');\n\n// Return the result in a new JSON property\nreturn [{ json: { result: resultString } }];\n",
				},
				position: [-2760, -200],
				name: 'High search volume keywords',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-3.5-turbo',
						cachedResultName: 'GPT-3.5-TURBO',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									"=You are part of a team that creates world class blog posts. Your job is to choose the topic for each blog post. \n\nThe blog posts are posted on the website of a [COMPANY NAME + DESCRIPTION + PRODUCTS + TARGET MARKET]. The blog posts are mainly posted as part of an SEO campaign to get [YOUR_COMPANY] to rank high for its products and services.\n\nIn this instance, you are given a list of 2 keywords which have been trending the most on Google news search over the past few days. \n\nYour job is to pick one which you think would make for the most relevant blog post with the best SEO outcomes for the client. \n\nThe keywords have two attributes: \n\n1. query: This attribute determines the search query that users have been searching for which is trending. \n\n2. value: This attribute determines what percentage increase the keyword has seen compared to previous periods (i.e. the increase in search volume). \n\nYou must choose one out of the taking into consideration both the relevance of the keyword for [YOUR_COMPANY]'s SEO efforts and the comparative trendiness determined by the value attribute. \n\nOutput the keyword you decided to post a blog on and nothing else. Don't explain your reasoning. Just output the keyword. \n\nThis instance: \n\nKeyword 1:\n{{ $('2 Most Trending').item.json['most-trending']['#1'].toJsonString() }} \n\nKeyword2: \n{{ $('2 Most Trending').item.json['most-trending']['#2'].toJsonString() }} ",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-2540, -200],
				name: 'Choosing Topic',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.perplexity.ai/chat/completions',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "sonar-pro",\n  "messages": [\n    {\n      "role": "system",\n      "content": "Act as a skilled editor revising AI-generated text to sound authentically human. Follow these rules:\\n\\n1. Punctuation Adjustments\\n   - Replace em dashes, semicolons, or rephrase sentences where appropriate.\\n   - Avoid semicolons in casual contexts; use periods or conjunctions (e.g., \'and,\' \'but\').\\n   - Remove mid-sentence ellipses unless mimicking deliberate hesitation.\\n   - Limit parenthetical asides; integrate explanations into the main sentence.\\n   - Use colons sparingly.\\n\\n2. Language\\n   - Replace hedging phrases with direct statements.\\n   - Avoid stock transitions.\\n   - Vary repetitive terms.\\n   - Use contractions in informal contexts.\\n   - Replace overly formal words with simpler alternatives.\\n\\n3. Style\\n   - Prioritize concise, varied sentence lengths.\\n   - Allow minor imperfections.\\n   - Maintain the core message but adjust tone to match the audience."\n    },\n    {\n      "role": "user",\n      "content": "You are a researcher and expert copywriter in a business development team of an AI Automation Agency. Generate exactly one LinkedIn post that adheres to LinkedIn\'s API formatting guidelines and is easy for humans to read. Follow these rules:\\n\\nStructure:\\n1. Hook: Start with a bold opening line using Unicode characters (e.g., \\"𝐁𝐎𝐋𝐃 𝐒𝐓𝐀𝐓𝐄𝐌𝐄𝐍𝐓\\").\\n2. Body: Use short paragraphs (1-3 sentences) separated by \\\\n\\\\n.\\n3. Use bullet points (•) for key features or highlights.\\n4. End with a clear call-to-action (e.g., \\"Comment below with your thoughts!\\").\\n\\nFormatting Requirements:\\n- Remove all numeric citation brackets like [2], [3], [4] from the text.\\n- Instead of citation brackets, if needed, add a brief phrase like \\"according to Google I/O 2025\\" or \\"as reported by DeepMind\\" naturally within the sentence.\\n- No Markdown or rich text formatting.\\n- Use Unicode characters or emojis for emphasis (e.g., ★, 🚀).\\n- Include up to 3 relevant hashtags at the end (e.g., #AI #Automation).\\n- For URLs or references, use placeholders like [Link] instead of raw URLs.\\n- If mentioning users or companies, use official LinkedIn URN format (e.g., \\"urn:li:organization:123456\\").\\n\\nContent Rules:\\n- Max 1,200 characters.\\n- Avoid promotional language.\\n- Include one statistical claim or industry insight.\\n- Add one personal anecdote or professional observation.\\n\\nReturn the post as plain text without additional commentary.\\n\\nInput: {{ $json.message.content }}"\n    }\n  ]\n}\n',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-2160, -200],
				name: 'Research Topic- Perplexity',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 10 }, position: [-1940, -200] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'choices[0].message.content' },
				position: [-1720, -200],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.twitter',
			version: 2,
			config: {
				parameters: { additionalFields: {} },
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [-1500, 0],
				name: 'X1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: { options: {}, httpRequestMethod: 'POST' },
				position: [-1500, -400],
				name: 'Facebook Graph API1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $json['choices[0].message.content'] }}",
					person: '[CONFIGURE_YOUR_LINKEDIN_PERSON_ID]',
					authentication: 'communityManagement',
					additionalFields: {},
				},
				credentials: {
					linkedInCommunityManagementOAuth2Api: {
						id: 'credential-id',
						name: 'linkedInCommunityManagementOAuth2Api Credential',
					},
				},
				position: [-1480, -200],
				name: 'LinkedIn1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							Topic: "={{ $('Choosing Topic').item.json.message.content }}",
							Status: 'Posted',
							'AI Output': "={{ $json['choices[0].message.content'] }}",
							'Date Posted': "={{ $('Schedule Trigger').item.json.timestamp }}",
						},
						schema: [
							{
								id: 'Topic',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Topic',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'AI Output',
								type: 'string',
								display: true,
								required: false,
								displayName: 'AI Output',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Date Posted',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Date Posted',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Topic'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl: '[YOUR_GOOGLE_SHEETS_URL]',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '[YOUR_GOOGLE_SHEETS_DOCUMENT_ID]',
						cachedResultUrl: '[YOUR_GOOGLE_SHEETS_URL]',
						cachedResultName: 'LinkedIn Automation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1280, -200],
				name: 'Google Sheets2',
			},
		}),
	)
	.add(sticky('## Find Trend\n\n', { position: [-3240, -280], width: 400, height: 240 }))
	.add(
		sticky('## High Volume Keywords\n\n', {
			name: 'Sticky Note1',
			position: [-2820, -280],
			width: 200,
			height: 240,
		}),
	)
	.add(
		sticky('## Choosing Blog Topic\n\n\n', {
			name: 'Sticky Note2',
			position: [-2580, -280],
			width: 340,
			height: 240,
		}),
	)
	.add(
		sticky('## Research\n\n\n', {
			name: 'Sticky Note3',
			position: [-2200, -280],
			width: 600,
			height: 240,
		}),
	)
	.add(
		sticky('## Multi Social Media Posting', {
			name: 'Sticky Note4',
			position: [-1560, -540],
			height: 800,
		}),
	)
	.add(sticky('## Status update', { name: 'Sticky Note5', position: [-1300, -280], height: 260 }));
