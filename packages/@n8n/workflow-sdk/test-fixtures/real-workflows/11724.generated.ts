const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.3,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 19 }] } },
				position: [-704, 272],
				name: 'Trice once a day - evenings',
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
								id: 'f8246957-4a9c-441a-ada5-a5d5060980be',
								name: 'logo_big',
								type: 'string',
								value: 'https://your-domain.com/your-big-image.png',
							},
							{
								id: '441c5f76-0cf1-4bd4-9ded-9bbef4864951',
								name: 'logo_small',
								type: 'string',
								value: 'https://your-domain.com/your-small-image.png',
							},
							{
								id: '7e44cdd9-1ea0-4550-88cc-0386784f95f3',
								name: 'default_photo_url',
								type: 'string',
								value: 'https://your-domain.com/your-default-image.png',
							},
							{
								id: '134b3134-0d78-4812-a4df-0be245ae987f',
								name: 'daily_digest_text',
								type: 'string',
								value: 'Daily Digest',
							},
							{
								id: '9766161f-1426-43f7-aad2-4046d371f913',
								name: 'button_text',
								type: 'string',
								value: 'Read more on your-site.com',
							},
							{
								id: 'a02acad4-a88f-43f8-94e4-07058994226e',
								name: 'button_bg_color',
								type: 'string',
								value: '#dd9933',
							},
							{
								id: '57f98836-d82c-4cd7-9cd3-66b31d3c7f36',
								name: 'sound_url',
								type: 'string',
								value: 'https://getinnovation.dev/sounds/no-comment-minimal-background.wav',
							},
						],
					},
				},
				position: [-368, 272],
				name: 'Config Variables',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wordpress',
			version: 1,
			config: {
				parameters: {
					options: {
						after:
							"={{ (() => { \n  const d = new Date(); \n  d.setHours(0,0,0,0); \n  const pad = n => n.toString().padStart(2,'0'); \n  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} 00:00:00`; \n})() }}",
						before:
							"={{ (() => { \n  const d = new Date(); \n  const pad = n => n.toString().padStart(2,'0'); \n  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; \n})() }}",
						status: 'publish',
					},
					operation: 'getAll',
					returnAll: true,
				},
				credentials: { wordpressApi: { id: '', name: '' } },
				position: [-144, 272],
				name: 'Get articles from today',
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
								id: '469ee1e5-56e1-4cb9-953d-e9bdf3694a86',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $input.all().length }}',
								rightValue: 2,
							},
						],
					},
				},
				position: [80, 272],
				name: 'Check if have enough articles',
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
						'function extractVideoUrl(contentHtml) {\n  if (!contentHtml) return null;\n  try {\n    const scriptMatch = contentHtml.match(/<script type="application\\/json" class="wp-playlist-script">(.*?)<\\/script>/s);\n    if (scriptMatch && scriptMatch[1]) {\n      const playlistData = JSON.parse(scriptMatch[1]);\n      if (playlistData.tracks && playlistData.tracks.length > 0) {\n        return playlistData.tracks[0].src;\n      }\n    }\n    const videoSrcMatch = contentHtml.match(/<video[^>]*src="([^"]+)"/);\n    if (videoSrcMatch && videoSrcMatch[1]) return videoSrcMatch[1];\n    \n    const sourceMatch = contentHtml.match(/<source[^>]*src="([^"]+)"/);\n    if (sourceMatch && sourceMatch[1]) return sourceMatch[1];\n  } catch (error) {\n    return null;\n  }\n  return null;\n}\n\n// Process WordPress articles\nconst articles = $input.all();\nreturn articles.map(article => {\n  const content = article.json.content?.rendered;\n  const videoUrl = extractVideoUrl(content);\n  \n  return {\n    json: {\n      ...article.json,\n      video: videoUrl ? { src: videoUrl } : null\n    }\n  };\n});',
				},
				position: [304, 272],
				name: 'Check if have videos',
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
								id: 'f535b472-d8c5-4e94-8036-47e3a5cf7db8',
								name: 'link',
								type: 'string',
								value: '={{ $json.link }}',
							},
							{
								id: '465b5a25-bf7b-44c1-b2ec-50bacad03e02',
								name: 'title',
								type: 'string',
								value: '={{ $json.title.rendered }}',
							},
							{
								id: '34b694df-cc7f-4f34-a5d9-38943768b7b4',
								name: 'photo_id',
								type: 'number',
								value: '={{ $json.featured_media }}',
							},
							{
								id: '20db12ad-124f-49c9-9efd-fc753f80e2f4',
								name: 'video',
								type: 'object',
								value: '={{ $json.video }}',
							},
						],
					},
				},
				position: [528, 272],
				name: 'Clean data and assign fields',
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
								id: 'bc6a7a5e-6f82-44ae-8ed9-8eff322ae5bc',
								operator: { type: 'number', operation: 'equals' },
								leftValue: '={{ $json.photo_id }}',
								rightValue: 0,
							},
						],
					},
				},
				position: [1040, 272],
				name: 'Check for missing images',
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
								id: '444f5cb7-c647-4371-a6e0-8778a28a9d16',
								name: 'photo_url',
								type: 'string',
								value: "={{ $('Config Variables').item.json.default_photo_url }}",
							},
						],
					},
					includeOtherFields: true,
				},
				position: [1664, 256],
				name: 'Assign Default Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [1936, 272], name: 'Merge all articles' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Function to clean HTML entities from text\nfunction cleanText(text) {\n  if (!text) return "";\n  return text\n    .replace(/<[^>]*>/g, \'\')\n    .replace(/&hellip;/g, \'...\')\n    .replace(/&nbsp;/g, \' \')\n    .replace(/&amp;/g, \'&\')\n    .replace(/&lt;/g, \'<\')\n    .replace(/&gt;/g, \'>\')\n    .replace(/&quot;/g, \'"\')\n    .replace(/&#39;/g, "\'")\n    .replace(/&#8211;/g, \'–\')\n    .replace(/&#8212;/g, \'—\')\n    .replace(/&#(\\d+);/g, (_match, dec) => String.fromCharCode(dec))\n    .replace(/\\n/g, \' \')\n    .replace(/\\s+/g, \' \')\n    .trim();\n}\n\n// Calculate reading time based on word count\nfunction calculateReadingTime(text) {\n  const words = text.split(\' \').length;\n  const readingTime = 2 + (words * 0.3);\n  return Math.min(Math.max(readingTime, 3), 7);\n}\n\n// Get today\'s date in numeric format DD-MM-YYYY\nfunction getDateFormat() {\n  const date = new Date();\n  const day = String(date.getDate()).padStart(2, \'0\');\n  const month = String(date.getMonth() + 1).padStart(2, \'0\');\n  const year = date.getFullYear();\n  return `${day}-${month}-${year}`;\n}\n\n// Variables\nconst logo_big = $(\'Config Variables\').first().json.logo_big;\nconst logo_small = $(\'Config Variables\').first().json.logo_small;\nconst daily_digest_text = $(\'Config Variables\').first().json.daily_digest_text;\nconst button_text = $(\'Config Variables\').first().json.button_text;\nconst button_bg_color = $(\'Config Variables\').first().json.button_bg_color;\n\n// Get all items from previous node\nconst allItems = $input.all();\n\n// Transform each item to include video data\nconst transformedItems = allItems.map(item => {\n  const n = item.json;\n  const title = n.title || "";\n  const photo_url = n.photo_url || "";\n  const video = n.video || null;\n\n  return {\n    clip: {\n      asset: {\n        type: "image",\n        src: photo_url\n      },\n      length: 4.5,\n      transition: { in: "fade", out: "fade" }\n    },\n    overlay: {\n      title: title\n    },\n    video: video\n  };\n});\n\n// Build Shotstack payload\nconst shotstackClips = [];\nconst introBgClips = [];\nconst introLogoClips = [];\nconst introTitleClips = [];\nconst introDateClips = [];\nconst paginationBgClips = [];\nconst paginationTextClips = [];\nconst buttonBgClips = [];\nconst buttonTextClips = [];\nlet currentTime = 0;\n\n// 1. INTRO SLIDE\nconst introLength = 3;\nintroBgClips.push({\n  asset: {\n    type: "shape",\n    shape: "rectangle",\n    fill: { color: "#000000", opacity: 1 },\n    stroke: { color: "#000000", width: "0" },\n    width: 1080,\n    height: 1920,\n    rectangle: { width: 1080, height: 1920, cornerRadius: 0 }\n  },\n  start: 0,\n  length: introLength,\n  position: "center"\n});\n\nintroLogoClips.push({\n  asset: { type: "image", src: logo_big },\n  start: 0,\n  length: introLength,\n  position: "center",\n  offset: { x: 0, y: -0.1 },\n  scale: 0.05\n});\n\nintroTitleClips.push({\n  asset: {\n    type: "text",\n    text: daily_digest_text,\n    font: { color: "#ffffff", family: "Montserrat ExtraBold", size: "62", lineHeight: 1.2 },\n    alignment: { horizontal: "center", vertical: "center" },\n    width: 800,\n    height: 150\n  },\n  start: 0,\n  length: introLength,\n  position: "center",\n  offset: { x: 0, y: 0.05 }\n});\n\nintroDateClips.push({\n  asset: {\n    type: "text",\n    text: getDateFormat(),\n    font: { color: "#cccccc", family: "Montserrat ExtraBold", size: "28", lineHeight: 1.2 },\n    alignment: { horizontal: "center", vertical: "center" },\n    width: 800,\n    height: 200\n  },\n  start: 0,\n  length: introLength,\n  position: "center",\n  offset: { x: 0, y: 0.1 }\n});\n\ncurrentTime += introLength;\n\n// 2. NEWS SLIDES\ntransformedItems.forEach((item, index) => {\n  const cleanedTitle = cleanText(item.overlay.title);\n  const duration = calculateReadingTime(cleanedTitle);\n  const baseStart = currentTime;\n  const hasVideo = item.video && item.video.src;\n\n  // Background media (video or image)\n  shotstackClips.push({\n    asset: {\n      type: hasVideo ? "video" : "image",\n      src: hasVideo ? item.video.src : item.clip.asset.src,\n      ...(hasVideo && { volume: 0 })\n    },\n    start: baseStart,\n    length: duration,\n    fit: "crop",\n    position: "center",\n    transition: { in: "fade", out: "fade" }\n  });\n\n  // Dark overlay\n  shotstackClips.push({\n    asset: {\n      type: "shape",\n      shape: "rectangle",\n      fill: { color: "#000000", opacity: 0.4 },\n      stroke: { color: "#000000", width: "0" },\n      width: 1080,\n      height: 1920,\n      rectangle: { width: 1080, height: 1920, cornerRadius: 0 }\n    },\n    start: baseStart,\n    length: duration,\n    offset: { x: 0, y: 0 },\n    position: "center"\n  });\n\n  // Title\n  shotstackClips.push({\n    asset: {\n      type: "text",\n      text: cleanedTitle,\n      alignment: { horizontal: "center", vertical: "top" },\n      font: { color: "#ffffff", family: "Montserrat ExtraBold", size: "62", lineHeight: 1.2 },\n      width: 800,\n      height: 800\n    },\n    start: baseStart + 0.2,\n    length: duration - 0.4,\n    position: "center",\n    offset: { x: 0, y: 0.1 }\n  });\n\n  // Logo\n  shotstackClips.push({\n    asset: { type: "image", src: logo_small },\n    start: baseStart,\n    length: duration,\n    position: "topRight",\n    scale: 0.07,\n    offset: { x: -0.05, y: -0.05 }\n  });\n\n  // Pagination background\n  paginationBgClips.push({\n    asset: {\n      type: "shape",\n      shape: "rectangle",\n      fill: { color: "#ffffff", opacity: 0.95 },\n      stroke: { color: "#000000", width: "0" },\n      width: 140,\n      height: 60,\n      rectangle: { width: 140, height: 60, cornerRadius: 25 }\n    },\n    start: baseStart + 0.2,\n    length: duration - 0.4,\n    position: "bottomRight",\n    offset: { x: -0.08, y: 0.08 }\n  });\n\n  // Pagination text\n  paginationTextClips.push({\n    asset: {\n      type: "text",\n      text: `${index + 1} / ${transformedItems.length}`,\n      font: { color: "#333333", family: "Montserrat", size: "22", weight: "700" },\n      alignment: { horizontal: "center", vertical: "center" },\n      width: 140,\n      height: 60\n    },\n    start: baseStart + 0.2,\n    length: duration - 0.4,\n    position: "bottomRight",\n    offset: { x: -0.08, y: 0.08 }\n  });\n\n  // Button background\n  buttonBgClips.push({\n    asset: {\n      type: "shape",\n      shape: "rectangle",\n      fill: { color: button_bg_color, opacity: 1 },\n      stroke: { color: button_bg_color, width: "0" },\n      width: 400,\n      height: 70,\n      rectangle: { width: 400, height: 70, cornerRadius: 35 }\n    },\n    start: baseStart + 0.2,\n    length: duration - 0.4,\n    position: "center",\n    offset: { x: 0, y: -0.15 }\n  });\n\n  // Button text\n  buttonTextClips.push({\n    asset: {\n      type: "text",\n      text: button_text,\n      font: { color: "#ffffff", family: "Montserrat ExtraBold", size: "32" },\n      alignment: { horizontal: "center", vertical: "center" },\n      width: 400,\n      height: 70\n    },\n    start: baseStart + 0.2,\n    length: duration - 0.4,\n    position: "center",\n    offset: { x: 0, y: -0.15 }\n  });\n\n  currentTime += duration;\n});\n\n// 3. OUTRO SLIDE\nconst outroLength = 3;\nintroBgClips.push({\n  asset: {\n    type: "shape",\n    shape: "rectangle",\n    fill: { color: "#000000", opacity: 1 },\n    stroke: { color: "#000000", width: "0" },\n    width: 1080,\n    height: 1920,\n    rectangle: { width: 1080, height: 1920, cornerRadius: 0 }\n  },\n  start: currentTime,\n  length: outroLength,\n  transition: { in: "fade" },\n  position: "center"\n});\n\nintroLogoClips.push({\n  asset: { type: "image", src: logo_big },\n  start: currentTime,\n  length: outroLength,\n  position: "center",\n  offset: { x: 0, y: -0.1 },\n  scale: 0.05,\n  transition: { in: "fade" }\n});\n\nintroTitleClips.push({\n  asset: {\n    type: "text",\n    text: daily_digest_text,\n    font: { color: "#ffffff", family: "Montserrat ExtraBold", size: "56", lineHeight: 1.1 },\n    alignment: { horizontal: "center", vertical: "center" },\n    width: 800,\n    height: 200\n  },\n  start: currentTime,\n  length: outroLength,\n  position: "center",\n  offset: { x: 0, y: 0.05 },\n  transition: { in: "fade" }\n});\n\nintroDateClips.push({\n  asset: {\n    type: "text",\n    text: getDateFormat(),\n    font: { color: "#cccccc", family: "Montserrat ExtraBold", size: "28", lineHeight: 1.2 },\n    alignment: { horizontal: "center", vertical: "center" },\n    width: 800,\n    height: 200\n  },\n  start: currentTime,\n  length: outroLength,\n  position: "center",\n  offset: { x: 0, y: 0.1 },\n  transition: { in: "fade" }\n});\n\n// Build final payload\nconst shotstackPayload = {\n  timeline: {\n    background: "#000000",\n    tracks: [\n      { clips: buttonTextClips },\n      { clips: buttonBgClips },\n      { clips: paginationTextClips },\n      { clips: paginationBgClips },\n      { clips: introLogoClips },\n      { clips: introTitleClips },\n      { clips: introDateClips },\n      { clips: shotstackClips },\n      { clips: introBgClips }\n    ]\n  },\n  output: {\n    format: "mp4",\n    size: { width: 1080, height: 1920 },\n    fps: 25\n  }\n};\n\n// Add audio\nconst totalDuration = currentTime + outroLength;\nconst audioLength = 30;\nconst loopsNeeded = Math.ceil(totalDuration / audioLength);\nconst audioTrack = { clips: [] };\n\nfor (let i = 0; i < loopsNeeded; i++) {\n  const audioStart = i * audioLength;\n  const audioClipLength = Math.min(audioLength, totalDuration - audioStart);\n  audioTrack.clips.push({\n    asset: {\n      type: "audio",\n      src: $(\'Config Variables\').first().json.sound_url,\n      volume: 0.6\n    },\n    start: audioStart,\n    length: audioClipLength\n  });\n}\n\nshotstackPayload.timeline.tracks.push(audioTrack);\n\nreturn [{ json: shotstackPayload }];',
				},
				position: [2448, 272],
				name: 'Prepare json for Shotstack',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: {
					url: 'https://api.shotstack.io/stage/render',
					method: 'POST',
					options: {},
					jsonBody: '={{ JSON.stringify($json) }}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: { httpHeaderAuth: { id: '', name: '' } },
				position: [2688, 272],
				name: 'Shotstack - Submit Request',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 30 }, position: [2944, 272], name: 'Wait - Shotstack Works' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: {
					url: '=https://api.shotstack.io/stage/render/{{ $json.response.id }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: { httpHeaderAuth: { id: '', name: '' } },
				position: [3184, 272],
				name: 'Check Status',
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
								id: 'e194250a-6d72-42d0-b85f-189bf6975252',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.response.status }}',
								rightValue: '=done',
							},
						],
					},
				},
				position: [3408, 272],
				name: 'If video is ready',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.response.url }}', options: {} },
				position: [3664, 256],
				name: 'Download video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.youTube',
			version: 1,
			config: {
				parameters: {
					title:
						'={{$(\'Config Variables\').first().json.daily_digest_text}} - {{ \n  (function() {\n    const d = new Date();\n    const day = d.getDate();\n    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];\n    const year = d.getFullYear();\n    return `${day} ${weekday}, ${year}`;\n  })()\n}}\n',
					options: {
						tags: 'dailydigest',
						license: 'creativeCommon',
						embeddable: true,
						description:
							'={{$(\'Config Variables\').first().json.daily_digest_text}} - {{ \n  (function() {\n    const d = new Date();\n    const day = d.getDate();\n    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];\n    const year = d.getFullYear();\n    return `${day} ${weekday}, ${year}`;\n  })()\n}}\n',
						defaultLanguage: 'ro',
						notifySubscribers: true,
						selfDeclaredMadeForKids: true,
					},
					resource: 'video',
					operation: 'upload',
					categoryId: '25',
					regionCode: 'MD',
				},
				credentials: { youTubeOAuth2Api: { id: '', name: '' } },
				position: [4144, 256],
				name: 'Upload video to youtube as',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: {
					url: '=https://your-site.com/wp-json/wp/v2/media/{{ $json.photo_id }}',
					options: {},
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'wordpressApi',
				},
				credentials: { wordpressApi: { id: '', name: '' } },
				position: [1200, 448],
				name: 'Get Image',
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
								id: '01d7eac8-c380-459e-8bdc-c0266d5f2eab',
								name: 'photo_url',
								type: 'string',
								value: '={{ $json.guid.rendered }}',
							},
						],
					},
				},
				position: [1376, 448],
				name: 'Assign image URL',
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
					options: { includeUnpaired: false },
					combineBy: 'combineByPosition',
				},
				position: [1664, 432],
				name: 'Merge image url with article details',
			},
		}),
	)
	.add(
		sticky(
			'## How it works\nThe workflow runs every evening. It scans all news articles published that day on your website, detects any embedded videos, and selects the featured image, or a default one if none is available. It then generates a Daily Digest video using Shotstack.com and automatically uploads it to your YouTube channel as a Short. The final video displays a list of your articles, each shown with its featured image or background video.\n\n\n## Setup steps\nWe assume you are using a WordPress based news website.\n\n- Add your credentials for WordPress, Shotstack, and YouTube.\n\n- Configure the workflow by editing the Config Variables node, where you can set your main logo, corner logo, button color, title, default image URL, and sound URL.',
			{ name: 'Sticky Note6', position: [-1408, 64], width: 560, height: 400 },
		),
	)
	.add(sticky('', { color: 4, position: [-448, 208], width: 1136, height: 256 }))
	.add(
		sticky(
			'## Configure workflow & retrieve articles\n\nThis section sets the default variables, fetches all articles published today, and checks whether any video is present.',
			{ name: 'Sticky Note1', position: [-448, 64], width: 1136, height: 128 },
		),
	)
	.add(
		sticky('', { name: 'Sticky Note2', color: 4, position: [960, 208], width: 1152, height: 416 }),
	)
	.add(
		sticky(
			'## Get background image URL\n\nThis section retrieves the image URL from WordPress, or assigns the default image if none is available.',
			{ name: 'Sticky Note3', position: [960, 64], width: 1152, height: 128 },
		),
	)
	.add(
		sticky('', { name: 'Sticky Note4', color: 4, position: [2416, 208], width: 1392, height: 304 }),
	)
	.add(
		sticky(
			'## Generate video\n\nThis section prepares the JSON payload for Shotstack based on their API, submits the rendering request, and checks every 30 seconds until the video is ready, then retrieves the download URL.',
			{ name: 'Sticky Note5', position: [2416, 64], width: 1392, height: 128 },
		),
	)
	.add(
		sticky('', { name: 'Sticky Note7', color: 4, position: [4032, 208], width: 336, height: 304 }),
	)
	.add(
		sticky('## Submits Short\n\nThis node uploads the generated Short to YouTube.', {
			name: 'Sticky Note8',
			position: [4032, 64],
			width: 336,
			height: 128,
		}),
	);
