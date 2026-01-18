const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.3,
			config: {
				parameters: {
					options: { appendAttribution: false },
					formTitle: 'Create a Video using Sora 2',
					formFields: {
						values: [
							{ fieldLabel: 'Prompt', requiredField: true },
							{
								fieldType: 'dropdown',
								fieldLabel: 'Aspect Ratio',
								fieldOptions: {
									values: [{ option: '9:16 (vertical)' }, { option: '16:9 (Horizontal)' }],
								},
								requiredField: true,
							},
							{
								fieldType: 'checkbox',
								fieldLabel: 'Model',
								fieldOptions: { values: [{ option: 'sora-2' }, { option: 'sora-2-pro' }] },
								requiredField: true,
								limitSelection: 'exact',
							},
							{
								fieldType: 'checkbox',
								fieldLabel: 'Lenght',
								fieldOptions: {
									values: [{ option: '4s' }, { option: '8s' }, { option: '12s' }],
								},
								requiredField: true,
								limitSelection: 'exact',
							},
							{
								fieldType: 'file',
								fieldLabel: 'Image',
								multipleFiles: false,
								acceptFileTypes: '.jpg,.jpeg,.png',
							},
						],
					},
				},
				position: [5392, 2448],
				name: 'Video Input Form',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '=https://tmpfiles.org/api/v1/upload',
							method: 'POST',
							options: {},
							sendBody: true,
							contentType: 'multipart-form-data',
							bodyParameters: {
								parameters: [
									{
										name: 'file',
										parameterType: 'formBinaryData',
										inputDataFieldName: 'Image',
									},
								],
							},
						},
						position: [5888, 2320],
						name: 'Temp Image Upload',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.chainLlm',
					version: 1.7,
					config: {
						parameters: {
							text: "=User Query: {{ $json.Prompt }}\n\nApect Ratio: {{ $json['Aspect Ratio'] }}\n\nLenght: {{ $json.Lenght[0] }}",
							batching: {},
							messages: {
								messageValues: [
									{
										message:
											'=You are an expert AI video prompt engineer specializing in OpenAI\'s Sora 2 video generation model. Your role is to transform user input into professionally structured, cinematic prompts optimized for high-quality video generation.\n\n## Core Principles\n\n1. **Brevity for Reliability**: Shorter clips (4s) follow instructions more reliably than longer ones. Recommend 4s duration unless user specifically needs longer content.\n\n2. **Specificity Over Vagueness**: Replace abstract concepts with concrete, visual details. Transform "beautiful street" into "wet asphalt, zebra crosswalk, neon signs reflecting in puddles."\n\n3. **One Beat Per Shot**: Each shot should contain ONE clear camera movement and ONE clear subject action. Avoid cramming multiple complex actions into a single clip.\n\n4. **Cinematic Thinking**: Treat prompts as storyboard descriptions or cinematographer briefs, not casual requests.\n\n## Prompt Structure Framework\n\nOrganize enhanced prompts using this hierarchy:\n\n### 1. Style & Format (Optional but Powerful)\n- Establish overall aesthetic early: "1970s film," "IMAX aerial," "handheld documentary"\n- Film stock references: "35mm film," "16mm with grain," "digital capture"\n- Color treatment: "Kodak warm grade," "teal and orange palette," "desaturated noir"\n\n### 2. Scene Description\n- Setting and environment with specific visual details\n- Character descriptions (clothing, age, demeanor)\n- Atmospheric elements (weather, time of day, lighting quality)\n- Props and set dressing that matter to the shot\n\n### 3. Cinematography\n**Camera shot**: Specify framing and angle\n- Examples: "wide establishing shot, eye level," "medium close-up, slight low angle," "aerial wide shot, downward tilt"\n\n**Lens/DOF**: When detail matters\n- Examples: "35mm lens, shallow depth of field," "50mm with background softness," "wide angle for environmental context"\n\n**Camera movement**: Keep it simple and precise\n- Examples: "slow push-in," "dolly left to right," "static handheld," "crane up revealing skyline"\n\n**Mood**: Emotional tone\n- Examples: "tense and cinematic," "warm and nostalgic," "playful suspense"\n\n### 4. Lighting & Palette\nDescribe light quality and color anchors:\n- Light quality: "soft window light," "hard single source," "diffused overhead"\n- Direction: "from camera left," "backlit," "rim lighting"\n- Color anchors: Name 3-5 specific colors for palette consistency\n- Examples: "warm key from overhead, cool rim from window; palette: amber, cream, teal"\n\n### 5. Actions (Time-Based Beats)\nBreak down motion into countable beats:\n- Use specific verbs and counts: "takes four steps," "pauses for two seconds," "turns and catches"\n- Avoid: "walks around" → Use: "takes three steps forward, pauses, looks left"\n- Keep actions achievable within the duration\n\n### 6. Dialogue (If Applicable)\nFormat dialogue clearly:\n- Place in dedicated block with speaker labels\n- Keep lines short and natural (4s = 1-2 exchanges, 8s = 3-4 exchanges)\n- Example format:\n  ```\n  Dialogue:\n  - Character A: "Short, natural line."\n  - Character B: "Response that fits timing."\n  ```\n\n### 7. Audio/Sound (Optional)\nSuggest diegetic sounds to establish rhythm:\n- Examples: "distant traffic hum," "coffee machine hiss," "paper rustle"\n- Note: This is for pacing cues, not full soundtracks\n\n## Enhancement Guidelines\n\n### What to ADD:\n- Concrete visual details (colors, textures, specific objects)\n- Professional cinematography terms (shot types, camera movements)\n- Lighting direction and quality\n- Precise action beats with timing\n- Style references that set aesthetic tone\n- Specific color palette (3-5 colors)\n\n### What to REPLACE:\n- "Beautiful" → Specific visual qualities\n- "Moves" → Precise action with counts\n- "Nice lighting" → Light source, direction, quality\n- "Cinematic" → Actual film/lens specifications\n- "Interesting angle" → Specific shot type and framing\n\n### What to AVOID:\n- Multiple complex actions in one shot\n- Vague descriptors without visual specifics\n- Requesting duration/resolution in prose (these are API parameters)\n- Overcrowding shots with too many elements\n- Abstract emotions without visual manifestations\n\n## Duration Recommendations\n\nBased on user intent:\n- **4 seconds**: Default recommendation. Most reliable for instruction following. Best for single clear action.\n- **8 seconds**: When user needs slightly more development. Warn that this may be less reliable; suggest stitching two 4s clips instead.\n- **12 seconds**: Only when explicitly requested. Strongly recommend breaking into multiple 4s shots for better control.\n\n## Aspect Ratio Selection\n\n- **16:9**: Landscape, traditional video, cinematic scenes, wide vistas, desktop viewing\n- **9:16**: Portrait, social media (TikTok, Instagram Stories, Reels), mobile-first content, vertical stories\n\n## Transformation Process\n\n1. **Analyze** user input for core intent\n2. **Identify** missing cinematic elements (camera, lighting, specific actions)\n3. **Expand** vague descriptions into concrete visuals\n4. **Structure** using the framework above\n5. **Optimize** for the chosen duration\n6. **Balance** detail with creative freedom based on user needs\n\n## Examples of Weak → Strong Transformations\n\n**Weak**: "A person walking down a street at night"\n**Strong**: "Style: Handheld 35mm with natural grain. A woman in a red coat takes five measured steps down a wet cobblestone street. Amber streetlights create pools of warm light; cool shadows between them. Camera: medium tracking shot, following from behind at shoulder level. Mood: solitary, urban noir. Lighting: practical streetlights only; reflections in puddles."\n\n**Weak**: "Make it look cinematic"\n**Strong**: "Camera: wide shot, slow dolly-in. Lens: 40mm spherical with shallow DOF. Lighting: golden hour natural key from camera left, edge light on subject. Palette: warm amber, deep teal, cream. Mood: nostalgic, intimate."\n\n## Response Format\n\nAlways output your enhanced prompt as a JSON object with exactly three fields:\n- "prompt": The fully enhanced, professionally structured prompt (50-4000 characters)\n- "aspect_ratio": Either "16:9" or "9:16"\n- "duration": Either 4, 8, or 12 (integer, in seconds)\n\nAim for 60-150 words for standard prompts, more for complex cinematic shots requiring detailed specifications. Include professional cinematographic language while maintaining clarity.',
									},
								],
							},
							promptType: 'define',
							hasOutputParser: true,
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
											value: 'gpt-5',
											cachedResultName: 'gpt-5',
										},
										options: {},
									},
									credentials: {
										openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
									},
									name: 'Refiner Model',
								},
							}),
							outputParser: outputParser({
								type: '@n8n/n8n-nodes-langchain.outputParserStructured',
								version: 1.3,
								config: {
									parameters: {
										schemaType: 'manual',
										inputSchema:
											'{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "title": "Sora2VideoGenerationRequest",\n  "description": "Simplified schema for Sora 2 video generation with enhanced prompts",\n  "type": "object",\n  "required": ["prompt", "aspect_ratio", "duration"],\n  "properties": {\n    "prompt": {\n      "type": "string",\n      "description": "The fully enhanced, professionally structured prompt optimized for Sora 2 video generation with cinematography details, specific actions, lighting, and visual specifics",\n      "minLength": 50,\n      "maxLength": 4000\n    },\n    "aspect_ratio": {\n      "type": "string",\n      "enum": ["16:9", "9:16"],\n      "description": "Video aspect ratio. 16:9 for landscape/cinematic, 9:16 for portrait/social media"\n    },\n    "duration": {\n      "type": "integer",\n      "enum": [4, 8, 12],\n      "description": "Video duration in seconds. 4s is most reliable, 8s and 12s may have reduced instruction-following accuracy"\n    }\n  }\n}',
									},
									name: 'JSON Output Parser',
								},
							}),
						},
						position: [5840, 2592],
						name: 'Prompt Refiner',
					},
				}),
			],
			{
				version: 3.3,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Image to Video',
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
											id: 'dfdd231a-d2f6-4973-a068-ac13f2bbd506',
											operator: { type: 'string', operation: 'notEmpty', singleValue: true },
											leftValue: '={{ $json.Image.filename }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Text to Video ',
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
											id: '68ac0648-f33e-4394-805d-a8a9b788f1df',
											operator: { type: 'string', operation: 'empty', singleValue: true },
											leftValue: '={{ $json.Image.filename }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Input Mode Router',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/sora-2/image-to-video{{ $('Video Input Form').item.json.Model[0] === 'sora-2-pro' ? '/pro' : '' }}",
					method: 'POST',
					options: {},
					jsonBody:
						"={\n  \"prompt\": \"{{ JSON.stringify($('Video Input Form').item.json.Prompt.replaceAll(/\\\\n/g, '')).slice(1, -1) }}\",\n  \"resolution\": \"auto\",\n  \"aspect_ratio\": \"{{ $('Video Input Form').item.json['Aspect Ratio'].replaceAll(' (vertical)', '').replaceAll(' (Horizontal)', '') }}\",\n  \"duration\": {{ $('Video Input Form').item.json.Lenght[0].replaceAll('s', '') }},\n  \"image_url\": \"{{ $json.data.url.replaceAll('.org/', '.org/dl/') }}\"\n}",
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [6064, 2320],
				name: 'Image-to-Video Call',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 60 }, position: [6336, 2416], name: 'Wait 60 Seconds' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://queue.fal.run/fal-ai/sora-2/requests/{{ $json.request_id }}/status',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [6544, 2416],
				name: 'Status Check',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '=https://queue.fal.run/fal-ai/sora-2/requests/{{ $json.request_id }}',
							options: {},
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
						},
						credentials: {
							httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
						},
						position: [6944, 2400],
						name: 'Retrieve Video',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { amount: 60 }, position: [6336, 2416], name: 'Wait 60 Seconds' },
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Done',
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
											id: 'd8b8dbdc-1ad9-4ab9-8b2d-e76fd5db0899',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Progress',
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
											id: '9c10982c-5f8c-4eec-9b8a-f4b42e99ecf9',
											operator: { type: 'string', operation: 'notEquals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Status Router',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					operation: 'completion',
					redirectUrl: '={{ $json.video.url }}',
					respondWith: 'redirect',
				},
				position: [7152, 2400],
				name: 'Video Redirect',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/sora-2/text-to-video{{ $('Video Input Form').item.json.Model[0] === 'sora-2-pro' ? '/pro' : '' }}",
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "prompt": "{{ JSON.stringify($(\'Prompt Refiner\').item.json.output.prompt.replaceAll(/\\\\n/g, \'\')).slice(1, -1) }}",\n  "resolution": "720p",\n  "aspect_ratio": "{{ $(\'Prompt Refiner\').item.json.output.aspect_ratio }}",\n  "duration": {{ $(\'Prompt Refiner\').item.json.output.duration }}\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [6144, 2592],
				name: 'Text-to-Video Call',
			},
		}),
	)
	.add(
		sticky(
			'## 🔀 Input Mode Router\n\n**Purpose:** Branches to image-to-video if file uploaded, else text-to-video with refinement.\n\n**Note:** Switch checks filename; ensures GPT-5 processes text prompts.',
			{ name: 'Note: Mode Router', color: 3, position: [5280, 2640], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## 🖼️ Temp Image Upload\n\n**Purpose:** Uploads reference image to tmpfiles.org for Sora image-to-video.\n\n**Note:** Multipart POST; swaps URL to /dl/ for direct API access.',
			{ name: 'Note: Image Upload', color: 6, position: [5744, 2080], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## 🤖 Prompt Refiner\n\n**Purpose:** Uses GPT-5 to enhance text prompts for Sora 2 text-to-video mode.\n\n**Note:** Mandatory for text branch; outputs JSON with refined prompt, ratio, duration.',
			{ name: 'Note: Prompt Refiner', color: 5, position: [5488, 2928], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## 🔍 JSON Output Parser\n\n**Purpose:** Validates GPT-5 response against schema for clean API params.\n\n**Note:** Ensures prompt (50-4000 chars), ratio (16:9/9:16), duration (4/8/12).',
			{ name: 'Note: JSON Parser', color: 3, position: [5920, 2944], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## 🎥 Text-to-Video Call\n\n**Purpose:** Submits refined prompt to fal.ai Sora 2 text endpoint (pro if selected).\n\n**Note:** Uses 720p res; calls /text-to-video or /pro; returns request_id for polling.',
			{ name: 'Note: Text-to-Video', color: 5, position: [6288, 2752], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## 🖼️ Image-to-Video Call\n\n**Purpose:** Sends raw prompt + image URL to fal.ai Sora 2 image endpoint.\n\n**Note:** Auto res; calls /image-to-video or /pro; uses form ratio/duration directly.',
			{ name: 'Note: Image-to-Video', color: 5, position: [6240, 2144], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'# 🎬 Sora 2 Video Generator via Fal with GPT-5 Refinement\n\n## 📋 What This Template Does\nGenerate videos using OpenAI\'s Sora 2 via fal.ai\'s four endpoints (text-to-video, text-to-video/pro, image-to-video, image-to-video/pro). Accepts form inputs for prompts, aspect ratios, models, durations (4-12s), and optional images. For text mode, GPT-5 refines prompts for cinematic quality; image mode uses raw input. Polls status asynchronously and redirects to the final video.\n\n## 🔧 Prerequisites\n- n8n with HTTP Request and LangChain nodes\n- fal.ai account\n- OpenAI account (GPT-5 access)\n\n## 🔑 Required Credentials\n\n### fal.ai API Setup\n1. fal.ai → Dashboard → API Keys\n2. Generate key with sora-2 permissions\n3. n8n: Header Auth ("fal.ai", Header: "Authorization", Value: "Key [Your Key]")\n\n### OpenAI API Setup\n1. platform.openai.com → API Keys → Create secret key\n2. n8n: OpenAI API credential (paste key, select GPT-5)\n\n## ⚙️ Configuration Steps\n1. Import JSON (Settings → Import)\n2. Assign creds to HTTP/LLM nodes\n3. Activate—use form URL from trigger\n4. Test prompt; check executions\n5. Tune polling for longer clips\n\n## 🎯 Use Cases\n- Social: 9:16 Reels from refined text (e.g., product anims)\n- Marketing: Image-to-8s promos (e.g., logo intros)\n- Education: 4s explainers (e.g., science demos)\n- Dev: Backend for app video gen\n\n## ⚠️ Troubleshooting\n- Quota fail: Check fal.ai usage; upgrade/add waits\n- Refinement error: Verify GPT-5 schema output\n- Image reject: JPG/PNG <10MB; test tmpfiles\n- Poll timeout: Bump wait to 120s; add retry IF',
			{ name: 'Overview Note8', color: 4, position: [4528, 1984], width: 696, height: 1184 },
		),
	)
	.add(
		sticky(
			'## 📝 Video Input Form\n\n**Purpose:** Captures user prompt, ratio, model, duration, and optional image via web form.\n\n**Note:** Required fields validated; activates webhook URL on workflow start.',
			{ name: 'Note: Form Trigger1', color: 6, position: [5248, 2176], width: 332, height: 192 },
		),
	)
	.add(
		sticky(
			'## ⏳ Status Polling Loop\n\n**Purpose:** Waits 60s, checks Sora status, loops until COMPLETED.\n\n**Note:** Switch routes to result or retry; handles all four endpoints uniformly.',
			{ name: 'Note: Polling Loop1', color: 2, position: [6688, 2640], width: 332, height: 192 },
		),
	);
