const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.1,
			config: {
				parameters: {
					path: '352a575b-42cf-4e9b-8d76-6acec4e40402',
					options: {},
					formTitle: '🎬 Video to Viral Shorts',
					formFields: {
						values: [
							{
								fieldType: 'file',
								fieldLabel: 'Video',
								requiredField: true,
								acceptFileTypes: 'video/*',
							},
						],
					},
					formDescription:
						"Upload your video and automatically create viral shorts with AI. Depending on the video's length, 3 to 6 shorts will be generated and automatically scheduled to be uploaded one per day at this time starting tomorrow.\n",
				},
				position: [-704, 272],
				name: 'Form: Upload Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'Video',
							},
							{
								name: 'full_command',
								value: '=ffmpeg -y -i {input} -map a:0 -vn -ac 1 -ar 16000 -c:a pcm_s16le {output}',
							},
							{ name: 'output_extension', value: 'wav' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{}] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-496, 272],
				name: 'FFmpeg: Extract Audio',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 10 }, position: [-336, 272], name: 'Wait 10s (Audio)' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/{{ $json.job_id }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-128, 272],
				name: 'Check Audio Job Status',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 1,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '60615090-7a29-4573-9b47-369d6a3e95e9',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.status }}',
								rightValue: 'finished',
							},
						],
					},
				},
				position: [32, 272],
				name: 'Is Audio Job Completed?',
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
					url: '=https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/{{ $json.job_id }}/download',
					options: { response: { response: {} } },
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [208, 144],
				name: 'Download Audio',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.openai.com/v1/audio/transcriptions',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
							{ name: 'model', value: 'whisper-1' },
							{ name: 'response_format', value: 'verbose_json' },
							{ name: 'timestamp_granularities[]', value: 'word' },
						],
					},
					nodeCredentialType: 'openAiApi',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [384, 144],
				name: 'Whisper: Transcribe with Timestamps',
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
						'// Input: item.json.{text, words, duration} del nodo Whisper\nreturn items.map(item => {\n  const dur = Number(item.json.duration || 0);\n\n  // Redondea a 3 decimales y mantiene tipo number\n  const round3 = (n) => Math.round(Number(n) * 1000) / 1000;\n\n  const wordsLLM = (item.json.words || []).map(w => ({\n    w: w.word,\n    s: round3(w.start),\n    e: round3(w.end),\n  }));\n\n  item.json.video_duration = round3(dur);\n  item.json.words_llm = wordsLLM;      // array limpio para la IA\n  item.json.text_llm  = item.json.text; // texto tal cual (o límpialo si quieres)\n\n  return item;\n});\n',
				},
				position: [576, 144],
				name: 'Parse Whisper Results',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=You are a senior short-form video editor. Read the ENTIRE transcription and word-level timestamps to pick the 3–15 MOST VIRAL moments for TikTok/IG Reels/YouTube Shorts. Each clip must be 15–60 seconds.\n\n⚠️ FFMPEG TIMING CONTRACT — HARD REQUIREMENTS:\n- Return timestamps as ABSOLUTE SECONDS from video start (usable in: ffmpeg -ss <start> -to <end> -i <input> …).\n- Numbers ONLY with DOT decimal, up to 3 decimals (examples: 0, 1.250, 17.350).\n- Ensure 0 ≤ start < end ≤ VIDEO_DURATION_SECONDS.\n- Each clip 15–60s inclusive.\n- Prefer starting 0.2–0.4s BEFORE the hook and ending 0.2–0.4s AFTER the payoff.\n- Use silent moments for natural cuts; never cut mid-word or mid-phrase.\n- STRICTLY NO time formats other than absolute seconds.\n\nVIDEO_DURATION_SECONDS: {{ $json.video_duration }}\n\nTRANSCRIPT_TEXT (raw):\n{{ JSON.stringify($json.text_llm) }}\n\nWORDS_JSON (array of {w, s, e} where s/e are seconds):\n{{ JSON.stringify($json.words_llm) }}\n\nHARD EXCLUSIONS:\n- No generic intros/outros or sponsor-only segments unless they contain the hook.\n- No clips < 15s or > 60s.\n\nOUTPUT — RETURN ONLY VALID JSON (no markdown, no comments). Order clips by predicted performance (best first):\n{\n  "shorts": [\n    {\n      "start": <number seconds, e.g. 12.340>,\n      "end": <number seconds, e.g. 37.900>,\n      "video_description_for_tiktok": "<tiktok video description for get views>",\n      "video_description_for_instagram": "<instagram video description for get views>",\n      "video_title_for_youtube_short": "<youtube short video title for get views>",\n\n    }\n  ]\n}\n',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [784, 144],
				name: 'AI Agent - Select Viral Clips',
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
						"// Get Gemini response\nconst data = $input.first().json;\nconst formData = $('Form: Upload Video').first();\n\n// --- Config opcional ---\nconst VIDEO_DURATION_SECONDS =\n  Number(formData?.json?.videoDurationSeconds) ||\n  Number(formData?.json?.duration) ||\n  Number(formData?.json?.meta?.durationSec) ||\n  null;\n\n// --- Helpers ---\nconst toMs = (v) => (isFinite(Number(v)) ? Math.round(Number(v) * 1000) : 0);\n\nconst stripCodeFences = (txt) =>\n  String(txt || '')\n    .replace(/```json\\s*/gi, '')\n    .replace(/```\\s*/g, '')\n    .trim();\n\nconst extractJsonObject = (txt) => {\n  // 1) intenta parse directo\n  try { return JSON.parse(txt); } catch {}\n  // 2) intenta localizar el primer {...}\n  const m = String(txt).match(/\\{[\\s\\S]*\\}/);\n  if (m) {\n    try { return JSON.parse(m[0]); } catch {}\n  }\n  throw new Error('No se pudo extraer JSON válido del texto:\\n' + String(txt).slice(0, 300));\n};\n\nconst pickText = (payload) => {\n  // Nuevos formatos (string en 'output')\n  if (typeof payload === 'string') return payload;\n  if (payload?.output) return payload.output;\n\n  // Antiguos formatos (content.parts[0].text)\n  if (Array.isArray(payload) && payload[0]?.output) return payload[0].output;\n  if (Array.isArray(payload) && payload[0]?.content?.parts?.[0]?.text) return payload[0].content.parts[0].text;\n  if (payload?.content?.parts?.[0]?.text) return payload.content.parts[0].text;\n\n  // Otros\n  if (payload?.response) return payload.response;\n  if (payload?.text) return payload.text;\n\n  // Último recurso: stringify\n  return JSON.stringify(payload);\n};\n\n// --- 1) Extrae texto crudo del output ---\nlet textResponse = pickText(data);\n\n// --- 2) Limpia fences y parsea el JSON interior ---\ntextResponse = stripCodeFences(textResponse);\nlet parsed = extractJsonObject(textResponse);\n\n// Si vino envuelto otra vez dentro de 'output', vuelve a parsear\nif (!parsed?.shorts && typeof parsed?.output === 'string') {\n  parsed = extractJsonObject(stripCodeFences(parsed.output));\n}\n\nconst shorts = Array.isArray(parsed?.shorts) ? parsed.shorts : [];\nif (!shorts.length) {\n  throw new Error('Gemini no encontró segmentos interesantes');\n}\n\n// --- 3) Normalización opcional (si Gemini mandó fracciones 0–1 y conocemos D) ---\nconst MIN = 15, MAX = 60;\nconst clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));\n\nconst vf = \"scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=increase,crop=1080:1920,setsar=1\";\n\nreturn shorts.map((s, i) => {\n  let startSec = Number(s.start);\n  let endSec   = Number(s.end);\n\n  if (!isFinite(startSec) || !isFinite(endSec)) {\n    throw new Error(`Timestamps inválidos en short #${i + 1}`);\n  }\n\n  // Si parecen porcentajes 0–1 y tenemos duración del vídeo, conviértelo a segundos\n  if (VIDEO_DURATION_SECONDS && endSec <= 1.001) {\n    startSec *= VIDEO_DURATION_SECONDS;\n    endSec   *= VIDEO_DURATION_SECONDS;\n  }\n\n  // Fuerza rango 15–60s de forma suave\n  let duration = endSec - startSec;\n  if (duration < MIN) endSec = startSec + MIN;\n  if (duration > MAX) endSec = startSec + MAX;\n  duration = endSec - startSec;\n\n  // Mantén dentro de la duración del vídeo (si la sabemos)\n  if (VIDEO_DURATION_SECONDS) {\n    startSec = clamp(startSec, 0, Math.max(0, VIDEO_DURATION_SECONDS - MIN));\n    endSec   = clamp(endSec, startSec + MIN, VIDEO_DURATION_SECONDS);\n    duration = endSec - startSec;\n  }\n\n  // Redondeos\n  const start = Number(startSec.toFixed(3));\n  const end   = Number(endSec.toFixed(3));\n  const dur   = Number(duration.toFixed(3));\n\n  // Construye el comando FFmpeg completo (usa -t = duración)\n  const ffmpegCmd =\n    `ffmpeg -y -hide_banner -loglevel error ` +\n    `-ss ${start} -t ${dur} -i {input} ` +\n    `-c:v h264_nvenc -cq 22 -vf \"${vf}\" ` +\n    `-c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart {output}`;\n\n  return {\n    json: {\n      index: i + 1,\n      startTime: start,\n      endTime: end,\n      duration: dur,\n      startTimeMs: toMs(start),\n      endTimeMs: toMs(end),\n      durationMs: toMs(dur),\n      video_description_for_tiktok: s.video_description_for_tiktok ?? '',\n      video_description_for_instagram: s.video_description_for_instagram ?? '',\n      video_title_for_youtube_short: s.video_title_for_youtube_short ?? '',\n      full_command: ffmpegCmd\n    },\n    binary: formData.binary\n  };\n});\n",
				},
				position: [1088, 144],
				name: 'Parse Gemini Analysis',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'Video',
							},
							{
								name: 'full_command',
								value:
									'=ffmpeg -y -hide_banner -loglevel error -ss {{ $json.startTime }} -t {{ $json.duration }} -i {input} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1" -c:v h264_nvenc -cq 22 -pix_fmt yuv420p -c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart {output}',
							},
							{ name: 'output_extension', value: 'mp4' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1264, 144],
				name: 'FFmpeg: Upload & Cut',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 10 }, position: [1472, 144], name: 'Wait 10s (Short)' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/{{ $json.job_id }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1680, 144],
				name: 'Check Short Job Status',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 1,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '60615090-7a29-4573-9b47-369d6a3e95e9',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.status }}',
								rightValue: 'finished',
							},
						],
					},
				},
				position: [1904, 144],
				name: 'Is Short Job Completed?',
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
					url: '=https://api.upload-post.com/api/uploadposts/ffmpeg/jobs/{{ $json.job_id }}/download',
					options: { response: { response: {} } },
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2160, 128],
				name: 'Download Short',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: 'influencersde',
					title: "={{ $('Parse Gemini Analysis').item.json.video_description_for_tiktok }}",
					video: 'data',
					platform: ['tiktok', 'instagram', 'youtube'],
					operation: 'uploadVideo',
					youtubeTitle: "={{ $('Parse Gemini Analysis').item.json.video_title_for_youtube_short }}",
					scheduledDate:
						"={{ \n  $now\n    .setZone('Europe/Madrid')\n    .plus({ days: $itemIndex + 1 })   // +1 = empieza mañana\n    .set({ hour: 15, minute: 0, second: 0, millisecond: 0 })\n    .toFormat('yyyy-LL-dd HH:mm:ss')  // si tu nodo acepta este formato\n}}\n",
					instagramTitle:
						"={{ $('Parse Gemini Analysis').item.json.video_description_for_instagram }}",
					waitForCompletion: '=',
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [2432, 128],
				name: 'Schedule to TikTok, Instagram, and YouTube',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [2160, 288], name: 'Wait 5s & Retry (Short)' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [208, 288], name: 'Wait 5s & Retry (Audio)' },
		}),
	)
	.add(
		sticky(
			'**AUTO-SHORTS GENERATOR**\n\n**How it Works:**\n1.  Upload a long video via the form.\n2.  AI transcribes the audio (Whisper) and finds the most viral clips (Gemini).\n3.  The clips are auto-cut, cropped, and prepared for social media.\n4.  Shorts are scheduled to post daily on TikTok, Instagram, and YouTube.\n\n**Quick Setup:**\n1.  **OpenAI Whisper:** Add your API key to the `Whisper: Transcribe` node.\n2.  **Google Gemini:** Add your Google AI Studio API key to the `Google Gemini Chat Model` node.\n3.  **Upload-Post:**\n    *   Sign up at `app.upload-post.com` & connect your social accounts.\n    *   Generate an API token.\n    *   In n8n, create credentials for the `HTTP Request` nodes (Header Auth) and the `Schedule...` node (Upload-Post API) using that token.\n4.  **Scheduling:** Adjust the post time and timezone in the `Schedule to...` node.\n5.  **To Run:** Use the URL from the `Form: Upload Video` node to upload your video.',
			{ color: 7, position: [-752, -464], width: 480, height: 592 },
		),
	)
	.add(
		sticky('**Intake & Form**\n- Form: Upload Video', {
			name: 'Section: Intake & Form',
			position: [-752, 128],
			width: 228,
			height: 352,
		}),
	)
	.add(
		sticky(
			'**Transcription & Parsing**\n- Whisper: Transcribe with Timestamps\n- Parse Whisper Results\n- Download Audio',
			{ name: 'Section: Transcription & Parsing', position: [352, 16], width: 428, height: 320 },
		),
	)
	.add(
		sticky(
			'**AI Selection**\n- Google Gemini Chat Model\n- AI Agent – Select Viral Clips\n- Parse Gemini Analysis',
			{ name: 'Section: AI Selection (Gemini)', position: [768, 16], width: 420, height: 480 },
		),
	)
	.add(
		sticky(
			'**FFmpeg Audio Job Loop**\n- FFmpeg: Extract Audio\n- Wait 10s (Audio) → Check Audio Job Status → Is Audio Job Completed?\n- Retry path: Wait 5s & Retry (Audio)',
			{ name: 'Section: FFmpeg Audio Job Loop', position: [-528, 128], width: 880, height: 352 },
		),
	)
	.add(
		sticky(
			'**FFmpeg Short Job Loop**\n- FFmpeg: Upload & Cut\n- Wait 10s (Short) → Check Short Job Status → Is Short Job Completed?\n- Retry path: Wait 5s & Retry (Short)',
			{ name: 'Section: FFmpeg Short Job Loop', position: [1184, 16], width: 1132, height: 480 },
		),
	)
	.add(
		sticky('**Scheduling**\n- Download Short\n- Schedule to TikTok, Instagram, and YouTube', {
			name: 'Section: Scheduling',
			position: [2320, 16],
			width: 420,
			height: 480,
		}),
	);
