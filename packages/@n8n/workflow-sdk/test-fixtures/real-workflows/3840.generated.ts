const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{}] } },
				position: [-1240, -380],
				name: 'Scheduled Start: Check for New Posts',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: { returnFirstMatch: true },
					filtersUI: { values: [{ lookupValue: '0', lookupColumn: 'Status' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1510137257,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k/edit#gid=1510137257',
						cachedResultName: 'Postİ',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k/edit?usp=drivesdk',
						cachedResultName: 'Medium Post Automation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-920, -380],
				name: '1. Get Next Post Idea from Sheet',
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
								id: 'aa3b9a02-ac6a-4d7f-937f-a0e6e566a0c8',
								name: 'Topic',
								type: 'string',
								value: '={{ $json.Topic }}',
							},
							{
								id: 'e48783e8-5f6b-4c54-bf4f-c004414dc510',
								name: 'TargetAudience',
								type: 'string',
								value: '={{ $json.Audience }}',
							},
							{
								id: 'c499a954-b4c6-4702-ab86-3656aa2b1783',
								name: 'BrandVoice',
								type: 'string',
								value: '={{ $json.Voice }}',
							},
							{
								id: '210f7103-4d6b-42e9-9168-fd99dff94b5a',
								name: 'Platform',
								type: 'string',
								value: '={{ $json.Platform }}',
							},
						],
					},
				},
				position: [-620, -380],
				name: '2. Prepare Input Variables (Topic, Audience, etc.)',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.5,
			config: {
				parameters: {
					text: '=',
					messages: {
						messageValues: [
							{
								message:
									'=<prompt>     <role>         You are a **highly imaginative Social Media Strategist** specializing in generating **unique, platform-aware content CONCEPTS** for **Instagram and LinkedIn**. You think beyond basic formats and consider audience engagement.     </role>      <task>         Based *only* on the `Topic`, `Target Audience`, `Brand Voice`, AND **target `Platform` (\'Instagram\' or \'LinkedIn\')**, generate **exactly 1 creative content CONCEPT**. Focus on the **core message, angle, or hook**. The suggested format **MUST be "Single Image"**.         1.  **Platform Optimization:** **Explicitly tailor** the *type* and *angle* of the concept to the specified `Platform`. Consider typical user expectations and content formats:             * **Instagram:** Often more visual, storytelling, personal, community-focused, impactful single images.             * **LinkedIn:** Can utilize impactful single images to convey data points, key takeaways, or thought-provoking visuals supporting a concise message.         2.  **Originality:** Avoid common tropes (like basic quotes) unless the input strongly suggests it. Explore diverse angles: striking visual representations of data, metaphorical imagery, thought-provoking questions presented visually, behind-the-scenes moments captured in a compelling image, key message highlighted graphically.         3.  **Format Suggestion:** The format **MUST be "Single Image"**. The **CONCEPT is primary, the format is fixed**.      </task>      <input_context>         <param name="Topic">{{ $json.Topic }}</param>         <param name="TargetAudience">{{ $json.TargetAudience }}</param>         <param name="BrandVoice">{{ $json.BrandVoice }}</param>         <param name="Platform">{{ $json.Platform }}</param>     </input_context>      <output_instructions>         Your response MUST be a single, valid JSON object containing exactly one key: `ideas`.         The value of `ideas` MUST be an array containing exactly 1 object.         The object in the array MUST have two keys: `concept` (string: the descriptive concept text) and `suggested_format` (string: **MUST be "Single Image"**).         Example: `{"ideas": [{"concept": "Concept text...", "suggested_format": "Single Image"}]}`         Do NOT include any other text, explanations, or formatting outside the JSON structure.     </output_instructions> </prompt>',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-160, -380],
				name: '3a. Generate Content Concept (Gemini)',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.5,
			config: {
				parameters: {
					text: '=',
					messages: {
						messageValues: [
							{
								message:
									'=<prompt>\n    <role>\n        You are an **Expert Instagram/LinkedIn Content Strategist and AI Image Prompt Engineer**. You excel at elaborating concepts based on user feedback and crafting distinct, detailed, and visually consistent prompt options tailored for the target platform.\n    </role>\n\n    <task>\n        1.  **Analyze** the `Chosen Idea`, `User Visual Input` (if provided and relevant), and **target `Platform`** to determine the optimal post format (in this case, assumed to be Single Image based on the output) and elaborate this into a practical `expanded_post_concept`. **Justify format choice based on concept AND platform norms.**\n        2.  **Incorporate** the user\'s visual direction (if any) into the concept description. If no specific visual input was given, propose a clear visual direction that aligns with the concept and platform.\n        3.  Generate **TWO DISTINCT OPTIONS** for the image prompts based on the `expanded_post_concept`. **Tailor the visual style and content nuances** described in the prompts to the target `Platform`. (E.g., LinkedIn visuals might be cleaner, more data-oriented; Instagram more lifestyle or emotive).\n        4.  **Ensure Distinction:** The two options should offer meaningful variety (e.g., style, composition, focus) while remaining true to the core concept.\n        5.  **Detail:** Prompts should be highly detailed, suitable for advanced AI image generators (include subject, action, setting, style, mood, composition, lighting, color palette keywords).\n    </task>\n\n    <input_context>\n        <param name="ChosenIdea">{{ $json.output.ideas[0].concept }}</param>\n        <param name="OriginalTopic"> {{ $(\'2. Prepare Input Variables (Topic, Audience, etc.)\').item.json.Topic }}</param>\n        <param name="TargetAudience"> {{ $(\'2. Prepare Input Variables (Topic, Audience, etc.)\').item.json.TargetAudience }}</param>\n        <param name="BrandVoice"> {{ $(\'2. Prepare Input Variables (Topic, Audience, etc.)\').item.json.BrandVoice }}</param>\n        <param name="Platform"> {{ $(\'2. Prepare Input Variables (Topic, Audience, etc.)\').item.json.Platform }}</param>\n        </input_context>\n\n    <output_instructions>\n        Your response MUST be a single, valid JSON object containing exactly two keys: `expanded_post_concept` and `prompt_options`.\n        - `expanded_post_concept` (string): The elaborated visual concept, stating Single Image format and incorporating user input/platform considerations.\n        - `prompt_options` (array): MUST contain exactly TWO objects.\n            - Each object represents one prompt option and MUST have two keys:\n                - `option_description` (string): Briefly describe the distinct angle/style of this option (e.g., "Option 1: Hyperrealistic...").\n                - `prompts` (array of strings): Contains ONE string representing the detailed prompt for the single image.\n       \n         \n        Do NOT include any text outside this JSON structure. Do NOT generate captions here.\n    </output_instructions>\n</prompt>',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [580, -380],
				name: '3b. Generate Image Prompt Options (Gemini)',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.5,
			config: {
				parameters: {
					text: '=',
					messages: {
						messageValues: [
							{
								message:
									'=<prompt>\n    <role>\n        You are an AI Instagram/LinkedIn **Caption Writer**. You specialize in crafting concise, engaging, and contextually relevant captions based on a generated image (represented by its prompt) and the overall content strategy, specifically tailored for the target platform.\n    </role>\n\n    <task>\n        Write a short, effective social media caption **specifically tailored for the target `Platform` (\'Instagram\' or \'LinkedIn\')**.\n        * The caption must complement the image described by `ImagePrompt` and align with all context parameters (`ChosenIdea`, `OriginalTopic`, `TargetAudience`, `BrandVoice`).\n        * **Platform Style:** Adapt tone, length, calls-to-action, and hashtag usage:\n            * **Instagram:** Can be more conversational, use more emojis, ask engaging questions, often benefits from slightly longer, more storytelling captions if relevant. Use a mix of popular and niche hashtags (3-7 recommended).\n            * **LinkedIn:** Generally more professional, concise, focused on insights or value proposition. Calls-to-action often relate to reading more, commenting with professional opinions, or business objectives. Use targeted, professional hashtags (1-3 recommended).\n        * Include 1-5 relevant, platform-appropriate hashtags.\n    </task>\n\n    <input_context>\n        <param name="ImagePrompt">{{ $json.output.prompt_options[0].prompts[0] }}</param>\n        <param name="ChosenIdea">{{ $(\'3a. Generate Content Concept (Gemini)\').item.json.output.ideas[0].concept }} </param>\n        <param name="OriginalTopic">{{ $(\'1. Get Next Post Idea from Sheet\').item.json.Topic }} </param>\n        <param name="TargetAudience">{{ $(\'1. Get Next Post Idea from Sheet\').item.json.Audience }}</param>\n        <param name="BrandVoice">{{ $(\'1. Get Next Post Idea from Sheet\').item.json.Voice }} </param>\n        <param name="Platform">{{ $(\'1. Get Next Post Idea from Sheet\').item.json.Platform }} </param>\n    </input_context>\n\n    <output_instructions>\n        Your response MUST be a single, valid JSON object containing exactly one key: `Caption`.\n        The value of `Caption` MUST be a string containing the generated caption text, including hashtags.\n        Example: `{"Caption": "Caption text tailored for LinkedIn goes here. #ProfessionalDevelopment #IndustryInsights"}`\n        Do NOT include any other text, explanations, or formatting outside the JSON structure.\n    </output_instructions>\n</prompt>',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [1540, -380],
				name: '3c. Generate Post Caption (Gemini)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "input": {\n    "raw": false,\n    "prompt": "{{ $(\'3b. Generate Image Prompt Options (Gemini)\').item.json.output.prompt_options[0].prompts[0] }}",\n    "aspect_ratio": "1:1",\n    "output_format": "jpg",\n    "safety_tolerance": 6\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{ name: 'Prefer', value: 'wait' }] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2360, -380],
				name: '4. Generate Image using Prompt 1 (Replicate Flux)',
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
								id: '8a4260ba-3bde-4444-8f42-8a8abd51ff0c',
								name: 'ImageURL',
								type: 'string',
								value: '={{ $json.output }}',
							},
							{
								id: '1953ae03-6a86-4847-8686-5a928637be1d',
								name: 'Caption',
								type: 'string',
								value: "={{ $('3c. Generate Post Caption (Gemini)').item.json.output.Caption }}",
							},
						],
					},
				},
				position: [2880, -380],
				name: '5. Prepare Data for Instagram API',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: {
					edge: 'media',
					node: '17841473009917118',
					options: {
						queryParameters: {
							parameter: [
								{ name: 'caption', value: '={{ $json.Caption }}' },
								{ name: 'image_url', value: '={{ $json.ImageURL }}' },
							],
						},
					},
					graphApiVersion: 'v22.0',
					httpRequestMethod: 'POST',
				},
				credentials: {
					facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' },
				},
				position: [3180, -380],
				name: '6a. Create Instagram Media Container',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [3480, -380], name: '6b. Wait for Container Processing' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: {
					edge: 'media_publish',
					node: '17841473009917118',
					options: {
						queryParameters: {
							parameter: [{ name: 'creation_id', value: '={{ $json.id }}' }],
						},
					},
					graphApiVersion: 'v22.0',
					httpRequestMethod: 'POST',
				},
				credentials: {
					facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' },
				},
				position: [3780, -380],
				name: '6c. Publish Post to Instagram',
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
							Topic: "={{ $('1. Get Next Post Idea from Sheet').item.json.Topic }}",
							Status: '1',
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
								id: 'Audience',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Audience',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Voice',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Voice',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Platform',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Platform',
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
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
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
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1510137257,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k/edit#gid=1510137257',
						cachedResultName: 'Postİ',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1hG2NMi-4fMa7D5qGonCN8bsYVya4L2TOB_8mI4XK-9k/edit?usp=drivesdk',
						cachedResultName: 'Medium Post Automation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [4440, -380],
				name: '7. Update Post Status in Sheet',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash-001' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-160, -220],
				name: '(LLM Model for Concept)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					schemaType: 'manual',
					inputSchema:
						'{\n  "type": "object",\n  "properties": {\n    "ideas": {\n      "type": "array",\n      "description": "An array containing exactly 1 content concept.",\n      "minItems": 1,\n      "maxItems": 1,\n      "items": {\n        "type": "object",\n        "properties": {\n          "concept": {\n            "type": "string",\n            "description": "The detailed text describing the content concept for a Single Image."\n          },\n          "suggested_format": {\n            "type": "string",\n            "description": "The post format, which MUST be \'Single Image\'.",\n            "const": "Single Image"\n          }\n        },\n        "required": [\n          "concept",\n          "suggested_format"\n        ]\n      }\n    }\n  },\n  "required": [\n    "ideas"\n  ]\n}',
				},
				position: [0, -220],
				name: '(Parse Concept JSON)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash-001' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [580, -220],
				name: '(LLM Model for Prompts)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					schemaType: 'manual',
					inputSchema:
						'{\n  "type": "object",\n  "properties": {\n    "expanded_post_concept": {\n      "type": "string",\n      "description": "The elaborated visual concept, stating Single Image format and incorporating user input/platform considerations."\n    },\n    "prompt_options": {\n      "type": "array",\n      "description": "An array containing exactly TWO prompt options for the single image concept.",\n      "minItems": 2,\n      "maxItems": 2,\n      "items": {\n        "type": "object",\n        "properties": {\n          "option_description": {\n            "type": "string",\n            "description": "Briefly describes the distinct angle/style of this option (e.g., \'Option 1: Hyperrealistic...\')."\n          },\n          "prompts": {\n            "type": "array",\n            "description": "Contains ONE detailed prompt string for the single image.",\n            "minItems": 1,\n            "maxItems": 1,\n            "items": {\n              "type": "string",\n              "description": "A detailed image generation prompt."\n            }\n          }\n        },\n        "required": [\n          "option_description",\n          "prompts"\n        ]\n      }\n    }\n  },\n  "required": [\n    "expanded_post_concept",\n    "prompt_options"\n  ]\n}',
				},
				position: [740, -220],
				name: '(Parse Prompts JSON)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1560, -220],
				name: '(LLM Model for Caption)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample: '{\n	"Caption": "Thee future of call centers is here!"\n}',
				},
				position: [1700, -220],
				name: '(Parse Caption JSON)',
			},
		}),
	)
	.add(
		sticky(
			'# 01. Content Concept Generation\n\n**Purpose:** This step uses Google Gemini to generate **one unique content concept** tailored for the specified platform (Instagram/LinkedIn), based on the input topic, audience, and brand voice. The format is fixed to "Single Image".\n\n**Input (from Node \'2. Prepare Input Variables\'):**\n*   `Topic` (string)\n*   `TargetAudience` (string)\n*   `BrandVoice` (string)\n*   `Platform` (string: \'Instagram\' )\n\n**Output (JSON):**\n*   `{"ideas": [{"concept": "Generated concept text...", "suggested_format": "Single Image"}]}`',
			{ position: [-240, -820], width: 460, height: 740 },
		),
	)
	.add(
		sticky(
			'# 03b. Image Generation\n\n**Purpose:** Generates the actual image using the **first detailed prompt** created in step 3b. It sends this prompt to the Replicate API, specifically using the \'Flux 1.1 Pro Ultra\' model.\n\n**Input (from Node \'3b. Generate Image Prompt Options\'):**\n*   `prompt` (string: The *first* prompt string from `prompt_options[0].prompts[0]`)\n\n**Output (from Replicate API):**\n*   JSON containing the `output` URL of the generated image (e.g., `{"output": "https://replicate.delivery/..."}`)',
			{ name: 'Sticky Note1', color: 4, position: [2220, -820], width: 380, height: 740 },
		),
	)
	.add(
		sticky(
			'# 02. Image Prompt Elaboration & Options\n\n**Purpose:** Takes the generated content concept and expands on it to create **two distinct, detailed image generation prompts**. These prompts are optimized for the target platform and suitable for AI image generators like Replicate Flux.\n\n**Input (from Nodes \'2. Prepare Input Variables\' & \'3a. Generate Content Concept\'):**\n*   `ChosenIdea` (string: Concept from step 3a)\n*   `OriginalTopic` (string)\n*   `TargetAudience` (string)\n*   `BrandVoice` (string)\n*   `Platform` (string: \'Instagram\')\n\n**Output (JSON):**\n*   `{"expanded_post_concept": "Elaborated concept description...", "prompt_options": [{"option_description": "Option 1: ...", "prompts": ["Detailed prompt 1..."]}, {"option_description": "Option 2: ...", "prompts": ["Detailed prompt 2..."]}]}`\n',
			{ name: 'Sticky Note2', color: 2, position: [400, -820], width: 740, height: 740 },
		),
	)
	.add(
		sticky(
			"# 03a. Caption Generation\n\n**Purpose:** Uses Google Gemini to write a short, engaging social media caption **specifically tailored for the target platform**. The caption complements the image (represented by the first generated prompt) and aligns with the overall content strategy. Includes relevant hashtags.\n\n**Input (from Nodes '1. Get Next Post Idea', '3a. Generate Content Concept', '3b. Generate Image Prompt Options'):**\n*   `ImagePrompt` (string: The *first* prompt from step 3b)\n*   `ChosenIdea` (string: Concept from step 3a)\n*   `OriginalTopic` (string)\n*   `TargetAudience` (string)\n*   `BrandVoice` (string)\n*   `Platform` (string: 'Instagram' or 'LinkedIn')\n\n**Output (JSON):**\n*   `{\"Caption\": \"Generated caption text with #hashtags...\"}`",
			{ name: 'Sticky Note3', color: 3, position: [1380, -820], width: 620, height: 740 },
		),
	)
	.add(
		sticky(
			"# 04. Instagram Publishing\n\n**Purpose:** This block takes the final image URL and caption, prepares them for the Instagram Graph API, uploads the media to create a container, waits for Instagram to process it, and finally publishes the container as a post to the connected Instagram account.\n\n**Input (from Nodes '3c. Generate Post Caption (Gemini)' & '4. Generate Image using Prompt 1 (Replicate Flux)'):**\n*   `ImageURL` (string: URL of the generated image from Replicate)\n*   `Caption` (string: Generated post text with hashtags from Gemini)\n\n**Process:**\n1.  **Format Data (`5. Prepare Data...`):** Organizes the ImageURL and Caption into the required structure.\n2.  **Create Media Container (`6a. Create...`):** Sends the `image_url` and `caption` to the Instagram Graph API (`media` edge) to initiate the upload. Receives a container `id`.\n3.  **Wait for Processing (`6b. Wait...`):** Pauses the workflow to allow Instagram's servers time to process the uploaded media. *Note: Wait time might need adjustment depending on media size and API responsiveness.*\n4.  **Publish Media (`6c. Publish...`):** Sends the container `id` (as `creation_id`) to the Instagram Graph API (`media_publish` edge) to make the post live.\n\n**Output:** The content is published as a new post on the target Instagram profile. The final node (`6c. Publish Post...`) returns the `id` of the successfully published media object on Instagram.",
			{ name: 'Sticky Note4', color: 5, position: [2800, -820], width: 1160, height: 740 },
		),
	)
	.add(
		sticky(
			"# 05. Finalize: Update Sheet Status\n\n**Purpose:** Marks the processed post idea as completed in the Google Sheet.\n\n**Action:** Finds the corresponding row in the sheet (using the 'Topic' to match) and updates its 'Status' column to '1'. This prevents the same idea from being processed again by the workflow in future runs.",
			{ name: 'Sticky Note5', color: 6, position: [4640, -480], width: 380, height: 300 },
		),
	)
	.add(sticky('', { name: 'Sticky Note6', position: [-100, -300] }))
	.add(
		sticky(
			'# 00. Scheduled Start & Input Preparation\n\n**Purpose:** Initiates the workflow automatically based on the user-defined schedule. Fetches the next available post idea (Status=0) from Google Sheets and prepares the necessary input variables (`Topic`, `Audience`, `Voice`, `Platform`) for the content generation steps.',
			{ name: 'Sticky Note7', position: [-1760, -440], width: 420, height: 240 },
		),
	);
