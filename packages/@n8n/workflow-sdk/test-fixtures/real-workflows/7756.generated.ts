const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: { values: [{ name: 'User_ID' }, { name: 'Date' }] },
				},
				position: [2848, 1920],
				name: 'Get report',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [
							{ lookupValue: '={{ $json.Date }}', lookupColumn: 'Date' },
							{
								lookupValue: '={{ $json.User_ID }}',
								lookupColumn: 'User_ID',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 403788598,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=403788598',
						cachedResultName: 'Meals',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
						cachedResultName: 'Cal AI',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [3056, 1808],
				name: 'Get Meals Info',
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
								id: 'd3ff7d44-6241-41c6-ac56-4549ba0cbd6d',
								name: 'Calories',
								type: 'number',
								value: '={{ $json.Calories }}',
							},
							{
								id: '64afda83-d211-48fa-830e-c0b7ddb5d50e',
								name: 'Proteins',
								type: 'number',
								value: '={{ $json.Proteins }}',
							},
							{
								id: 'ab3861af-5716-400b-a736-f5a2dc4713a7',
								name: 'Carbs',
								type: 'number',
								value: '={{ $json.Carbs }}',
							},
							{
								id: 'cce6d192-9bc9-401e-98b0-697dc4ec8f08',
								name: 'Fats',
								type: 'number',
								value: '={{ $json.Fats }}',
							},
						],
					},
				},
				position: [3264, 1808],
				name: 'Get Data',
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
						'// Get all input items\nconst items = $input.all();\n\n// Initialize accumulators\nlet totalCalories = 0;\nlet totalProteins = 0;\nlet totalCarbs = 0;\nlet totalFats = 0;\n\n// Sum up each field from every item\nfor (const item of items) {\n  const data = item.json;\n\n  totalCalories += Number(data.Calories || 0);\n  totalProteins += Number(data.Proteins || 0);\n  totalCarbs += Number(data.Carbs || 0);\n  totalFats += Number(data.Fats || 0);\n}\n\n// Return a single result with totals\nreturn [\n  {\n    json: {\n      Total_Calories: totalCalories,\n      Total_Proteins: totalProteins,\n      Total_Carbs: totalCarbs,\n      Total_Fats: totalFats,\n    }\n  }\n];\n',
				},
				position: [3472, 1808],
				name: 'Unify data',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								'// Get all input items\nconst items = $input.all();\n\n// Initialize accumulators\nlet totalCalories = 0;\nlet totalProteins = 0;\nlet totalCarbs = 0;\nlet totalFats = 0;\n\n// Sum up each field from every item\nfor (const item of items) {\n  const data = item.json;\n\n  totalCalories += Number(data.Calories || 0);\n  totalProteins += Number(data.Proteins || 0);\n  totalCarbs += Number(data.Carbs || 0);\n  totalFats += Number(data.Fats || 0);\n}\n\n// Return a single result with totals\nreturn [\n  {\n    json: {\n      Total_Calories: totalCalories,\n      Total_Proteins: totalProteins,\n      Total_Carbs: totalCarbs,\n      Total_Fats: totalFats,\n    }\n  }\n];\n',
						},
						position: [3472, 1808],
						name: 'Unify data',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					config: {
						parameters: {
							options: {},
							filtersUI: {
								values: [
									{
										lookupValue: '={{ $json.User_ID }}',
										lookupColumn: 'User_ID',
									},
								],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=0',
								cachedResultName: 'Profile',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
								cachedResultName: 'Cal AI',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [3056, 2064],
						name: 'Get User Info',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"/**\n * Nutrition summary → Telegram MarkdownV2 (n8n Code node)\n */\n\nconst MAX_TELEGRAM = 4096;\nconst SAFE_BUDGET = 4000; // margen de seguridad\n\n// ============ Helpers de barras ============\nfunction makeProgressBar(current, target, length = 20) {\n  const ratio = Math.min(current / target, 1);\n  const filled = Math.round(ratio * length);\n  const empty = length - filled;\n  return '█'.repeat(filled) + '░'.repeat(empty);\n}\n\nfunction percent(current, target) {\n  if (!target || target === 0) return 0;\n  return Math.round((current / target) * 100);\n}\n\n// ============ Helpers MarkdownV2 ============\nfunction escapeMarkdownV2(text) {\n  if (!text) return '';\n  return String(text).replace(/([\\\\_*[\\]()~`>#+\\-=|{}.!])/g, '\\\\$1');\n}\n\nfunction escapeForUrl(url) {\n  return String(url).replace(/[)\\\\]/g, '\\\\$&');\n}\n\nfunction normalizeAndValidateUrl(url) {\n  let raw = String(url || '').trim();\n  try {\n    const u = new URL(raw);\n    return u.toString();\n  } catch {}\n  const domainLike = /^[a-z0-9.-]+\\.[a-z]{2,}([/:?#].*)?$/i.test(raw);\n  if (domainLike) {\n    try {\n      const u2 = new URL('https://' + raw);\n      return u2.toString();\n    } catch {}\n  }\n  return null;\n}\n\nfunction normalizeHeadings(text) {\n  return text.replace(/^(#{1,6})\\s+(.*)$/gm, (m, hashes, title) => `*${title.trim()}*`);\n}\n\nfunction normalizeCommonMd(text) {\n  return String(text)\n    .replace(/\\*\\*([\\s\\S]*?)\\*\\*/g, '*$1*')\n    .replace(/__([\\s\\S]*?)__/g, '_$1_');\n}\n\nfunction processMarkdownV2Safe(inputText) {\n  if (!inputText) return '';\n\n  let text = normalizeCommonMd(String(inputText));\n  text = normalizeHeadings(text);\n\n  const placeholders = { links: [], bolds: [], italics: [], spoilers: [] };\n\n  // Links\n  text = text.replace(/\\[([^\\]\\n]+)\\]\\(([^)]+)\\)/g, (m, label, url) => {\n    const normalizedUrl = normalizeAndValidateUrl(url);\n    if (!normalizedUrl) return escapeMarkdownV2(label);\n    const idx = placeholders.links.length;\n    const ph = `⟬L${idx}⟭`;\n    const safeLabel = escapeMarkdownV2(label);\n    const safeUrl = escapeForUrl(normalizedUrl);\n    placeholders.links.push(`[${safeLabel}](${safeUrl})`);\n    return ph;\n  });\n\n  // Bold\n  text = text.replace(/\\*([\\s\\S]+?)\\*/g, (m, inner) => {\n    const idx = placeholders.bolds.length;\n    const ph = `⟬B${idx}⟭`;\n    placeholders.bolds.push(`*${escapeMarkdownV2(inner)}*`);\n    return ph;\n  });\n\n  // Italic\n  text = text.replace(/_([\\s\\S]+?)_/g, (m, inner) => {\n    const idx = placeholders.italics.length;\n    const ph = `⟬I${idx}⟭`;\n    placeholders.italics.push(`_${escapeMarkdownV2(inner)}_`);\n    return ph;\n  });\n\n  // Spoilers\n  text = text.replace(/\\|\\|([\\s\\S]+?)\\|\\|/g, (m, inner) => {\n    const idx = placeholders.spoilers.length;\n    const ph = `⟬S${idx}⟭`;\n    placeholders.spoilers.push(`||${escapeMarkdownV2(inner)}||`);\n    return ph;\n  });\n\n  text = escapeMarkdownV2(text);\n\n  placeholders.links.forEach((md, i) => { text = text.replace(`⟬L${i}⟭`, md); });\n  placeholders.bolds.forEach((md, i) => { text = text.replace(`⟬B${i}⟭`, md); });\n  placeholders.italics.forEach((md, i) => { text = text.replace(`⟬I${i}⟭`, md); });\n  placeholders.spoilers.forEach((md, i) => { text = text.replace(`⟬S${i}⟭`, md); });\n\n  return text;\n}\n\nfunction chunkForTelegram(text, maxLen = SAFE_BUDGET) {\n  if (!text || text.length <= maxLen) return [text || ''];\n\n  const parts = [];\n  let buffer = '';\n\n  const flush = () => {\n    if (buffer) {\n      parts.push(buffer);\n      buffer = '';\n    }\n  };\n\n  const paragraphs = text.split(/\\n{2,}/);\n  for (const p of paragraphs) {\n    const candidate = buffer ? buffer + '\\n\\n' + p : p;\n    if (candidate.length <= maxLen) {\n      buffer = candidate;\n      continue;\n    }\n    if (p.length <= maxLen) {\n      flush();\n      buffer = p;\n      continue;\n    }\n    flush();\n    const sentences = p.split(/(?<=[.!?…])\\s+(?=[^\\s])/u);\n    let sBuf = '';\n    for (const s of sentences) {\n      const sCandidate = sBuf ? sBuf + ' ' + s : s;\n      if (sCandidate.length <= maxLen) {\n        sBuf = sCandidate;\n        continue;\n      }\n      if (s.length <= maxLen) {\n        if (sBuf) parts.push(sBuf);\n        sBuf = s;\n        continue;\n      }\n      if (sBuf) { parts.push(sBuf); sBuf = ''; }\n      let wBuf = '';\n      const words = s.split(/\\s+/);\n      for (const w of words) {\n        const wCandidate = wBuf ? wBuf + ' ' + w : w;\n        if (wCandidate.length <= maxLen) {\n          wBuf = wCandidate;\n          continue;\n        }\n        if (w.length <= maxLen) {\n          if (wBuf) parts.push(wBuf);\n          wBuf = w;\n          continue;\n        }\n        if (wBuf) { parts.push(wBuf); wBuf = ''; }\n        const re = new RegExp(`.{1,${maxLen}}`, 'g');\n        const hardPieces = w.match(re) || [];\n        parts.push(...hardPieces);\n      }\n      if (wBuf) parts.push(wBuf);\n    }\n    if (sBuf) parts.push(sBuf);\n  }\n  if (buffer) parts.push(buffer);\n\n  return parts.flatMap(part => {\n    if (part.length <= MAX_TELEGRAM) return [part];\n    const re = new RegExp(`.{1,${SAFE_BUDGET}}`, 'g');\n    return part.match(re) || [];\n  });\n}\n\n// ============ MAIN ============\nconst inputItems = $input.all();\nconst out = [];\n\nfor (const item of inputItems) {\n  const j = item.json || {};\n\n  // Datos dinámicos\n  const name = j.Name || 'User';\n  const cal = j.Total_Calories || 0;\n  const calTarget = j.Calories_target || 1;\n\n  const prot = j.Total_Proteins || 0;\n  const protTarget = j.Protein_target || 1;\n\n  const carbs = j.Total_Carbs || 0;\n  const fats  = j.Total_Fats || 0;\n\n  // Construcción del mensaje\n  let msg = `*Hello ${name}*\\nHere is your nutrition summary:\\n\\n`;\n\n  msg += `🔥 *Calories*: ${cal}/${calTarget} (${percent(cal, calTarget)}%)\\n`;\n  msg += makeProgressBar(cal, calTarget) + '\\n\\n';\n\n  msg += `🍗 *Protein*: ${prot}/${protTarget} (${percent(prot, protTarget)}%)\\n`;\n  msg += makeProgressBar(prot, protTarget) + '\\n\\n';\n\n  msg += `🌾 *Carbs*: ${carbs} g\\n`;\n  msg += `🥑 *Fats*: ${fats} g\\n`;\n\n  // Formateo seguro\n  const formatted = processMarkdownV2Safe(msg);\n  const chunks = chunkForTelegram(formatted, SAFE_BUDGET);\n\n  chunks.forEach((chunk, idx) => {\n    out.push({\n      json: {\n        ...j,\n        message: chunk,\n        message_part_index: idx + 1,\n        message_parts_total: chunks.length,\n      },\n      binary: item.binary,\n    });\n  });\n}\n\nreturn out;\n",
				},
				position: [3776, 2048],
				name: 'Get chart message',
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
								id: '750d5bca-c08f-42bb-b9cc-5709c6fad4a9',
								name: 'message',
								type: 'string',
								value: '={{ $json.message }}',
							},
						],
					},
				},
				position: [3952, 2048],
				name: 'Send back message',
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
				position: [1072, 1200],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [
							{
								lookupValue: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
								lookupColumn: 'User_ID',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=0',
						cachedResultName: 'Profile',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
						cachedResultName: 'Cal AI',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1296, 1200],
				name: 'Registered?',
			},
		}),
	)
	.then(
		ifBranch(
			[
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
													leftValue: "={{ $('Telegram Trigger').item.json.message.text }}",
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
													leftValue: "={{ $('Telegram Trigger').item.json.message.voice }}",
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
													leftValue:
														"={{ $('Telegram Trigger').item.json.message.photo[0].file_id }}",
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
						position: [1776, 1136],
						name: 'Input Message Router1',
					},
				}),
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
										value: "={{ $('Telegram Trigger').item.json.message.text }}",
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
						position: [1728, 1776],
						name: 'get_message (register)',
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
								id: 'b9e63bbf-24e6-424b-ba4e-6acd3f17b57c',
								operator: { type: 'number', operation: 'exists', singleValue: true },
								leftValue: '={{ $json.User_ID }}',
								rightValue: '',
							},
						],
					},
				},
				name: 'If',
			},
		),
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
								value: "={{ $('Telegram Trigger').item.json.message.text }}",
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
				position: [2144, 912],
				name: 'get_message (text)',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '={{ $json.message }}',
					options: {
						systemMessage:
							"=You are Cal AI 🏋️‍♂️🥦, your friendly fitness coach and nutrition orchestrator.\nYour mission is to guide the user with motivation, clarity, and precision while managing their nutrition data. Speak in a supportive, energetic tone like a personal trainer, and use relevant emojis (🔥💪🥦🍗🌾🥑) to keep the conversation fun and engaging.\n\nYou have four tools available:\n\nappendMealData(tool) → store a meal row in Meals sheet.\n\nupdateProfileData(tool) → update the user's profile targets (fields: Name, Calories_target, Protein_target).\n\ngetUserData(tool) → fetch the user's profile info.\n\ngetReport(tool) → generate or fetch the daily report (requires date).\n\n🔑 Rules\n\nThe image analysis is done before reaching you. You will always receive structured info:\nMeal Description: [short description]\nCalories: [number]\nProteins: [number]\nCarbs: [number]\nFat: [number]\n\nWith this info, call appendMealData.\n\nAfter appendMealData success, confirm naturally in a coach style: repeat the meal info using emojis (🔥 Calories, 🍗 Protein, 🌾 Carbs, 🥑 Fat).\n\nEnd confirmations with a quick motivational phrase like:\n\n“Great fuel for your body 💪🔥”\n\n“Another step closer to your goals 🥦🏋️‍♂️”\n\nAlways offer short next-step options:\n👉 “View daily report 📑”\n👉 “Analyze another meal 📸”\n👉 “View or update profile targets ⚙️”\n\n🔄 Profile Update Logic\n\nWhen the user wants to update their profile (Name, Calories_target, or Protein_target):\n\nFirst call getUserData to fetch current profile info.\n\nCompare the requested update with the existing values.\n\nOnly pass the changed fields to updateProfileData (never overwrite unchanged values).\n\nConfirm to the user in a friendly way, e.g.:\n\n“✅ Your Calories_target is now 2200 🔥. Protein_target stays strong at 150 🍗.”\n\n“Profile updated! Let’s crush it 💪🥦.”\n\n📑 Tool Usage Rules\n\ngetUserData → always called first before updating the profile.\n\nupdateProfileData → only include the fields that have changed.\n\ngetReport → only pass the requested date.\n\nKeep all responses short, clear, motivational, and full of energy.\n\n📅 Date: {{ $today.format('yyyy-MM-dd') }}",
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.2,
							config: {
								parameters: {
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'getReport\nPurpose: Generate or fetch the user’s daily nutrition report.\nInput required: date (string, format: YYYY-MM-DD).\nWhen to use: When the user asks to see their daily summary or report for a specific date.',
									workflowInputs: {
										value: {
											Date: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Date', ``, 'string') }}",
											User_ID: '={{ $json.chat_id }}',
										},
										schema: [
											{
												id: 'User_ID',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'User_ID',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Date',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Date',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Get Report',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.7,
							config: {
								parameters: {
									columns: {
										value: {
											Date: '={{ $today.format("yyyy-LL-dd") }}\n',
											Fats: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Fats', ``, 'string') }}",
											Carbs:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Carbs', ``, 'string') }}",
											User_ID: '={{ $json.chat_id }}',
											Calories:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Calories', ``, 'string') }}",
											Proteins:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Proteins', ``, 'string') }}",
											Meal_description:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Meal_description', ``, 'string') }}",
										},
										schema: [
											{
												id: 'User_ID',
												type: 'string',
												display: true,
												required: false,
												displayName: 'User_ID',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Date',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Date',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Meal_description',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Meal_description',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Calories',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Calories',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Proteins',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Proteins',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Carbs',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Carbs',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Fats',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Fats',
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
									operation: 'append',
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 403788598,
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=403788598',
										cachedResultName: 'Meals',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
										cachedResultName: 'Cal AI',
									},
									descriptionType: 'manual',
									toolDescription:
										'appendMealData\nPurpose: Store one meal entry into the Meals sheet.\nInputs required:\n\nMeal Description (string)\n\nCalories (number)\n\nProteins (number)\n\nCarbs (number)\n\nFat (number)\nWhen to use: Every time you receive structured meal information from image analysis.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Append Meal Data',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.7,
							config: {
								parameters: {
									options: {},
									filtersUI: {
										values: [
											{
												lookupValue: '={{ $json.chat_id }}',
												lookupColumn: 'User_ID',
											},
										],
									},
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=0',
										cachedResultName: 'Profile',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
										cachedResultName: 'Cal AI',
									},
									descriptionType: 'manual',
									toolDescription:
										'=getUserData\nPurpose: Retrieve the user’s profile information.\nInputs: none.\nWhen to use: When the user asks about their profile info or targets.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Get Profile Data',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.7,
							config: {
								parameters: {
									columns: {
										value: {
											Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}",
											User_ID: '={{ $json.chat_id }}',
											Protein_target:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Protein_target', ``, 'string') }}",
											Calories_target:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Calories_target', ``, 'string') }}",
										},
										schema: [
											{
												id: 'User_ID',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'User_ID',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Calories_target',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Calories_target',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Protein_target',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Protein_target',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: ['User_ID'],
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
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=0',
										cachedResultName: 'Profile',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
										cachedResultName: 'Cal AI',
									},
									descriptionType: 'manual',
									toolDescription:
										'=updateProfileData\nPurpose: Update the user’s profile targets.\nFields that can be updated:\n\nName (string)\n\nCalories_target (string/number)\n\nProtein_target (string/number)\nWhen to use: When the user explicitly asks to update their name, calorie target, or protein target.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Update Profile Data',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: '={{ $json.chat_id }}',
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
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
				position: [3200, 1136],
				name: 'Cal IA Agent',
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
				position: [3520, 1136],
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
					chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
					additionalFields: { parse_mode: 'MarkdownV2', appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [3680, 1136],
				name: 'Send a text message',
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
					fileId: "={{ $('Telegram Trigger').item.json.message.voice.file_id }}",
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2144, 1072],
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
				position: [2320, 1072],
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
				position: [2480, 1072],
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
									'=Voice message description:{{ $json.candidates?.[0]?.content?.parts?.[0]?.text || $json.content?.parts?.[0]?.text }}',
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
				position: [2656, 1072],
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
						"={{ $('Telegram Trigger').item.json.message.photo[3]?.file_id || $('Telegram Trigger').item.json.message.photo[2]?.file_id || $('Telegram Trigger').item.json.message.photo[1]?.file_id }}",
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2144, 1248],
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
				position: [2320, 1248],
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
					text: '=You are a Nutrition Vision Assistant. Think like a food scientist and registered dietitian. Reason silently and do not reveal your steps. From a single food photo, identify the meal components, estimate portion weight in grams per component using geometric/visual cues, then compute total calories, protein, carbs, and fat.\n\nEstimation method (internal only; do not output these steps)\n\nIdentify components: list the main foods (e.g., chicken breast, white rice, mixed salad, sauce).\n\nChoose references: map each component to a standard reference food.\n\nEstimate volume/size: use visible objects for scale (plate ≈ 27 cm diameter, fork tines ≈ 3.5 cm, spoon bowl ≈ 5–6 cm). Approximate shapes (cuboid, cylinder, dome) to get volume in ml (≈ cm³).\n\nConvert to grams (densities, g/ml): meats 1.05; cooked rice 0.66; cooked pasta 0.60; potato/solid starchy veg 0.80; leafy salad 0.15; sauces creamy 1.00; oils 0.91. If the image clearly suggests deep-fried or glossy/oily coating, account for added oil.\n\nMacros & energy per 100 g (reference values):\n\nWhite rice, cooked: 130 kcal, P 2.7, C 28, F 0.3\n\nPasta, cooked: 131 kcal, P 5.0, C 25, F 1.1\n\nChicken breast, cooked skinless: 165 kcal, P 31, C 0, F 3.6\n\nSalmon, cooked: 208 kcal, P 20, C 0, F 13\n\nLean ground beef (≈10% fat), cooked: 217 kcal, P 26, C 0, F 12\n\nBlack beans, cooked: 132 kcal, P 8.9, C 23.7, F 0.5\n\nPotato, baked: 93 kcal, P 2.5, C 21, F 0.1\n\nLettuce/leafy salad: 15 kcal, P 1.4, C 2.9, F 0.2\n\nAvocado: 160 kcal, P 2, C 9, F 15\n\nBread (white): 265 kcal, P 9, C 49, F 3.2\n\nEgg, cooked: 155 kcal, P 13, C 1.1, F 11\n\nCheddar cheese: 403 kcal, P 25, C 1.3, F 33\n\nOlive oil: 884 kcal, P 0, C 0, F 100\n(If a food is not listed, pick the closest standard equivalent.)\n\nHidden oil & sauces: if pan-fried or visibly glossy, add ~1 tablespoon oil = 13.5 g = 120 kcal = 13.5 g fat per clearly coated serving; adjust by visual coverage.\n\nSum totals: compute grams per component × (per-100 g macros/energy) and add all components.\n\nValidation: enforce Calories ≈ 4×Protein + 4×Carbs + 9×Fat. If off by >8%, adjust fat first (oil/sauce most variable), then carbs (starches), keeping protein consistent with visible lean mass.\n\nRounding: round all final totals to integers. Never output ranges or decimals.\n\nOutput rules (must follow exactly)\n\nPlain text only.\n\nUse this exact structure and field order.\n\nValues are numbers only (no units, no “g” or “kcal”), no extra text, no JSON, no notes.\n\nMeal Description: [short description]\nCalories: [number]\nProteins: [number]\nCarbs: [number]\nFat: [number]',
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-pro',
						cachedResultName: 'models/gemini-2.5-pro',
					},
					options: {},
					resource: 'image',
					inputType: 'binary',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [2480, 1248],
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
								value: '=Content:\n{{ $json.content.parts[0].text }}',
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
				position: [2656, 1248],
				name: 'get_message (Media  message)',
			},
		}),
	)
	.output(3)
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
				position: [2144, 1408],
				name: 'get_error_message1',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '={{ $json.message }}',
					options: {
						systemMessage:
							'=You are Cal AI 🏋️‍♂️🥦, the friendly fitness & nutrition coach assistant.\nYour single job is to register a new user into the Users table while keeping the tone supportive, clear, and motivational. Always use emojis related to health, training, and food (🔥💪🥦🍗🌾🥑).\n\n🔑 Registration Rules\n\nYou MUST collect these fields:\n\nuser_id (not asked, system provides it)\n\nname\n\ncalories_target\n\nprotein_target\n\n📌 When sending data to the Register User tool, always send numbers only (no units, no text, no emojis) for calories_target and protein_targe\n\nIf the user does not know their numeric targets, do not invent them. Instead, coach them by politely asking for:\n\nweight ⚖️\n\nheight 📏\n\nage 🎂\n\ngoal 🎯 (gain muscle 💪, lose fat 🔥, maintain ⚖️)\n\nBased on this info, calculate precise calorie and protein targets.\n\nOnly when all fields are collected and confirmed → call Register User tool with the final data.\n\n✅ After Successful Registration\n\nSend a short, friendly confirmation like a coach:\n\n“Awesome, champ 💪! Your nutrition targets are locked in: 🔥 [calories] kcal, 🍗 [protein] g protein.”\n\nThen, explain clearly how to use Cal AI:\n\n📸 Send food photos → get instant calories + macros.\n\n⚙️ View or update your targets anytime.\n\n📑 Request daily reports → compare intake vs. targets with charts.\n\n🗣️ Style Guide\n\nAlways keep responses simple, clear, and concise.\n\nSpeak like a friendly trainer/coach who motivates the user.\n\nUse emojis to highlight key concepts.\n\nBe warm, supportive, and practical:\n\n“Let’s get you set up for success 🏋️‍♂️🔥”\n\n“Strong start, [Name]! Targets ready 💪🥦.”',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.7,
							config: {
								parameters: {
									columns: {
										value: {
											Name: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Name', ``, 'string') }}",
											User_ID: '={{ $json.chat_id }}',
											Protein_target:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Protein_target', ``, 'string') }}",
											Calories_target:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Calories_target', ``, 'string') }}",
										},
										schema: [
											{
												id: 'User_ID',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'User_ID',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Calories_target',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Calories_target',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Protein_target',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'Protein_target',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: ['ID'],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
									options: {},
									operation: 'append',
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit#gid=0',
										cachedResultName: 'Profile',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1Dm_YOUR_AWS_SECRET_KEY_HERE',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1Dm_YOUR_AWS_SECRET_KEY_HERE/edit?usp=drivesdk',
										cachedResultName: 'Cal AI',
									},
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Register User',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: '={{ $json.chat_id }}',
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory1',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model1',
						},
					}),
				},
				position: [2000, 1776],
				name: 'Register Agent',
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
				position: [2320, 1776],
				name: 'MarkdownV',
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
					chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
					additionalFields: { parse_mode: 'MarkdownV2', appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2480, 1776],
				name: 'Send a text message1',
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
					chatId: '={{ $json.message.chat.id }}',
					operation: 'sendChatAction',
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1296, 1040],
				name: 'Typing…',
			},
		}),
	)
	.add(
		sticky(
			'# 📘 Cal AI Alternative – Nutrition Assistant \n\nThis workflow implements a **Nutrition Assistant** that helps users log meals, track nutritional goals, and receive personalized reports.  \nThe system integrates **Telegram**, **Google Sheets**, and an **AI Agent (Gemini)** within **n8n**.\n\n✅ **With this workflow, users can:**  \n- Register easily via Telegram.  \n- Log meals with text, voice, or images.  \n- Track nutrition goals automatically.  \n- Receive daily personalized reports.  ',
			{ position: [368, 240], width: 608, height: 336 },
		),
	)
	.add(
		sticky('', { name: 'Sticky Note1', color: 4, position: [1008, 1024], width: 608, height: 464 }),
	)
	.add(
		sticky('', { name: 'Sticky Note2', color: 5, position: [1744, 880], width: 1104, height: 720 }),
	)
	.add(
		sticky('', { name: 'Sticky Note3', color: 6, position: [3024, 1008], width: 896, height: 720 }),
	)
	.add(
		sticky('', {
			name: 'Sticky Note4',
			color: 3,
			position: [1648, 1696],
			width: 1104,
			height: 528,
		}),
	)
	.add(
		sticky('', {
			name: 'Sticky Note5',
			color: 2,
			position: [2784, 1760],
			width: 1392,
			height: 464,
		}),
	)
	.add(
		sticky('![](https://github.com/JarsRat/Images/blob/main/cal_ia_start.png?raw=true)\n', {
			name: 'Sticky Note6',
			color: 3,
			position: [2320, 2272],
			width: 368,
			height: 304,
		}),
	)
	.add(
		sticky('![](https://github.com/JarsRat/Images/blob/main/cal_ia_meal.png?raw=true)\n', {
			name: 'Sticky Note8',
			color: 5,
			position: [2432, 512],
			width: 352,
			height: 224,
		}),
	)
	.add(
		sticky('![](https://github.com/JarsRat/Images/blob/main/cal_ia_report.png?raw=true)\n ', {
			name: 'Sticky Note9',
			color: 2,
			position: [3456, 2432],
			width: 368,
			height: 208,
		}),
	)
	.add(
		sticky(
			'## Telegram Trigger & User Check\n\n**Purpose:** Handle incoming messages and validate user registration.\n\n1. **Telegram Trigger**  \n   - Captures user messages (text, voice, or images) from Telegram.\n\n2. **User Registration Check**  \n   - Verifies if the sender exists in the `Profile` table (Google Sheets).\n   - If the user **is not registered** → Redirects to **Zone Red (Register Agent)**.  \n   - If the user **is registered** → Forwards the message to **Zone Blue (Message Processing)**.',
			{ name: 'Sticky Note7', color: 4, position: [1008, 624], width: 496, height: 352 },
		),
	)
	.add(
		sticky(
			'## Register Agent\n\n**Purpose:** Register new users and set up nutritional goals.\n\n1. **Register Agent**  \n   - Guides new users through the registration process.  \n   - Collects user details:\n     - **Name**\n     - **Calories_target**\n     - **Protein_target**\n\n2. **Target Assistance**  \n   - If the user is unsure about their targets, the agent asks simple questions to help determine suitable daily calorie and protein goals.  \n   - ⚠️ **Note:** No personal health data (e.g., weight, height) is stored.\n\n3. **Database Update**  \n   - Once confirmed, the new profile is added to the **Profile Table** in Google Sheets.  \n   - The user is now considered "registered" and future messages will be processed in **Zone Blue**.\n',
			{ name: 'Sticky Note10', color: 3, position: [1648, 2256], width: 624, height: 496 },
		),
	)
	.add(
		sticky(
			'## Message Processing\n\n**Purpose:** Classify and process different types of user messages.\n\n1. **Message Routing**  \n   - Determines the type of message received:\n     - **Text** → Sent directly to the AI Agent.  \n     - **Voice/Audio** → Downloaded, transcribed, and converted into text.  \n     - **Image** → Downloaded and analyzed by Google AI Vision.\n\n2. **Image Analysis (Food Recognition)**  \n   - Google AI receives a custom prompt to analyze food images.  \n   - The AI:\n     - Identifies food items.  \n     - Estimates nutritional values (Calories, Proteins, Carbs, Fats).  \n     - Returns the analysis in a structured, human-readable text format.  \n\n3. **Error Handling**  \n   - If processing fails, a fallback node (`get_error_message`) sends an error notification to the user.\n',
			{ name: 'Sticky Note11', color: 5, position: [1744, 336], width: 672, height: 512 },
		),
	)
	.add(
		sticky(
			'## Report Subworkflow\n\n**Purpose:** Generate personalized daily nutrition reports.\n\n1. **Get Meals & Targets**  \n   - Retrieves all logged meals for the selected day from the database.  \n   - Fetches the user’s nutrition targets from the profile.\n\n2. **Progress Calculation**  \n   - Runs a code node to calculate:\n     - Daily totals (Calories, Proteins, etc.)  \n     - Percentage progress toward targets.\n\n3. **Report Formatting**  \n   - Returns a **personalized message** with:\n     - Summary of meals logged.  \n     - Totals and percentages.  \n     - A **progress bar** visualization of calories and proteins.  \n',
			{ name: 'Sticky Note12', color: 2, position: [2800, 2288], width: 624, height: 448 },
		),
	)
	.add(
		sticky(
			'##  Main AI Agent\n\n**Purpose:** Central decision-making agent for all user interactions.\n\nThe AI Agent (Gemini) operates with **four key tools**:\n\n1. **getProfileData**  \n   - Retrieves user profile (calorie/protein targets).\n\n2. **updateProfileData**  \n   - Updates user goals upon request.\n\n3. **appendMealData**  \n   - Adds new meal entries to the **Meals Table** in Google Sheets.\n\n4. **getReport**  \n   - Triggers **Zone Yellow** to generate a daily progress report.\n\n**Conversation Flow:**  \n- Managed with the **Simple Memory node**, ensuring contextual and natural dialogue.  \n- All responses are returned to the user via Telegram.\n',
			{ name: 'Sticky Note13', color: 6, position: [3024, 464], width: 480, height: 528 },
		),
	)
	.add(
		sticky('![](https://github.com/JarsRat/Images/blob/main/cal_ia_target.png?raw=true)\n', {
			name: 'Sticky Note14',
			color: 6,
			position: [3536, 512],
			width: 368,
		}),
	)
	.add(
		sticky(
			'## 💡 Need Assistance?\n\nIf you’d like help customizing or extending this workflow, feel free to reach out:  \n\n📧 Email: [johnsilva11031@gmail.com](mailto:johnsilva11031@gmail.com)  \n🔗 LinkedIn: [John Alejandro Silva Rodríguez](https://www.linkedin.com/in/john-alejandro-silva-rodriguez-48093526b/)',
			{ name: 'Sticky Note15', color: 2, position: [3536, 736], width: 368, height: 208 },
		),
	)
	.add(
		sticky(
			"# **Documentation: Configuring the Telegram Nutrition AI Assistant Workflow**\n\nThis guide provides step-by-step instructions for setting up the Google Sheets database and configuring the required n8n nodes to make the workflow fully operational.\n\n---\n\n### **Important Notes on Errors and Customization**\n\n*   **Public Sheet Errors:** If you encounter persistent errors while using the pre-configured public Google Sheet, it is highly probable that another user has modified its structure (e.g., deleted or renamed a column header), causing the workflow to fail. The most reliable way to resolve this is to follow the instructions in **Step 1** to set up and connect your own private Google Sheet.\n\n*   **Connection Issues:** Please be aware that intermittent connection errors with Google services can occasionally occur. If a Google (Sheets or Gemini) node fails, simply re-executing the step or the entire workflow is often enough to resolve the issue.\n\n*   **Customizing the AI Model:** While this workflow is pre-configured with Google Gemini for all AI-driven tasks, n8n's modular design allows for easy customization. You can swap the Gemini nodes for any large language model (LLM) you prefer, such as those from OpenAI, Anthropic, or others, to better suit your specific needs or existing subscriptions.\n\n---\n\n## **Step 1: Setting Up Your Google Sheets**\n\nYou will need a Google Sheet with two specific tabs (\"Sheets\") to act as your database.\n\n1.  **Create a Copy of the Template**\n    The easiest way to start is by making a copy of the official template. Open the link below and go to `File > Make a copy`.\n    *   **Template Link:** [Google Sheets Nutrition Template](https://docs.google.com/spreadsheets/d/11kI8q0oB2vPzbVJOItdna5o0y7szuoprJSA8v0Bt-Ec/edit?usp=sharing)\n\n2.  **Verify Sheet Structure**\n    Ensure your copy has the following two tabs with the exact column headers:\n\n    *   **Sheet 1: `Profile`**\n        This sheet stores user information and their nutritional goals.\n        *   `User_ID`\n        *   `Name`\n        *   `Calories_target`\n        *   `Protein_target`\n\n    *   **Sheet 2: `Meals`**\n        This sheet logs every meal entry for all users.\n        *   `User_ID`\n        *   `Date`\n        *   `Meal_description`\n        *   `Calories`\n        *   `Proteins`\n        *   `Carbs`\n        *   `Fats`\n\n3.  **Get Your Spreadsheet ID**\n    Copy the ID from your new spreadsheet's URL. It is the long string of characters between `/d/` and `/edit`.\n    `https://docs.google.com/spreadsheets/d/`**`[YOUR_SPREADSHEET_ID]`**`/edit`\n\n---\n\n## **Step 2: Configuring the n8n Google Sheets Nodes**\n\n>Now it's time to connect the workflow to your new Google Sheet. The following documentation is organized to match the colored sections you see on the n8n canvas. Each part of this guide details the specific configuration for the Google Sheets nodes located within its corresponding colored section.\n\n---\n\nBy following these steps, you will have successfully reconfigured the workflow to use your own private and secure Google Sheet, ensuring its long-term stability and the privacy of your data.",
			{ name: 'Sticky Note16', color: 7, position: [352, 624], width: 608, height: 2032 },
		),
	)
	.add(
		sticky(
			"#### **🟩 Green Section: Telegram Trigger & User Check**\n\nThis section checks if a user is already registered.\n\n**Node: `Registered?`**\n*   **Purpose:** Looks for the user's `chat.id` in the `Profile` sheet to see if they exist.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Get Row(s)`.\n    3.  **Document:** Select your Google Sheet document (\"Cal AI\" in the example).\n    4.  **Sheet:** Select `Profile`.\n    5.  **Filters > Column:** `User_ID`.\n    6.  **Filters > Value:** Set this to the following expression to get the chat ID from the Telegram trigger: `{{ $('Telegram Trigger').item.json.message.chat.id }}`.\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070009.png?raw=true)",
			{ name: 'Sticky Note17', color: 7, position: [1008, 1520], width: 608, height: 1216 },
		),
	)
	.add(
		sticky(
			"#### **🟥 Red Section: Register Agent**\n\nThis section handles the creation of a new user profile.\n\n**Node: `Register User`**\n*   **Purpose:** Adds a new row with the new user's information to the `Profile` sheet after they complete the registration dialogue.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Append Row`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Profile`.\n    5.  **Mapping Column Mode:** `Map Each Column Manually`.\n    6.  **Values to Send:**\n        *   **User\\_ID:** Set this to the expression that holds the user's chat ID, for example: `{{ $json.chat_id }}`.\n        *   **Name, Calories\\_target, Protein\\_target:** These fields will be populated dynamically by the AI model (`Register Agent`) that runs just before this node. You don't need to enter a static value here; the workflow will automatically pass the extracted information.\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070403.png?raw=true)",
			{ name: 'Sticky Note18', color: 7, position: [1648, 2784], width: 608, height: 1344 },
		),
	)
	.add(
		sticky(
			"#### **🟪 Purple Section: Main AI Agent**\n\nThis is the core section that handles user interactions, including retrieving data, logging meals, and updating profiles.\n\n**Node: `Get Profile Data`**\n*   **Purpose:** Retrieves the user's profile (including their goals) from the `Profile` sheet. This provides the AI Agent with the necessary context for the conversation.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Get Row(s)`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Profile`.\n    5.  **Filters > Column:** `User_ID`.\n    6.  **Filters > Value:** Use an expression to reference the user's chat ID from the input, for example: `{{ $json.chat_id }}`.\n\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070500.png?raw=true)\n\n\n\n",
			{ name: 'Sticky Note19', color: 7, position: [3952, 416], width: 608, height: 1328 },
		),
	)
	.add(
		sticky(
			'**Node: `Append Meal Data`**\n*   **Purpose:** Logs a new meal into the `Meals` sheet after the AI has analyzed the user\'s text, voice, or image input.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Append Row`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Meals`.\n    5.  **Values to Send:**\n        *   **User\\_ID:** `{{ $json.chat_id }}`.\n        *   **Date:** `{{ $today.format("YYYY-LL-DD") }}` (This sets the current date for the meal entry).\n        *   **Meal\\_description, Calories, Proteins, Carbs, Fats:** These fields are populated dynamically by the AI model. The workflow will pass the extracted nutritional data to this node.\n\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070542.png?raw=true)',
			{ name: 'Sticky Note20', color: 7, position: [4592, 416], width: 608, height: 1328 },
		),
	)
	.add(
		sticky(
			"**Node: `Update Profile Data`**\n*   **Purpose:** Modifies an existing user's record in the `Profile` sheet, typically used when a user asks to change their calorie or protein goals.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Update Row`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Profile`.\n    5.  **Column to match on:** `User_ID`. This tells the node which column to use to find the correct row to update.\n    6.  **Values to Send:**\n        *   **User\\_ID (using to match):** `{{ $json.chat_id }}`. This value is used to find the right row.\n        *   **Name, Calories\\_target, Protein\\_target:** These are the fields to be updated. The AI Agent will provide the new values, which the workflow will pass into these fields.\n\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070601.png?raw=truee)",
			{ name: 'Sticky Note21', color: 7, position: [5232, 416], width: 608, height: 1328 },
		),
	)
	.add(
		sticky(
			"#### **🟨 Yellow Section: Report Subworkflow**\n\nThis subworkflow is triggered to generate and send a daily nutrition report to the user.\n\n**Node: `Get Meals Info`**\n*   **Purpose:** Fetches all meals logged by a specific user for the current day from the `Meals` sheet.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Get Row(s)`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Meals`.\n    5.  **Filters:**\n        *   **Filter 1:**\n            *   **Column:** `Date`.\n            *   **Value:** `{{ $json.Date }}` (or the expression representing the current date from the input).\n        *   **Filter 2 (Recommended):**\n            *   Click **Add Filter**.\n            *   **Combine Filters:** `AND`.\n            *   **Column:** `User_ID`.\n            *   **Value:** `{{ $json.User_ID }}` (or the expression for the user's ID from the input). This is critical to ensure you only get meals for the correct user.\n\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Screenshot%202025-08-28%20070616.png?raw=true)\n\n\n\n---",
			{ name: 'Sticky Note22', color: 7, position: [2800, 2784], width: 608, height: 1408 },
		),
	)
	.add(
		sticky(
			"**Node: `Get User Info`**\n*   **Purpose:** Retrieves the user's goals from the `Profile` sheet to calculate their progress in the daily report.\n*   **Configuration:**\n    1.  **Credential to connect with:** Select your Google Sheets account credential.\n    2.  **Operation:** `Get Row(s)`.\n    3.  **Document:** Select your Google Sheet.\n    4.  **Sheet:** Select `Profile`.\n    5.  **Filters > Add Filter:**\n        *   **Column:** `User_ID`.\n        *   **Value:** Use an expression that references the User ID passed into the subworkflow, for example: `{{ $json.User_ID }}`.\n\n![](https://github.com/JarsRat/Images/blob/main/Documentation/Correction.png?raw=true)",
			{ name: 'Sticky Note23', color: 7, position: [3456, 2784], width: 608, height: 1408 },
		),
	);
