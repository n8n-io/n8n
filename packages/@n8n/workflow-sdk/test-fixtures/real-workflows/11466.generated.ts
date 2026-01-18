const wf = workflow('V994vNilogCvoCug', 'News_Tech_EN', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.3,
			config: { parameters: { rule: { interval: [{}] } }, position: [-2032, 1248] },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://feeds.feedburner.com/TheHackersNews',
					options: {},
				},
				position: [-1040, -448],
				name: 'RSS_TheHackersNews',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: {
							url: 'https://feeds.feedburner.com/TheHackersNews',
							options: {},
						},
						position: [-1040, -448],
						name: 'RSS_TheHackersNews',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: { url: 'https://cybersecuritynews.com/feed/', options: {} },
						position: [-1040, -320],
						name: 'RSS_cybersecuritynews',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: { url: 'https://krebsonsecurity.com/feed/', options: {} },
						position: [-1040, -192],
						name: 'RSS_krebsonsecurity',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: {
							url: 'https://feeds.feedburner.com/TheHackersNews',
							options: {},
						},
						position: [-1040, -64],
						name: 'RSS_GrahamCluley',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: {
							url: 'https://cloudblog.withgoogle.com/topics/threat-intelligence/rss/',
							options: {},
						},
						position: [-1040, 64],
						name: 'RSS_GoogleCloudBlog',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: { url: 'https://research.checkpoint.com/feed/', options: {} },
						position: [-1040, 192],
						name: 'RSS_darkreading1',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: { url: 'https://www.darkreading.com/rss.xml', options: {} },
						position: [-1040, 320],
						name: 'RSS_darkreading',
					},
				}),
				node({
					type: 'n8n-nodes-base.rssFeedRead',
					version: 1.2,
					config: {
						parameters: { url: 'https://isc.sans.edu/rssfeed_full.xml', options: {} },
						position: [-1040, 464],
						name: 'RSS_Sans',
					},
				}),
			],
			{ version: 3.2, parameters: { numberInputs: 8 }, name: 'Merge_Cyber1' },
		),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.merge',
					version: 3.2,
					config: { parameters: { numberInputs: 8 }, position: [-736, -16], name: 'Merge_Cyber1' },
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 3.2,
					config: { position: [-736, 704], name: 'Merge_Cyber2' },
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 3.2,
					config: { parameters: { numberInputs: 5 }, position: [-736, 1104], name: 'Merge_Cyber3' },
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 3.2,
					config: { parameters: { numberInputs: 4 }, position: [-736, 1808], name: 'Merge_AI' },
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 3.2,
					config: { parameters: { numberInputs: 3 }, position: [-736, 2336], name: 'Merge_Nvidia' },
				}),
			],
			{ version: 3.2, parameters: { numberInputs: 5 }, name: 'Merge_All' },
		),
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
								id: '05cbdcd8-582a-460b-bbb2-f55c76b39ae3',
								operator: { type: 'dateTime', operation: 'after' },
								leftValue: '={{ $json.isoDate }}',
								rightValue: '={{ DateTime.now().minus({ hours: 24 }).toISO() }}',
							},
						],
					},
				},
				position: [160, 1216],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.sort',
			version: 1,
			config: {
				parameters: {
					options: {},
					sortFieldsUi: { sortField: [{ order: 'descending', fieldName: 'isoDate' }] },
				},
				position: [400, 1216],
				name: 'Sort - Articles by Date',
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
						'// Trasforma i 68 item in UN solo item con un array "articles"\nreturn [\n  {\n    json: {\n      articles: items.map(i => ({\n        title: i.json.title,\n        content: i.json.contentSnippet || i.json.content,\n        link: i.json.link,\n        isoDate: i.json.isoDate,\n      })),\n    },\n  },\n];',
				},
				position: [608, 1216],
				name: 'Code in JavaScript',
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
						value: 'models/gemini-2.5-flash',
						cachedResultName: 'models/gemini-2.5-flash',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=You are the editor-in-chief of a major technology newspaper.\n\nEvery day you receive dozens of tech, AI and cybersecurity news articles, but your job is NOT to summarize everything.\nYour job is to decide WHAT REALLY MATTERS for a smart reader interested in technology, innovation and digital power.\n\nThink like a front-page editor of a tech newspaper.\n\n━━━━━━━━━━━━━━━━━━━━\nEDITORIAL RULES\n━━━━━━━━━━━━━━━━━━━━\n\n### 1. SELECTION (most important rule)\n\n* From ALL provided articles, select at most 8–10 total news items.\n* Selecting fewer is perfectly acceptable.\n* Ignore minor updates, marketing announcements, product rumors, curiosities, lifestyle tech, speculative hype.\n\n---\n\n### 2. RELEVANCE CRITERIA (at least one)\n\nSelect only news that have real strategic importance, such as:\n\n* Artificial Intelligence (foundation models, regulation, major deployments, scientific or industrial breakthroughs)\n* Big Tech companies (OpenAI, Google, Microsoft, Meta, Apple, Amazon, Nvidia, etc.)\n* Cybersecurity incidents (data breaches, ransomware, state-sponsored cyberwarfare, critical infrastructure attacks)\n* Regulation & digital policy (EU AI Act, privacy, antitrust, platform regulation)\n* Semiconductors, cloud, digital infrastructure, networks\n* National or European technological sovereignty\n* Major industrial or economic impacts of technology\n* Democracy, misinformation, surveillance, digital rights\n\n---\n\n### 3. DEDUPLICATION\n\n* If multiple articles refer to the same event, keep only one.\n* Prefer the most complete, clear and authoritative article.\n\n---\n\n### 4. STRUCTURE BY TOPIC\n\nGroup the selected news into the following categories\n(use only those with at least one item):\n\n* AI & Machine Learning\n* Big Tech & Digital Industry\n* Cybersecurity & Cyberwar\n* Regulation & Digital Policy\n* Tech Economy & Markets\n* Infrastructure, Cloud & Chips\n* Digital Society & Rights\n\nDo NOT invent new categories.\n\n---\n\n### 5. WRITING STYLE + LINK (CRITICAL RULES)\n\n* Each news item: 1–2 sentences, journalistic and factual tone\n* No opinions, no commentary, no hype\n* Prefer context and implications over technical details\n\nMANDATORY LINK\n\n* Every news item must end with ONE source, formatted as a clickable HTML link on the name of the outlet only\n* DO NOT show the URL in plain text\n* DO NOT use markdown\n* DO NOT use parentheses, brackets or braces\n\n✅ ONLY ALLOWED FORMAT:\n\n<a href="ORIGINAL_URL" target="_blank">Outlet Name</a>\n\n✅ Correct example:\n\nAmazon Web Services introduced new chips and strengthened its AI services at the Re:Invent event, focusing on the integration of generative models for enterprises. <a href="https://www.ilsole24ore.com/..." target="_blank">Il Sole 24 Ore</a>\n\n---\n\n━━━━━━━━━━━━━━━━━━━━\nINPUT DATA\n━━━━━━━━━━━━━━━━━━━━\n\nYou receive the last 24 hours of tech news as a JSON array of articles:\n\n{{ JSON.stringify($json.articles) }}\n\nEach article includes:\n\n* title\n* content\n* link\n* isoDate\n\n---\n\n━━━━━━━━━━━━━━━━━━━━\nTASK\n━━━━━━━━━━━━━━━━━━━━\n\n1. Read all articles in "articles".\n2. Select only the most relevant tech / AI / cyber news (max 8–10).\n3. Deduplicate articles covering the same event.\n4. Organize the selected news into the defined categories.\n5. Build a clean, readable HTML output, ensuring every news item includes its formatted source link.\n\n---\n\n━━━━━━━━━━━━━━━━━━━━\nOUTPUT (MANDATORY)\n━━━━━━━━━━━━━━━━━━━━\n\nYou must return ONLY a valid JSON object.\nNo additional text, no explanations, no markdown, no code fences.\n\nExact format:\n\n{\n  "subject": "Tech & AI Briefing – [Day Month Year]",\n  "html": "<h2>🧠 Tech, AI & Cyber – Top Stories</h2>...<p><em>Tech briefing automatically generated on [Day Month Year].</em></p>"\n}\n\nIf you include even a single word outside this JSON object, the response is INVALID.',
							},
						],
					},
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [816, 1216],
				name: 'LLM - News Summarizer',
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
						'// Take the output from the LLM - News Summarizer node\nconst item = items[0].json;\n\n// 1. Get raw text from Gemini format\nlet text = item?.content?.parts?.[0]?.text;\nif (!text) {\n  throw new Error(\n    "Unexpected LLM output, missing content.parts[0].text:\\n" +\n    JSON.stringify(item, null, 2)\n  );\n}\n\n// 2. If there is ```json ... ``` remove the fences\nconst fenced = text.match(/```json?[\\s\\n]*([\\s\\S]*?)```/i);\nif (fenced) {\n  text = fenced[1].trim();\n}\n\n// 3. Extract the first { ... } block (in case the model adds text before/after)\nlet candidate = text;\nconst start = candidate.indexOf("{");\nconst end = candidate.lastIndexOf("}");\nif (start === -1 || end === -1) {\n  throw new Error(\n    "No JSON object found in LLM output:\\n" + text\n  );\n}\ncandidate = candidate.slice(start, end + 1);\n\n// 4. Clean trailing commas before } or ]\ncandidate = candidate.replace(/,\\s*([}\\]])/g, "$1");\n\n// 5. Parse JSON\nlet data;\ntry {\n  data = JSON.parse(candidate);\n} catch (err) {\n  throw new Error(\n    "JSON parse error (inner payload from LLM):\\n" +\n    err.message +\n    "\\n\\nPayload was:\\n" +\n    candidate\n  );\n}\n\n// 6. Special cases: { "text": "{...}" } etc.\nif (data.text && (!data.subject || !data.html)) {\n  try {\n    const inner = JSON.parse(data.text);\n    if (inner.subject && inner.html) {\n      data = inner;\n    }\n  } catch {\n    // if it fails, keep data as-is and proceed\n  }\n}\n\n// 7. Final validation\nif (!data.subject || !data.html) {\n  throw new Error(\n    "LLM JSON does not contain subject/html as expected:\\n" +\n    JSON.stringify(data, null, 2)\n  );\n}\n\n// 8. HTML email template\nconst htmlEmail = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${data.subject}</title>\n  <style>\n    body { font-family: Arial, sans-serif; line-height:1.5; color:#333; background-color:#f7f9fa; margin:0; padding:20px; }\n    .container { max-width:700px; margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden; }\n    .header { background:#2c3e50; color:#fff; padding:20px; text-align:center; }\n    .header h1 { margin:0; font-size:24px; }\n    .content { padding:20px; }\n    h2 { color:#e74c3c; border-bottom:2px solid #e74c3c; padding-bottom:5px; }\n    ul { padding-left:20px; }\n    li { margin-bottom:10px; }\n    a { color:#2980b9; text-decoration:none; }\n    a:hover { text-decoration:underline; }\n    .footer { background:#ecf0f1; text-align:center; padding:10px; font-size:12px; color:#7f8c8d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>${data.subject}</h1>\n    </div>\n    <div class="content">\n      ${data.html}\n    </div>\n    <div class="footer">\n      <em>Briefing automatically sent on ${new Date().toLocaleDateString(\'en-US\', {\n        year: \'numeric\', month: \'long\', day: \'numeric\'\n      })}.</em>\n    </div>\n  </div>\n</body>\n</html>\n`.trim();\n\n// 9. Return data for the Gmail node\nreturn [\n  {\n    json: {\n      subject: data.subject,\n      html: htmlEmail,\n    },\n  },\n];\n',
				},
				position: [1168, 1216],
				name: 'Build Final Newsletter HTML',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message: '={{ $json.html }}',
					options: { senderName: 'n8n News' },
					subject: '=News_Tech | n8n RSS',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1520, 1216],
				name: 'Send Final Digest Email',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml',
					options: {},
				},
				position: [-1040, 624],
				name: 'RSS_cve1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://cvefeed.io/rssfeed/latest.xml', options: {} },
				position: [-1040, 752],
				name: 'RSS_cve2',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://www.ilsole24ore.com/rss/tecnologia--cybersicurezza.xml',
					options: {},
				},
				position: [-1040, 912],
				name: 'RSS_ilsole24ore Cyber',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://www.ilsole24ore.com/rss/tecnologia.xml',
					options: {},
				},
				position: [-1040, 1040],
				name: 'RSS_ilsole24ore Tech',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://www.cybersecurity360.it/feed/', options: {} },
				position: [-1040, 1168],
				name: 'RSS_cybersecurity360',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://feeds.feedburner.com/eset/blog', options: {} },
				position: [-1040, 1296],
				name: 'RSS Read',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://blog.talosintelligence.com/rss/', options: {} },
				position: [-1040, 1440],
				name: 'RSS_CiscoTalos',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://www.artificialintelligence-news.com/feed/',
					options: {},
				},
				position: [-1040, 1632],
				name: 'RSS_artificialintelligence-news.',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://research.google/blog/rss/', options: {} },
				position: [-1040, 1760],
				name: 'RSS_GoogleResearch',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
					options: {},
				},
				position: [-1040, 1888],
				name: 'RSS_MIT',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://openai.com/news/rss.xml', options: {} },
				position: [-1040, 2016],
				name: 'RSS_OpenAI',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: {
					url: 'https://nvidianews.nvidia.com/releases.xml',
					options: {},
				},
				position: [-1040, 2208],
				name: 'RSS_Nvidia1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://developer.nvidia.com/blog/feed', options: {} },
				position: [-1040, 2336],
				name: 'RSS_Nvidia2',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: 'https://feeds.feedburner.com/nvidiablog', options: {} },
				position: [-1040, 2464],
				name: 'RSS_Nvidia3',
			},
		}),
	)
	.add(sticky('### CyberSecurity', { color: 7, position: [-1104, -512], height: 2096 }))
	.add(sticky('### AI', { name: 'Sticky Note1', color: 7, position: [-1104, 1600], height: 560 }))
	.add(
		sticky('### Nvidia', { name: 'Sticky Note2', color: 7, position: [-1104, 2176], height: 416 }),
	)
	.add(
		sticky(
			'## RSS Tech News to your inbox\n\nThis workflow automates the collection, normalization, and publication of content from a broad set of RSS feeds. The execution begins with a Schedule Trigger, which activates the entire pipeline at recurring intervals. Each feed is handled by its own individual RSS node, allowing full separation of sources and easier monitoring or troubleshooting. The collected items flow into a structured series of Merge nodes that consolidate all outputs into one unified data stream.\n\nAfter aggregation, the workflow performs filtering and transformation. A dedicated filtering step removes invalid or duplicate entries, while a custom Function node standardizes fields such as title, URL, timestamp, and raw content. This ensures that data coming from heterogeneous sources is normalized before further processing. The workflow also includes an AI-powered enrichment stage—via an OpenAI node—which generates summaries, tags, categories, or any other metadata needed to enhance the collected articles.\n\nThe pipeline concludes by delivering the processed content to a chosen destination (email, database, Notion, API endpoint, or social platform). The modular design allows new sources to be added effortlessly without altering the core logic, making the workflow scalable and easy to maintain.\nThis setup is ideal for automated newsletters, content curation, topic monitoring, or internal knowledge management systems.\n\nRead: [Full setup Guide](https://paoloronco.it/n8n-template-rss-tech-news-to-your-inbox/)\n\n#### Youtube Video: \n[![RSS Tech News](https://img.youtube.com/vi/Gck8nmvx1UA/0.jpg)](https://www.youtube.com/watch?v=Gck8nmvx1UA "RSS Tech News")',
			{ name: 'Sticky Note3', position: [-224, -528], width: 592, height: 992 },
		),
	)
	.add(
		sticky(
			'📌 Schedule Trigger\nStarts the entire workflow automatically at defined intervals—no manual execution required.',
			{ name: 'Sticky Note4', color: 7, position: [-2064, 1104], width: 192, height: 288 },
		),
	)
	.add(
		sticky(
			'📌 RSS Nodes (Multiple Sources)\n\nEach node fetches the latest entries from one feed. Using isolated nodes keeps the flow stable and simplifies debugging.',
			{ name: 'Sticky Note5', color: 7, position: [-1408, -512], width: 192, height: 192 },
		),
	)
	.add(
		sticky(
			'📌 Merge Nodes\n\nCombine all feed outputs into one coherent dataset, preparing the workflow for global filtering and processing.',
			{ name: 'Sticky Note6', color: 7, position: [-96, 992], width: 192, height: 416 },
		),
	)
	.add(
		sticky(
			'📌 Filter\n\nFilters out everything older than 24 hours by comparing each article’s isoDate to “now minus 24 hours”. Only fresh news is allowed through to keep the briefing truly daily and relevant.',
			{ name: 'Sticky Note7', color: 7, position: [112, 992], width: 208, height: 352 },
		),
	)
	.add(
		sticky(
			'📌 Gemini Node (AI Enrichment)\n\nGenerates summaries, keywords, topics, or enhanced textual representations of each article.',
			{ name: 'Sticky Note8', color: 7, position: [800, 992], width: 256, height: 352 },
		),
	)
	.add(
		sticky(
			'📌 Final Output Node (Email / Notion / API / etc.)\n\nSends the finished newsletter via Gmail.\nUses the subject from the Code node and the generated html as the email body, so you receive a curated Tech & AI briefing directly in your inbox with no manual work required.',
			{ name: 'Sticky Note9', color: 7, position: [1472, 992], width: 256, height: 368 },
		),
	)
	.add(
		sticky(
			'📌Sort – Articles by Date\n\nSorts all remaining articles by isoDate in descending order. This ensures that the most recent and time-sensitive stories are processed first and shown higher in the final briefing.',
			{ name: 'Sticky Note10', color: 7, position: [336, 992], width: 208, height: 352 },
		),
	)
	.add(
		sticky(
			'📌Sort – Code in JavaScript\n\nTakes all incoming RSS items and packs them into a single item with an articles array.\nFor each article it keeps: title, content or contentSnippet, link, isoDate\n',
			{ name: 'Sticky Note11', color: 7, position: [560, 992], width: 224, height: 352 },
		),
	)
	.add(
		sticky(
			'📌 Build Final Newsletter HTML (Code)\n\nThis Code node takes the JSON returned by the LLM and prepares the final email.\nIt removes any ```json wrappers, parses the JSON safely, and checks that subject and html exist.\nThen it inserts both fields into a clean, responsive HTML email template.\nThe output is a single item containing the final subject and html, ready for the Gmail node.',
			{ name: 'Sticky Note12', color: 7, position: [1072, 992], width: 368, height: 368 },
		),
	);
