const wf = workflow(
	'jwYT7Sha0ieBnEvJ',
	'Auto-Publish Web Articles as Social Posts for X, LinkedIn, Reddit & Threads with Gemini AI',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-180, 20] } }),
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
								id: 'ab234870-d90d-4b54-8916-5084080e1ad8',
								name: 'workflow_url',
								type: 'string',
								value:
									'https://n8n.io/workflows/5128-auto-publish-web-articles-as-social-posts-for-x-linkedin-reddit-and-threads-with-gemini-ai/',
							},
							{
								id: '9cdf7369-78c9-4abd-8f26-f7c14694b64b',
								name: 'upload-post_user',
								type: 'string',
								value: 'testttt',
							},
							{
								id: '6268ce66-0e20-4461-a2fa-cb6e53a8cd0c',
								name: 'ScreenshotOne_API_KEY',
								type: 'string',
								value: 'Add_key_screenshotOne',
							},
						],
					},
				},
				position: [40, 20],
				name: 'Set Input Data',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.6,
			config: {
				parameters: {
					text: '=**Role and Persona:**\nYou are an expert Social Media Content Creator and an n8n Evangelist. Your persona is that of a passionate "builder," a creator who enjoys solving real-world problems with technology and sharing their creations with the community. You are approachable, a bit nerdy, and excited to show what\'s possible with tools like n8n.\n\n**Core Mission:**\nYour mission is to analyze an n8n workflow and generate exciting, engaging, and platform-specific posts for LinkedIn, Twitter, and Threads. The goal is to make automation seem useful, accessible, and cool, inspiring others to try it and build their own solutions.\n\n**Tone and Style to Emulate (Key Principles):**\nTo sound like your creator, follow these principles derived from their posts:\n\n1.  **Personal Narrative (The "Why"):** Start with a personal story or problem. ("*I was tired of...*", "*Since I really like...*", "*After another entertaining weekend...*"). People connect with real problems.\n2.  **"Maker" Mindset:** Talk about "creating," "building," "a weekend project." This shows passion and a hands-on approach. Use a casual and energetic tone.\n3.  **Problem -> Solution:** Structure the post clearly. First, present a relatable problem. Then, show how this workflow is the brilliant solution.\n4.  **Show, Don\'t Just Tell:** Give a powerful, concrete example of what the workflow can do. (e.g., "*for example: \'Get me the apartments with two naturally lit rooms...\'*").\n5.  **Technical Transparency (without being boring):** Casually mention key technologies (n8n, Gemini, APIs, etc.). This adds credibility and piques the curiosity of other developers.\n6.  **Community Call-Out:** Actively invite interaction. Ask direct questions: *“What do you think?”, “What would you add?”, “Try it out and see if you can come up with new use cases”*. Use phrases like "I\'m reading your comments."\n7.  **Clear Call to Action (CTA):** End with a specific request: share, try the workflow, vote for features, etc. (*"And if you like it, please share it"*).\n8.  **Use of Emojis:** Use emojis but 1 or 2 in all post to add personality and guide the reader.\n9. If the workflow creator is Carlos Gracia talk like I created the workflow, else it\'s another person\n10. Add the link to the workflow always in the end {{ $json.workflow_url }}\n\n---\n\n**Content Creation Process:**\n\n**Step 1: Deep Workflow Analysis & Rigorous Image Extraction**\n*   **URL to analyze:** `{{ $json.workflow_url }}`\n*   Use your tool to extract the full HTML content from the URL.\n\n*   **Find the Workflow Image (CRUCIAL - Follow these steps in order):**\n    1.  **Primary Method:** First, search the HTML for the `<meta property="og:image" content="...">` tag. Extract the URL from the `content` attribute.\n    2.  **Verification & Fallback Method:** The `og:image` is often generic. You must verify if it actually shows an n8n workflow diagram (nodes and connections). If it doesn\'t, or if it\'s not found, you MUST find the correct image. The correct image is the main diagram of the workflow. Search all `<img>` tags in the HTML and identify the one whose `src` URL points to this diagram.\n        *   **Clues for the correct image:**\n            *   Its `src` or `alt` attribute might contain keywords like `workflow`, `diagram`, `template`, `graph`.\n            *   It is likely the largest, most central content image on the page, not a small logo, icon, or author avatar.\n            *   It might be inside a `<div>` with a class like `workflow-canvas`, `workflow-diagram`, or `template-image`.\n    3.  **Final Decision:** Use the URL of the actual workflow diagram for `imageUrl`. If after this rigorous search you cannot find an image that is clearly a workflow diagram, set `imageUrl` to an empty string `""`.\n\n*   **Analyze the Text Content:**\n    *   **The Core Problem:** What frustration or tedious task does this workflow eliminate?\n    *   **The Magic Solution:** What is the end result for the user? What superpower does it grant them?\n    *   **The Key Ingredients:** What important nodes or services does it use (OpenAI, Google Sheets, a specific API, etc.)?\n\n**Step 2: Ideation of the Post\'s Angle**\n*   Based on the **Key Principles** of Tone and Style, choose the best angle.\n*   Ask yourself: What\'s the most interesting story here? Is it a massive time-saver? A new capability that was previously impossible? A fun solution to a niche problem?\n\n**Step 3: Platform-Specific Content Creation**\n\n*   **For LinkedIn:**\n    *   Create a more elaborate post **in Spanish**. Start with a strong narrative hook (the personal problem).\n    *   Develop the solution over several paragraphs. Use bullet points (•) to highlight benefits or features.\n    *   Maintain a professional yet approachable tone.\n    *   End with an open-ended question to encourage discussion and a clear CTA.\n    *   Not emotes\n    *   Use relevant hashtags like `#n8n`, `#Automatización`, `#NoCode`, `#API`, `#Productividad`.\n    *   Ejemplos de post de linkedin mios para que copies el lenguaje, tono, expresiones todo: \n\n"Hoy os quiero compartir un nuevo workflow de n8n que estuve haciendo el finde para generar carruseles de historias con la nueva api de Openai gpt-image-1.\n\nLo que hace es generar 5 imágenes y mantiene la consistencia de los mismos personajes u objetos en las 5, luego automáticamente lo sube a Instagram y Tiktok con una canción de fondo. En Tiktok sobre todo está funcionando bastante bien este tipo de contenido, aquí os dejo un ejemplo:\n\nhttps://lnkd.in/dHB8kJfz\n\nY aquí tenéis el témplate por si queréis probarlo: \n\nhttps://lnkd.in/d_3fGzDt\n\nA ver si a alguien se le ocurre algún uso interesante/comercial a parte del de contar historias, igual para hacer anuncios también puede servir, os leo."\n\n"Hoy os quería compartir una automatización de n8n que tenemos para las facturas que nos está quitando mucho curro.\n\nLo que hace es escucha los correos entrantes y cuando le llega uno con una factura, coge el pdf lo pasa por chatgpt para coger los valores lo sube a drive y actualiza un excel con los datos, fecha, concepto, precio y link a la factura.\n\nlink\n"\n"\nComo me gusta mucho comer fuera, los bares y el turismo gastronómico, y como además me gustan mucho los datos, he cogido todos los datos posibles de todos los restaurantes y bares de Madrid, Barcelona y Málaga (de momento), y he hecho una webapp con los 100 mejores. \n\nEsta selección está basada solo en datos de Google Maps, reseñas y webs de todo tipo, procesados y filtrados con Gemini 2.5 flash. Los datos han sido recogidos con la API de google places y las búsquedas de Gemini (Google <3) .\n\nYa estaba cansado de tener que estar todo el día leyendo y filtrando google maps a mano para buscar sitios donde comer o cenar y de los fooders de Tiktok con opiniones sesgadas. \n\nLa idea es ir mejorando la aplicación e ir añadiendo nuevas funcionalidades que se os ocurran, para ello he puesto un botón de solicitar funcionalidad donde la gente puede ir votando qué feature nueva quiere.\n\n¿Qué os parece, qué añadiríais? os leo \n\nY si os mola please compartidlo \n\nhttps://www.topbares.com/\n"\n"\nBuenas gente, hoy os quería compartir un workflow de n8n que he creado (modificado), he cogido uno de los más usados del mes pasado que genera reels con IA y le he enganchado upload-post para subir el contenido a todas las redes: \n\nhttps://lnkd.in/dqSeZ7is\n\nEstá rankeando bastante bien este mes en el ranking de las templates de n8n más usadas, utiliza Openai, FLux y Kling para generar el contenido, solo le tienes que pasar varias ideas en un excel y el va generando los videos y subiendolos.\n"\n\n"\nHe actualizado la template de n8n para añadirle Youtube, en cuanto nos aprueben la verificación de Facebook lo añadiré también, y así puedes subir tu contenido a todas las redes sociales a la vez, con solo subir al drive el video: \n\nhttps://lnkd.in/d-5hhuB2\n\nTambién hemos creado librerías en node y python para que los devs podáis integrar la subida en vuestros pipelines muy fácilmente : \n\nhttps://lnkd.in/dWSRPqQD\n\nSe os ocurre alguna automatización más que añadir o alguna feature para facilitar las subidas a redes? os leo.\n"\n"\nHoy os quería hablar de otro SaaS que tenemos: https://upload-post.com \n\nBásicamente es una API que te permite subir fácilmente post, reels, imágenes ect a casi todas las redes sociales: Tiktok, Instagram, Facebook, YouTube , Twitter y Linkedin\n\nSolo hay que conectar las cuentas, generar un token y listo! ya solo con una petición subes a todas las redes tu post. \n\nAdemás tenemos integración con n8n y make y 10 subidas gratis al mes para que pruebes.\n\nLas únicas alternativas del mercado que te dejan integrar con API (que yo conozca son Ayrshare y Hootsuite) y parten de un plan mensual de 150 dólares.\n\nNosotros hemos hecho planes mucho más asequibles. echadle un vistazo!\n\n"\n\n*   **For Twitter/X:**\n    *   Create a thread **in English** .\n    *   **If it\'s a thread:**\n        *   Tweet 1: The hook with the image. Present the problem and solution explosively. (e.g., "I built an n8n workflow that does [X]. Goodbye to [problem]. 🧵👇")\n        *   Tweet 2-3: Briefly explain how it works and why it\'s useful.\n        *   Final Tweet: The CTA and community invitation.\n    *   Use concise hashtags: `#n8n`, `#automation`, `#dev`.\nThe system is designed to intelligently create threads on X (formerly Twitter) by automatically splitting your text while respecting any formatting you\'ve already done. Here’s the step-by-step logic:\nSplitting by Paragraphs (Primary Method):\nThe function first looks for two or more newlines (i.e., a blank line) between blocks of text. It considers each of these blocks as a separate, intended tweet in your thread.\nExample: If you write two paragraphs separated by a blank line, they will become the first and second tweets in the thread.\nHandling Overly Long Tweets:\nIf any of these individual "tweets" are still longer than the 280-character limit, the system will try to split them further using these rules in order:\nSplitting by Line Breaks: It will first try to split the long text by single newline characters. This is useful for lists or text with intentional line breaks.\nSplitting by Words: As a last resort, if a single line is still too long, it will be broken up by words to ensure it fits within the character limit.\n\n\n*   **For Threads:**\n    *   The style is similar to Twitter, but allows for a slightly more conversational and relaxed tone. Create the post **in Spanish**.\n    *   You can frame it as a "dev note" or a "behind the scenes" look at the workflow.\n    *   It\'s a good place to ask direct questions and respond to comments more fluidly.\n    *  Mximun 500 characters long\n    *  Don\'t need create thread like x here is more long\n\n\n*   For Reddit  *\n\nCopy this lenguage and style no emotes, Always in English, need a title too for the post: \n\n"Hi everyone!\n\nI wanted to share a workflow I came across on YouTube that lets you generate videos with Veo 3 and publish them all by chatting with a Telegram agent.\n\nYou can ask the agent to create the video, brainstorm ideas, review it, and then post it to TikTok, Facebook, YouTube, etc.\n\nHere’s the video, showing the workflow demo and how to configure\n\nhttps://www.youtube.com/watch?v=v52xbWp1LFk\n\nAnd here it\'s the workflow code:\n\nlink\n"\n"Hey folks,\n\nJust ran into an n8n template that lets you turn full-length podcast videos into short, TikTok-ready clips in one go. It uses Gemini AI to pick the best moments, slaps on captions, mixes in a “keep-them-watching” background video (think Minecraft parkour or GTA gameplay), and even schedules the uploads straight to your TikTok account. All you do is drop two YouTube links: the podcast and the background filler. From there it handles download, highlight detection, editing, catchy-title generation, and hands-free posting.\n\nThe cool part: everything runs on free tiers. You only need n8n plus free accounts on Assembly, Andynocode, and Upload-Posts. Perfect if you’re already making money on TikTok or just want to squeeze more reach out of your podcast backlog.\n\nLink here if you want to poke around:\nhttps://n8n.io/workflows/4568-transform-podcasts-into-viral-tiktok-clips-with-gemini-ai-and-auto-posting/\n\nCurious to hear if anyone’s tried it yet or has tweaks to make it even smoother."\n\n\n**Step 4: Output Format**\n\n**CRITICAL!** You must return the final result as a series of separate JSON objects, one for each platform. Strictly adhere to this format for each platform.\n\n`{"platform": "linkedin", "content": "generated_content_in_spanish", "userId": "user_id", "imageUrl": "the_url_you_extracted_in_step_1"}`\n`{"platform": "twitter", "content": "generated_content_in_english", "userId": "user_id", "imageUrl": "the_url_you_extracted_in_step_1"}`\n`{"platform": "threads", "content": "generated_content_in_spanish", "userId": "user_id", "imageUrl": "the_url_you_extracted_in_step_1"}`\n`{"platform": "reddit", "title": "generated_title_in_english", "content": "generated_content_in_english", "userId": "user_id", "imageUrl": "the_url_you_extracted_in_step_1"}`',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('URL', ``, 'string') }}",
									options: {},
								},
								name: 'HTTP Request1',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: {
								options: {},
								modelName: 'models/gemini-2.5-pro-preview-06-05',
							},
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'[\n{"platform": "linkedin", "content": "generated_content_in_spanish", "userId": "user_id", "imageUrl": "optional_image_url"},\n{"platform": "twitter", "content": "generated_content_in_english", "userId": "user_id", "imageUrl": "optional_image_url"},\n{"platform": "threads", "content": "generated_content_in_spanish", "userId": "user_id", "imageUrl": "optional_image_url"},\n{"platform": "reddit", "title": "generated_title_in_english", "content": "generated_content_in_english", "userId": "user_id", "imageUrl": "optional_image_url"}\n]',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [260, 20],
				name: 'Social Media Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: {
					resume: 'form',
					options: {},
					formTitle: 'Review the posts ',
					formFields: {
						values: [
							{
								fieldType: 'dropdown',
								fieldLabel: 'decision',
								fieldOptions: { values: [{ option: 'approve' }, { option: 'reject' }] },
								requiredField: true,
							},
						],
					},
					formDescription:
						"=### 🔵 LINKEDIN\n{{ $('Social Media Agent').item.json.output[0].content }}\n\n---\n\n### 🇽 TWITTER/X\n{{ $('Social Media Agent').item.json.output[1].content }}\n\n---\n\n### 🧵 THREADS\n{{ $('Social Media Agent').item.json.output[2].content }}\n\n---\n\n### 🤖 REDDIT\n**Title:** {{ $('Social Media Agent').item.json.output[3].title }}\n**Content:** {{ $('Social Media Agent').item.json.output[3].content }}\n\nplease review de posts and approve it if you want to publish",
				},
				position: [560, 20],
				name: 'Wait to approve by user',
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
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: '394500db-496d-4c6e-9adb-59f3caead492',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: "={{ $('Wait to approve by user').item.json.decision }}",
								rightValue: '=approve',
							},
						],
					},
					looseTypeValidation: '=true',
				},
				position: [740, 20],
				name: 'If approved publish',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: "={{ $('Set Input Data').item.json['upload-post_user'] }}",
					title: "={{ $('Social Media Agent').item.json.output[1].content }}",
					photos:
						"=https://api.screenshotone.com/take?access_key={{ $('Set Input Data').item.json['ScreenshotOne_API_KEY'] }}&url={{ $('Set Input Data').item.json.workflow_url }}&format=jpg&block_ads=false&block_cookie_banners=false&block_banners_by_heuristics=false&block_trackers=true&delay=20&timeout=60&response_type=by_format&image_quality=80\n",
					platform: ['x'],
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [1060, -160],
				name: 'Upload Post X',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: "={{ $('Set Input Data').item.json['upload-post_user'] }}",
					title: "={{ $('Social Media Agent').item.json.output[2].content }}",
					photos:
						"=https://api.screenshotone.com/take?access_key={{ $('Set Input Data').item.json['ScreenshotOne_API_KEY'] }}&url={{ $('Set Input Data').item.json.workflow_url }}&format=jpg&block_ads=false&block_cookie_banners=false&block_banners_by_heuristics=false&block_trackers=true&delay=20&timeout=60&response_type=by_format&image_quality=80",
					platform: ['threads'],
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [1060, 20],
				name: 'Upload Post Threads',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: "={{ $('Set Input Data').item.json['upload-post_user'] }}",
					title: "={{ $('Social Media Agent').item.json.output[0].content }}",
					photos:
						"=https://api.screenshotone.com/take?access_key={{ $('Set Input Data').item.json['ScreenshotOne_API_KEY'] }}&url={{ $('Set Input Data').item.json.workflow_url }}&format=jpg&block_ads=false&block_cookie_banners=false&block_banners_by_heuristics=false&block_trackers=true&delay=20&timeout=60&response_type=by_format&image_quality=80",
					platform: ['linkedin'],
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [1060, 200],
				name: 'Upload Post Linkedin',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.reddit',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Social Media Agent').item.json.output[3].content }}",
					title: "={{ $('Social Media Agent').item.json.output[3].title }}",
					subreddit: 'n8n',
				},
				credentials: {
					redditOAuth2Api: { id: 'credential-id', name: 'redditOAuth2Api Credential' },
				},
				position: [1060, 400],
				name: 'Upload Post Reddit',
			},
		}),
	);
