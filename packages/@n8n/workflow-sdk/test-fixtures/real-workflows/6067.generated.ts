const wf = workflow('OcdRRO25OfTnrILJ', 'Blog Post : Tendencias Ecosistema', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [{ field: 'cronExpression', expression: '0 6 * * 1' }],
					},
				},
				position: [-1480, 610],
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
						'={\n  "model": "sonar-pro",\n  "messages": [\n    {\n      "role": "system",\n      "content": "Eres un asistente experto en generar artículos SEO en español neutro sobre startups tecnológicas. El tono debe ser educativo, práctico, reflexivo e inspirador."\n    },\n    {\n      "role": "user",\n      "content": "Redacta un artículo basado en la tendencia más relevante del ecosistema de startups tecnológicas hispanohablantes del día.\\n\\nDevuelve la respuesta estrictamente en formato JSON con esta estructura:\\n{\\n  \\"title\\": \\"[título atractivo en una sola línea]\\",\\n  \\"content\\": \\"[cuerpo del artículo en HTML limpio, sin caracteres escapados, sin markdown, sin saltos \\\\n, y sin comentarios externos. Usar solo etiquetas estándar de HTML como <p>, <h2>, <ul>, <li>, <strong> y <em>. No uses etiquetas personalizadas ni scripts.]\\"\\n}\\n\\nEl artículo debe:\\n- Tener entre 1000 y 1500 palabras.\\n- Incluir subtítulos usando <h2>.\\n- Iniciar con un gancho atractivo de máximo 3 frases dentro de <p>.\\n- Incluir al menos 2 datos estadísticos actuales con fuente (en texto).\\n- Ofrecer mínimo 3 consejos útiles, en formato de lista con <ul> y <li>.\\n- Terminar con una reflexión motivadora e invitación a sumarse a la comunidad (sin enlaces).\\n- Usar naturalmente palabras clave como: startups tecnológicas, innovación, emprendimiento, inversión, comunidad.\\n\\nNo agregues ningún texto ni explicación fuera del objeto JSON."\n    }\n  ]\n}\n',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'perplexityApi',
				},
				credentials: {
					perplexityApi: { id: 'credential-id', name: 'perplexityApi Credential' },
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-1260, 610],
				name: 'Research Topic- Perplexity',
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
						'const data = JSON.parse($input.first().json.choices[0].message.content);\n\n// Función para generar slug SEO-friendly\nfunction toSlug(text) {\n  return text\n    .toLowerCase()\n    .normalize("NFD")                   // elimina acentos\n    .replace(/[\\u0300-\\u036f]/g, "")   // elimina diacríticos\n    .replace(/[^a-z0-9\\s-]/g, "")      // elimina caracteres especiales\n    .replace(/\\s+/g, "-")              // reemplaza espacios por guiones\n    .replace(/-+/g, "-")               // evita guiones dobles\n    .replace(/^-|-$/g, "");            // quita guiones iniciales y finales\n}\n\nconst imageName = toSlug(data.title) + ".jpg";\n\nreturn [\n  {\n    json: {\n      title: data.title,\n      content: data.content,\n      image_filename: imageName\n    }\n  }\n];\n',
				},
				position: [-1040, 610],
				name: 'Get Title, Content, and Image FileName',
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
						value: 'gpt-4.1-mini',
						cachedResultName: 'GPT-4.1-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=Generate a single-line English description of an editorial-style image to visually represent the following article.\n\nThe image must follow these rules:\n- Cinematic, editorial look (not cartoonish or abstract).\n- No visible text or logos.\n- Must work for a blog post featured image in Google News and Discover (ideal size: 1200x628 px).\n- The article title is: "{{ $json.title }}"\n- Article content: {{ $json.content }}.\n\nOutput just the English prompt, without quotes or formatting.',
							},
							{
								role: 'system',
								content:
									'You are an expert in crafting AI image generation prompts for editorial and news images. You help generate cinematic, editorial-style prompts for blog images that perform well in Google News and Google Discover. Avoid any text or logos in the result.',
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-820, 610],
				name: 'Message a model',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cloud.leonardo.ai/api/rest/v1/generations',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "prompt": "{{ $json.message.content }}",\n  "modelId": "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",\n  "width": 1280,\n  "height": 720,\n  "sd_version": "v2",\n  "num_images": 1,\n  "promptMagic": true,\n  "promptMagicStrength": 0.5,\n  "public": false,\n  "scheduler": "LEONARDO",\n  "guidance_scale": 7\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [-460, 610],
				name: 'Leonardo: Create Post Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://cloud.leonardo.ai/api/rest/v1/generations/{{ $json.sdGenerationJob.generationId }}',
					options: {},
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [-240, 610],
				name: 'Get Leonardo Image Status',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '={{ $json.generations_by_pk.generated_images[0].url }}',
							options: {},
						},
						position: [200, 760],
						name: 'Get Leonardo Image',
					},
				}),
				node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [200, 560] } }),
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
								id: '132de601-8ca1-46b4-9ae3-67baa33f28ad',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.generations_by_pk.status }}',
								rightValue: 'COMPLETE',
							},
						],
					},
				},
				name: 'If',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cristiantala.com/wp-json/wp/v2/media',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'binaryData',
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
					headerParameters: {
						parameters: [
							{
								name: 'Content-Disposition',
								value:
									'=attachment; filename="{{ $(\'Get Title, Content, and Image FileName\').item.json.image_filename }}"',
							},
							{ name: 'Content-Type', value: 'image/jpeg' },
						],
					},
					inputDataFieldName: 'data',
				},
				credentials: {
					httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' },
				},
				position: [420, 760],
				name: 'Upload Image to Wordpress',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://cristiantala.com/wp-json/wp/v2/media/{{ $json.id }}',
					method: 'PUT',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'alt_text',
								value: "={{ $('Message a model').item.json.message.content }}",
							},
						],
					},
					genericAuthType: 'httpBasicAuth',
				},
				credentials: {
					httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' },
				},
				position: [640, 760],
				name: 'Agregar ALT a la Imagen',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cristiantala.com/wp-json/wp/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "title": "{{ $(\'Get Title, Content, and Image FileName\').item.json.title }}",\n  "content": "{{ $(\'Get Title, Content, and Image FileName\').item.json.content }}",\n  "status": "publish",\n  "categories": [\n    916\n  ],\n  "featured_media": {{ $(\'Upload Image to Wordpress\').item.json.id }}\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
				credentials: {
					httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' },
				},
				position: [860, 760],
				name: 'Crear Post en Wordpress',
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
							URL: '={{ $json.guid.raw }}',
							Tipo: 'Post WP',
							Topic: '={{ $json.title.rendered }}',
							Status: 'Posted',
							'URL Imagen': "={{ $('Upload Image to Wordpress').item.json.guid.rendered }}",
							'Contenido AI': '={{ $json.content.raw }}',
							'Fecha del Posteo': '={{ $json.date }}',
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
								id: 'Tipo',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Tipo',
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
								id: 'Contenido AI',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Contenido AI',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Fecha del Posteo',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Fecha del Posteo',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL Imagen',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'URL Imagen',
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
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1s3HKV8M3U8NvOp1CxERz8tnC9ibYmnB4Pztgv1ZjkOQ/edit#gid=0',
						cachedResultName: 'Hoja 1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1s3HKV8M3U8NvOp1CxERz8tnC9ibYmnB4Pztgv1ZjkOQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1s3HKV8M3U8NvOp1CxERz8tnC9ibYmnB4Pztgv1ZjkOQ/edit?usp=drivesdk',
						cachedResultName: 'Publicaciones RRSS',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1080, 760],
				name: 'Publicaciones Wordpress Startups y Tecnología',
			},
		}),
	)
	.add(
		sticky(
			'## Problem in node ‘Get Title, Content, and Image FileName‘\nIf this happens, is because the Json file was not created successfully before on Perplexity. IA Models still struggles with this.',
			{ position: [-1100, 800], height: 260 },
		),
	)
	.add(
		sticky(
			'## ALT Images \nALT sigue siendo una de las características seo Importantes, junto al nombre del archivo de la imagen.',
			{ name: 'Sticky Note1', position: [560, 960] },
		),
	)
	.add(
		sticky(
			'## Generación de Imagen con LeonardoAI\nEl proceso de generación de la imagen es asincrono, por lo que debemos preguntar si está listo cada cierto tiempo. % segundos son más que suficientes, y menos puede bloquearte el API.',
			{ name: 'Sticky Note2', position: [-240, 980], width: 540, height: 120 },
		),
	)
	.add(
		sticky(
			'## Image Prompt\nLe pedimos a ChaGPT que nos ayude a generar el prompt que usaremos en LeonardoAI para la imagen. Si bien podemos ocupar OpenAI para la imagen, Leonardo es considerablemente más económico.',
			{ name: 'Sticky Note3', position: [-800, 840], height: 200 },
		),
	)
	.add(
		sticky('## Publicamos\nSe genera la publicación incluyendo la imagen y la categoría.', {
			name: 'Sticky Note4',
			position: [800, 560],
		}),
	)
	.add(
		sticky(
			'## Journal\nGeneramos una lista de las publicaciones que hemos hecho a través de este flujo',
			{ name: 'Sticky Note5', position: [1060, 960] },
		),
	);
