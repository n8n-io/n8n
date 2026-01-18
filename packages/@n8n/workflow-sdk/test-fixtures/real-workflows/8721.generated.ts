const wf = workflow('mGgSDkJTDBI4mq1J', 'Categorize Keywords', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-1024, 864], name: 'When clicking ‘Test workflow’' },
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
								id: '99f5e2d5-6280-4a72-b012-1c67f650cf61',
								name: 'airtable_base_id',
								type: 'string',
								value: 'apprrQ0Dv1cJOfMi9',
							},
							{
								id: 'e858bffe-72b3-4a26-80db-c4cfc39215c0',
								name: 'categories_table_id',
								type: 'string',
								value: 'tblD8sMi6W4EikkN4',
							},
							{
								id: '753f86c8-f0fd-4207-87f4-315860219035',
								name: 'content_ideas_from_kws_table_id',
								type: 'string',
								value: 'tblRDR7uE4b73ZpRt',
							},
							{
								id: '0b487ade-b243-42fd-884c-5dae08f6cd84',
								name: 'clusters_table_id',
								type: 'string',
								value: 'tblDRGVjI1vPuJxvm',
							},
							{
								id: '0ff536ed-aba0-4d47-bc6f-c42c39f6874d',
								name: 'content_ideas_from_clusters_table_id',
								type: 'string',
								value: 'tbl7trYCu9sSGdRTJ',
							},
							{
								id: '5bb24a3e-a434-4817-9041-b39bbe09c60b',
								name: 'master_all_kw_variations_table_id',
								type: 'string',
								value: 'tblHz4bwclrB24afu',
							},
						],
					},
				},
				position: [-736, 864],
				name: 'Set Airtable Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'id',
						value: '={{ $json.airtable_base_id }}',
					},
					table: {
						__rl: true,
						mode: 'id',
						value: '={{ $json.master_all_kw_variations_table_id }}',
					},
					options: {},
					operation: 'search',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [-480, 864],
				name: 'Airtable Get All KWs',
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
								id: 'acee4494-86dc-4f48-b5d8-e18e7db9eaaa',
								name: 'keyword',
								type: 'string',
								value: '={{ $json.Keyword }}',
							},
							{
								id: '575ec827-4dd3-4d4c-8aca-14c80f4a9015',
								name: 'record_id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: 'b5d76b17-8473-4369-9c50-7c0194bce34e',
								name: 'primary_keyword',
								type: 'string',
								value: "={{ $json['Primary Keyword'] }}",
							},
							{
								id: '8e4e71d4-662f-4c59-9f01-5b0f14ffb54f',
								name: 'competition',
								type: 'string',
								value: '={{ $json.Competition }}',
							},
							{
								id: '5925b3bb-8581-4dfa-9aec-b3578cabef35',
								name: 'msv',
								type: 'number',
								value: '={{ $json.MSV }}',
							},
							{
								id: '4de58314-1701-4a95-9826-f28233c1a87d',
								name: 'search_intent',
								type: 'string',
								value: "={{ $json['Search Intent'] }}",
							},
							{
								id: 'dfb906d8-3c2e-446e-bee3-d24ba4610927',
								name: 'kw_difficulty',
								type: 'number',
								value: "={{ $json['KW Difficulty'] }}",
							},
							{
								id: '2fdf1cd1-742b-418b-8966-33823c5aa90b',
								name: 'type',
								type: 'string',
								value: '={{ $json.Type }}',
							},
							{
								id: '89472023-1df7-4d64-b874-9106dee97866',
								name: 'cpc',
								type: 'number',
								value: '={{ $json.CPC }}',
							},
							{
								id: '9fdccded-22de-4daf-86bb-67ae1db5bfec',
								name: 'Date Pulled from D4SEO',
								type: 'string',
								value: "={{ $json['Date Pulled from D4SEO'] }}",
							},
						],
					},
				},
				position: [-208, 864],
				name: 'Set WF Fields',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					include: 'specifiedFields',
					options: {},
					aggregate: 'aggregateAllItemData',
					fieldsToInclude: 'keyword, primary_keyword, type, search_intent',
				},
				position: [64, 1200],
				name: 'Aggregate Keywords for Agent',
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
								id: '909557e4-1568-4f9b-8fab-96cc37faf290',
								name: 'keyword_dataset',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [272, 1200],
				name: 'Set Field for Agent',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Analyze ALL keywords as a complete dataset and identify natural semantic clusters. Let the number and size of clusters emerge from the relationships in the data. Each keyword should be assigned to its most relevant cluster based on semantic meaning and user intent.\n\nGuidelines for clustering:\n- Identify genuine thematic relationships across keywords\n- Group keywords based on semantic similarity and shared user intents\n- Consider how different keyword types complement each other in revealing topic patterns\n- Let cluster count and size be determined by the natural groupings in the data\n- Each keyword should belong to exactly one cluster\n\nReturn a single-line JSON object with this structure (no line breaks):\n{\n  "total_keywords_processed": number,\n  "number_of_clusters": number,\n  "clusters": [\n    {\n      "cluster_name": "descriptive name",\n      "core_topic": "main theme or focus",\n      "intent_pattern": "primary user intent pattern",\n      "keywords": ["array of all keywords in this cluster"],\n      "reasoning": "explanation of why these keywords form a coherent cluster",\n      "primary_keyword": "the primary keyword"\n    }\n  ]\n}\n\nIMPORTANT: Do not include extra spaces, backticks ```, or any comments about what you did. Do not include \\n in any part of the output.\n\nInput data:\n{{ $json.keyword_dataset }}\n\n',
					options: {
						systemMessage:
							'=You are an AI expert in semantic analysis and content clustering. Your task is to analyze a collection of keywords holistically and identify natural semantic clusters based on:\n- Thematic relationships\n- User intent patterns\n- Topic hierarchies\n- Search behavior signals across different keyword types (direct searches, questions, suggestions)\n\nConsider both keywords with metrics (search_intent) and those without (people also ask, subtopics, autocomplete) as they represent different aspects of user intent.',
					},
					promptType: 'define',
				},
				position: [480, 1200],
				name: 'AI Agent Analyze and Cluster KWs',
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
								id: '99ad3918-128a-4617-a7b0-d4aac162316c',
								name: 'items',
								type: 'array',
								value: '={{ $json.output.parseJson().clusters }}',
							},
						],
					},
				},
				position: [992, 1168],
				name: 'Edit Fields1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'items' },
				position: [1200, 1168],
				name: 'Split Out',
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
								id: '1cccc58b-8eb5-473e-bd57-10b512b64226',
								name: 'cluster_name',
								type: 'string',
								value: '={{ $json.cluster_name }}',
							},
							{
								id: '9e00d18c-e025-4125-99a9-c6c46ba9ddc4',
								name: 'core_topic',
								type: 'string',
								value: '={{ $json.core_topic }}',
							},
							{
								id: 'eea33e0b-32c8-420c-ba7a-b0dd9cf45bcd',
								name: 'intent_pattern',
								type: 'string',
								value: '={{ $json.intent_pattern }}',
							},
							{
								id: '15a26f8f-73d4-4200-a22f-dfbe1f6a57ac',
								name: 'keywords',
								type: 'array',
								value: '={{ $json.keywords }}',
							},
							{
								id: 'd164bda0-5f4f-4763-a5ca-5d418b505384',
								name: 'reasoning',
								type: 'string',
								value: '={{ $json.reasoning }}',
							},
							{
								id: 'd9cdd3c1-ea3f-4f86-a7cc-2cb98560142e',
								name: 'primary_keyword',
								type: 'string',
								value: '={{ $json.primary_keyword }}',
							},
						],
					},
				},
				position: [1424, 1168],
				name: 'Set Fields for Airtable',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'keywords' },
				position: [1648, 1168],
				name: 'Split Out1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.airtable_base_id }}",
					},
					table: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.clusters_table_id }}",
					},
					columns: {
						value: {
							Intent: "={{ $('Set Fields for Airtable').item.json.intent_pattern }}",
							Keywords: '={{ $json.keywords }}',
							Reasoning: "={{ $('Set Fields for Airtable').item.json.reasoning }}",
							'Core Topic': "={{ $('Set Fields for Airtable').item.json.core_topic }}",
							'Cluster Name': "={{ $('Set Fields for Airtable').item.json.cluster_name }}",
							'Primary Keyword': "={{ $('Set Fields for Airtable').item.json.primary_keyword }}",
						},
						schema: [
							{
								id: 'Cluster Name',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Cluster Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Core Topic',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Core Topic',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Intent',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Intent',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Keywords',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Keywords',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Reasoning',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Reasoning',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Primary Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Primary Keyword',
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
					operation: 'create',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [1872, 1168],
				name: 'Clusters table',
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
								id: '99ad3918-128a-4617-a7b0-d4aac162316c',
								name: 'items',
								type: 'array',
								value: '={{ $json.output.parseJson().clusters }}',
							},
							{
								id: '478eb15a-a8bb-4fc5-b488-487dfdd1e3c7',
								name: 'number_of_clusters',
								type: 'string',
								value: '={{ $json.output.parseJson().number_of_clusters }}',
							},
						],
					},
				},
				position: [1024, 1504],
				name: 'Edit Fields2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'items' },
				position: [1248, 1504],
				name: 'Split Out2',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=For each of the {{ $(\'Edit Fields2\').item.json.number_of_clusters }} clusters, consider its:\n- cluster_name: {{ $json.cluster_name }}\n- core_topic: {{ $json.core_topic }}\n- intent_pattern:{{ $json.intent_pattern }}\n- keywords: {{ $json.keywords }}\n- reasoning: {{ $json.reasoning }}\n- primary_keyword: {{ $json.primary_keyword }}\nTo create one hub article and 5 spoke articles.\n\nYou are creating a hub and spoke content strategy. For each hub and spoke article, you will create:\n- title: an seo-optimized title that is engaging and reflects the article content. It is around 60 characters long.\n- description: 3 to 5 paragraphs desribing the article\n- keyword: the primary keyword of the article\n\nTo create the clusters group all keywords with the same cluster_name. Give each cluster a name and type of either hub or spoke. There will be one hub article and up to 5 spoke articles per cluster.\n\nThe hub article serves as the central piece of content that provides a broad overview of a main topic. The spoke articles are detailed content pieces that branch out from the hub, each focusing on specific subtopics.\n\nImportant: Each cluster as defined above should have one hub article and up to 5 spoke articles. Always make sure that hub and spoke articles are created for each cluster.\nConsider the following when creating the hub and spoke articles.\n1. cluster_name\n2. title\n- SEO-optimized\n- Under 62 characters\n3. description\n- 3-5 paragraphs desribing the article\n4. type \n- hub or spoke\n\nReturn a single-line JSON object with this structure for each cluster (no line breaks). \n    {\n      "cluster_name": "descriptive name",\n      "title": "the title",\n      "description": "the description",\n      "type": "either hub or spoke",\n      "keyword": "the primary keyword"\n      "reasoning": "reasoning for the cluster"\n    }\n\nImportant: Return ONLY the JSON array with NO line breaks (\\n), NO extra quotations, NO extra spaces, and NO additional text.\n\n\n\n',
					options: {
						systemMessage:
							'You are an AI content strategist specializing in creating seo-optimized hub and spoke content structures. For each cluster, create one main hub article and up to 5 supporting spoke articles that comprehensively cover the topic while maintaining SEO best practices and user intent.\n',
					},
					promptType: 'define',
				},
				position: [1440, 1504],
				name: 'Agent Create Content Opps',
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
								id: '99ad3918-128a-4617-a7b0-d4aac162316c',
								name: 'items',
								type: 'array',
								value: '={{ $json.output.parseJson() }}',
							},
						],
					},
				},
				position: [1792, 1504],
				name: 'Edit Fields3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'items' },
				position: [2000, 1504],
				name: 'Split Out3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.airtable_base_id }}",
					},
					table: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.content_ideas_from_clusters_table_id }}",
					},
					columns: {
						value: {
							Type: '={{ $json.type }}',
							Title: '={{ $json.title }}',
							Status: 'Not Started',
							Keyword: '={{ $json.keyword }}',
							Reasoning: '={{ $json.reasoning }}',
							Description: '={{ $json.description }}',
							'Cluster Name': '={{ $json.cluster_name }}',
							'Primary Keyword': "={{ $('Set WF Fields').first().json.primary_keyword }}",
						},
						schema: [
							{
								id: 'Cluster Name',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Cluster Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Title',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Description',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Type',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Reasoning',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Reasoning',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'options',
								display: true,
								options: [
									{ name: 'Not Started', value: 'Not Started' },
									{
										name: 'Send to Article Writer',
										value: 'Send to Article Writer',
									},
									{ name: 'Complete', value: 'Complete' },
									{ name: 'Delete', value: 'Delete' },
								],
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Primary Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Primary Keyword',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Keyword',
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
					operation: 'create',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [2240, 1504],
				name: 'Clusters Ideas Table',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Please categorize the following keywords according to the rules. Ensure every keyword is processed and included in the output.\n\nKeyword to Categorize and Data for Categorization:\n {{ $json.keyword }}\n{{ $json.msv }}\n{{ $json.search_intent }}\n{{ $json.kw_difficulty }}\n{{ $json.competition }}\n{{ $json.cpc }}\n',
					options: {
						systemMessage:
							'You are an AI agent specialized in analyzing and categorizing SEO keywords and search intent signals.\n\nCategorization Rules:\n1. Quick Wins:\n   - MSV > 100 AND KW Difficulty < 30\n   - These are opportunities for relatively fast ranking\n\n2. Authority Builders:\n   - KW Difficulty > 50 AND MSV > 200\n   - High-value terms worth investing in for authority building\n\n3. Emerging Topics:\n   - MSV < 100 OR (doesn\'t fit Quick Wins AND shows future potential)\n   - Focus on search intent and growth potential\n- Represent trends or novel concepts that are likely to grow in popularity\n\n4. Intent Signals:\n   - People Also Ask questions\n   - Direct user questions that show search intent\n   - Good opportunities for featured snippets and AI results\n   - Categorize here even if metrics are missing\n\n5. Semantic Topics:\n   - Autocomplete suggestions and semantic subtopics\n   - Related concepts that build topic authority\n   - Categorize here even if metrics are missing\n\n6. Unknown:\n   - Keywords that don\'t fit other categories\n   - Or have insufficient data and aren\'t questions/semantic topics\n\nReturn only a JSON object for each keyword with these exact fields:\n{\n    "keyword": "exact keyword text",\n    "category": "Quick Wins|Authority Builders|Emerging Topics|Intent Signals|Semantic Topics|Unknown",\n    "reasoning": "brief explanation of categorization",\n    "msv": number or null,\n    "kw_difficulty": number or null,\n    "search_intent": "original intent or null",\n    "competition": "original competition or null",\n    "cpc": number or null\n}\n\n\nImportant: Return ONLY the JSON object with NO line breaks (\\n), NO extra spaces, and NO additional text.\n\nImportant:\n- Process EVERY keyword in the input\n- Preserve all original data\n- Ensure total_processed matches input count\n- Provide brief reasoning for each categorization\n- please be accurate with the language, if the researches are made in Dutch, write in Dutch',
					},
					promptType: 'define',
				},
				position: [192, 368],
				name: 'Category AI Agent',
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
								id: '3f1f38b9-8941-4047-8904-270b17bfc2ed',
								name: 'keyword',
								type: 'string',
								value: '={{ JSON.parse($json.output).keyword }}',
							},
							{
								id: '849f572c-1339-4a83-bd4c-2b4c13cd80d4',
								name: 'category',
								type: 'string',
								value: '={{ JSON.parse($json.output).category }}',
							},
							{
								id: '5909d7fe-6050-490d-bf90-ad0817d882a0',
								name: 'reasoning',
								type: 'string',
								value: '={{ JSON.parse($json.output).reasoning }}',
							},
							{
								id: 'aeb81379-fba7-483d-828c-427f2851ee87',
								name: 'msv',
								type: 'number',
								value: '={{ JSON.parse($json.output).msv }}',
							},
							{
								id: '3b7b8188-de51-4a6b-95cb-73a8de200996',
								name: 'kw_difficulty',
								type: 'number',
								value: '={{ JSON.parse($json.output).kw_difficulty }}',
							},
							{
								id: '013f802d-6c2e-4519-8104-5d3951f845cd',
								name: 'search_intent',
								type: 'string',
								value: '={{ JSON.parse($json.output).search_intent }}',
							},
							{
								id: 'a2799b9e-8c28-4c02-8162-2874cae2bf2b',
								name: 'competition',
								type: 'string',
								value: '={{ JSON.parse($json.output).competition }}',
							},
							{
								id: '7929eaff-788c-43fa-899f-cd04953f8f7f',
								name: 'cpc',
								type: 'number',
								value: '={{ JSON.parse($json.output).cpc }}',
							},
						],
					},
				},
				position: [944, 240],
				name: 'Set Category Table Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.airtable_base_id }}",
					},
					table: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.categories_table_id }}",
					},
					columns: {
						value: {
							CPC: '={{ $json.cpc }}',
							MSV: '={{ $json.msv }}',
							Keyword: '={{ $json.keyword }}',
							Category: '={{ $json.category }}',
							Reasoning: '={{ $json.reasoning }}',
							Competition: '={{ $json.competition }}',
							'KW Difficulty': '={{ $json.kw_difficulty }}',
							'Search Intent': '={{ $json.search_intent }}',
						},
						schema: [
							{
								id: 'Category',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Keyword',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Reasoning',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Reasoning',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'MSV',
								type: 'number',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'MSV',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'KW Difficulty',
								type: 'number',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'KW Difficulty',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Search Intent',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Search Intent',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Competition',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Competition',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CPC',
								type: 'number',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'CPC',
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
					operation: 'create',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [1168, 240],
				name: 'Category Table',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
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
								id: 'fa613938-57a8-49f6-a01b-723028c6cbf3',
								operator: { type: 'string', operation: 'notEquals' },
								leftValue: '={{ $json.fields.Category }}',
								rightValue: 'Unknown',
							},
						],
					},
				},
				position: [880, 560],
				name: 'Filter Out Unknown',
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
								id: 'cae1e309-cab6-472a-9bfc-75448a504455',
								name: 'keyword',
								type: 'string',
								value: '={{ $json.fields.Keyword }}',
							},
							{
								id: '1c725316-fa66-401c-b028-6039c7845540',
								name: 'category',
								type: 'string',
								value: '={{ $json.fields.Category }}',
							},
							{
								id: '328a070b-312e-4c39-bacb-970d0e485e7a',
								name: 'reasoning',
								type: 'string',
								value: '={{ $json.fields.Reasoning }}',
							},
						],
					},
				},
				position: [1104, 560],
				name: 'Set Content from Category Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [1360, 560], name: 'Loop Over Items' },
		}),
	)
	.output(1)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=For each keyword, analyze its category and reasoning to create:\n\n1. A title that:\n   - Captures search intent\n   - Is engaging and clickable\n   - Includes the main keyword naturally\n   - Is optimized for both search and social sharing\n   - Is under 60 characters\n   - Aligns with the category context: {{ $json.category }}\n   \n2. A description that:\n   - Clearly outlines the main topics and key points the article should cover\n   - Indicates specific value readers will gain\n   - Provides enough context to guide content creation\n   - Naturally incorporates the keyword\n   - Is concise but comprehensive (aim for 2-3 sentences)\n   - Considers the categorization reasoning: {{ $json.reasoning }}\n\nInput:\n\n{{ $json.keyword }}\n\nReturn a single-line JSON object with this structure (no line breaks):\n{"keyword":"input keyword","title":"created title","description":"article description"}',
					options: {
						systemMessage:
							'You are an AI content strategist specialized in creating engaging, SEO-optimized titles and article descriptions.',
					},
					promptType: 'define',
				},
				position: [1584, 640],
				name: 'Content Ideas from Category AI Agent',
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
								id: '3b11eddb-dfa2-4e28-a4e5-8cf3996e3e56',
								name: 'keyword',
								type: 'string',
								value: '={{ JSON.parse($json.output).keyword }}',
							},
							{
								id: 'eaa730fd-678f-42fb-95d7-fb0210fefcd7',
								name: 'title',
								type: 'string',
								value: '={{ JSON.parse($json.output).title }}',
							},
							{
								id: 'eb7f4d7d-c669-4f13-acfc-109e6af78f96',
								name: 'description',
								type: 'string',
								value: '={{ JSON.parse($json.output).description }}',
							},
							{
								id: '76254565-f080-41d6-b8ed-e71d22c315da',
								name: 'primary_keyword',
								type: 'string',
								value: "={{ $('Set WF Fields').item.json.primary_keyword }}",
							},
							{
								id: '619a217e-8526-499d-826a-8874364f0b3b',
								name: 'reasoning',
								type: 'string',
								value: "={{ $('Filter Out Unknown').item.json.fields.Reasoning }}",
							},
							{
								id: '74a4cb6e-8ca6-4ebe-b821-1b26d018d1b8',
								name: 'category',
								type: 'string',
								value: "={{ $('Filter Out Unknown').item.json.fields.Category }}",
							},
						],
					},
				},
				position: [1952, 640],
				name: 'Set Content Ideas Table Field',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.airtable_base_id }}",
					},
					table: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Airtable Fields').item.json.content_ideas_from_kws_table_id }}",
					},
					columns: {
						value: {
							Title: '={{ $json.title }}',
							Status: 'Not Started',
							Keyword: '={{ $json.keyword }}',
							Category: '={{ $json.category }}',
							Reasoning: '={{ $json.reasoning }}',
							Description: '={{ $json.description }}',
							'Primary Keyword': '={{ $json.primary_keyword }}',
						},
						schema: [
							{
								id: 'Title',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'options',
								display: true,
								options: [
									{ name: 'Not Started', value: 'Not Started' },
									{
										name: 'Send to Article Writer',
										value: 'Send to Article Writer',
									},
									{ name: 'Discard', value: 'Discard' },
									{ name: 'In Article Writer', value: 'In Article Writer' },
								],
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Description',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Keyword',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Primary Keyword',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Primary Keyword',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Category',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Reasoning',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Reasoning',
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
					operation: 'create',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [2160, 640],
				name: 'Categories Content Ideas Table',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.1,
			config: {
				parameters: { model: 'gpt-4o', options: {} },
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1440, 1680],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'chatgpt-4o-latest',
						cachedResultName: 'chatgpt-4o-latest',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [192, 544],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'chatgpt-4o-latest',
						cachedResultName: 'chatgpt-4o-latest',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1584, 816],
				name: 'OpenAI Chat Model2',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'chatgpt-4o-latest',
						cachedResultName: 'chatgpt-4o-latest',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [480, 1392],
				name: 'OpenAI Chat Model3',
			},
		}),
	)
	.add(
		sticky(
			'## Gets KWs from Master List and Categorizes\nCategorizes keywords as Quick Wins, Authority Builders, Emerging Topics, and Unknown.',
			{ position: [48, 224], width: 520, height: 540 },
		),
	)
	.add(
		sticky('## Send All Categorized Keywords to Airtable\n', {
			name: 'Sticky Note1',
			position: [848, 144],
			width: 520,
			height: 260,
		}),
	)
	.add(
		sticky('## Creates Title and Description for each categorized keyword.\nSends to Airtable', {
			name: 'Sticky Note2',
			position: [640, 448],
			width: 1720,
			height: 460,
		}),
	)
	.add(
		sticky(
			'## Clusters KWs from Master KW All Variations List\nCreates clusters based on semantic similarity and search intent.',
			{ name: 'Sticky Note4', position: [32, 1072], width: 800, height: 520 },
		),
	)
	.add(
		sticky('## Adds Cluster and Keywords to Clusters Sheet\n', {
			name: 'Sticky Note5',
			position: [880, 1072],
			width: 1120,
			height: 260,
		}),
	)
	.add(
		sticky(
			'## Create Hub and Spoke Content Opportunities\nCreates title and description for Hub and Spoke content opportunities.\nPrompted (at the moment) to create 5 supporting articles for each pillar.',
			{ name: 'Sticky Note6', position: [880, 1360], width: 1600, height: 460 },
		),
	)
	.add(
		sticky('## Categorize and Create Content Opportunities\n', {
			name: 'Sticky Note7',
			color: 3,
			width: 2544,
			height: 920,
		}),
	)
	.add(
		sticky('## Cluster and Create Content Opportunities\n', {
			name: 'Sticky Note8',
			color: 3,
			position: [0, 960],
			width: 2540,
			height: 920,
		}),
	)
	.add(
		sticky(
			'# Setup \n\n## 1. Copy this Airtable base: [KW Research Content Ideation](https://airtable.com/apphzhR0wI16xjJJs/shrsojqqzGpgMJq9y)\n## Important: Copy the base. Please do not ask for access. \n## 2. Set Airtable Base Id\nWith your (copied) Airtable base open (to any table), copy the base id from the url.\n\nThe base id begins with app. For example: https://airtable.com/apphzhR0wI16xjJJs/tblewTSMwBdGQKUuZ/\napphzhR0wI16xjJJs is the base id. Enter this into the Set Airtable Fields node.\n\n## 3. Enter the table id of the following tables into the Set Airtable Fields node.\n- Master All KW Variations\n- Keyword Categories\n- Content Ideas for Keywords\n- Clusters\n- Content Ideas from Clusters\n\nThe table id is after the base id. For example.\nhttps://airtable.com/apphzhR0wI16xjJJs/tblD8sMi6W4EikkN4/viw8DZMvccWGY7YuO?blocks=hide\n\ntblD8sMi6W4EikkN4 is the table id.\n\n## 4. Test your automation\nSelect Test Workflow.',
			{ name: 'Sticky Note9', color: 3, position: [-1680, 288], width: 540, height: 820 },
		),
	);
