const wf = workflow('sgcKe5gsmJFdEAe3', 'ai-trend-email-alerter-weaviate', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ daysInterval: 7 }, {}] } },
				position: [-128, 752],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.dateTime',
			version: 2,
			config: { parameters: { options: {} }, position: [48, 752], name: 'Get Current Date' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.dateTime',
			version: 2,
			config: {
				parameters: {
					options: {},
					duration: 7,
					magnitude: '={{ $json.currentDate }}',
					operation: 'subtractFromDate',
					outputFieldName: 'startDate',
				},
				position: [240, 752],
				name: 'Date & Time',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://export.arxiv.org/api/query?search_query=cat:cs.LG+OR+cat:stat.ML&sortBy=submittedDate&sortOrder=descending&start=0&max_results=10&last_update_date_from={{ $(\'Date & Time\').item.json.startDate.toDateTime().toFormat("yyyyMMdd") }}\n',
					options: {},
				},
				position: [528, 752],
				name: 'Query arXiv',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.xml',
			version: 1,
			config: { parameters: { options: {} }, position: [832, 752], name: 'Convert XML to JSON' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'feed.entry' },
				position: [1024, 752],
				name: 'Split Results',
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
								id: '428846a4-8555-48cc-aded-bb0beb5fb123',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '40614d42-547f-48d6-8fde-4d94b7a4963c',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '1bcd0610-3a4a-4ee8-aa78-673319282cf5',
								name: 'summary',
								type: 'string',
								value: '={{ $json.summary }}',
							},
							{
								id: 'd49b5557-9379-4132-b2c4-cf155aca7428',
								name: 'author',
								type: 'string',
								value:
									'={{\n  Array.isArray($json.author)\n    ? $json.author.map(author => author.name)\n    : ($json.author && $json.author.name ? [$json.author.name] : [])\n}}',
							},
							{
								id: 'ed8d5a76-bc40-4fa7-9f19-61f2a3429f1d',
								name: 'published',
								type: 'string',
								value: '={{ new Date($json.published).toISOString() }}',
							},
							{
								id: '6e6fbfb5-d2bb-474f-9885-d65438c8b271',
								name: 'category',
								type: 'string',
								value:
									'={{   Array.isArray($json.category)     ? $json.category.map(category => category.term)     : ($json.category && $json.category.term ? [$json.category.term] : []) }}',
							},
						],
					},
				},
				position: [1232, 752],
				name: 'Prep Data for Weaviate',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.removeDuplicates',
			version: 2,
			config: {
				parameters: { compare: '={{ $json.id }}', options: {} },
				position: [1424, 752],
				name: 'Remove Duplicates',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Classify the following arXiv papers:\n\n```json\nTitle: {{ $json.title }}\nAbstract: {{ $json.summary }}',
					options: {
						systemMessage:
							'=You are an expert AI agent designed to classify academic research papers. Your task is to analyze the provided arXiv paper data and categorize it based on its content.\n\nInput Data Schema:\nThe input data will be a JSON object with the following structure:\n\n{\n  "title": "string",\n  "summary": "string"\n}\n\nYou MUST respond with a JSON object containing the following fields:\n\n"primary_category": (string) The single most relevant primary category for the paper. You MUST choose one category from the following predefined list. Do NOT use any category not on this list.\n\n"secondary_categories": (array of strings) Up to two additional relevant secondary categories. These are optional; if no secondary categories apply, provide an empty array []. If chosen, they MUST also be from the predefined list.\n\n"potential_impact": (integer) An integer score from 1 to 5, judging the paper\'s potential impact based on these criteria:\n\n1: Papers with no new existing information or limited results.\n\n2: Papers with minor incremental contributions or limited novelty.\n\n3: Papers with solid contributions, good results, and clear utility, but not groundbreaking.\n\n4: Papers with significant advancements, novel approaches, or strong potential to influence the field.\n\n5: Papers that are potential game-changers, representing paradigm shifts, or opening entirely new research directions.\n\nPredefined Categories and Definitions:\n\nFoundation Models: Models trained on broad data at scale, designed to be adaptable to a wide range of downstream tasks (e.g., large language models, large vision models, multi-modal models).\n\nLLM Fine-tuning: Techniques and methodologies for adapting pre-trained Large Language Models (LLMs) to specific tasks or datasets.\n\nParameter-Efficient Fine-tuning (PEFT): Methods that enable efficient adaptation of large pre-trained models to new tasks with minimal computational cost, by updating only a small subset of parameters (e.g., LoRA, Prompt Tuning).\n\nRetrieval-Augmented Generation (RAG): Architectures or systems that combine generative models (like LLMs) with information retrieval mechanisms to enhance the factual accuracy and relevance of generated outputs by referencing external knowledge bases.\n\nModel Quantization: Techniques for reducing the precision of model parameters (e.g., from float32 to int8) to decrease model size, memory footprint, and computational requirements, often for efficient deployment on edge devices.\n\nAgentic AI / AI Agents: Systems designed for autonomous decision-making, planning, and action in dynamic environments, often involving reasoning, memory, and tool use.\n\nMultimodality: Models capable of processing, understanding, and generating content across multiple data types or modalities (e.g., text and images, audio and video).\n\nReinforcement Learning: A paradigm where an agent learns to make decisions by performing actions in an environment to maximize a cumulative reward, often through trial and error.\n\nComputer Vision (Specific Techniques): Papers focusing on particular computer vision tasks or methodologies that are not primarily about foundation models (e.g., 3D reconstruction, object detection, image segmentation, pose estimation).\n\nNatural Language Processing (Specific Techniques): Papers focusing on particular NLP tasks or methodologies that are not primarily about foundation models or LLM fine-tuning (e.g., text summarization, machine translation, sentiment analysis, named entity recognition).\n\nEthical AI / AI Safety: Research addressing the societal implications of AI, including fairness, bias detection and mitigation, interpretability, transparency, privacy, and alignment with human values.\n\nEfficient AI / AI Optimization: Techniques aimed at improving the computational efficiency, speed, or resource usage of AI models beyond just quantization, including architecture search, inference optimization, and hardware-aware design.\n\nData-centric AI: Approaches that prioritize improving the quality, quantity, and organization of data used to train AI models, rather than solely focusing on model architecture improvements.\n\nOther: A catch-all category for articles that don\'t fall into one of the classes mentioned above.\n\nFocus solely on the content of the paper\'s title, summary, and categories to make your classification. Do NOT include any conversational text or explanations in your response, only the JSON object.',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'anthropic/claude-3.7-sonnet', options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model1',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								autoFix: true,
								jsonSchemaExample:
									'{\n	"primary_category": "LLM Fine-tuning",\n	"secondary_categories": ["Parameter-Efficient Fine-tuning (PEFT)", "Data-centric AI"],\n    "potential_impact": 1\n}',
							},
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
									version: 1,
									config: {
										parameters: { model: 'anthropic/claude-3.7-sonnet', options: {} },
										credentials: {
											openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
										},
										name: 'OpenRouter Chat Model2',
									},
								}),
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [1984, 752],
				name: 'Enrich Articles with Topic Classification',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [2704, 752],
				name: 'Merge',
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
								id: 'bd542bdd-d919-4688-a34d-395dd003e832',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '714d07a2-0c05-4d12-bba4-b37ca21c6521',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: 'ec2e4ccb-70ec-4d12-8d5b-8b5359b93315',
								name: 'summary',
								type: 'string',
								value: '={{ $json.summary }}',
							},
							{
								id: 'acae59b4-d167-42e5-8f07-f799d2cefcdf',
								name: 'author',
								type: 'string',
								value: '={{ $json.author }}',
							},
							{
								id: '0b74d264-c314-4522-9e7e-37d6a13e4247',
								name: 'published',
								type: 'string',
								value: '={{ $json.published }}',
							},
							{
								id: 'e6f4a0a9-8b6c-47ab-9abb-29d530c21f2c',
								name: 'category',
								type: 'string',
								value: '={{ $json.category }}',
							},
							{
								id: 'a808ca6a-6847-4730-a0ed-2b1dbdb5ad8a',
								name: 'primary_topic',
								type: 'string',
								value: '={{ $json.output.primary_category }}',
							},
							{
								id: '4f82732d-4f67-4047-bd67-6c00dd1c9a80',
								name: 'secondary_topics',
								type: 'string',
								value: '={{ $json.output.secondary_categories }}',
							},
							{
								id: '322c2946-8a90-451a-b484-bc1da68fb178',
								name: 'potential_impact',
								type: 'number',
								value: '={{ parseFloat($json.output.potential_impact) }}',
							},
						],
					},
				},
				position: [2912, 752],
				name: 'Remove Fields',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate',
			version: 1.2,
			config: {
				parameters: {
					mode: 'insert',
					options: { textKey: 'summary' },
					weaviateCollection: { __rl: true, mode: 'id', value: 'ArxivArticles' },
				},
				credentials: {
					weaviateApi: { id: 'credential-id', name: 'weaviateApi Credential' },
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
							name: 'Embeddings OpenAI',
						},
					}),
					documentLoader: documentLoader({
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						version: 1,
						config: {
							parameters: {
								options: {
									metadata: {
										metadataValues: [
											{
												name: 'arxiv_id',
												value: "={{ $('Remove Fields').item.json.id }}",
											},
											{
												name: 'published',
												value: "={{ $('Remove Fields').item.json.published }}",
											},
											{
												name: 'author',
												value: "={{ $('Remove Fields').item.json.author }}",
											},
											{
												name: 'title',
												value: "={{ $('Remove Fields').item.json.title }}",
											},
											{
												name: 'category',
												value: "={{ $('Remove Fields').item.json.category }}",
											},
											{
												name: 'primary_topic',
												value: "={{ $('Remove Fields').item.json.primary_topic }}",
											},
											{
												name: '=secondary_topics',
												value: "={{ $('Remove Fields').item.json.secondary_topics }}",
											},
											{
												name: 'potential_impact',
												value: "={{ $('Remove Fields').item.json.potential_impact }}",
											},
										],
									},
								},
								jsonData: "={{ $('Remove Fields').item.json.summary }}",
								jsonMode: 'expressionData',
							},
							subnodes: {
								textSplitter: textSplitter({
									type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
									version: 1,
									config: {
										parameters: { options: {}, chunkSize: 2000 },
										name: 'Recursive Character Text Splitter1',
									},
								}),
							},
							name: 'Default Data Loader',
						},
					}),
				},
				position: [3440, 752],
				name: 'Weaviate Vector Store',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					fieldsToAggregate: {
						fieldToAggregate: [{ fieldToAggregate: 'metadata.arxiv_id' }],
					},
				},
				position: [4112, 752],
				name: 'Aggregate Uploaded arXiv IDs',
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
								id: 'dea40507-a706-4792-b0b4-673d655ec877',
								name: 'sessionId',
								type: 'string',
								value: 'static_id',
							},
						],
					},
				},
				position: [4400, 752],
				name: 'Add Static sessionId',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Please provide a summarized trend analysis using the articles stored in the Weaviate vector store.',
					options: {
						systemMessage:
							'=**CRITICAL: YOUR FINAL RESPONSE MUST CONTAIN ABSOLUTELY NO MARKDOWN CODE FENCES (```JSON) OR ANY OTHER TEXT OUTSIDE THE PURE JSON OBJECT. IMMEDIATELY PROVIDE THE JSON.**\n\nYou are an expert AI and Machine Learning research analyst, specifically tasked with synthesizing weekly trends from arXiv publications. Your goal is to generate a concise, approachable, and easy-to-read email summary for a general audience interested in the latest developments in AI and ML. You must use the Weaviate Vector Store1 and perform a proper vector search to retrieve the data. If you were unable to retrieve data, please repeatedly try again until you can. Do not hallucinate, do not make anything up, do not rely on your memory.\n\n**Input Data:**\nYou will receive an array of JSON objects, where each object represents a single AI/ML article published on arXiv in the last week. You MUST analyze this entire collection of articles to identify key trends and notable research. Each article object has the following fields:\n- `arxiv_id`: The FULL arXiv URL of the article. (e.g. "http://arxiv.org/abs/2507.02863v1")\n- `title`: The title of the article.\n- `main_findings`: The main findings of the paper.\n- `primary_topic`: The primary topic assigned to the article (e.g., "Language Model Evaluation").\n- `secondary_topics`: A list of secondary topics assigned to the article (e.g., ["Generative AI", "Natural Language Processing"]).\n- `paper_quality`: A numerical score from 1 (very poor) to 5 (excellent quality), representing the predicted research quality.\n- `potential_impact`: A numerical score from 1 (not important) to 5 (potential paradigm shift, huge game-changer), representing the predicted impact on the field.\n\nYou will also recieve an array of JSONs with article counts by primary topic. Incorporate this into your trend anaylsis by focusing on topics with the most number of publications. Use this to guide the rest of the analysis\n\n**Trend Identification and Selection Rules:**\n- **Get article counts by `primary_topic`:** First, perform an aggregate query in the Weaviate vector store to get the counts of articles published by `primary_topic`. Use these counts to inform the rest of your analysis, focusing on the most-published topics. \n- **Identify Key Trends:** Group papers by `primary_topic` and `secondary_topics`. Prioritize trends with a higher number of associated papers, or papers with higher `potential_impact` or `paper_quality` scores.\n- **Select Representative Papers for Citation:** For each trend you summarize, choose 1-2 representative papers. These should ideally be the highest `potential_impact` or `paper_quality` papers relevant to that trend from the provided input data.\n- **Infer Future Outlook:** Based on the collective summaries and topics of the provided articles, infer and summarize likely future research directions.\n\n**Output Format (Strict JSON):**\nYour entire response MUST be **only** a valid JSON object.\n- **DO NOT include any Markdown code fences (```json) or any other text before or after the JSON object.**\n- The JSON object MUST contain exactly two top-level keys: "subject" and "body".\n- The value for "subject" MUST be a single string. It MUST always start with "✨ ML Weekly Update:" and the rest should be a succinct summary of the report\'s top trends for the week.\n- The value for "body" MUST be a single string representing the full email content in Markdown format. Use `\\\\n` for newlines within the body string. All double quotes within string values MUST be escaped as `\\"`.\n- You must cite all of your conclusions with the matching `arxiv_id` for the paper. Cite the in markdown format so that the user can click on a word related to the paper which is linked to the `arxiv_id`.\n\nHere is an example of a citation:\n...including [MOTIF](http://arxiv.org/abs/2507.02851v1) which enables modular thinking beyond context limitations\n\nUse ONLY data from the `arxiv_id` field for citations. Do NOT create an arXiv_id spontaneously.\n\nExample JSON Output (strictly adhere to this format):\n```json\n{\n  "subject": "✨ ML Weekly Update: BERT gets an upgrade, new PEFT techniques, and ML for radiology",\n  "body": "Rest of email in markdown format here."\n}\n\nFollow this format strictly for the email, giving the body output in markdown format:\n\nHey there,\n\nHere\'s a quick rundown of the key trends in Machine Learning research from the past week.\n\n## 💫 Key Research Trends This Week\nA one-sentence summary of the main trends covered in the report.\n* Bullet 1: A specific trend explained in 1 sentence or less, with the corresponding `arxiv_id` from the input report.\n* Bullet 2: A specific trend explained in 1 sentence or less, with the corresponding `arxiv_id` from the input report.\n* Bullet 3: A specific trend explained in 1 sentence or less, with the corresponding `arxiv_id` from the input report.\n** Write a maximum of 3 bullet points **\n\n## 🔮 Future Research Directions\nA one-sentence summary of future research directions from the report.\n* Bullet 1: A specific prediction explained in 1 sentence or less.\n* Bullet 2: A specific prediction explained in 1 sentence or less.\n* Bullet 3: A specific prediction explained in 1 sentence or less.\n** Write a maximum of 3 bullet points **\n\nGive a one sentence summary of the email. Then follow it with some short tips on what to look for in terms of new developments over the coming week.\n\nUntil next week,\n\nArchi 🧑🏽‍🔬',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: { sessionKey: 'sessionId', sessionIdType: 'customKey' },
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: {
								model: 'anthropic/claude-3.7-sonnet',
								options: { temperature: 2 },
							},
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model',
						},
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate',
							version: 1.2,
							config: {
								parameters: {
									mode: 'retrieve-as-tool',
									options: {},
									toolName: 'ArxivPapers',
									toolDescription:
										'This tool allows you to query the Weaviate Vector Store1 to retrieve arXiv article titles, summary and other metadata to be used as the sole data source performing a trend analysis. You must query the database to get information for the trend analysis.',
									weaviateCollection: { __rl: true, mode: 'id', value: 'ArxivArticles' },
								},
								credentials: {
									weaviateApi: { id: 'credential-id', name: 'weaviateApi Credential' },
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
								},
								name: 'Weaviate Vector Store1',
							},
						}),
					],
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample: '{\n  "subject":"...",\n  "body":"..."\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [48, 1584],
				name: 'Agentic RAG for Trend Analysis',
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
								id: '42cf92c6-730d-4abf-a578-480f71e220da',
								name: 'subject',
								type: 'string',
								value: '={{ $json.output.subject }}',
							},
							{
								id: 'c1f254e2-8333-431e-a6f1-0efa38f4fd3b',
								name: 'output.body',
								type: 'string',
								value: "={{ $json.output.body.replace(/\\\\n/g, '\\n') }}",
							},
						],
					},
				},
				position: [832, 1584],
				name: 'Post Process Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.markdown',
			version: 1,
			config: {
				parameters: {
					mode: 'markdownToHtml',
					options: { simplifiedAutoLink: true },
					markdown: '={{ $json.output.body }}',
					destinationKey: '=data',
				},
				position: [1088, 1584],
				name: 'Markdown',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: '={{ $json.data }}',
					options: {},
					subject: '={{ $json.subject }}',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [1520, 1584],
				name: 'Send email',
			},
		}),
	)
	.add(
		sticky(
			"## 1. Specify date range for weekly automation\n1. Calculate today's date\n2. Calculate dates for the last week based on today",
			{ name: 'Sticky Note7', color: 5, position: [0, 560], width: 380, height: 340 },
		),
	)
	.add(
		sticky(
			'## 2. Fetch weekly articles from arXiv.\nFetch ML article abstracts by querying the free arXiv API.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nThe number of maximum papers returned is set by default to 200. You can change this by editing `max_results` in the query node.',
			{ name: 'Sticky Note8', color: 5, position: [400, 560], width: 360, height: 452 },
		),
	)
	.add(
		sticky(
			'## 3. Pre-process data\n1. Convert XML response to JSON.\n2. Split results by article ID.\n3. Format data for Weaviate.\n4. Remove any duplicates, if they exist.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nSpecifically, we are merging fields that have multiple entries, like `author`, and `category` into an Array of strings and adding datetime formatting to the publication date.',
			{ name: 'Sticky Note9', color: 5, position: [784, 560], width: 820, height: 420 },
		),
	)
	.add(
		sticky(
			'## 6. Create a new Weaviate collection in existing cloud cluster\n1. Connect to your Weaviate Cloud or local credentials.\n2. Set `Operation Mode` to `Insert Documents`.\n3. To insert new data into a **new** `Weaviate Collection`, select `By ID` and give your collection a name in SnakeCase format.\n4. To insert data into an **existing** `Weaviate Collection`, select `From List` and choose your existing collection from the drop down menu.\n\n\n    \n\n\n\n\n\n\n\n\n\n5. Under `Options`, click `Add Option` and select `Text Key`. This is the field for which embeddings will be generated. In this example, we are embedding the `summary` field in our data, as this is the abstract text for the articles.',
			{ name: 'Sticky Note10', color: 5, position: [3104, 560], width: 840, height: 380 },
		),
	)
	.add(
		sticky(
			"## 7. Configure components for embeddings\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n__Embeddings Node__\n1. Select your embedding provider and model connect it to your credentials.\n  \n__Data Loader__\n2. The `Type of Data` we're loading is `JSON`.\n3. If you are including metadata (we are), set `Mode` to `Load Specific Data`.\n4. The `Data` field represents the data we want to generate embeddings for.\n5. Under `Options` we define our metadata schema.\n\n__Text Splitter__\n6. We're using the Recursive Character Text Splitter and setting our `Chunk Size` to `2000` to get one chunk per abstract (but feel free to experiment!)",
			{ name: 'Sticky Note11', color: 5, position: [3264, 960], width: 560, height: 580 },
		),
	)
	.add(
		sticky(
			"## 8. Confirm that articles have been uploaded.\nThese steps serve as verification that the new weekly articles have been successfully uploaded into Weaviate before proceeding to run the AI Agent node. The list of articles will generate a static `session_id` that serves as that verification.\n1. Get a list of all the arXiv ID's just uploaded into Weaviate.\n2. Generate a static `session_id` that will serve as a trigger for the AI Agent node.",
			{ name: 'Sticky Note12', color: 5, position: [3968, 560], width: 700, height: 340 },
		),
	)
	.add(
		sticky(
			'## 1. Configure the AI Agent node with Weaviate as a _TOOL_\n1. Set  `Source for Prompt (User Message)` to `Define below`.\n2. In `Prompt (User Message)`, give a short explanation of the retrieval and analysis tasks to be performed.\n3. Under `Options`, click `Add Option` to add the `System Message`, also known as the system prompt. Provide specific instructions for the agent, including:\n\n\n\n\n\n\n\n\n\n\n\n\n\n* Instructions to query the Weaviate vector store\n* Explanation and schema of data in Weaviate\n* Instructions on how to determine trends\n* Specified output format\n* Example of real output\n\n',
			{ name: 'Sticky Note13', color: 6, position: [32, 1392], width: 660, height: 500 },
		),
	)
	.add(
		sticky(
			"## 3. Configure Weaviate Vector Store\n1. Select the same credentials (cloud or local) to connect with as earlier.\n2. Set `Operation Mode` to `Retrieve Documents as Tool for AI Agent`.\n3. Add a `Description` to the tool that tells the LLM how to use the Weaviate vector store. **This description is very important! A poor tool description can result in the agent not using the tool. A good description includes, what the tools allows the agent to do and what the agent should do with the tool. You can be forceful in your tone, here.**\n4. Connect to existing vector store by selecting `By ID` and type in the same collection name as above: `ArxivArticles`.\n5. Turn on `Include Metadata`, as publication dates, titles, and arXiv URLs are all critical to the agent's response.\n6. Select OpenAI as the embedding provider for the query.",
			{ name: 'Sticky Note14', color: 6, position: [32, 1920], width: 500, height: 640 },
		),
	)
	.add(
		sticky(
			'## 4. Add model, memory, and output parser\n1. We\'re using the OpenRouter Chat Model node so that we can use Google Gemini for the agent.\n2. Add simple (short-term) memory to the agent, setting `Session ID` to `Define Below` and `Key` to `sessionId` (which is our static session ID because we are only using short-term memory and not storing the agent output for future use.\n3. Add the `Structured Output Parser` node and set `Schema Type` to `Generate from JSON Example`.\n4. In `JSON Example`, we define the format of the output for the agent, which will be a subject line and body text for the resulting summary email we want to generate:\n\n```\n{\n  "subject": "...",\n  "body": "..."\n}\n```',
			{ name: 'Sticky Note15', color: 6, position: [544, 1920], width: 744, height: 640 },
		),
	)
	.add(
		sticky(
			'## 2. Post-process agent response\n1. Use the `Edit Fields` node to add an expression that replaces "\\n\\n" in the agent\'s response with actual page breaks (so that it can be properly parsed as markdown text).\n2. Add the `Markdown to HTML` node to convert the body text of the email to HTML. \n3. We give the output a name in `Destination Key`.\n4. Add the option for `Automatic Linking to URLs`.',
			{ name: 'Sticky Note16', color: 6, position: [704, 1392], width: 600, height: 400 },
		),
	)
	.add(
		sticky(
			'## 5. Send the output as an email!\n1. Select your `STMP Account` credential.\n2. Set the `Subject` equal to the subject key `{{ $json.output.subject }}`.\n3. Set `Email Format` to `HTML`.\n4. Set `HTML` to `{{ $json.data }}` (the post-processed body text).',
			{ name: 'Sticky Note17', color: 6, position: [1328, 1392], width: 520, height: 400 },
		),
	)
	.add(
		sticky(
			"# Part 1: Fetch, clean, enrich and insert arXiv abstracts into Weaviate\nIn the first part of this workflow, we activate a `Schedule Trigger` to fetch AI and ML abstracts (along with their metadata like article title, authors, publication date, etc.) on a weekly basis. We clean the data and then enrich it with a LLM that will predict label it with topic categories and predict each article's potential impact in the field. Finally, we upload the enriched and cleaned data into a Weaviate collection and verify that the data has been uploaded.",
			{ name: 'Sticky Note18', color: 5, position: [0, 400], width: 1600, height: 140 },
		),
	)
	.add(
		sticky(
			'# Part 2: Use agentic RAG to identify research trends and send them in an email\nIn this part of the workflow, we configure an AI Agent node to work with Weaviate as a tool. The entire embedded collection of embedded article abstracts, along with their metadata, are at the disposal of the agent. We instruct the agent to use Weaviate as a tool, describe available input data, and give directions for how to identify trends and structure the summary email. We clean up the data and then send it off via email.',
			{ name: 'Sticky Note19', color: 6, position: [32, 1232], width: 1580, height: 140 },
		),
	)
	.add(
		sticky(
			'## 4. Enrich arXiv articles with topic classifications and potential impact predictions \n1. Set  `Source for Prompt (User Message)` to `Define below`.\n2. In `Prompt (User Message)`, give a short explanation of the classification task and point the agent towards the article title and abstract and fields.\n3. Under `Options`, click `Add Option` to add the `System Message`, also known as the system prompt. Enter specific instructions for making the classifications, including defining our categories:\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n * `primary_category`: (string) The single most relevant primary category for the paper out of a list of pre-defined topics.\n * `secondary_categories`: (array of strings) Up to two additional relevant secondary categories.\n * `potential_impact`: (integer) An integer score from 1 to 5 representing how impactful the research conclusions may be in the field at large.\n* Make sure that `Require Specific Output Format` is enabled.',
			{ color: 5, position: [1632, 560], width: 980, height: 460 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nChoose your models for the agent and structured output parser (we use `claude-3.7-sonnet`).',
			{ name: 'Sticky Note1', color: 5, position: [1920, 1040], width: 592, height: 380 },
		),
	)
	.add(
		sticky(
			'## 5. Post-process enriched data\n1. Merge the output from AI agent with the existing article data.\n2. Get rid of the redundant `"output"` field in the JSON.',
			{ name: 'Sticky Note2', color: 5, position: [2624, 560], width: 460, height: 340 },
		),
	)
	.add(
		sticky(
			'# Build a Weekly AI Trend Alerter with arXiv and Weaviate\n\n🧑🏽‍🔬 Ditch the endless scroll for AI trends. Meet Archi, your personal AI trend scout that hits you up once a week with everyone you need to know.\n\nThis workflow scrapes AI and machine learning article abstracts from [arxiv](arxiv.org), enriches them with topic categories using a LLM, and embeds them in a [Weaviate](Weaviate) vector store. The vector store is then used as a tool for agentic RAG to write a concise, easy-to-read summary of the week in research.\n\n## Prerequisites\n1.  **An existing Weaviate cluster.** You can view instructions for setting up a **local cluster** with Docker [here](https://weaviate.io/developers/weaviate/installation/docker-compose#starter-docker-compose-file) or a **Weaviate Cloud** cluster [here](https://weaviate.io/developers/wcs/quickstart).\n2.  **API keys** to generate embeddings and power chat models. We use a combination of [OpenRouter](https://openrouter.ai/) and [OpenAI](https://openai.com/) Feel free to switch out the models as you like.\n3.  **An email address with STMP privileges**. This is the address the email will come from. In this demo we use a personal Gmail address. You can create a new credential to link a `STMP Account` using these [instructions](https://docs.n8n.io/integrations/builtin/credentials/sendemail/).\n4.  **Self-hosted n8n instance.** See this [video](https://www.youtube.com/watch?v=kq5bmrjPPAY&t=108s) for how to get set up in just three minutes.\n  \n\n💚 Sign up [here](https://console.weaviate.cloud/?utm_source=recipe&utm_campaign=n8n&utm_content=n8n_arxiv_template) for a 14-day free trial of Weaviate Cloud (no credit card required).',
			{ name: 'Sticky Note3', color: 4, width: 1600, height: 380 },
		),
	);
