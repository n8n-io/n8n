const wf = workflow('eEVvcTInAYIB2SLi', 'Copycat SEO article (public version)', {
	timezone: 'Europe/Ljubljana',
	callerPolicy: 'workflowsFromSameOwner',
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 2 }] } },
				position: [-320, 20],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [{ lookupValue: '={{ false }}', lookupColumn: 'Completed' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 268886635,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/16rMg45cnPeJMoaCQmmhF5dvsbpkwtINUTx57WEkcDDM/edit#gid=268886635',
						cachedResultName: 'Blogs (ideas)',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '16rMg45cnPeJMoaCQmmhF5dvsbpkwtINUTx57WEkcDDM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/16rMg45cnPeJMoaCQmmhF5dvsbpkwtINUTx57WEkcDDM/edit?usp=drivesdk',
						cachedResultName: 'Example SEO research',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-140, 20],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Google Sheets').item.json.URL }}",
					options: {},
				},
				position: [80, 20],
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
						'const items = $input.all();\nconst updatedItems = items.map((item) => {\n  let html = item?.json?.data;\n\n  // Trim to body\n  let bodyStart = html.indexOf("<body>");\n  let bodyEnd = html.indexOf("</body>") + 7;\n  html = html.slice(bodyStart, bodyEnd);\n\n  // Remove header\n  html = html.replace(/<header>[\\s\\S]*?<\\/header>/g, "");\n\n  // Remove scripts\n  html = html.replace(/<script>[\\s\\S]*?<\\/script>/g, "");\n\n  // Remove iframes\n  html = html.replace(/<iframe[\\s\\S]*?<\\/iframe>/g, "");\n\n  item.json.data = html;\n  return item;\n});\n\nreturn updatedItems;\n',
				},
				position: [220, 20],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=You are an expert SEO writer. You will get page data return me bulltpoints for what sections are being used in this webpage. for example:\n- content\n- faq\n- testimonials \n\n{{ $json.data }}\n\nFor each section also give me what is the key point for SEO',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.3,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'claude-3-5-haiku-20241022',
									cachedResultName: 'Claude Haiku 3.5',
								},
								options: {},
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Haiku ',
						},
					}),
				},
				position: [100, 160],
				name: 'Page structure analiser',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=You are an expert SEO writer working for www.productai.photo.\n\nRewrite the following article directly and return the full SEO-optimized version **in one complete response**, in **JSON** format with the following structure:\n\n{\n  "article": "HTML Markdown-formatted article goes here",\n  "summary": "1–2 sentence summary of the article here"\n}\n\nReturn only the requested output with no explanations, commentary, or additional text.\n\n## Guidelines:\n- Use the primary keyword:{{ $(\'Google Sheets\').item.json[\'Top keyword\'] }}  throughout the article, naturally and repeatedly.\n- Follow this exact structure based on the original HTML:\n  1. Header Navigation (SEO context)\n  2. Hero Section (main headline + paragraph)\n  3. Main Content Sections (H2s, H3s, internal links <a> tags)\n  4. Use Case Explanations\n  5. Step-by-Step Tutorial (numbered list with headings)\n  6. Call-to-Action Section (use link: create.productai.photo)\n  8. Technical SEO elements (image alt text, responsive, semantic)\n\n## Markdown Formatting:\n- Don\'t use H1 for the article title, start with H2.\n- Use H2 html tag for main sections and H3 html tag for subsections.\n- Short paragraphs, clear headings, internal links where relevant.\n- All CTA buttons or links use <a> tag must point to: **create.productai.photo**\n- Add **bold**, *italic*, and lists <li> where helpful.\n- User rich text elements HTML:\n* Paragraphs\n* Heading tags (H1-H6)\n* Images\n* Image captions\n* Image alt attributes\n* Custom code\n* Block quotes\n* Unordered lists (bulleted)\n* Ordered lists (numbered)\n* Videos (Youtube, Vimeo)\n* Rich media (Google maps, SoundCloud, Imgur, Giphy, Codepen, and more)\n\n## Output Rules:\n- DO NOT say “I will now rewrite...” or "I\'ll rewrite the article based on your requirements. " explain anything, just return the article.\n- DO NOT include planning or step-by-step generation.\n- Just return the **fully rewritten markdown article** in the required JSON structure.\n- Include a brief SEO-friendly summary.\n- Instead of a competition company name like (PixelCut, pixelcut, CreatorKit, Soona, Pebblely), ALWAYS use "ProductAI"\n\n## Source Article:\nRewrite the following article: {{ $(\'Google Sheets\').item.json.URL }} \n\n\n## Content Structure:\n{{ $json.output }} \n\n## Take internal links from webflow tool',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.webflowTool',
							version: 2,
							config: {
								parameters: {
									siteId: '648717e882e5860a12ab9d1c',
									operation: 'getAll',
									collectionId: '64b1bae9c2d06f1241365376',
									descriptionType: 'manual',
									toolDescription:
										'Get URLs of current related articles on productai.photo so they can be used ad internal links.',
								},
								credentials: {
									webflowOAuth2Api: { id: 'credential-id', name: 'webflowOAuth2Api Credential' },
								},
								name: 'Get Articles',
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
									cachedResultName: 'Claude Sonnet 4',
								},
								options: { thinking: false, maxTokensToSample: 4096 },
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Thinking Claude',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserAutofixing',
						version: 1,
						config: {
							parameters: {
								options: {
									prompt:
										'Instructions:\n--------------\nOutput the format as:\n{\n"article": "long article text",\n"summary": "summary of article"\n}\n\n--------------\nCompletion:\n--------------\nAll attibutes are full field is {{completed}}\n\n--------------\n\nAbove, the Completion did not satisfy the constraints given in the Instructions.\nError:\n--------------\n{error}\n--------------\n\nPlease try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:\n\nWrite the article and give output',
								},
							},
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
									version: 1.2,
									config: {
										parameters: {
											model: {
												__rl: true,
												mode: 'list',
												value: 'o4-mini',
												cachedResultName: 'o4-mini',
											},
											options: {},
										},
										credentials: {
											openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
										},
										name: 'OpenAI Mini model',
									},
								}),
								outputParser: outputParser({
									type: '@n8n/n8n-nodes-langchain.outputParserStructured',
									version: 1.2,
									config: {
										parameters: {
											jsonSchemaExample:
												'{\n"article": "long article text",\n"summary": "summary of article",\n"author": "Marko Balažic"\n}',
										},
										name: 'Structured Output Parser1',
									},
								}),
							},
							name: 'Auto-fixing Output Parser',
						},
					}),
				},
				position: [540, 100],
				name: 'Content writer',
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
								id: 'ce170e51-4f33-4b18-bf9d-85416b7c5ad6',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.output.article }}',
								rightValue: '',
							},
						],
					},
				},
				position: [980, 0],
				name: 'Article written?',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.executeWorkflow',
			version: 1.2,
			config: {
				parameters: {
					options: {},
					workflowId: {
						__rl: true,
						mode: 'list',
						value: '7FHTcSuCIjHvvBfe',
						cachedResultName: 'Shape workflows — SEO Content evaluator',
					},
					workflowInputs: {
						value: {
							article: '={{ $json.output.article }}',
							summary: '={{ $json.output.summary }}',
						},
						schema: [
							{
								id: 'article',
								type: 'string',
								display: true,
								required: false,
								displayName: 'article',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
				},
				position: [980, -300],
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 1.9,
					config: {
						parameters: {
							text: "=You are an expert at generating detailed prompts for AI image generators (like Midjourney or DALL-E) to create eye-catching, clickable thumbnail images.\n\nYour Task:\nGiven the full text of an article, analyze and identify its main topic and tone. Based on your analysis, create a clear, visually descriptive prompt suitable for generating a thumbnail image that will attract viewers and convey the essence of the article.\n\nGuidelines:\n\nHighlight the article’s key theme, main characters or elements, and any emotions you want the image to evoke.\nSuggest specific visuals, colors, moods, and, if suitable, stylish text overlays.\nKeep the prompt concise but rich in visual detail so the resulting image will be engaging and informative.\nAvoid vague terms—be as specific as possible.\nExample Input:\n(Article about the rise of electric vehicles and their impact on the auto industry.)\n\nExample Output:\n\"Create a bold, modern thumbnail depicting a sleek electric car zooming down a futuristic highway with city skyscrapers in the background. Use vibrant blues and greens to symbolize innovation and eco-friendliness. Add stylized lightning bolts and a glowing 'EV Revolution' text overlay. Convey excitement and progress.\"\n\nArticle:\n{{ $('Content writer').item.json.output.article }}",
							options: {},
							promptType: 'define',
						},
						subnodes: {
							model: languageModel({
								type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
								version: 1.2,
								config: {
									parameters: {
										model: {
											__rl: true,
											mode: 'list',
											value: 'o4-mini',
											cachedResultName: 'o4-mini',
										},
										options: {},
									},
									credentials: {
										openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
									},
									name: 'OpenAI Mini model',
								},
							}),
						},
						position: [1420, -340],
						name: 'Prompt engineer',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 1.9,
					config: {
						parameters: {
							text: '=You are an expert SEO writer working for www.productai.photo.\n\nRewrite the following article directly and return the full SEO-optimized version **in one complete response**, in **JSON** format with the following structure:\n\n{\n  "article": "HTML Markdown-formatted article goes here",\n  "summary": "1–2 sentence summary of the article here"\n}\n\nReturn only the requested output with no explanations, commentary, or additional text.\n\n## Guidelines:\n- Use the primary keyword:{{ $(\'Google Sheets\').item.json[\'Top keyword\'] }}  throughout the article, naturally and repeatedly.\n- Follow this exact structure based on the original HTML:\n  1. Header Navigation (SEO context)\n  2. Hero Section (main headline + paragraph)\n  3. Main Content Sections (H2s, H3s, internal links <a> tags)\n  4. Use Case Explanations\n  5. Step-by-Step Tutorial (numbered list with headings)\n  6. Call-to-Action Section (use link: create.productai.photo)\n  8. Technical SEO elements (image alt text, responsive, semantic)\n\n## Markdown Formatting:\n- Don\'t use H1 for the article title, start with H2.\n- Use H2 html tag for main sections and H3 html tag for subsections.\n- Short paragraphs, clear headings, internal links where relevant.\n- All CTA buttons or links use <a> tag must point to: **create.productai.photo**\n- Add **bold**, *italic*, and lists <li> where helpful.\n- User rich text elements HTML:\n* Paragraphs\n* Heading tags (H1-H6)\n* Images\n* Image captions\n* Image alt attributes\n* Custom code\n* Block quotes\n* Unordered lists (bulleted)\n* Ordered lists (numbered)\n* Videos (Youtube, Vimeo)\n* Rich media (Google maps, SoundCloud, Imgur, Giphy, Codepen, and more)\n\n## Output Rules:\n- DO NOT say “I will now rewrite...” or "I\'ll rewrite the article based on your requirements. " explain anything, just return the article.\n- DO NOT include planning or step-by-step generation.\n- Just return the **fully rewritten markdown article** in the required JSON structure.\n- Include a brief SEO-friendly summary.\n- Instead of a competition company name like (PixelCut, pixelcut, CreatorKit, Soona, Pebblely), ALWAYS use "ProductAI"\n\n## Source Article:\nRewrite the following article: {{ $(\'Google Sheets\').item.json.URL }} \n\n\n## Content Structure:\n{{ $json.output }} \n\n## Take internal links from webflow tool',
							options: {},
							promptType: 'define',
							hasOutputParser: true,
						},
						subnodes: {
							tools: [
								tool({
									type: 'n8n-nodes-base.webflowTool',
									version: 2,
									config: {
										parameters: {
											siteId: '648717e882e5860a12ab9d1c',
											operation: 'getAll',
											collectionId: '64b1bae9c2d06f1241365376',
											descriptionType: 'manual',
											toolDescription:
												'Get URLs of current related articles on productai.photo so they can be used ad internal links.',
										},
										credentials: {
											webflowOAuth2Api: {
												id: 'credential-id',
												name: 'webflowOAuth2Api Credential',
											},
										},
										name: 'Get Articles',
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
											cachedResultName: 'Claude Sonnet 4',
										},
										options: { thinking: false, maxTokensToSample: 4096 },
									},
									credentials: {
										anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
									},
									name: 'Thinking Claude',
								},
							}),
							outputParser: outputParser({
								type: '@n8n/n8n-nodes-langchain.outputParserAutofixing',
								version: 1,
								config: {
									parameters: {
										options: {
											prompt:
												'Instructions:\n--------------\nOutput the format as:\n{\n"article": "long article text",\n"summary": "summary of article"\n}\n\n--------------\nCompletion:\n--------------\nAll attibutes are full field is {{completed}}\n\n--------------\n\nAbove, the Completion did not satisfy the constraints given in the Instructions.\nError:\n--------------\n{error}\n--------------\n\nPlease try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:\n\nWrite the article and give output',
										},
									},
									subnodes: {
										model: languageModel({
											type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
											version: 1.2,
											config: {
												parameters: {
													model: {
														__rl: true,
														mode: 'list',
														value: 'o4-mini',
														cachedResultName: 'o4-mini',
													},
													options: {},
												},
												credentials: {
													openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
												},
												name: 'OpenAI Mini model',
											},
										}),
										outputParser: outputParser({
											type: '@n8n/n8n-nodes-langchain.outputParserStructured',
											version: 1.2,
											config: {
												parameters: {
													jsonSchemaExample:
														'{\n"article": "long article text",\n"summary": "summary of article",\n"author": "Marko Balažic"\n}',
												},
												name: 'Structured Output Parser1',
											},
										}),
									},
									name: 'Auto-fixing Output Parser',
								},
							}),
						},
						position: [540, 100],
						name: 'Content writer',
					},
				}),
			],
			{
				version: 2.2,
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
								id: 'ce170e51-4f33-4b18-bf9d-85416b7c5ad6',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.output[1].percent_ok }}',
								rightValue: 60,
							},
							{
								id: '39161f8c-bba5-4c48-b2d3-dda06a7ea84d',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.output[5].percent_ok }}',
								rightValue: 60,
							},
							{
								id: 'b8c3b829-3450-4952-816e-9240cf235f58',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.output[8].percent_ok }}',
								rightValue: 50,
							},
						],
					},
				},
				name: 'Is it good enough?',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n"input": {\n      "prompt": "{{$json.output.replace(/[\\"“”’\\n]/g, \'\')}}",\n      "go_fast": false,\n      "lora_scale": 1,\n      "megapixels": "1",\n      "num_outputs": 1,\n      "aspect_ratio": "16:9",\n      "output_format": "png",\n      "guidance_scale": 3.5,\n      "output_quality": 100,\n      "prompt_strength": 0.8,\n      "extra_lora_scale": 1,\n      "num_inference_steps": 50\n}\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: '=Bearer <token> //move this up',
							},
							{ name: 'Prefer', value: 'wait' },
						],
					},
				},
				position: [1440, -200],
				name: 'HTTP Request1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 30 }, position: [1400, 20] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.urls.get }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer <token>' }],
					},
				},
				position: [1600, 20],
				name: 'get_image_url',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			config: {
				parameters: {
					select: 'channel',
					message:
						'={\n  "blocks": [\n    {\n      "type": "section",\n      "text": {\n        "type": "mrkdwn",\n        "text": "*New article waiting to be published on Webflow*:{{ $(\'Content writer\').item.json.output.match(/^# (.*)/)?.[1] || \'Untitled\' }}"\n      },\n      "accessory": {\n        "type": "image",\n        "image_url": "{{ $json.output }}",\n        "alt_text": "Article thumbnail"\n      }\n    }\n  ]\n}',
					options: {},
					channelId: {
						__rl: true,
						mode: 'list',
						value: 'C090P7V3QUQ',
						cachedResultName: 'n8n-trigger',
					},
					operation: 'sendAndWait',
					authentication: 'oAuth2',
				},
				credentials: {
					slackOAuth2Api: { id: 'credential-id', name: 'slackOAuth2Api Credential' },
				},
				position: [1560, 260],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							Completed: '=true',
							row_number: "={{ $('Google Sheets').item.json.row_number }}",
						},
						schema: [
							{
								id: 'URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Traffic',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Traffic',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Traffic value',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Traffic value',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Top keyword',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Top keyword',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Position',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Position',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Completed',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Completed',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['row_number'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 268886635,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/130zi0ImQlwMxzYEFXE9yUOmjqZ5u-d2gyUUc5ncKP5c/edit#gid=268886635',
						cachedResultName: 'Blogs (ideas)',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '16rMg45cnPeJMoaCQmmhF5dvsbpkwtINUTx57WEkcDDM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/16rMg45cnPeJMoaCQmmhF5dvsbpkwtINUTx57WEkcDDM/edit?usp=drivesdk',
						cachedResultName: 'Example SEO research',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1880, 320],
				name: 'Google Sheets1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [2080, 260], name: 'No Operation, do nothing' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.webflow',
			version: 2,
			config: {
				parameters: {
					live: true,
					siteId: '648717e882e5860a12ab9d1c',
					fieldsUi: {
						fieldValues: [
							{
								fieldId: 'cover-image',
								fieldValue: "={{ $('get_image_url').item.json.output }}",
							},
							{
								fieldId: 'name',
								fieldValue:
									"={{ $('Content writer').item.json.output.article.match(/<h2>(.*?)<\\/h2>/)?.[1].trim() || '' }}",
							},
							{
								fieldId: 'article-body-text',
								fieldValue:
									"={{ $('Content writer').item.json.output.article.replace(/<h1>|<\\/h1>/g, '') }}",
							},
							{ fieldId: 'read-time', fieldValue: '5 min' },
							{
								fieldId: 'short-paragraph',
								fieldValue: "={{ $('Content writer').item.json.output.summary }}",
							},
							{
								fieldId: 'first-post-image',
								fieldValue: "={{ $('get_image_url').item.json.output }}",
							},
						],
					},
					operation: 'create',
					collectionId: '64b1bae9c2d06f1241365376',
				},
				credentials: {
					webflowOAuth2Api: { id: 'credential-id', name: 'webflowOAuth2Api Credential' },
				},
				position: [1880, 140],
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			config: {
				parameters: {
					text: 'Looks like Content writer produced nothing',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'list',
						value: 'C090P7V3QUQ',
						cachedResultName: 'n8n-trigger',
					},
					otherOptions: {},
					authentication: 'oAuth2',
				},
				credentials: {
					slackOAuth2Api: { id: 'credential-id', name: 'slackOAuth2Api Credential' },
				},
				position: [1560, 440],
				name: 'Send error',
			},
		}),
	)
	.add(
		sticky('## Content production ', { color: 7, position: [1340, -400], width: 420, height: 560 }),
	)
	.add(
		sticky('## Content publishing', {
			name: 'Sticky Note1',
			color: 7,
			position: [1800, 40],
			width: 500,
			height: 580,
		}),
	)
	.add(
		sticky('## Human check', {
			name: 'Sticky Note2',
			color: 7,
			position: [1460, 180],
			width: 300,
			height: 440,
		}),
	)
	.add(
		sticky('## SEO quality vatidation ', {
			name: 'Sticky Note3',
			color: 7,
			position: [920, -400],
			width: 400,
			height: 280,
		}),
	)
	.add(
		sticky('## Content layout?', {
			name: 'Sticky Note4',
			color: 7,
			position: [40, -60],
			width: 400,
			height: 500,
		}),
	)
	.add(
		sticky('## Content writer', {
			name: 'Sticky Note5',
			color: 7,
			position: [460, -40],
			width: 860,
			height: 560,
		}),
	);
