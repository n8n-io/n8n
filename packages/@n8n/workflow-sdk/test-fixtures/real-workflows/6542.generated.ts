const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [160, 0],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					options: {
						systemMessage:
							'=You are **AI Assistant** for **[your company]**, orchestrated by the `Knowledge Agent` node inside an n8n workflow.  \nYour mission:\n\n1. **Respond clearly and helpfully** to every user request, matching their tone and preferred language.  \n2. **Persist context**: every turn is automatically stored in `Postgres Chat Memory`; use it to maintain continuity, avoid repetition, and recall prior details when relevant.  \n3. **Reason before you act**:  \n   - Call the `Think` tool to outline your plan or ask clarifying questions.  \n   - Invoke the appropriate tools when needed:  \n     • `General knowledge` (Supabase vector store) for internal content from [your company]  \n     • `structured data` (Postgres) for tabular queries  \n     • `search about any doc in google drive` to locate Drive files  \n     • `Read File From GDrive` to download and process PDFs, CSVs, images, audio, or video  \n     • `Message a model in Perplexity` only when you need very recent external web information \n4. **Output format**: reply in well‑structured Markdown—headings, lists, and code when useful. Keep it concise; avoid unnecessary tables.\n\nAdditional notes:  \n- Always cite the data source in your answer (“*from the vector store*,” “*from the analysed CSV*,” etc.).  \n- If anything is ambiguous (e.g., which file to open), ask a precise follow‑up question first.  \n',
					},
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: {
								parameters: {
									description:
										'Use the tool to think about the user query and the actual data extracted.',
								},
								name: 'Think',
							},
						}),
						tool({
							type: 'n8n-nodes-base.postgresTool',
							version: 2.6,
							config: {
								parameters: {
									table: {
										__rl: true,
										mode: 'name',
										value:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Table', ``, 'string') }}",
									},
									schema: { __rl: true, mode: 'list', value: 'public' },
									columns: {
										value: {},
										schema: [
											{
												id: 'Keyword',
												type: 'string',
												display: true,
												required: true,
												displayName: 'Keyword',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Avg monthly searches',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Avg monthly searches',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Competition',
												type: 'string',
												display: true,
												removed: true,
												required: false,
												displayName: 'Competition',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Competition indexed value',
												type: 'string',
												display: true,
												removed: true,
												required: false,
												displayName: 'Competition indexed value',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Low range bid',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Low range bid',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'High range bid',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'High range bid',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Score',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Score',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Base score',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Base score',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'cpc median',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'cpc median',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'n chars',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'n chars',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'relevance bonus',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'relevance bonus',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Scored?',
												type: 'boolean',
												display: true,
												removed: true,
												required: false,
												displayName: 'Scored?',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Primary used',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Primary used',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Secondary used?',
												type: 'number',
												display: true,
												removed: true,
												required: false,
												displayName: 'Secondary used?',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'autoMapInputData',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
									options: {},
								},
								credentials: {
									postgres: { id: 'credential-id', name: 'postgres Credential' },
								},
								name: 'structured data',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
							version: 1.3,
							config: {
								parameters: {
									mode: 'retrieve-as-tool',
									options: {},
									tableName: {
										__rl: true,
										mode: 'list',
										value: 'danelfin',
										cachedResultName: 'danelfin',
									},
									useReranker: true,
									toolDescription: 'Acces information About (YOUR COMPANY)',
								},
								credentials: {
									supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' },
								},
								subnodes: {
									embedding: embedding({
										type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
										version: 1.2,
										config: {
											parameters: { options: { dimensions: 1536 } },
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'Embeddings OpenAI',
										},
									}),
								},
								name: 'General knowledge',
							},
						}),
						tool({
							type: 'n8n-nodes-base.perplexityTool',
							version: 1,
							config: {
								parameters: {
									options: {},
									messages: {
										message: [
											{
												content:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('message0_Text', ``, 'string') }}",
											},
										],
									},
									requestOptions: {},
								},
								credentials: {
									perplexityApi: { id: 'credential-id', name: 'perplexityApi Credential' },
								},
								name: 'Message a model in Perplexity',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.mcpClientTool',
							version: 1,
							config: {
								parameters: { sseEndpoint: 'https://your instancesse' },
								name: 'search  about any doc in google drive',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.3,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'claude-sonnet-4-20250514',
									cachedResultName: 'Claude 4 Sonnet',
								},
								options: {},
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model',
						},
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
						version: 1.3,
						config: {
							credentials: {
								postgres: { id: 'credential-id', name: 'postgres Credential' },
							},
							name: 'Postgres Chat Memory',
						},
					}),
				},
				position: [464, 0],
				name: 'Knowledge Agent',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [144, -688], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: 'list',
						value: '1B10ODCBzQixzx1wxfA1Nsrnz8a8o2vzV',
						cachedResultUrl: 'https://drive.google.com/YOUR_AWS_SECRET_KEY_HERE/view?usp=drivesdk',
						cachedResultName: '1.0.zip',
					},
					options: {},
					operation: 'download',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [352, -688],
				name: 'Download file',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1.3,
			config: {
				parameters: {
					mode: 'insert',
					options: {},
					tableName: {
						__rl: true,
						mode: 'list',
						value: 'danelfin',
						cachedResultName: 'danelfin',
					},
				},
				credentials: {
					supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' },
				},
				subnodes: {
					embedding: embedding({
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						version: 1.2,
						config: {
							parameters: { options: {} },
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'Embeddings OpenAI1',
						},
					}),
					documentLoader: documentLoader({
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						version: 1.1,
						config: {
							parameters: {
								options: {},
								dataType: 'binary',
								textSplittingMode: 'custom',
							},
							subnodes: {
								textSplitter: textSplitter({
									type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
									version: 1,
									config: {
										parameters: { options: {} },
										name: 'Recursive Character Text Splitter1',
									},
								}),
							},
							name: 'Default Data Loader1',
						},
					}),
				},
				position: [592, -688],
				name: 'Add to Supabase Vector DB',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: {
						values: [{ name: 'operation' }, { name: 'folderId' }, { name: 'fileId' }],
					},
				},
				position: [2112, 448],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.googleDrive',
					version: 3,
					config: {
						parameters: {
							fileId: { __rl: true, mode: 'id', value: '={{ $json.fileId }}' },
							options: {
								googleFileConversion: {
									conversion: {
										docsToFormat: 'text/plain',
										slidesToFormat: 'application/pdf',
									},
								},
							},
							operation: 'download',
						},
						position: [2464, 448],
						name: 'Download File1',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'ReadFile',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'b03bb746-dc4e-469c-b8e6-a34c0aa8d0a6',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.operation }}',
											rightValue: 'readFile',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Operation',
			},
		),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.extractFromFile',
					version: 1,
					config: {
						parameters: { options: {}, operation: 'pdf' },
						position: [2928, 160],
						name: 'Extract from PDF',
					},
				}),
				node({
					type: 'n8n-nodes-base.extractFromFile',
					version: 1,
					config: {
						parameters: {
							options: {
								encoding: 'utf-8',
								headerRow: false,
								relaxQuotes: true,
								includeEmptyCells: true,
							},
						},
						position: [2928, 352],
						name: 'Extract from CSV',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.openAi',
					version: 1.8,
					config: {
						parameters: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'gpt-4o-mini',
								cachedResultName: 'GPT-4O-MINI',
							},
							options: {},
							resource: 'image',
							inputType: 'base64',
							operation: 'analyze',
						},
						position: [2928, 528],
						name: 'Analyse Image',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.openAi',
					version: 1.8,
					config: {
						parameters: { options: {}, resource: 'audio', operation: 'transcribe' },
						position: [2928, 704],
						name: 'Transcribe Audio',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'pdf',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: '7b6958ce-d553-4379-a5d6-743f39b342d0',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $binary.data.mimeType }}',
											rightValue: 'application/pdf',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'csv',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'd0816a37-ac06-49e3-8d63-17fcd061e33f',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $binary.data.mimeType }}',
											rightValue: 'text/csv',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'image',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: '589540e1-1439-41e3-ba89-b27f5e936190',
											operator: { type: 'boolean', operation: 'true', singleValue: true },
											leftValue:
												"={{\n[\n  'image/jpeg',\n  'image/jpg',\n  'image/png',\n  'image/gif'\n].some(mimeType => $binary.data.mimeType === mimeType)\n}}",
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'audio',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: 'b8fc61a1-6057-4db3-960e-b8ddcbdd0f31',
											operator: { type: 'string', operation: 'contains' },
											leftValue: '={{ $binary.data.mimeType }}',
											rightValue: 'audio',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'video',
								conditions: {
									options: {
										version: 2,
										leftValue: '',
										caseSensitive: true,
										typeValidation: 'strict',
									},
									combinator: 'and',
									conditions: [
										{
											id: '959d65a6-372f-4978-b2d1-f28aa1e372c6',
											operator: { type: 'string', operation: 'contains' },
											leftValue: '={{ $binary.data.mimeType }}',
											rightValue: 'video',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'FileType',
			},
		),
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
								id: 'a481cde3-b8ec-4d97-aa13-4668bd66c24d',
								name: 'response',
								type: 'string',
								value: '={{ $json.text }}',
							},
						],
					},
				},
				position: [3088, 160],
				name: 'Get PDF Response',
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
								id: 'a481cde3-b8ec-4d97-aa13-4668bd66c24d',
								name: 'response',
								type: 'string',
								value:
									"={{\n$input.all()\n  .map(item => item.json.row.map(cell => `\"${cell}\"`).join(','))\n  .join('\\n')\n}}",
							},
						],
					},
				},
				position: [3088, 352],
				name: 'Get CSV Response',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'a289c719-fb71-4b08-97c6-79d12645dc7e' },
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'ReadFile',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'Call this tool to download and read the contents of a file within google drive.',
									workflowInputs: {
										value: {
											fileId:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('fileId', ``, 'string') }}",
											folderId:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('folderId', ``, 'string') }}",
											operation: 'readFile',
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'folderId',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'folderId',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'fileId',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'fileId',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Read File From GDrive',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleDriveTool',
							version: 3,
							config: {
								parameters: {
									limit: 10,
									filter: {
										driveId: { mode: 'list', value: 'My Drive' },
										whatToSearch: 'files',
									},
									options: {},
									resource: 'fileFolder',
									queryString:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search_Query', ``, 'string') }}",
								},
								credentials: {
									googleDriveOAuth2Api: {
										id: 'credential-id',
										name: 'googleDriveOAuth2Api Credential',
									},
								},
								name: 'Search Files from Gdrive',
							},
						}),
					],
				},
				position: [1712, 64],
				name: 'Google Drive MCP Server',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.rerankerCohere',
			version: 1,
			config: {
				credentials: {
					cohereApi: { id: 'credential-id', name: 'cohereApi Credential' },
				},
				position: [1296, 560],
			},
		}),
	)
	.add(
		sticky(
			"### Always Authenticate Your Server!\nBefore going to production, it's always advised to enable authentication on your MCP server trigger.",
			{ name: 'Sticky Note3', color: 5, position: [1664, -48], width: 380, height: 100 },
		),
	)
	.add(
		sticky('It can be google sheets/ airtable ...', {
			name: 'Sticky Note2',
			color: 5,
			position: [768, 368],
			height: 176,
		}),
	)
	.add(
		sticky(
			'## https://n8n.io/creators/jimleuk/ (Jimleuk build this)\n\n- https://n8n.io/workflows/3634-build-your-own-google-drive-mcp-server/ (click the link for more detailed explanation)\n',
			{ name: 'Sticky Note5', color: 5, position: [2080, -112], width: 480 },
		),
	)
	.add(
		sticky('### Advanced model of claude or Grok 4 for better results ', {
			name: 'Sticky Note6',
			color: 5,
			position: [112, 272],
			height: 224,
		}),
	)
	.add(
		sticky(
			'## 2. Handle Multiple Binary Formats via Conversion and AI\n[Read more about the PostgreSQL Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/)\n\nMCP clients (or rather, the AI agents) still expect and require text responses from our MCP server.\nN8N can provide the right conversion tools to parse most text formats such as PDF, CSV and XML.\nFor images, audio and video, consider using multimodal LLMs to describe or transcribe the file instead.',
			{ name: 'Sticky Note1', color: 7, position: [2080, 48], width: 1180, height: 812 },
		),
	)
	.add(
		sticky('## Load data to vector store', {
			color: 7,
			position: [64, -848],
			width: 1072,
			height: 720,
		}),
	)
	.add(
		sticky('### Search for live data in the Web', {
			name: 'Sticky Note4',
			color: 5,
			position: [576, 688],
			height: 224,
		}),
	)
	.add(
		sticky(
			'# 📜 Detailed n8n Workflow Description\n\n## Main Flow\n\nThe workflow operates through a three-step process that handles incoming chat messages with intelligent tool orchestration:\n\n1. **Message Trigger**: The `When chat message received` node triggers whenever a user message arrives and passes it directly to the `Knowledge Agent` for processing.\n\n2. **Agent Orchestration**: The `Knowledge Agent` serves as the central orchestrator, registering a comprehensive toolkit of capabilities:\n   - **LLM Processing**: Uses `Anthropic Chat Model` with the *claude-sonnet-4-20250514* model to craft final responses\n   - **Memory Management**: Implements `Postgres Chat Memory` to save and recall conversation context across sessions\n   - **Reasoning Engine**: Incorporates a `Think` tool to force internal chain-of-thought processing before taking any action\n   - **Semantic Search**: Leverages `General knowledge` vector store with OpenAI embeddings (1536-dimensional) and Cohere reranking for intelligent content retrieval\n   - **Structured Queries**: Provides `structured data` Postgres tool for executing queries on relational database tables\n   - **Drive Integration**: Includes `search about any doc in google drive` functionality to locate specific file IDs\n   - **File Processing**: Connects to `Read File From GDrive` sub-workflow for fetching and processing various file formats\n   - **External Intelligence**: Offers `Message a model in Perplexity` for accessing up-to-the-minute web information when internal knowledge proves insufficient\n\n3. **Response Generation**: After invoking the `Think` process, the agent intelligently selects appropriate tools based on the query, integrates results from multiple sources, and returns a comprehensive Markdown-formatted answer to the user.\n\n## Persistent Context Management\n\nThe workflow maintains conversation continuity through `Postgres Chat Memory`, which automatically logs every user-agent exchange. This ensures long-term context retention without requiring manual intervention, allowing for sophisticated multi-turn conversations that build upon previous interactions.\n\n## Semantic Retrieval Pipeline\n\nThe semantic search system operates through a sophisticated two-stage process:\n\n- **Embedding Generation**: `Embeddings OpenAI` converts textual content into high-dimensional vector representations\n- **Relevance Reranking**: `Reranker Cohere` reorders search hits to prioritize the most contextually relevant results\n- **Knowledge Integration**: Processed results feed into the `General knowledge` vector store, providing the agent with relevant internal knowledge snippets for enhanced response accuracy\n\n## Google Drive File Processing\n\nThe file reading capability handles multiple formats through a structured sub-workflow:\n\n1. **Workflow Initiation**: The agent calls `Read File From GDrive` with the selected `fileId` parameter\n2. **Sub-workflow Activation**: `When Executed by Another Workflow` node activates the dedicated file processing sub-workflow\n3. **Operation Validation**: `Operation` node confirms the request type is `readFile`\n4. **File Retrieval**: `Download File1` node retrieves the binary file data from Google Drive\n5. **Format-Specific Processing**: `FileType` node branches processing based on MIME type:\n   - **PDF Files**: Route through `Extract from PDF` → `Get PDF Response` to extract plain text content\n   - **CSV Files**: Process via `Extract from CSV` → `Get CSV Response` to obtain comma-delimited text data\n   - **Image Files**: Analyze using `Analyse Image` with GPT-4o-mini to generate visual descriptions\n   - **Audio/Video Files**: Transcribe using `Transcribe Audio` with Whisper for text transcript generation\n6. **Content Integration**: The extracted text content returns to `Knowledge Agent`, which seamlessly weaves it into the final response\n\n## External Search Capability\n\nWhen internal knowledge sources prove insufficient, the workflow can access current public information through `Message a model in Perplexity`, ensuring responses remain accurate and up-to-date with the latest available information.\n\n## Design Highlights\n\nThe workflow architecture incorporates several key design principles that enhance reliability and reusability:\n\n- **Forced Reasoning**: The mandatory `Think` step significantly reduces hallucinations and prevents tool misuse by requiring deliberate consideration before action\n- **Template Flexibility**: The design is intentionally generic—organizations can replace **[your company]** placeholders with their specific company name and integrate their own credentials for immediate deployment\n- **Documentation Integration**: Sticky notes throughout the canvas serve as inline documentation for workflow creators and maintainers, providing context without affecting runtime performance\n\n## System Benefits\n\nWith this comprehensive architecture, the assistant delivers powerful capabilities including long-term memory retention, semantic knowledge retrieval, multi-format file processing, and contextually rich responses tailored specifically for users at **[your company]**. The system balances sophisticated AI capabilities with practical business requirements, creating a robust foundation for enterprise-grade conversational AI deployment.',
			{ name: 'Sticky Note7', color: 3, position: [-880, -848], width: 896, height: 1872 },
		),
	)
	.add(
		sticky(
			'## Need a tailor-made workflow? Tell me about your business and get a free proposal:\n\n**[Start here → Custom Automation Form](https://taskmorphr.com/contact)**\n\n---\n## 📈 Cost-Savings Snapshot  \nCurious what automation could save you?  \nRun the 60-second calculator:\n\n**[ROI / Cost Comparison](https://taskmorphr.com/cost-comparison)**\n\n---\n### ✉️ Reach me directly  \n`paul@taskmorphr.com`',
			{ name: 'Sticky Note8', color: 3, position: [1168, -672], width: 576, height: 560 },
		),
	)
	.add(
		sticky(
			'### 🛠️ Build it yourself  \nBrowse every ready-made workflow:  \n[Full Template Pack — coming soon](https://n8n.io/creators/diagopl/)\n',
			{ name: 'Sticky Note9', color: 3, position: [1488, -272], width: 224, height: 128 },
		),
	);
