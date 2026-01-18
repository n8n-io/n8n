const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.postgresTrigger',
			version: 1,
			config: {
				parameters: {
					schema: {
						__rl: true,
						mode: 'list',
						value: 'public',
						cachedResultName: 'public',
					},
					options: {},
					tableName: {
						__rl: true,
						mode: 'list',
						value: 'media_queue',
						cachedResultName: 'media_queue',
					},
					additionalFields: {},
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [624, 704],
				name: 'Media_queue Trigger',
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
								id: '3f3ff787-3c12-494e-8d64-bc313956bc96',
								name: 'chat_id',
								type: 'string',
								value: '={{ $json.payload.chat_id }}',
							},
							{
								id: '28e55878-a7c3-4b6f-b92c-6a71d62a8250',
								name: 'payload.media_group_id',
								type: 'string',
								value: '={{ $json.payload.media_group_id }}',
							},
						],
					},
				},
				position: [800, 704],
				name: 'get_chat_id',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [960, 704], name: 'Wait for all the files' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: 'media_group',
						cachedResultName: 'media_group',
					},
					where: {
						values: [
							{
								value: "={{ $('get_chat_id').item.json.payload.media_group_id }}",
								column: 'media_group',
							},
						],
					},
					schema: { __rl: true, mode: 'list', value: 'public' },
					options: {},
					operation: 'select',
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [1152, 704],
				name: 'Get all files from group_id',
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
						'const allItems = $input.all().map((item) => item.json);\n\nlet telegramItems = [];\ntry {\n  telegramItems = $("Media_queue Trigger").all().map((item) => item.json);\n} catch (e) {\n  telegramItems = [];\n}\n\n// Capturamos el caption (solo una vez, del primer elemento disponible)\nconst caption = telegramItems[0]?.payload?.captions || "";\n\n// Creamos la lista de archivos usando file_description\nconst fileList = allItems.map((item, index) => {\n  const fileDesc = item.file_description || "";\n  return `file${index + 1}: ${fileDesc}`;\n});\n\n// Unificamos el mensaje\nconst unifiedMessage = `caption: ${caption}\\n${fileList.join("\\n")}`;\n\nreturn {\n  json: {\n    unifiedMessage\n  }\n};\n',
				},
				position: [1328, 704],
				name: 'unified_variables',
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
								id: 'b9c92d3b-db05-4d27-968e-3fc8b27d4d2b',
								name: 'message',
								type: 'string',
								value: '={{ $json.unifiedMessage }}',
							},
							{
								id: '812d7730-117c-4d1f-b18e-8c3561e86c5e',
								name: 'chat_id',
								type: 'number',
								value: "={{ $('get_chat_id').first().json.chat_id }}",
							},
						],
					},
				},
				position: [1488, 704],
				name: 'Get_message (multiple files)',
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
								id: 'eb807b26-c415-42d2-9cef-707825d6fa82',
								name: 'message',
								type: 'string',
								value: '={{ $json.message }}',
							},
							{
								id: '62235ef7-8bc9-485b-bb75-4fc2c5829cfb',
								name: 'chat_id',
								type: 'number',
								value: '={{ $json.chat_id }}',
							},
						],
					},
				},
				position: [3584, 688],
				name: 'Normalize input',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '={{ $json.message }}',
					options: { systemMessage: '', returnIntermediateSteps: true },
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
						version: 1.3,
						config: {
							parameters: {
								tableName: 'chat_histories',
								sessionKey: '={{ $json.chat_id }}',
								sessionIdType: 'customKey',
							},
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
				position: [3776, 688],
				name: 'AI Agent1',
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
						"/**\n * MarkdownV2-safe formatter + auto-chunker for Telegram (n8n Code node)\n * --------------------------------------------------------------------\n * - Allows: *bold*, _italic_, ||spoiler||, [label](url)\n * - Escapes everything else for Telegram MarkdownV2\n * - Validates/normalizes URLs\n * - Converts \"# Heading\" lines to bold titles\n * - Splits long messages into <= 4096-char chunks (uses a 4000-char budget)\n * - Outputs one item per chunk so the Telegram node sends all parts\n *\n * Recommended: Run this node in \"Run Once for All Items\".\n */\n\nconst MAX_TELEGRAM = 4096;\nconst SAFE_BUDGET = 4000; // small margin to avoid edge overflows\n\n// ============ MarkdownV2 helpers ============\nfunction escapeMarkdownV2(text) {\n  if (!text) return '';\n  return String(text).replace(/([\\\\_*[\\]()~`>#+\\-=|{}.!])/g, '\\\\$1');\n}\n\nfunction escapeForUrl(url) {\n  return String(url).replace(/[)\\\\]/g, '\\\\$&');\n}\n\nfunction normalizeAndValidateUrl(url) {\n  let raw = String(url || '').trim();\n  try {\n    const u = new URL(raw);\n    return u.toString();\n  } catch {}\n  // Try https:// for bare domains\n  const domainLike = /^[a-z0-9.-]+\\.[a-z]{2,}([/:?#].*)?$/i.test(raw);\n  if (domainLike) {\n    try {\n      const u2 = new URL('https://' + raw);\n      return u2.toString();\n    } catch {}\n  }\n  return null;\n}\n\nfunction normalizeHeadings(text) {\n  // Turn \"# Title\" → \"*Title*\"\n  return text.replace(/^(#{1,6})\\s+(.*)$/gm, (m, hashes, title) => `*${title.trim()}*`);\n}\n\nfunction normalizeCommonMd(text) {\n  return String(text)\n    .replace(/\\*\\*([\\s\\S]*?)\\*\\*/g, '*$1*') // **bold** → *bold*\n    .replace(/__([\\s\\S]*?)__/g, '_$1_');    // __italic__ → _italic_\n}\n\n/**\n * Convert incoming text to Telegram-safe MarkdownV2.\n */\nfunction processMarkdownV2Safe(inputText) {\n  if (!inputText) return '';\n\n  let text = normalizeCommonMd(String(inputText));\n  text = normalizeHeadings(text);\n\n  const placeholders = { links: [], bolds: [], italics: [], spoilers: [] };\n\n  // Links: keep safe via placeholders during escaping\n  text = text.replace(/\\[([^\\]\\n]+)\\]\\(([^)]+)\\)/g, (m, label, url) => {\n    const normalizedUrl = normalizeAndValidateUrl(url);\n    if (!normalizedUrl) return escapeMarkdownV2(label);\n    const idx = placeholders.links.length;\n    const ph = `⟬L${idx}⟭`;\n    const safeLabel = escapeMarkdownV2(label);\n    const safeUrl = escapeForUrl(normalizedUrl);\n    placeholders.links.push(`[${safeLabel}](${safeUrl})`);\n    return ph;\n  });\n\n  // Bold\n  text = text.replace(/\\*([\\s\\S]+?)\\*/g, (m, inner) => {\n    const idx = placeholders.bolds.length;\n    const ph = `⟬B${idx}⟭`;\n    placeholders.bolds.push(`*${escapeMarkdownV2(inner)}*`);\n    return ph;\n  });\n\n  // Italic\n  text = text.replace(/_([\\s\\S]+?)_/g, (m, inner) => {\n    const idx = placeholders.italics.length;\n    const ph = `⟬I${idx}⟭`;\n    placeholders.italics.push(`_${escapeMarkdownV2(inner)}_`);\n    return ph;\n  });\n\n  // Spoilers\n  text = text.replace(/\\|\\|([\\s\\S]+?)\\|\\|/g, (m, inner) => {\n    const idx = placeholders.spoilers.length;\n    const ph = `⟬S${idx}⟭`;\n    placeholders.spoilers.push(`||${escapeMarkdownV2(inner)}||`);\n    return ph;\n  });\n\n  // Escape everything else\n  text = escapeMarkdownV2(text);\n\n  // Restore placeholders\n  placeholders.links.forEach((md, i) => { text = text.replace(`⟬L${i}⟭`, md); });\n  placeholders.bolds.forEach((md, i) => { text = text.replace(`⟬B${i}⟭`, md); });\n  placeholders.italics.forEach((md, i) => { text = text.replace(`⟬I${i}⟭`, md); });\n  placeholders.spoilers.forEach((md, i) => { text = text.replace(`⟬S${i}⟭`, md); });\n\n  return text;\n}\n\n// ============ Chunking helpers ============\n/**\n * Split text into Telegram-safe chunks <= maxLen.\n * Prefers paragraph boundaries, then sentence boundaries, then words.\n * Falls back to hard cuts only when unavoidable (e.g., extremely long URL).\n */\nfunction chunkForTelegram(text, maxLen = SAFE_BUDGET) {\n  if (!text || text.length <= maxLen) return [text || ''];\n\n  const parts = [];\n  let buffer = '';\n\n  const flush = () => {\n    if (buffer) {\n      parts.push(buffer);\n      buffer = '';\n    }\n  };\n\n  // 1) Paragraph-level packing\n  const paragraphs = text.split(/\\n{2,}/);\n  for (const pRaw of paragraphs) {\n    const p = pRaw; // keep paragraph as-is\n    const candidate = buffer ? buffer + '\\n\\n' + p : p;\n    if (candidate.length <= maxLen) {\n      buffer = candidate;\n      continue;\n    }\n    if (p.length <= maxLen) {\n      flush();\n      buffer = p;\n      continue;\n    }\n\n    // 2) Sentence-level packing (paragraph is still too big)\n    flush();\n    const sentences = p.split(/(?<=[.!?…])\\s+(?=[^\\s])/u);\n    let sBuf = '';\n    for (const s of sentences) {\n      const sCandidate = sBuf ? sBuf + ' ' + s : s;\n      if (sCandidate.length <= maxLen) {\n        sBuf = sCandidate;\n        continue;\n      }\n      if (s.length <= maxLen) {\n        if (sBuf) parts.push(sBuf);\n        sBuf = s;\n        continue;\n      }\n\n      // 3) Word-level packing (sentence is still too big)\n      if (sBuf) { parts.push(sBuf); sBuf = ''; }\n      let wBuf = '';\n      const words = s.split(/\\s+/);\n      for (const w of words) {\n        const wCandidate = wBuf ? wBuf + ' ' + w : w;\n        if (wCandidate.length <= maxLen) {\n          wBuf = wCandidate;\n          continue;\n        }\n        if (w.length <= maxLen) {\n          if (wBuf) parts.push(wBuf);\n          wBuf = w;\n          continue;\n        }\n        // 4) Hard split (extremely long token, e.g., massive URL)\n        if (wBuf) { parts.push(wBuf); wBuf = ''; }\n        const re = new RegExp(`.{1,${maxLen}}`, 'g');\n        const hardPieces = w.match(re) || [];\n        parts.push(...hardPieces);\n      }\n      if (wBuf) parts.push(wBuf);\n    }\n    if (sBuf) parts.push(sBuf);\n  }\n  if (buffer) parts.push(buffer);\n\n  // Final safety pass: trim chunks that might still exceed MAX_TELEGRAM\n  return parts.flatMap(part => {\n    if (part.length <= MAX_TELEGRAM) return [part];\n    const re = new RegExp(`.{1,${SAFE_BUDGET}}`, 'g');\n    return part.match(re) || [];\n  });\n}\n\n// ============ Main ============\nconst inputItems = $input.all();\nconst out = [];\n\nfor (const item of inputItems) {\n  const j = item.json || {};\n  const raw =\n    j.message ?? j.output ?? j.text ?? j.content ?? '';\n\n  const formatted = processMarkdownV2Safe(raw);\n  const chunks = chunkForTelegram(formatted, SAFE_BUDGET);\n\n  chunks.forEach((chunk, idx) => {\n    out.push({\n      json: {\n        ...j,\n        message: chunk,\n        message_part_index: idx + 1,\n        message_parts_total: chunks.length,\n      },\n      binary: item.binary,\n    });\n  });\n}\n\nreturn out;\n",
				},
				position: [4080, 688],
				name: 'MarkdownV2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.message }}',
					chatId: "={{ $('Normalize input').first().json.chat_id }}",
					additionalFields: { parse_mode: 'MarkdownV2', appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [4272, 688],
				name: 'Send a text message1',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [624, 464], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					query:
						"CREATE TABLE IF NOT EXISTS public.media_group (\n  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,\n  media_group text NOT NULL,\n  file_description text NULL,\n  CONSTRAINT media_group_pkey PRIMARY KEY (id)\n) TABLESPACE pg_default;\n\nCREATE TABLE IF NOT EXISTS public.media_queue (\n  media_group_id text NOT NULL,\n  chat_id bigint NOT NULL,\n  captions text NULL,\n  CONSTRAINT media_queue_pkey PRIMARY KEY (media_group_id),\n  CONSTRAINT media_queue_media_group_id_key UNIQUE (media_group_id)\n) TABLESPACE pg_default;\n\nCREATE TABLE IF NOT EXISTS public.chat_histories (\n  id serial NOT NULL,\n  session_id character varying(255) NOT NULL,\n  message jsonb NOT NULL,\n  CONSTRAINT chat_histories_pkey PRIMARY KEY (id)\n) TABLESPACE pg_default;\n\nCREATE INDEX IF NOT EXISTS idx_pch_session \n  ON public.chat_histories USING btree (session_id) TABLESPACE pg_default;\n\nCREATE INDEX IF NOT EXISTS idx_pch_message_gin \n  ON public.chat_histories USING gin (message) TABLESPACE pg_default;\n\nCREATE INDEX IF NOT EXISTS idx_pch_message_type \n  ON public.chat_histories USING btree (((message ->> 'type'::text))) TABLESPACE pg_default;\n",
					options: {},
					operation: 'executeQuery',
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [800, 464],
				name: ' Create Tables',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [608, 1392],
				name: 'Telegram Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Text',
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
											id: 'fcb767ee-565e-4b56-a54e-6f97f739fc24',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.text }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Voice Message',
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
											id: 'c1016c40-f8f2-4e08-8ec8-5cdb88f5c87a',
											operator: { type: 'object', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.voice }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Video note',
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
											id: '9b94667e-c79b-4e4a-81ca-c4cd0d55f465',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.video_note.file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Image',
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
											id: 'f8150ac7-eea4-4658-8da9-f7a1c88a471d',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.photo[0].file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Audio',
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
											id: '24ad08e0-6567-41e2-921f-b2a5cd6e2d47',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.audio.file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Video',
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
											id: 'c266ee51-45e8-45e0-ba4a-d3d8f41f2e43',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.video.file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Document',
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
											id: '67b350d3-97e9-4966-a05e-cabbe825fe8d',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.document.file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {
						ignoreCase: false,
						fallbackOutput: 'extra',
						allMatchingOutputs: true,
					},
				},
				position: [784, 1296],
				name: 'Input Message Router1',
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
								id: '801ec600-22ad-4a94-a2b4-ae72eb271df0',
								name: 'message',
								type: 'string',
								value: '={{ $json.message.text }}',
							},
							{
								id: '263071fb-bcdf-42b0-bb46-71b75fa0bf2a',
								name: 'chat_id',
								type: 'string',
								value: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							},
						],
					},
				},
				position: [1152, 928],
				name: 'get_message (text)',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId: '={{ $json.message.voice.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 1072],
				name: 'Download Voice Message',
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
						"// --- Mapa Extendido de Tipos MIME ---\n// Una lista completa para cubrir la mayoría de los formatos de archivo comunes.\nconst mimeMap = {\n  // --- Formatos de Documentos ---\n  'pdf': 'application/pdf',\n  'txt': 'text/plain',\n  'rtf': 'application/rtf',\n  'csv': 'text/csv',\n  'html': 'text/html',\n  'htm': 'text/html',\n  'json': 'application/json',\n  'xml': 'application/xml', // 'text/xml' también es válido pero 'application/xml' es más común\n  'yaml': 'application/x-yaml',\n  'yml': 'application/x-yaml',\n\n  // --- Formatos de Microsoft Office ---\n  'doc': 'application/msword',\n  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'xls': 'application/vnd.ms-excel',\n  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  'ppt': 'application/vnd.ms-powerpoint',\n  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',\n  'pub': 'application/vnd.ms-publisher',\n\n  // --- Formatos de OpenOffice / LibreOffice ---\n  'odt': 'application/vnd.oasis.opendocument.text',\n  'ods': 'application/vnd.oasis.opendocument.spreadsheet',\n  'odp': 'application/vnd.oasis.opendocument.presentation',\n  'odg': 'application/vnd.oasis.opendocument.graphics',\n\n  // --- Formatos de Apple iWork ---\n  'pages': 'application/vnd.apple.pages',\n  'numbers': 'application/vnd.apple.numbers',\n  'key': 'application/vnd.apple.keynote',\n\n  // --- Formatos de Imagen ---\n  'png': 'image/png',\n  'jpg': 'image/jpeg',\n  'jpeg': 'image/jpeg',\n  'gif': 'image/gif',\n  'webp': 'image/webp',\n  'svg': 'image/svg+xml',\n  'bmp': 'image/bmp',\n  'ico': 'image/vnd.microsoft.icon',\n  'tif': 'image/tiff',\n  'tiff': 'image/tiff',\n  'heic': 'image/heic',\n  'heif': 'image/heif',\n\n  // --- Formatos de Audio ---\n  'mp3': 'audio/mpeg',\n  'wav': 'audio/wav',\n  'oga': 'audio/ogg',\n  'ogg': 'audio/ogg',\n  'flac': 'audio/flac',\n  'm4a': 'audio/mp4',\n  'aac': 'audio/aac',\n  'opus': 'audio/opus',\n  'wma': 'audio/x-ms-wma',\n  'mid': 'audio/midi',\n  'midi': 'audio/midi',\n\n  // --- Formatos de Video ---\n  'mp4': 'video/mp4',\n  'mov': 'video/quicktime',\n  'webm': 'video/webm',\n  'mpeg': 'video/mpeg',\n  'mpg': 'video/mpeg',\n  'avi': 'video/x-msvideo',\n  'wmv': 'video/x-ms-wmv',\n  'flv': 'video/x-flv',\n  'mkv': 'video/x-matroska',\n\n  // --- Formatos de Archivos y Compresión ---\n  'zip': 'application/zip',\n  'rar': 'application/vnd.rar',\n  '7z': 'application/x-7z-compressed',\n  'tar': 'application/x-tar',\n  'gz': 'application/gzip',\n  'bz2': 'application/x-bzip2',\n\n  // --- Otros Formatos ---\n  'epub': 'application/epub+zip',\n  'ics': 'text/calendar',\n  'vcf': 'text/vcard',\n  'js': 'text/javascript',\n  'css': 'text/css',\n  'sh': 'application/x-sh',\n  'py': 'text/x-python',\n};\n\n// --- Lógica de Procesamiento (sin cambios) ---\n\n// Obtenemos todos los items que llegan al nodo\nconst items = $input.all();\n\n// Iteramos sobre cada item para procesarlo\nfor (const item of items) {\n  // Verificamos que el item tenga datos binarios para procesar\n  if (item.binary && item.binary['data']) {\n    // Obtenemos el nombre del archivo de forma segura\n    const fileName = item.binary['data'].fileName || '';\n    if (!fileName) {\n      continue; // Si no hay nombre de archivo, pasamos al siguiente item\n    }\n\n    // Extraemos la extensión del archivo de forma robusta\n    const extension = fileName.slice((fileName.lastIndexOf(\".\") - 1 >>> 0) + 2).toLowerCase();\n\n    // Buscamos la extensión en nuestro mapa\n    const newMimeType = mimeMap[extension];\n\n    // Si encontramos una coincidencia en el mapa, actualizamos el mimeType\n    if (newMimeType) {\n      if(item.binary['data'].mimeType !== newMimeType) {\n        console.log(`Cambiando mimeType para '${fileName}' de '${item.binary['data'].mimeType}' a '${newMimeType}'.`);\n        item.binary['data'].mimeType = newMimeType;\n      }\n    }\n  }\n}\n\n// Devolvemos todos los items, modificados o no\nreturn items;",
				},
				position: [1328, 1072],
				name: 'Fix mime',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: "What's in this audio message from telegram user?",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-pro',
						cachedResultName: 'models/gemini-2.5-pro',
					},
					options: {},
					resource: 'audio',
					inputType: 'binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 1072],
				name: 'Analyze voice message',
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
								id: 'd8935452-fe20-469d-a68d-1aad056cb8dd',
								name: 'message',
								type: 'string',
								value:
									'=Media Message Transcription:{{ $json.candidates?.[0]?.content?.parts?.[0]?.text || $json.content?.parts?.[0]?.text }}',
							},
							{
								id: '93f1bba1-1180-404a-93ca-c34cf1d1b7ac',
								name: 'chat_id',
								type: 'string',
								value: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							},
						],
					},
				},
				position: [1840, 1152],
				name: 'get_message (Audio/Video message)',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 1232],
				name: 'Download VIDEO NOTE',
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
						"// --- Mapa Extendido de Tipos MIME ---\n// Una lista completa para cubrir la mayoría de los formatos de archivo comunes.\nconst mimeMap = {\n  // --- Formatos de Documentos ---\n  'pdf': 'application/pdf',\n  'txt': 'text/plain',\n  'rtf': 'application/rtf',\n  'csv': 'text/csv',\n  'html': 'text/html',\n  'htm': 'text/html',\n  'json': 'application/json',\n  'xml': 'application/xml', // 'text/xml' también es válido pero 'application/xml' es más común\n  'yaml': 'application/x-yaml',\n  'yml': 'application/x-yaml',\n\n  // --- Formatos de Microsoft Office ---\n  'doc': 'application/msword',\n  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'xls': 'application/vnd.ms-excel',\n  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  'ppt': 'application/vnd.ms-powerpoint',\n  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',\n  'pub': 'application/vnd.ms-publisher',\n\n  // --- Formatos de OpenOffice / LibreOffice ---\n  'odt': 'application/vnd.oasis.opendocument.text',\n  'ods': 'application/vnd.oasis.opendocument.spreadsheet',\n  'odp': 'application/vnd.oasis.opendocument.presentation',\n  'odg': 'application/vnd.oasis.opendocument.graphics',\n\n  // --- Formatos de Apple iWork ---\n  'pages': 'application/vnd.apple.pages',\n  'numbers': 'application/vnd.apple.numbers',\n  'key': 'application/vnd.apple.keynote',\n\n  // --- Formatos de Imagen ---\n  'png': 'image/png',\n  'jpg': 'image/jpeg',\n  'jpeg': 'image/jpeg',\n  'gif': 'image/gif',\n  'webp': 'image/webp',\n  'svg': 'image/svg+xml',\n  'bmp': 'image/bmp',\n  'ico': 'image/vnd.microsoft.icon',\n  'tif': 'image/tiff',\n  'tiff': 'image/tiff',\n  'heic': 'image/heic',\n  'heif': 'image/heif',\n\n  // --- Formatos de Audio ---\n  'mp3': 'audio/mpeg',\n  'wav': 'audio/wav',\n  'oga': 'audio/ogg',\n  'ogg': 'audio/ogg',\n  'flac': 'audio/flac',\n  'm4a': 'audio/mp4',\n  'aac': 'audio/aac',\n  'opus': 'audio/opus',\n  'wma': 'audio/x-ms-wma',\n  'mid': 'audio/midi',\n  'midi': 'audio/midi',\n\n  // --- Formatos de Video ---\n  'mp4': 'video/mp4',\n  'mov': 'video/quicktime',\n  'webm': 'video/webm',\n  'mpeg': 'video/mpeg',\n  'mpg': 'video/mpeg',\n  'avi': 'video/x-msvideo',\n  'wmv': 'video/x-ms-wmv',\n  'flv': 'video/x-flv',\n  'mkv': 'video/x-matroska',\n\n  // --- Formatos de Archivos y Compresión ---\n  'zip': 'application/zip',\n  'rar': 'application/vnd.rar',\n  '7z': 'application/x-7z-compressed',\n  'tar': 'application/x-tar',\n  'gz': 'application/gzip',\n  'bz2': 'application/x-bzip2',\n\n  // --- Otros Formatos ---\n  'epub': 'application/epub+zip',\n  'ics': 'text/calendar',\n  'vcf': 'text/vcard',\n  'js': 'text/javascript',\n  'css': 'text/css',\n  'sh': 'application/x-sh',\n  'py': 'text/x-python',\n};\n\n// --- Lógica de Procesamiento (sin cambios) ---\n\n// Obtenemos todos los items que llegan al nodo\nconst items = $input.all();\n\n// Iteramos sobre cada item para procesarlo\nfor (const item of items) {\n  // Verificamos que el item tenga datos binarios para procesar\n  if (item.binary && item.binary['data']) {\n    // Obtenemos el nombre del archivo de forma segura\n    const fileName = item.binary['data'].fileName || '';\n    if (!fileName) {\n      continue; // Si no hay nombre de archivo, pasamos al siguiente item\n    }\n\n    // Extraemos la extensión del archivo de forma robusta\n    const extension = fileName.slice((fileName.lastIndexOf(\".\") - 1 >>> 0) + 2).toLowerCase();\n\n    // Buscamos la extensión en nuestro mapa\n    const newMimeType = mimeMap[extension];\n\n    // Si encontramos una coincidencia en el mapa, actualizamos el mimeType\n    if (newMimeType) {\n      if(item.binary['data'].mimeType !== newMimeType) {\n        console.log(`Cambiando mimeType para '${fileName}' de '${item.binary['data'].mimeType}' a '${newMimeType}'.`);\n        item.binary['data'].mimeType = newMimeType;\n      }\n    }\n  }\n}\n\n// Devolvemos todos los items, modificados o no\nreturn items;",
				},
				position: [1328, 1232],
				name: 'Fix mime1',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: "What's in this video message from telegram user? don't talk about the circular frame of telegram",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-pro',
						cachedResultName: 'models/gemini-2.5-pro',
					},
					options: {},
					resource: 'video',
					simplify: false,
					inputType: '=binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 1232],
				name: 'Analyze video note',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ $json.message.photo[3]?.file_id || $json.message.photo[2]?.file_id || $json.message.photo[1]?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 1376],
				name: 'Download IMAGE',
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
						"// --- Mapa Extendido de Tipos MIME ---\n// Una lista completa para cubrir la mayoría de los formatos de archivo comunes.\nconst mimeMap = {\n  // --- Formatos de Documentos ---\n  'pdf': 'application/pdf',\n  'txt': 'text/plain',\n  'rtf': 'application/rtf',\n  'csv': 'text/csv',\n  'html': 'text/html',\n  'htm': 'text/html',\n  'json': 'application/json',\n  'xml': 'application/xml', // 'text/xml' también es válido pero 'application/xml' es más común\n  'yaml': 'application/x-yaml',\n  'yml': 'application/x-yaml',\n\n  // --- Formatos de Microsoft Office ---\n  'doc': 'application/msword',\n  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'xls': 'application/vnd.ms-excel',\n  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  'ppt': 'application/vnd.ms-powerpoint',\n  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',\n  'pub': 'application/vnd.ms-publisher',\n\n  // --- Formatos de OpenOffice / LibreOffice ---\n  'odt': 'application/vnd.oasis.opendocument.text',\n  'ods': 'application/vnd.oasis.opendocument.spreadsheet',\n  'odp': 'application/vnd.oasis.opendocument.presentation',\n  'odg': 'application/vnd.oasis.opendocument.graphics',\n\n  // --- Formatos de Apple iWork ---\n  'pages': 'application/vnd.apple.pages',\n  'numbers': 'application/vnd.apple.numbers',\n  'key': 'application/vnd.apple.keynote',\n\n  // --- Formatos de Imagen ---\n  'png': 'image/png',\n  'jpg': 'image/jpeg',\n  'jpeg': 'image/jpeg',\n  'gif': 'image/gif',\n  'webp': 'image/webp',\n  'svg': 'image/svg+xml',\n  'bmp': 'image/bmp',\n  'ico': 'image/vnd.microsoft.icon',\n  'tif': 'image/tiff',\n  'tiff': 'image/tiff',\n  'heic': 'image/heic',\n  'heif': 'image/heif',\n\n  // --- Formatos de Audio ---\n  'mp3': 'audio/mpeg',\n  'wav': 'audio/wav',\n  'oga': 'audio/ogg',\n  'ogg': 'audio/ogg',\n  'flac': 'audio/flac',\n  'm4a': 'audio/mp4',\n  'aac': 'audio/aac',\n  'opus': 'audio/opus',\n  'wma': 'audio/x-ms-wma',\n  'mid': 'audio/midi',\n  'midi': 'audio/midi',\n\n  // --- Formatos de Video ---\n  'mp4': 'video/mp4',\n  'mov': 'video/quicktime',\n  'webm': 'video/webm',\n  'mpeg': 'video/mpeg',\n  'mpg': 'video/mpeg',\n  'avi': 'video/x-msvideo',\n  'wmv': 'video/x-ms-wmv',\n  'flv': 'video/x-flv',\n  'mkv': 'video/x-matroska',\n\n  // --- Formatos de Archivos y Compresión ---\n  'zip': 'application/zip',\n  'rar': 'application/vnd.rar',\n  '7z': 'application/x-7z-compressed',\n  'tar': 'application/x-tar',\n  'gz': 'application/gzip',\n  'bz2': 'application/x-bzip2',\n\n  // --- Otros Formatos ---\n  'epub': 'application/epub+zip',\n  'ics': 'text/calendar',\n  'vcf': 'text/vcard',\n  'js': 'text/javascript',\n  'css': 'text/css',\n  'sh': 'application/x-sh',\n  'py': 'text/x-python',\n};\n\n// --- Lógica de Procesamiento (sin cambios) ---\n\n// Obtenemos todos los items que llegan al nodo\nconst items = $input.all();\n\n// Iteramos sobre cada item para procesarlo\nfor (const item of items) {\n  // Verificamos que el item tenga datos binarios para procesar\n  if (item.binary && item.binary['data']) {\n    // Obtenemos el nombre del archivo de forma segura\n    const fileName = item.binary['data'].fileName || '';\n    if (!fileName) {\n      continue; // Si no hay nombre de archivo, pasamos al siguiente item\n    }\n\n    // Extraemos la extensión del archivo de forma robusta\n    const extension = fileName.slice((fileName.lastIndexOf(\".\") - 1 >>> 0) + 2).toLowerCase();\n\n    // Buscamos la extensión en nuestro mapa\n    const newMimeType = mimeMap[extension];\n\n    // Si encontramos una coincidencia en el mapa, actualizamos el mimeType\n    if (newMimeType) {\n      if(item.binary['data'].mimeType !== newMimeType) {\n        console.log(`Cambiando mimeType para '${fileName}' de '${item.binary['data'].mimeType}' a '${newMimeType}'.`);\n        item.binary['data'].mimeType = newMimeType;\n      }\n    }\n  }\n}\n\n// Devolvemos todos los items, modificados o no\nreturn items;",
				},
				position: [1328, 1376],
				name: 'Fix mime5',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: "What's in this image from telegram user?",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-flash',
						cachedResultName: 'models/gemini-2.5-flash',
					},
					options: {},
					resource: 'image',
					inputType: 'binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 1376],
				name: 'Analyze image',
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
								id: 'd8935452-fe20-469d-a68d-1aad056cb8dd',
								name: 'message',
								type: 'string',
								value: '=Media description: {{ $json.content.parts[0].text }}',
							},
							{
								id: '53e34499-7dad-4f94-aa7d-f778321f13f4',
								name: 'chat_id',
								type: 'string',
								value: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							},
						],
					},
				},
				position: [1824, 1520],
				name: 'get_message (Media  message)',
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
								id: 'e6c61b94-9a84-4d6f-91a4-1839209fdc89',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: "={{ $('Telegram Trigger').first().json.message.caption }}",
								rightValue: '',
							},
						],
					},
				},
				position: [2272, 1520],
				name: 'Captions?1',
			},
		}),
	)
	.output(0)
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
								id: 'df19fe9e-d1bd-42e4-9617-654fb984cc55',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: "={{ $('Telegram Trigger').item.json.message.media_group_id }}",
								rightValue: '',
							},
						],
					},
				},
				position: [2448, 1376],
				name: 'Media_group?2',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: 'media_group',
						cachedResultName: 'media_group',
					},
					schema: { __rl: true, mode: 'list', value: 'public' },
					columns: {
						value: {
							media_group: "={{ $('Telegram Trigger').item.json.message.media_group_id }}",
							file_description: '={{ $json.message }}',
						},
						schema: [
							{
								id: 'id',
								type: 'number',
								display: true,
								removed: true,
								required: false,
								displayName: 'id',
								defaultMatch: true,
								canBeUsedToMatch: true,
							},
							{
								id: 'media_group',
								type: 'string',
								display: true,
								required: true,
								displayName: 'media_group',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'file_description',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'file_description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [2656, 1280],
				name: 'Insert documents in media_group',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: 'media_queue',
						cachedResultName: 'media_queue',
					},
					schema: { __rl: true, mode: 'list', value: 'public' },
					columns: {
						value: {
							chat_id: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							captions: "={{ $('Telegram Trigger').item.json.message.caption }}",
							media_group_id: "={{ $('Telegram Trigger').item.json.message.media_group_id }}",
						},
						schema: [
							{
								id: 'media_group_id',
								type: 'string',
								display: true,
								required: true,
								displayName: 'media_group_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'chat_id',
								type: 'number',
								display: true,
								required: true,
								displayName: 'chat_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'captions',
								type: 'string',
								display: true,
								required: false,
								displayName: 'captions',
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
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [2832, 1280],
				name: 'Insert media_queue with captions (Trigger)',
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
								id: 'c9c892e7-7f78-4a8d-a749-452a0d1b92cf',
								name: 'message',
								type: 'string',
								value:
									"=Captions: {{ $('Telegram Trigger').item.json.message.caption }}\n{{ $json.message }}\n",
							},
							{
								id: 'cda76cee-0b9c-4062-b987-10e438eb3b8f',
								name: 'chat_id',
								type: 'string',
								value: '={{ $json.chat_id }}',
							},
						],
					},
				},
				position: [2656, 1440],
				name: 'Get_file_and_captions',
			},
		}),
	)
	.output(1)
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
								id: 'df19fe9e-d1bd-42e4-9617-654fb984cc55',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: "={{ $('Telegram Trigger').first().json.message.media_group_id }}",
								rightValue: '',
							},
						],
					},
				},
				position: [2448, 1648],
				name: 'Media_group?3',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: 'media_group',
						cachedResultName: 'media_group',
					},
					schema: {
						__rl: true,
						mode: 'list',
						value: 'public',
						cachedResultName: 'public',
					},
					columns: {
						value: {
							media_group: "={{ $('Telegram Trigger').item.json.message.media_group_id }}",
							file_description: '={{ $json.message }}',
						},
						schema: [
							{
								id: 'id',
								type: 'number',
								display: true,
								removed: true,
								required: false,
								displayName: 'id',
								defaultMatch: true,
								canBeUsedToMatch: true,
							},
							{
								id: 'media_group',
								type: 'string',
								display: true,
								required: true,
								displayName: 'media_group',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'file_description',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'file_description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [2656, 1600],
				name: 'Insert documents in media_group1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 2 }, position: [2832, 1600], name: 'Wait' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: 'media_queue',
						cachedResultName: 'media_queue',
					},
					schema: { __rl: true, mode: 'list', value: 'public' },
					columns: {
						value: {
							chat_id: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							media_group_id: "={{ $('Telegram Trigger').item.json.message.media_group_id }}",
						},
						schema: [
							{
								id: 'media_group_id',
								type: 'string',
								display: true,
								required: true,
								displayName: 'media_group_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'chat_id',
								type: 'number',
								display: true,
								required: true,
								displayName: 'chat_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'captions',
								type: 'string',
								display: true,
								required: false,
								displayName: 'captions',
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
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [3008, 1600],
				name: 'Insert media_queue (Trigger)',
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
								id: '9e549a53-8801-42ea-8c41-e1e38032f62c',
								name: 'message',
								type: 'string',
								value: '=File description: {{ $json.message }}',
							},
							{
								id: 'df93f18e-9e2d-4ea6-8a0a-44046ee60f19',
								name: 'chat_id',
								type: 'string',
								value: '={{ $json.chat_id }}',
							},
						],
					},
				},
				position: [2656, 1760],
				name: 'Get_only_file',
			},
		}),
	)
	.output(4)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId: '={{ $json.message.audio.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 1520],
				name: 'Download AUDIO',
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
						"// --- Mapa Extendido de Tipos MIME ---\n// Una lista completa para cubrir la mayoría de los formatos de archivo comunes.\nconst mimeMap = {\n  // --- Formatos de Documentos ---\n  'pdf': 'application/pdf',\n  'txt': 'text/plain',\n  'rtf': 'application/rtf',\n  'csv': 'text/csv',\n  'html': 'text/html',\n  'htm': 'text/html',\n  'json': 'application/json',\n  'xml': 'application/xml', // 'text/xml' también es válido pero 'application/xml' es más común\n  'yaml': 'application/x-yaml',\n  'yml': 'application/x-yaml',\n\n  // --- Formatos de Microsoft Office ---\n  'doc': 'application/msword',\n  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'xls': 'application/vnd.ms-excel',\n  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  'ppt': 'application/vnd.ms-powerpoint',\n  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',\n  'pub': 'application/vnd.ms-publisher',\n\n  // --- Formatos de OpenOffice / LibreOffice ---\n  'odt': 'application/vnd.oasis.opendocument.text',\n  'ods': 'application/vnd.oasis.opendocument.spreadsheet',\n  'odp': 'application/vnd.oasis.opendocument.presentation',\n  'odg': 'application/vnd.oasis.opendocument.graphics',\n\n  // --- Formatos de Apple iWork ---\n  'pages': 'application/vnd.apple.pages',\n  'numbers': 'application/vnd.apple.numbers',\n  'key': 'application/vnd.apple.keynote',\n\n  // --- Formatos de Imagen ---\n  'png': 'image/png',\n  'jpg': 'image/jpeg',\n  'jpeg': 'image/jpeg',\n  'gif': 'image/gif',\n  'webp': 'image/webp',\n  'svg': 'image/svg+xml',\n  'bmp': 'image/bmp',\n  'ico': 'image/vnd.microsoft.icon',\n  'tif': 'image/tiff',\n  'tiff': 'image/tiff',\n  'heic': 'image/heic',\n  'heif': 'image/heif',\n\n  // --- Formatos de Audio ---\n  'mp3': 'audio/mpeg',\n  'wav': 'audio/wav',\n  'oga': 'audio/ogg',\n  'ogg': 'audio/ogg',\n  'flac': 'audio/flac',\n  'm4a': 'audio/mp4',\n  'aac': 'audio/aac',\n  'opus': 'audio/opus',\n  'wma': 'audio/x-ms-wma',\n  'mid': 'audio/midi',\n  'midi': 'audio/midi',\n\n  // --- Formatos de Video ---\n  'mp4': 'video/mp4',\n  'mov': 'video/quicktime',\n  'webm': 'video/webm',\n  'mpeg': 'video/mpeg',\n  'mpg': 'video/mpeg',\n  'avi': 'video/x-msvideo',\n  'wmv': 'video/x-ms-wmv',\n  'flv': 'video/x-flv',\n  'mkv': 'video/x-matroska',\n\n  // --- Formatos de Archivos y Compresión ---\n  'zip': 'application/zip',\n  'rar': 'application/vnd.rar',\n  '7z': 'application/x-7z-compressed',\n  'tar': 'application/x-tar',\n  'gz': 'application/gzip',\n  'bz2': 'application/x-bzip2',\n\n  // --- Otros Formatos ---\n  'epub': 'application/epub+zip',\n  'ics': 'text/calendar',\n  'vcf': 'text/vcard',\n  'js': 'text/javascript',\n  'css': 'text/css',\n  'sh': 'application/x-sh',\n  'py': 'text/x-python',\n};\n\n// --- Lógica de Procesamiento (sin cambios) ---\n\n// Obtenemos todos los items que llegan al nodo\nconst items = $input.all();\n\n// Iteramos sobre cada item para procesarlo\nfor (const item of items) {\n  // Verificamos que el item tenga datos binarios para procesar\n  if (item.binary && item.binary['data']) {\n    // Obtenemos el nombre del archivo de forma segura\n    const fileName = item.binary['data'].fileName || '';\n    if (!fileName) {\n      continue; // Si no hay nombre de archivo, pasamos al siguiente item\n    }\n\n    // Extraemos la extensión del archivo de forma robusta\n    const extension = fileName.slice((fileName.lastIndexOf(\".\") - 1 >>> 0) + 2).toLowerCase();\n\n    // Buscamos la extensión en nuestro mapa\n    const newMimeType = mimeMap[extension];\n\n    // Si encontramos una coincidencia en el mapa, actualizamos el mimeType\n    if (newMimeType) {\n      if(item.binary['data'].mimeType !== newMimeType) {\n        console.log(`Cambiando mimeType para '${fileName}' de '${item.binary['data'].mimeType}' a '${newMimeType}'.`);\n        item.binary['data'].mimeType = newMimeType;\n      }\n    }\n  }\n}\n\n// Devolvemos todos los items, modificados o no\nreturn items;",
				},
				position: [1328, 1520],
				name: 'Fix mime6',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: "What's in this audio from telegram user?",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-flash',
						cachedResultName: 'models/gemini-2.5-flash',
					},
					options: {},
					resource: 'audio',
					inputType: 'binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 1520],
				name: 'Analyze audio',
			},
		}),
	)
	.output(5)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 1664],
				name: 'Download VIDEO',
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
						"// --- Mapa Extendido de Tipos MIME ---\n// Una lista completa para cubrir la mayoría de los formatos de archivo comunes.\nconst mimeMap = {\n  // --- Formatos de Documentos ---\n  'pdf': 'application/pdf',\n  'txt': 'text/plain',\n  'rtf': 'application/rtf',\n  'csv': 'text/csv',\n  'html': 'text/html',\n  'htm': 'text/html',\n  'json': 'application/json',\n  'xml': 'application/xml', // 'text/xml' también es válido pero 'application/xml' es más común\n  'yaml': 'application/x-yaml',\n  'yml': 'application/x-yaml',\n\n  // --- Formatos de Microsoft Office ---\n  'doc': 'application/msword',\n  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'xls': 'application/vnd.ms-excel',\n  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  'ppt': 'application/vnd.ms-powerpoint',\n  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',\n  'pub': 'application/vnd.ms-publisher',\n\n  // --- Formatos de OpenOffice / LibreOffice ---\n  'odt': 'application/vnd.oasis.opendocument.text',\n  'ods': 'application/vnd.oasis.opendocument.spreadsheet',\n  'odp': 'application/vnd.oasis.opendocument.presentation',\n  'odg': 'application/vnd.oasis.opendocument.graphics',\n\n  // --- Formatos de Apple iWork ---\n  'pages': 'application/vnd.apple.pages',\n  'numbers': 'application/vnd.apple.numbers',\n  'key': 'application/vnd.apple.keynote',\n\n  // --- Formatos de Imagen ---\n  'png': 'image/png',\n  'jpg': 'image/jpeg',\n  'jpeg': 'image/jpeg',\n  'gif': 'image/gif',\n  'webp': 'image/webp',\n  'svg': 'image/svg+xml',\n  'bmp': 'image/bmp',\n  'ico': 'image/vnd.microsoft.icon',\n  'tif': 'image/tiff',\n  'tiff': 'image/tiff',\n  'heic': 'image/heic',\n  'heif': 'image/heif',\n\n  // --- Formatos de Audio ---\n  'mp3': 'audio/mpeg',\n  'wav': 'audio/wav',\n  'oga': 'audio/ogg',\n  'ogg': 'audio/ogg',\n  'flac': 'audio/flac',\n  'm4a': 'audio/mp4',\n  'aac': 'audio/aac',\n  'opus': 'audio/opus',\n  'wma': 'audio/x-ms-wma',\n  'mid': 'audio/midi',\n  'midi': 'audio/midi',\n\n  // --- Formatos de Video ---\n  'mp4': 'video/mp4',\n  'mov': 'video/quicktime',\n  'webm': 'video/webm',\n  'mpeg': 'video/mpeg',\n  'mpg': 'video/mpeg',\n  'avi': 'video/x-msvideo',\n  'wmv': 'video/x-ms-wmv',\n  'flv': 'video/x-flv',\n  'mkv': 'video/x-matroska',\n\n  // --- Formatos de Archivos y Compresión ---\n  'zip': 'application/zip',\n  'rar': 'application/vnd.rar',\n  '7z': 'application/x-7z-compressed',\n  'tar': 'application/x-tar',\n  'gz': 'application/gzip',\n  'bz2': 'application/x-bzip2',\n\n  // --- Otros Formatos ---\n  'epub': 'application/epub+zip',\n  'ics': 'text/calendar',\n  'vcf': 'text/vcard',\n  'js': 'text/javascript',\n  'css': 'text/css',\n  'sh': 'application/x-sh',\n  'py': 'text/x-python',\n};\n\n// --- Lógica de Procesamiento (sin cambios) ---\n\n// Obtenemos todos los items que llegan al nodo\nconst items = $input.all();\n\n// Iteramos sobre cada item para procesarlo\nfor (const item of items) {\n  // Verificamos que el item tenga datos binarios para procesar\n  if (item.binary && item.binary['data']) {\n    // Obtenemos el nombre del archivo de forma segura\n    const fileName = item.binary['data'].fileName || '';\n    if (!fileName) {\n      continue; // Si no hay nombre de archivo, pasamos al siguiente item\n    }\n\n    // Extraemos la extensión del archivo de forma robusta\n    const extension = fileName.slice((fileName.lastIndexOf(\".\") - 1 >>> 0) + 2).toLowerCase();\n\n    // Buscamos la extensión en nuestro mapa\n    const newMimeType = mimeMap[extension];\n\n    // Si encontramos una coincidencia en el mapa, actualizamos el mimeType\n    if (newMimeType) {\n      if(item.binary['data'].mimeType !== newMimeType) {\n        console.log(`Cambiando mimeType para '${fileName}' de '${item.binary['data'].mimeType}' a '${newMimeType}'.`);\n        item.binary['data'].mimeType = newMimeType;\n      }\n    }\n  }\n}\n\n// Devolvemos todos los items, modificados o no\nreturn items;",
				},
				position: [1328, 1664],
				name: 'Fix mime4',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: "What's in this video from telegram user?",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-pro',
						cachedResultName: 'models/gemini-2.5-pro',
					},
					options: {},
					resource: 'video',
					inputType: 'binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 1664],
				name: 'Analyze video',
			},
		}),
	)
	.output(6)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"const results = [];\nfor (const item of $input.all()) {\n  const fileName = item.json?.fileName || item.json?.message?.document?.file_name || '';\n  const ext = fileName.toLowerCase().split('.').pop();\n\n  let type = 'fallback';\n  if (['csv'].includes(ext)) type = 'csv';\n  else if (['html', 'htm'].includes(ext)) type = 'html';\n  else if (['ics'].includes(ext)) type = 'ics';\n  else if (['json'].includes(ext)) type = 'json';\n  else if (['ods'].includes(ext)) type = 'ods';\n  else if (['pdf'].includes(ext)) type = 'pdf';\n  else if (['rtf'].includes(ext)) type = 'rtf';\n  else if (['txt', 'md', 'log'].includes(ext)) type = 'text file';\n  else if (['xml'].includes(ext)) type = 'xml';\n  else if (['xls', 'xlsx'].includes(ext)) type = 'spreadsheet';\n  else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) type = 'image';\n  else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) type = 'audio';\n  else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) type = 'video';\n\n  item.json.fileTypeCategory = type;\n  results.push(item);\n}\nreturn results;",
				},
				position: [608, 2864],
				name: 'Group Similar Documents',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
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
											id: 'f1aefe24-17fb-4bf8-84fb-949a6802b66e',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'csv',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'html',
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
											id: 'b09d29b5-b263-4115-963d-d6879de78649',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'html',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'ics',
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
											id: '2a7822f4-889b-41d3-8a1c-7f4405eacb42',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'ics',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'json',
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
											id: 'f09cd376-96df-4f3d-9218-6a918715335a',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'json',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'ods',
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
											id: '1bf5c1f9-38a9-4bc5-8757-b85f98441579',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'ods',
										},
									],
								},
								renameOutput: true,
							},
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
											id: '4988d14f-4e3f-4494-96b0-a1a9d70a2787',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'pdf',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'rtf',
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
											id: 'f5bc921e-c083-4b12-8167-86a24e39fe5c',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'rtf',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'text file',
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
											id: '29251fca-c611-419c-85a2-a9e1ad6bd102',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'text file',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'xml',
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
											id: 'fd1cbb91-f3c6-4b20-91dc-2e490f77fe96',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'xml',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'spreadsheet',
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
											id: '16fc2a80-c341-4a5d-9d50-a1856ffb5242',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.fileTypeCategory }}',
											rightValue: 'spreadsheet',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: { fallbackOutput: 'extra' },
				},
				position: [784, 2720],
				name: 'Switch',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2048],
				name: 'Download CSV',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: { parameters: { options: {} }, position: [1312, 2048], name: 'Extract from CSV' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [1488, 2048],
				name: 'Aggregate',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1680, 2048],
				name: 'Normalize CSV',
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
								id: 'd8935452-fe20-469d-a68d-1aad056cb8dd',
								name: 'message',
								type: 'string',
								value:
									"=File name:{{ $('Telegram Trigger').item.json.message.document.file_name }}\nFile type:{{ $('Group Similar Documents').first().json.fileTypeCategory }}\nExtracted data from file:\n{{ $json.data }}",
							},
							{
								id: '6bceaed5-5a79-4354-a49a-d794ce4fb3ee',
								name: 'chat_id',
								type: 'number',
								value: "={{ $('Telegram Trigger').first().json.message.chat.id }}",
							},
						],
					},
				},
				position: [2096, 2832],
				name: 'get_message (File message)',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2192],
				name: 'Download HTML',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.html',
			version: 1.2,
			config: {
				parameters: {
					options: { cleanUpText: true },
					operation: 'extractHtmlContent',
					sourceData: 'binary',
					extractionValues: {
						values: [
							{ key: 'pageTitle', cssSelector: 'title' },
							{
								key: 'metaDescription',
								cssSelector: 'meta[name="description"]',
							},
							{
								key: 'fullBodyText',
								cssSelector: 'body',
								returnValue: 'html',
							},
						],
					},
				},
				position: [1312, 2192],
				name: 'HTML Extract Generic1',
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
								id: 'b4ab7227-9db9-4c74-aa17-80071ee0a7f0',
								name: 'data',
								type: 'string',
								value:
									'=Page title:  {{ $json.pageTitle}}\nMeta description: {{ $json.metaDescription }}\nbody: {{ $json.fullBodyText }}',
							},
						],
					},
				},
				position: [1488, 2192],
				name: 'Normalize HTML',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2336],
				name: 'Download ICS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'fromIcs' },
				position: [1312, 2336],
				name: 'Extract from ICS',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1488, 2336],
				name: 'Normalize ICS',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2480],
				name: 'Download JSON',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'fromJson' },
				position: [1312, 2480],
				name: 'Extract from JSON',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1488, 2480],
				name: 'Normalize JSON',
			},
		}),
	)
	.output(4)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2624],
				name: 'Download ODS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'ods' },
				position: [1312, 2624],
				name: 'Extract from ODS',
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
						'// Get the first item from the input array.\nconst firstItem = items[0];\n\n// Create a new object that has a single key: "data".\n// The value of "data" will be the entire json object from the input.\n// This gathers all fields (First Name, Last Name, Age, etc.) dynamically.\nconst result = {\n  data: firstItem.json\n};\n\n// Return the newly structured object.\n// It will be outputted as a single item with a \'json\' property\n// containing the \'data\' object.\nreturn result;',
				},
				position: [1488, 2624],
				name: 'Get ODS data',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1648, 2624],
				name: 'Normalize ODS',
			},
		}),
	)
	.output(5)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 2864],
				name: 'Download PDF',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [1312, 2784],
				name: 'Extract from PDF',
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
								id: '333a436f-c087-4250-a181-40657874959b',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.text }}',
								rightValue: '',
							},
						],
					},
				},
				position: [1488, 2784],
				name: 'Text?',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.text }}',
							},
						],
					},
				},
				position: [1648, 2768],
				name: 'Normalize PDF',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: { mode: 'chooseBranch', useDataOfInput: 2 },
				position: [1312, 2928],
				name: 'Merge',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-pro',
						cachedResultName: 'models/gemini-2.5-pro',
					},
					options: {},
					resource: 'document',
					inputType: 'binary',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1488, 2928],
				name: 'Analyze document',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.content.parts[0].text }}',
							},
						],
					},
				},
				position: [1648, 2928],
				name: 'Normalize PDF (AI)',
			},
		}),
	)
	.output(6)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 3088],
				name: 'Download RTF',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'rtf' },
				position: [1312, 3088],
				name: 'Extract from RTF',
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
						'// Get the first item from the input array.\nconst firstItem = items[0];\n\n// Create a new object that has a single key: "data".\n// The value of "data" will be the entire json object from the input.\n// This gathers all fields (First Name, Last Name, Age, etc.) dynamically.\nconst result = {\n  data: firstItem.json\n};\n\n// Return the newly structured object.\n// It will be outputted as a single item with a \'json\' property\n// containing the \'data\' object.\nreturn result;',
				},
				position: [1488, 3088],
				name: 'Get RTF data',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1648, 3088],
				name: 'Normalize RTF',
			},
		}),
	)
	.output(7)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 3232],
				name: 'Download TEXT FILE',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'text' },
				position: [1312, 3232],
				name: 'Extract from File',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1488, 3232],
				name: 'Normalize text file',
			},
		}),
	)
	.output(8)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 3376],
				name: 'Download XML',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'xml' },
				position: [1312, 3376],
				name: 'Extract from XML',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1488, 3376],
				name: 'Normalize XML',
			},
		}),
	)
	.output(9)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId:
						'={{ ($json.message.photo?.[3]?.file_id ?? $json.message.photo?.[2]?.file_id ?? $json.message.photo?.[1]?.file_id ?? $json.message.photo?.[0]?.file_id) ?? $json.message.document?.file_id ?? $json.message.video?.file_id ?? $json.message.voice?.file_id ?? $json.message.video_note?.file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1152, 3520],
				name: 'Download XLSX',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'xlsx' },
				position: [1312, 3520],
				name: 'Extract from XLSX',
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
						'// Get the first item from the input array.\nconst firstItem = items[0];\n\n// Create a new object that has a single key: "data".\n// The value of "data" will be the entire json object from the input.\n// This gathers all fields (First Name, Last Name, Age, etc.) dynamically.\nconst result = {\n  data: firstItem.json\n};\n\n// Return the newly structured object.\n// It will be outputted as a single item with a \'json\' property\n// containing the \'data\' object.\nreturn result;',
				},
				position: [1488, 3520],
				name: 'Get RTF data1',
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
								id: '24b93984-e305-4c11-a856-5fa0bfaaaa79',
								name: 'data',
								type: 'string',
								value: '={{ $json.data }}',
							},
						],
					},
				},
				position: [1648, 3520],
				name: 'Normalize XLSX',
			},
		}),
	)
	.output(10)
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
								id: 'd8935452-fe20-469d-a68d-1aad056cb8dd',
								name: 'message',
								type: 'string',
								value: '=It was not possible to process the file.File type not supported.',
							},
							{
								id: '38ba2498-2141-4a04-a22a-64563fe2ee6f',
								name: 'chat_id',
								type: 'string',
								value: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							},
						],
					},
				},
				position: [1152, 3680],
				name: 'get_error_message',
			},
		}),
	)
	.output(7)
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
								id: 'd8935452-fe20-469d-a68d-1aad056cb8dd',
								name: 'message',
								type: 'string',
								value: '=It was not possible to process the file.File type not supported.',
							},
							{
								id: '38ba2498-2141-4a04-a22a-64563fe2ee6f',
								name: 'chat_id',
								type: 'string',
								value: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
							},
						],
					},
				},
				position: [1152, 1808],
				name: 'get_error_message1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					chatId: '={{ $json.message.chat.id }}',
					operation: 'sendChatAction',
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [784, 1152],
				name: 'Typing…',
			},
		}),
	)
	.add(sticky('', { color: 3, position: [528, 2048], width: 1728, height: 1872 }))
	.add(
		sticky('', { name: 'Sticky Note1', color: 6, position: [3504, 576], width: 960, height: 496 }),
	)
	.add(
		sticky('', { name: 'Sticky Note2', color: 7, position: [528, 400], width: 576, height: 240 }),
	)
	.add(
		sticky('', { name: 'Sticky Note3', color: 4, position: [528, 656], width: 1360, height: 208 }),
	)
	.add(
		sticky('', { name: 'Sticky Note4', color: 5, position: [528, 912], width: 1504, height: 1104 }),
	)
	.add(sticky('', { name: 'Sticky Note5', position: [2208, 1200], width: 1104, height: 752 }))
	.add(
		sticky(
			'### Gray Section – Database Setup\n\nThis section creates the PostgreSQL tables required for the workflow to function.\n\n**Tables:**\n1. **media_group** – Stores descriptions of files that belong to the same Telegram `media_group_id`.  \n   - Purpose: After files are processed (see Yellow section), their metadata and descriptions are stored here.\n   - Reason: Telegram sends multiple files in separate messages but groups them using `media_group_id`. This table helps collect them for combined processing.\n\n2. **media_queue** – Tracks incoming media groups.  \n   - Purpose: When a new `media_group_id` is detected, this table is updated only once with:\n     - `media_group_id` (unique)\n     - `chat_id` (for sending messages back to the correct chat)\n     - `captions` (optional text from Telegram)\n\n3. **chat_histories** – Stores conversation history for the AI agent.  \n   - Purpose: Provides context for ongoing chats.\n',
			{ name: 'Sticky Note6', color: 7, position: [-112, 64], width: 608, height: 528 },
		),
	)
	.add(
		sticky(
			'### Green Section – Media Queue Trigger\n\nThis section listens for updates in the `media_queue` table.\n\n**Process:**\n1. The trigger checks regularly for new entries in `media_queue`.\n2. When new data is detected, it retrieves:\n   - `chat_id`\n   - `media_group_id`\n3. Waits 5 seconds to ensure all files in the media group are uploaded.  \n   > ⚠️ **Note:** Depending on the preprocessing speed, larger or more complex files may not finish processing before the `media_queue` trigger sends the message to the chatbot. If you are working with heavy or complex files, consider increasing the value of **"Wait for all the files"** (default: 5 seconds) to allow sufficient time for proper processing.  \n4. Fetches all file descriptions from the `media_group` table that match the `media_group_id`.\n5. Combines these descriptions into a single message.\n6. Sends the combined message to the AI agent (Purple section).\n',
			{ name: 'Sticky Note7', color: 4, position: [-112, 656], width: 608, height: 448 },
		),
	)
	.add(
		sticky(
			'### Blue Section – Telegram Trigger & Message Type Handling\n\nTriggered when a new message is received on Telegram.\n\n**Flow:**\n1. Sends a "typing" action to Telegram.\n2. Detects message type:\n   - **Text** → Sent directly to the AI agent.\n   - **Voice message** → Downloaded, transcribed, then sent to AI agent.\n   - **Video note** → Downloaded, described, then sent to AI agent.\n3. The above three types are sent directly since only one can appear in a message.\n\n**For media files (image, audio, video):**\n- Processed to generate descriptions.\n- Sent to Yellow section for grouping & database handling.\n\n**For documents:**\n- Sent to Red section for specialized processing.\n\n**If unsupported type:**\n- Sent to fallback → Generates error message → Sent to AI agent.\n',
			{ name: 'Sticky Note8', color: 5, position: [-112, 1280], width: 608, height: 528 },
		),
	)
	.add(
		sticky(
			'### Red Section – Document Processing\n\nProcesses supported document types: `CSV, HTML, ICS, JSON, ODS, PDF, RTF, TXT, XML, Spreadsheet`.\n\n**Steps:**\n1. Download the file.\n2. Extract data (file name, file type, extracted content).\n\n**Special PDF handling:**\n- If the initial extraction returns no text:\n  - Pass the PDF to an AI-based analyzer for description.\n\n**Unsupported documents:**\n- Sent to fallback with error message.\n\n**All extracted document descriptions** are sent to Yellow section for storage and possible grouping.\n',
			{ name: 'Sticky Note9', color: 3, position: [-112, 2048], width: 608, height: 496 },
		),
	)
	.add(
		sticky(
			'### Yellow Section – File & Caption Handling\n\nDetermines how files are stored and processed based on presence of `captions` and `media_group_id`.\n\n**Cases:**\n1. **Captions + Media Group**  \n   - First file in a multi-file group with captions.  \n   - Store description in `media_group` table.  \n   - Add entry to `media_queue` to trigger Green section.\n\n2. **Captions only (no Media Group)**  \n   - Single file with captions.  \n   - Combine captions + file description → Send to AI agent.\n\n3. **No Captions + Media Group**  \n   - Part of a multi-file group (first or later).  \n   - Insert into `media_group` table.  \n   - Wait 2 seconds to allow captions to be stored first.  \n   - Insert into `media_queue` if not already present.\n\n4. **No Captions + No Media Group**  \n   - Single file without captions.  \n   - Send file description directly to AI agent.\n',
			{ name: 'Sticky Note10', position: [2448, 2000], width: 608, height: 576 },
		),
	)
	.add(
		sticky(
			'### Purple Section – AI Agent & Output Formatting\n\nThis section contains the AI Agent connected to:\n- PostgreSQL chat memory (replaceable with any memory type)\n- AI model of choice (replaceable)\n\n**Notes:**\n- No fixed prompt for maximum flexibility.\n- Incoming processed messages follow a consistent format:\n  - **Captions** (optional)\n  - **File descriptions**:\n    - For documents → File name, type, extracted data\n    - For media → Media description\n  - **Voice/video messages** → Media message description\n\n**MarkdownV2 Formatting Node:**\n- Escapes Telegram’s restricted characters.\n- Splits long messages (>4096 chars) into multiple parts.\n- Sends them sequentially back to the user.\n',
			{ name: 'Sticky Note11', color: 6, position: [3504, 1136], width: 608, height: 496 },
		),
	)
	.add(
		sticky(
			'**🙏 Special Thanks**\n\nA huge thank you to **Ezema Gingsley Chibuzo** for the inspiration of the first version of this workflow:  \n[Create a Multi-Modal Telegram Support Bot with GPT-4 and Supabase RAG](https://n8n.io/workflows/5589-create-a-multi-modal-telegram-support-bot-with-gpt-4-and-supabase-rag/)\n',
			{ name: 'Sticky Note12', color: 2, position: [528, 144], width: 448, height: 176 },
		),
	)
	.add(
		sticky(
			'---\n\n## 💡 Need Assistance?\n\nIf you’d like help customizing or extending this workflow, feel free to reach out:  \n\n📧 Email: [johnsilva11031@gmail.com](mailto:johnsilva11031@gmail.com)  \n🔗 LinkedIn: [John Alejandro Silva Rodríguez](https://www.linkedin.com/in/john-alejandro-silva-rodriguez-48093526b/)',
			{ name: 'Sticky Note13', color: 2, position: [4496, 832], width: 352, height: 224 },
		),
	);
