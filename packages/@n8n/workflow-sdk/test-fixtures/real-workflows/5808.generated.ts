const wf = workflow('94ZTfrnyRHFV3xxr', 'DocAgentForTemplate', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: {
					public: true,
					options: {},
					initialMessages: 'Merhaba! 👋\nMy name is DocAgent. ',
				},
				position: [-60, -20],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					options: {
						systemMessage:
							'=You are “Legal-Doc Agent”, an expert that drafts professional Turkish\ndocuments from fixed Google Docs templates.\n\n<templateCatalog>\n{{ YOUR_MANUAL_TO_ADD_TEMPLATE_LIST }}\n</templateCatalog> \n\n#TOOLS AND USAGE RULES\nGetMetaData(id)                           → { placeholders\\[], conditionals\\[] }\nDocProcess(user_choice_name, user_choice_id, data{}) → \n\n(Call a tool by replying ONLY with\n{"tool":"ToolName","params":{...}} )\n\n\n#FLOW\nstep-1 Determine which document in the templateCatalog the user wants to create.\nstep-2 Call GetMetaData with the identified id.  \n         → You get back:\n           • metadata.placeholders       (global/static placeholders)\n           • metadata.conditionals[]     (each has flag, label, help, placeholders[])\n\nstep-3 Request the necessary information from the user:\n         a) For each name in metadata.placeholders, ask “What is <PLACEHOLDER>? ”\n         b) For each item in metadata.conditionals:\n              i.   Ask “Would you like to include the <label> section? <help>”\n              ii.  Record in blocks[KEY].include = true/false\n              iii. If include===true, then for each p in placeholders[] ask “What is <p>? ”\n         → Build up a `data` object:\n            {\n              /* static values from 3a */,\n              blocks: {\n                KEY1: { include: true,  P1: val1, P2: val2… },\n                KEY2: { include: false            },\n                …\n              }\n            }\n\nstep-4 After collecting all the required information, submit the information provided by the user to the user for approval as a whole.\nstep-5 Using the `docId` and that `data` object, call the DocProcess (FillDocument) tool.\n\nstep-6 If there are no errors, return the new document’s download URL (or ID) to the user indicating success.\n\n\n#STYLE\n• Speak concise, formal Turkish.\n• Never guess data; always ask.\n• Only tool-call messages may contain JSON blocks.\n\n#RULES\nWhen calling DocProcess, DO NOT CHANGE/TRANSLATE the placeholder names and conditional flag names/structure returned by GetMetaData. Only place the answers you obtained from the user next to them.\n',
					},
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.2,
							config: {
								parameters: {
									workflowId: { __rl: true, mode: 'id', value: '<YOUR_WORKFLOW_ID>' },
									description: 'Call this tool for Doc Process',
									workflowInputs: {
										value: {
											data: "={{ $fromAI('data') }}",
											user_choice_id: "={{ $fromAI('user_choice_id') }}",
											user_choice_name: "={{ $fromAI('user_choice_name') }}",
										},
										schema: [
											{
												id: 'user_choice_name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'user_choice_name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'user_choice_id',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'user_choice_id',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'data',
												type: 'object',
												display: true,
												removed: false,
												required: false,
												displayName: 'data',
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
								name: 'DocProcess',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://script.google.com/macros/s/<YOUR_DEPLOY_ID>/exec',
									options: {},
									sendQuery: true,
									sendHeaders: true,
									authentication: 'predefinedCredentialType',
									queryParameters: {
										parameters: [
											{ name: 'mode', value: 'meta' },
											{
												name: 'id',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `The id of the template requested by the user comes here.`, 'string') }}",
											},
										],
									},
									headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
									nodeCredentialType: 'googleDriveOAuth2Api',
								},
								credentials: {
									googleDriveOAuth2Api: {
										id: 'credential-id',
										name: 'googleDriveOAuth2Api Credential',
									},
								},
								name: 'GetMetaData',
							},
						}),
					],
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
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.5-pro' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [240, -20],
				name: 'DocAgent',
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
						values: [
							{ name: 'user_choice_name' },
							{ name: 'user_choice_id' },
							{ name: 'data', type: 'object' },
						],
					},
				},
				position: [80, 1020],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '=The reference point is the document name chosen by the user.\n\n<document_name_and_id>\n{{ $json.user_choice_name }}\n{{ $json.user_choice_id }}\n</document_name>\n\n<guide_template_list>\n{{ YOUR_MANUAL_TO_ADD_TEMPLATE_LIST }}\n</guide_template_list>\n\nA match of id information is given according to the document name. Examine this match according to the guide list given to you.\n\nIf match is correct\n\n{\n"match": true,\n"user_choice_name":"{{ $json.user_choice_name }}" ,\n"user_choice_id": {{ $json.user_choice_id }}\n}\n\nIf match is incorrect:\n{\n"match": false,\n"user_choice_name":"{{ $json.user_choice_name }}" ,\n"user_choice_id": {{ $json.user_choice_id }},\n"correct_id":"WRITE THE ID YOU NEED HERE"\n}',
					batching: {},
					messages: {
						messageValues: [{ message: 'Cevaplarını JSON formatında ver.' }],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n	"eslesme": true,\n	"user_choice_name": "SATIŞ SÖZLEŞMESİ",\n    "user_choice_id": "<EXAMPLE_TEMPLATE_ID>"\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.5-pro' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model2',
						},
					}),
				},
				position: [300, 1020],
				name: 'User Choice Match Check',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: 'a78bfdab-11cc-4ef1-8074-1fdcd6f14275',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.output.eslesme }}',
								rightValue: 'true',
							},
						],
					},
				},
				position: [660, 1020],
			},
		}),
	)
	.output(0)
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
								id: '0a616fd3-6227-4902-9d1d-1ca09f14412e',
								name: 'output.user_choice_id',
								type: 'string',
								value: '={{ $json.output.user_choice_id }}',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [880, 920],
				name: 'User Choice Match Correct',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://script.google.com/macros/s/<YOUR_DEPLOY_ID>/exec',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{ name: 'mode', value: 'meta' },
							{ name: 'id', value: '={{ $json.output.user_choice_id }}' },
						],
					},
					headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
				},
				position: [1100, 920],
				name: 'GetMetaData2',
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
					assignments: { assignments: [] },
					includeOtherFields: true,
				},
				position: [1320, 920],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '=Place the actual user answers according to the rules using the metadata information of the document given to you.\n\nMatch only the original metadata placeholder and conditional flags with the answers given by the user. DO NOT change the placeholder and conditional flag texts in the metadata.\n\n<metadata>\n{{ $json.metadata.toJsonString() }}\n</metadata>\n\n<user_answers>\n\n{{ $(\'When Executed by Another Workflow\').item.json.data.toJsonString() }}\n</user_answers>\n\nFormat example of the output you should give:\n\n{\n"docId": "<EXAMPLE_TEMPLATE_ID>",\n"data": {\n// — Static (mandatory) placeholders —\n"SELLER_NAME": "Özgür Mözgür",\n"BUYER_NAME": "Ali Veli",\n"PRODUCT_NAME": "Computer",\n"PRICE": "10000",\n"DELIVER_DATE": "12.06.2025",\n"TODAY_DATE": "02.07.2025",\n\n// — Conditional blocks in the “blocks” object —\n"blocks": {\n"MADATE_INSTALLMENT": {\n"include": false\n// INSTALLMENT_PLAN is not sent because include:false\n},\n"GUARANTEE": {\n"include": true,\n"GUARANTEE_PERIOD": "24"\n}\n}\n}\n}',
					batching: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.5-pro' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model1',
						},
					}),
				},
				position: [1540, 920],
				name: 'Format Control',
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
						"// 1) We get the raw text with $input.first() (direct JS instead of Expression)\n// $input provides access to each item as n8n's global variable.\nconst raw = $input.first().json.text;\n\n// 2) Regex to catch ```json … ``` block\nconst match = raw.match(/```json\\s*([\\s\\S]*?)```/i);\n\n// 3) Extract block or use full text\nconst jsonString = match ? match[1] : raw;\n\n// 4) Trim + parse\nconst clean = jsonString.trim();\nlet parsed;\ntry {\n  parsed = JSON.parse(clean);\n} catch (e) {\n  throw new Error(`JSON parse hatası: ${e.message}\\n\\nRaw içerik:\\n${clean}`);\n}\n\n// 5) Return a single item output\nreturn [{ json: parsed }];\n",
				},
				position: [1900, 920],
				name: 'Formatting Correction',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $now.toFormat('dd.MM.yyyy') }} tarihli {{ $('GetMetaData2').item.json.metadata.title }} belgesi",
					fileId: { __rl: true, mode: 'id', value: '={{ $json.docId }}' },
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: { __rl: true, mode: 'id', value: '=<YOUR_FOLDER_ID>' },
					operation: 'copy',
					sameFolder: false,
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2120, 920],
				name: 'CopyTemplate',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: '91055448-6534-40ca-939b-dfbdf2974ab1',
								operator: { type: 'string', operation: 'equals' },
								leftValue: "={{ $('Format Control').item.json.output.docId }}",
								rightValue: '={{ $json.id }}',
							},
						],
					},
				},
				position: [2340, 920],
				name: 'If1',
			},
		}),
	)
	.output(0)
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
								id: '4dec2470-f7cb-4b0a-92a8-31cf88581921',
								name: 'Belge oluşturulamama sebebi:',
								type: 'string',
								value: '=The document id to be filled with the copied document does not match',
							},
						],
					},
				},
				position: [2560, 820],
				name: 'Cop. Document ID Matching Error',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://script.google.com/macros/s/<YOUR_DEPLOY_ID>/exec',
					method: 'POST',
					options: {},
					sendBody: true,
					bodyParameters: {
						parameters: [
							{ name: 'docId', value: '={{ $json.id }}' },
							{
								name: 'data',
								value: "={{ $('Formatting Correction').item.json.data }}",
							},
						],
					},
				},
				position: [2560, 1020],
				name: 'FillDocument',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: 'fc031e6c-6bc6-445b-9cd5-f8e749156f88',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'OK',
							},
						],
					},
				},
				position: [2780, 1020],
				name: 'if',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://www.googleapis.com/drive/v3/files/{{ $('CopyTemplate').item.json.id }}?fields=webContentLink,exportLinks ",
					options: {},
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googleDriveOAuth2Api',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [3000, 820],
				name: 'Generate Download Link',
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
								id: '9af065e4-ec39-480b-b577-99351ed48228',
								name: 'download_link',
								type: 'string',
								value: "={{ $json.exportLinks['application/pdf'] }}",
							},
						],
					},
				},
				position: [3220, 820],
				name: 'Download Link Format',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Template Technical Error',
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
											id: 'c35889e4-f027-49b9-9b59-69cf996f0e9c',
											operator: { type: 'array', operation: 'notEmpty', singleValue: true },
											leftValue: "={{ $('FillDocument').item.json.unknown }}",
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Incomplete Information Error',
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
											id: '08a43597-51af-4632-82c5-ff54505bae13',
											operator: { type: 'array', operation: 'notEmpty', singleValue: true },
											leftValue: "={{ $('FillDocument').item.json.missing }}",
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Other Errors',
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
											id: 'b42acb05-8237-46c2-80f4-27cfb1232710',
											operator: { type: 'string', operation: 'notEquals' },
											leftValue: "={{ $('FillDocument').item.json.message }}",
											rightValue: ' Placeholder validation failed',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [3000, 1120],
			},
		}),
	)
	.output(0)
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
								id: 'cb4572fd-8cc7-4e85-860b-aabbb6b1038d',
								name: 'Belge oluşturulamama sebebi:',
								type: 'string',
								value:
									'=This is a technical error, you can send the following text to the user: "Please consult your institution or organization for this issue. The draft that the document you requested was created from is incorrect."',
							},
						],
					},
				},
				position: [3220, 1220],
				name: 'Template Technical Error',
			},
		}),
	)
	.output(1)
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
								id: '4dec2470-f7cb-4b0a-92a8-31cf88581921',
								name: 'Belge oluşturulamama sebebi:',
								type: 'string',
								value:
									"={{ $('FillDocument').item.json.status }}\nError description:\n{{ $('FillDocument').item.json.message }}\n\n\nLütfen buradaki eksik belgeleri user'dan isteyiniz. Tüm bilgileri tamamladıktan sonra tekrar DocProcess aracını çağırabilirsiniz. {{ $('FillDocument').item.json.missing.toJsonString() }}",
							},
						],
					},
				},
				position: [3220, 1020],
				name: 'Incomplete Information Error',
			},
		}),
	)
	.output(2)
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
								id: 'cb4572fd-8cc7-4e85-860b-aabbb6b1038d',
								name: 'Belge oluşturulamama sebebi:',
								type: 'string',
								value:
									"=Please consult the user to resolve the following error.\n{{ $('FillDocument').item.json.message }}",
							},
						],
					},
				},
				position: [3220, 1420],
				name: 'Other Errors',
			},
		}),
	)
	.output(1)
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
								id: '0bd79b8c-66b5-4a4e-9888-6a0af9276061',
								name: 'pdf_id',
								type: 'string',
								value:
									'The template name selected by the user does not match the template matched by the agent. Please check if the template name selected by the user matches its id.',
							},
						],
					},
				},
				position: [880, 1120],
				name: 'User Choice Matching Error',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "https://www.googleapis.com/drive/v3/files?q='%3CYOUR_PARENT_ID%3E'+in+parents+and+trashed=false&fields=files(id,name,description)&pageSize=1000",
					options: {},
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
					nodeCredentialType: 'googleDriveOAuth2Api',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-500, 440],
				name: 'Template List',
			},
		}),
	)
	.add(
		sticky(
			'## Manual Template List Retrieval\n**The response returned from this API request is manually added to the system prompt.\n\n',
			{ color: 4, position: [-560, 260], width: 260, height: 360 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n**It is preferred for more consistent memory management. Other alternatives can also be tried.',
			{ name: 'Sticky Note1', position: [160, 260], width: 180, height: 320 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n**Metadata of the template selected by the user is dynamically retrieved.',
			{ name: 'Sticky Note2', position: [380, 260], width: 180, height: 320 },
		),
	)
	.add(
		sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n**Prioritized due to free API-Key trial.', {
			name: 'Sticky Note3',
			position: [-60, 260],
			width: 180,
			height: 320,
		}),
	)
	.add(
		sticky(
			'## Description  \n\n## 1 — What Does It Do / Which Problem Does It Solve?\n\nThis workflow turns Google Docs-based contract & form templates into **ready-to-sign PDFs in minutes**—all from a single chat flow.\n\n- **Automates repetitive document creation.** Instead of copying a rental, sales, or NDA template and filling it by hand every time, the bot asks for the required values and fills them in.\n- **Eliminates human error.** It lists every mandatory field so nothing is missed, and removes unnecessary clauses via conditional blocks.\n- **Speeds up approvals.** The final draft arrives as a direct PDF link—one click to send for signing.\n- **One template → unlimited variations.** Every new template you drop in Drive is auto-listed with **zero workflow edits—**it scales effortlessly.\n- **100 % no-code.** Runs on n8n + Google Apps Script—no extra backend, self-hosted or cloud.\n\n---\n\n## 2 — How It Works (Detailed Flow)\n\n1. 📝 **Template Discovery**\n    \n    📂 The **TemplateList** node scans the Drive folder you specify via the `?mode=meta` endpoint and returns an `id / title / desc` list. The bot shows this list in chat.\n    \n2. 🎯 **Selection & Metadata Fetch**\n    \n    The user types a template name.\n    \n    🔍 **GetMetaData** opens the chosen Doc, extracts `META_JSON`, placeholders, and conditional blocks, then lists mandatory & optional fields.\n    \n3. 🗣 **Data-Collection Loop**\n    - The bot asks for every **placeholder** value.\n    - For each **conditional block** it asks 🟢 **Yes** / 🔴 **No**.\n        \n        Answers are accumulated in a `data` JSON object.\n        \n4. ✅ **Final Confirmation**\n    \n    The bot summarizes the inputs → when the user clicks **Confirm**, the *DocProcess* sub-workflow starts.\n    \n5. ⚙️ **DocProcess Sub-Workflow**\n    \n    \n    | 🔧 Step | Node | Task |\n    | --- | --- | --- |\n    | 1 | **User Choice Match Check** | Verifies name–ID match; throws if wrong |\n    | 2 | **GetMetaData (renew)** | Gets the latest placeholder list |\n    | 3 | **Validate JSON Format** | Checks for missing / unknown fields |\n    | 4 | **CopyTemplate** | Copies the Doc via Drive API |\n    | 5 | **FillDocument** | Apps Script fills placeholders & removes blocks |\n    | 6 | **Generate PDF Link** | Builds an `export?format=pdf` URL |\n6. 📎 **Delivery**\n    \n    The master agent sends **🔗 Download PDF** & **✏️ Open Google Doc** links.\n    \n7. 🚫 **Error Paths**\n    - `status:"ERROR", missing:[…]` → bot lists missing fields and re-asks.\n    - `unknown:[…]` → template list is outdated; rerun *TemplateList*.\n    - Any Apps Script error → the returned `message` is shown verbatim in chat.\n\n---\n\n## 3 — 🚀 Setup Steps (Full Checklist)\n\n> Goal: Get a flawless PDF on the first run.\n> \n> \n> Mentally **tick** the ☑️ in front of every line as you go.\n> \n\n### ☁️ A. Google Drive Preparation\n\n| Step | Do This | Watch Out For |\n| --- | --- | --- |\n| 1 | Create a `Templates/` folder → put every template Doc inside | Exactly **one** folder; **no** sub-folders |\n| 2 | Placeholders in every Doc are **`{{UPPER_CASE}}`** | No Turkish chars or spaces |\n| 3 | Wrap optional clauses with **`[[BLOCK_NAME:START]]…[[BLOCK_NAME:END]]`** | The `START` tag must have a **blank line above** |\n| 4 | Add a `META_JSON` block at the very end | Script deletes it automatically after fill |\n| 5 | Right-click Doc > **Details ▸ Description** = 1-line human description | Shown by the bot in the list |\n| 6 | Create a second `Generated/` folder (for copies) | Keeps Drive tidy |\n\n> 🔑 Folder ID (long alphanumerical) = <TEMPLATE_PARENT_ID>\n> \n> \n> We’ll paste this into the TemplateList node next.\n> \n\n[Simple sample template → Template Link](https://www.notion.so/Simple-sample-template-Template-Link-22b3f8a1e57f8070beacd034ba6f557f?pvs=21)\n\n---\n\n### 🛠 B. Import the Workflow into n8n\n\n```bash\nSettings ▸ Import Workflow ▸ DocAgent.json\n\n```\n\nIf nodes look **Broken** afterwards → no community-node problem; you only need to select credentials.\n\n---\n\n### 📑 C. Customize the TemplateList Node\n\n1. Open **Template List** node ⚙️ → replace\n    \n    `\'%3CYOUR_PARENT_ID%3E\' in parents`\n    \n    with the real **folder ID** in the **URL**.\n    \n2. Right-click node > **Execute Node**.\n3. Copy the entire JSON response.\n4. In the editor paste it into:\n    - **DocAgent** → *System Prompt* (top)\n    - **User Choice Match Check** → *System Prompt* (top)\n        \n        Save.\n        \n\n> ⚠️ Why manual? Caching the list saves LLM tokens. Whenever you add a template, rerun the node and update the prompts.\n> \n\n---\n\n### 🔗 D. Deploy the Apps Script\n\n| Step | Screen | Note |\n| --- | --- | --- |\n| 1 | Open Gist files **GetMetaData.gs** + **FillDocument.gs** → *File ▸ Make a copy* | Both files may live in one project |\n| 2 | *Project Settings* > enable **Google Docs API** ✔️ & **Google Drive API** ✔️ | Otherwise you’ll see 403 errors |\n| 3 | *Deploy ▸ New deployment ▸ Web app* |  |\n| • Execute as | **Me** |  |\n| • Who has access | **Anyone** |  |\n| 4 | On the consent screen allow scopes:• `…/auth/documents`• `…/auth/drive` | Click **Advanced › Go** if Google warns |\n| 5 | Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/ABC123/exec`) | If this URL changes, update n8n |\n\n[Apps Script source code → Notion Link](https://www.notion.so/Apps-Script-source-code-Notion-Link-22b3f8a1e57f8015a280d90de16c031f?pvs=21)\n\n---\n\n### 🔧 E. Wire the Script URL in n8n\n\n| Node | Field | Action |\n| --- | --- | --- |\n| **GetMetaData** | *URL* | `<WEB_APP_URL>?mode=meta&id={{ $json["id"] }}` |\n| **FillDocument** | *URL* | `<WEB_APP_URL>` |\n\n> 💡 Prefer using an .env file? Add GAS_WEBAPP_URL=… and reference it as {{ $env.GAS_WEBAPP_URL }}.\n> \n\n---\n\n### 🔐 F. Add Credentials\n\n- **Google Drive OAuth2** → *Drive API (v3) Full Access*\n- **Google Docs OAuth2** → same account\n- **LLM key** (OpenAI / Gemini)\n- (Optional) **Postgres Chat Memory** credential for the corresponding node\n\n---\n\n### 🧪 G. First Run (Smoke Test)\n\n1. Switch the workflow **Active**.\n2. In the chat panel type `/start`.\n3. Bot lists templates → pick one.\n4. Fill mandatory fields, optionally toggle blocks → **Confirm**.\n5. **🔗 Download PDF** link appears → ☑️ setup complete.\n\n---\n\n### ❌ H. Common Errors & Fixes\n\n| 🆘 Error | Likely Cause | Remedy |\n| --- | --- | --- |\n| `403: Apps Script permission denied` | Web app access set to *User* | Redeploy as **Anyone**, re-authorize scopes |\n| `placeholder validation failed` | Missing required field | Provide the listed values → rerun DocProcess |\n| `unknown placeholders: …` | Template vs. agent mismatch | Check placeholder spelling (UPPER_CASE ASCII) |\n| `Template ID not found` | Prompt list is old | Rerun **TemplateList** → update both prompts |\n| `Cannot find META_JSON` | No meta block / wrong tag | Add `[[META_JSON_START]] … [[META_JSON_END]]`, retry |\n\n---\n\n### ✅ Final Checklist\n\n- [ ]  Drive folder structure & template rules ready\n- [ ]  Workflow imported, folder ID set in node\n- [ ]  TemplateList output pasted into both prompts\n- [ ]  Apps Script deployed, URL set in nodes\n- [ ]  OAuth credentials & LLM key configured\n- [ ]  `/start` test passes, PDF link received\n\n---\n\n## 🙋‍♂️ Need Help with Customizations?\n\nReach out for consulting & support on LinkedIn: [**Özgür Karateke**](https://www.linkedin.com/in/%C3%B6zg%C3%BCr-karateke-130514147/)\n\n[Simple sample template → Template Link](https://www.notion.so/Simple-sample-template-Template-Link-22b3f8a1e57f8070beacd034ba6f557f?pvs=21)\n\n[Apps Script source code → Notion Link](https://www.notion.so/Apps-Script-source-code-Notion-Link-22b3f8a1e57f8015a280d90de16c031f?pvs=21)',
			{ name: 'Sticky Note4', color: 6, position: [-2000, -60], width: 1280, height: 4140 },
		),
	)
	.add(
		sticky('## DocProcess (Subworkflow)', {
			name: 'Sticky Note5',
			color: 4,
			position: [-100, 660],
			width: 3640,
			height: 1040,
		}),
	);
