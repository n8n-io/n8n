const wf = workflow('E6zaQoe1afHzQBOb', 'VOC Data into Blogs', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.reddit',
			version: 1,
			config: {
				parameters: {
					limit: 30,
					filters: { category: 'new' },
					operation: 'getAll',
					subreddit: 'n8n',
				},
				credentials: {
					redditOAuth2Api: { id: 'credential-id', name: 'redditOAuth2Api Credential' },
				},
				position: [220, 0],
				name: 'Reddit',
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
						"const questionWords = ['who', 'what', 'when', 'where', 'why', 'how', 'can', 'does', 'is', 'should', 'do', 'are', 'could', 'would'];\n\nreturn $input.all().filter(item => {\n  const rawTitle = item.json.title;\n  if (!rawTitle) return false;\n\n  const title = rawTitle.trim().toLowerCase();\n\n  const isQuestion =\n    title.endsWith('?') ||\n    questionWords.some(word =>\n      title.startsWith(word + ' ') ||\n      title.includes(' ' + word + ' ')\n    );\n\n  // 🪵 Debug log goes here:\n  if (isQuestion) console.log('✅ Question found:', title);\n\n  return isQuestion;\n});\n",
				},
				position: [440, 0],
				name: 'Code',
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
						value: { Query: '={{ $json.selftext }}', Title: '={{ $json.title }}' },
						schema: [
							{
								id: 'Query',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Query',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Title',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Query'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit#gid=0',
						cachedResultName: 'Queries',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit?usp=drivesdk',
						cachedResultName: 'VOC to blog',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [660, 0],
				name: 'Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [880, 0], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Here is a question:  {{ $json.Title }}\n\nRephrase it without changing the meaning. Keep it as a question.\n\nI just need the question as the output nothing else',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: '={{ $json.Title }}',
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [1140, 20],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'a8a698ac-11ee-4623-8cce-8a9900d2ba08',
								name: 'name',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [1500, 20],
				name: 'Edit Fields4',
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
						value: { name: '={{ $json.name }}' },
						schema: [
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'slug',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'slug',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Intro',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Intro',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Steps',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Steps',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Conclusion',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Conclusion',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['name'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1732850028,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit#gid=1732850028',
						cachedResultName: 'Blog',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit?usp=drivesdk',
						cachedResultName: 'VOC to blog',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1780, 20],
				name: 'Google Sheets1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Write a short intro for a blog post titled:  {{ $json.name }}\n\nMake it easy to read, with easy vocabulary\n\nJust give me the intro as the output',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('Google Sheets1').item.json.name }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory2',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model2',
						},
					}),
				},
				position: [2200, -80],
				name: 'Intro',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '89c11812-98e8-45fc-993e-9938b772051b',
								name: 'Intro',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [2560, -80],
				name: 'Edit Fields1',
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
							name: '={{ $json.name }}',
							slug: '={{ $json.slug }}',
							Intro: '={{ $json.Intro }}',
							Steps: '={{ $json.Steps }}',
							Conclusion: '={{ $json.Conclusion }}',
						},
						schema: [
							{
								id: 'name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'slug',
								type: 'string',
								display: true,
								required: false,
								displayName: 'slug',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Intro',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Intro',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Steps',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Steps',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Conclusion',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Conclusion',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1732850028,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit#gid=1732850028',
						cachedResultName: 'Blog',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fIk66lycsodCwVWY_3Jz8ReQBeo0_nOHaFuv427pzKQ/edit?usp=drivesdk',
						cachedResultName: 'VOC to blog',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [3420, 820],
				name: 'Google Sheets2',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: "=Write a 'step by step guide' section for a blog post titled:  {{ $json.name }}\n\nMake it easy to read, with easy vocabulary\nBut make it very detailed\n\nJust give me the output",
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('Google Sheets1').item.json.name }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory3',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model3',
						},
					}),
				},
				position: [2200, 220],
				name: 'Steps',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'db117030-0614-4d4b-9779-a2128eb08c84',
								name: 'Steps',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [2560, 220],
				name: 'Edit Fields2',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Write a short conclusion for a blog post titled:  {{ $json.name }}\n\nMake it easy to read, with easy vocabulary\n\nJust give me the conclusion as the output',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('Google Sheets1').item.json.name }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory4',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model4',
						},
					}),
				},
				position: [2200, 520],
				name: 'Conclusion',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '86fc0fde-f55c-445c-8ebd-828c505a730e',
								name: 'Conclusion',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [2560, 520],
				name: 'Edit Fields3',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Based on {{ $json.name }}\n\nCreate a website slug for it. For example: best-website-builder\n\nJust give me the slug as output nothing else',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: { sessionKey: '={{ $json.name }}', sessionIdType: 'customKey' },
							name: 'Simple Memory1',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model1',
						},
					}),
				},
				position: [2200, -320],
				name: 'slug',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'd07c915b-b5c9-454c-8d4b-cdc91f31696c',
								name: 'slug',
								type: 'string',
								value: '={{ $json.output }}',
							},
						],
					},
				},
				position: [2560, -320],
				name: 'Edit Fields',
			},
		}),
	)
	.add(sticky('# Send data', { color: 3, position: [-80, -80], width: 460, height: 280 }))
	.add(
		sticky('# Article factory', {
			name: 'Sticky Note1',
			position: [2100, -440],
			width: 600,
			height: 1280,
		}),
	)
	.add(
		sticky('# Enhancer', { name: 'Sticky Note2', position: [1060, -80], width: 780, height: 440 }),
	)
	.add(
		sticky('# Data cleaner', {
			name: 'Sticky Note3',
			color: 3,
			position: [400, -80],
			width: 400,
			height: 280,
		}),
	);
