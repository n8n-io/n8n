const wf = workflow(
	'dXrHZjJdzpNh79lJ',
	'Intelligent AI Digest for Security, Privacy, and Compliance Feeds',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: { interval: [{ triggerAtHour: 1, triggerAtMinute: 35 }] },
				},
				position: [-3040, 4280],
				name: 'Trigger Daily Digest',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// This node returns curated cybersecurity RSS feeds\n// You can add, remove, or modify feeds as needed\n\nreturn [\n  {\n    json: {\n      name: "Krebs on Security",\n      website: "https://krebsonsecurity.com",\n      rss_url: "https://krebsonsecurity.com/feed/"\n    }\n  },\n  {\n    json: {\n      name: "The Hacker News",\n      website: "https://thehackernews.com",\n      rss_url: "https://feeds.feedburner.com/TheHackersNews"\n    }\n  },\n  {\n    json: {\n      name: "Dark Reading",\n      website: "https://www.darkreading.com",\n      rss_url: "https://www.darkreading.com/rss.xml"\n    }\n  },\n  {\n    json: {\n      name: "SANS Internet Storm Center",\n      website: "https://isc.sans.edu",\n      rss_url: "https://isc.sans.edu/rssfeed_full.xml"\n    }\n  },\n  {\n    json: {\n      name: "Cisco Talos Intelligence Blog",\n      website: "https://blog.talosintelligence.com",\n      rss_url: "https://blog.talosintelligence.com/rss/"\n    }\n  },\n  {\n    json: {\n      name: "WeLiveSecurity (ESET)",\n      website: "https://www.welivesecurity.com",\n      rss_url: "https://feeds.feedburner.com/eset/blog"\n    }\n  },\n  {\n    json: {\n      name: "Graham Cluley Security Blog",\n      website: "https://grahamcluley.com",\n      rss_url: "https://grahamcluley.com/feed/"\n    }\n  }\n];\n',
				},
				position: [-2260, 3620],
				name: 'Fetch Security RSS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'rss_url' },
				position: [-2040, 3620],
				name: 'Split Out Security RSS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.1,
			config: {
				parameters: { url: '={{ $json.rss_url }}', options: {} },
				position: [-1820, 3620],
				name: 'Security RSS Read',
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
								id: '9aec0a09-4b6f-4fca-98e6-789abd5fdc51',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '56277e54-31a0-4804-ad23-c9ee6d244641',
								name: 'content',
								type: 'string',
								value: '={{ $json.contentSnippet }}',
							},
							{
								id: 'a3586a80-588e-42d1-9780-370a956ddf6b',
								name: 'link',
								type: 'string',
								value: '={{ $json.link }}',
							},
							{
								id: '58f01618-8014-4685-9192-d15d596ffcd9',
								name: 'isoDate',
								type: 'number',
								value: '={{ new Date($json.isoDate).getTime() }}',
							},
							{
								id: '716bb078-8df3-4d96-8a1b-4aec4f8cf206',
								name: 'categories',
								type: 'array',
								value: '={{ $json.categories }}',
							},
						],
					},
				},
				position: [-1600, 3620],
				name: 'Normalize Article Security Metadata',
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
								id: 'e7cf09fb-af35-495d-a840-341f8d0ddcd8',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.isoDate }}',
								rightValue: '={{ Date.now() - 24 * 60 * 60 * 1000 }}',
							},
						],
					},
				},
				position: [-1380, 3620],
				name: 'Filter Recent Security Articles (24h)',
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
				position: [-1160, 3620],
				name: 'Sort - Security Articles by Date',
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
						"// Dynamic n8n Newsletter Generator - Function Node\n// This code processes security news articles from a previous node and formats them into an HTML email\n\n// Get items from the previous node\nlet newsItems = [];\n\ntry {\n  if ($input && $input.all().length > 0) {\n    const inputItems = $input.all();\n    if (inputItems.length === 1 && Array.isArray(inputItems[0].json)) {\n      newsItems = inputItems[0].json;\n    } else {\n      newsItems = inputItems.map(item => item.json);\n    }\n  } else if (typeof items !== 'undefined' && items.length > 0) {\n    if (items.length === 1 && Array.isArray(items[0].json)) {\n      newsItems = items[0].json;\n    } else {\n      newsItems = items.map(item => item.json);\n    }\n  }\n  console.log(`Successfully processed input, found ${newsItems.length} news items`);\n} catch (error) {\n  console.log(`Error processing input: ${error.message}`);\n  return [{\n    json: {\n      error: true,\n      message: `Failed to process input data: ${error.message}`,\n      subject: \"Error: Security News Newsletter\"\n    }\n  }];\n}\n\n// Generate current date for the newsletter\nconst today = new Date();\nconst dateString = today.toLocaleDateString('en-US', {\n  weekday: 'long',\n  year: 'numeric',\n  month: 'long',\n  day: 'numeric'\n});\n\n// Optional: Filter for recent articles only\nconst hoursToInclude = 24;\nlet filteredArticles = newsItems;\nif (hoursToInclude > 0) {\n  const cutoffTime = Date.now() - (hoursToInclude * 60 * 60 * 1000);\n  filteredArticles = newsItems.filter(article => {\n    const articleDate = article.isoDate\n      ? (typeof article.isoDate === 'number'\n         ? article.isoDate\n         : new Date(article.isoDate).getTime())\n      : 0;\n    return articleDate >= cutoffTime;\n  });\n  console.log(`Filtered to ${filteredArticles.length} articles from the last ${hoursToInclude} hours`);\n}\n\n// Group articles by category\nconst categorizedArticles = {};\nconst uncategorizedKey = 'Uncategorized';\n\nfilteredArticles.forEach(article => {\n  if (!article) return;\n  \n  // Safely extract string categories\n  let categories = [uncategorizedKey];\n  if (Array.isArray(article.categories)) {\n    categories = article.categories\n      .map(cat => {\n        if (typeof cat === 'string') return cat;\n        if (cat && typeof cat.name === 'string') return cat.name;\n        return '';\n      })\n      .map(str => str.trim())\n      .filter(str => str.length > 0);\n    if (categories.length === 0) categories = [uncategorizedKey];\n  } else if (typeof article.categories === 'string' && article.categories.trim()) {\n    categories = [article.categories.trim()];\n  }\n\n  categories.forEach(category => {\n    const name = category || uncategorizedKey;\n    if (!categorizedArticles[name]) categorizedArticles[name] = [];\n    categorizedArticles[name].push(article);\n  });\n});\n\n// Generate HTML for the newsletter\nfunction generateNewsletterHTML() {\n  const styles = `\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }\n    h1 { color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }\n    h2 { color: #c0392b; margin-top: 30px; border-left: 4px solid #e74c3c; padding-left: 10px; }\n    .article { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }\n    .article h3 { margin-top: 0; color: #34495e; }\n    .article-content { color: #555; margin-bottom: 10px; }\n    .article-link { color: #e74c3c; text-decoration: none; font-weight: bold; }\n    .article-link:hover { text-decoration: underline; }\n    .article-date { color: #7f8c8d; font-size: 0.9em; margin-top: 8px; }\n    .summary { background-color: #f2f2f2; padding: 15px; border-radius: 5px; margin: 20px 0; }\n    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #7f8c8d; text-align: center; }\n  `;\n\n  let html = `\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"UTF-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <title>Security News Newsletter - ${dateString}</title>\n      <style>${styles}</style>\n    </head>\n    <body>\n      <h1>Security News Newsletter</h1>\n      <p>Here are the latest security news updates for ${dateString}:</p>\n      <div class=\"summary\">\n        <p><strong>Summary:</strong> This newsletter contains ${filteredArticles.length} articles across ${Object.keys(categorizedArticles).length} categories.</p>\n      </div>\n  `;\n\n  Object.keys(categorizedArticles).sort().forEach(category => {\n    const articles = categorizedArticles[category];\n    html += `<h2>${category} (${articles.length})</h2>`;\n    articles.forEach(article => {\n      let formattedDate = \"Date unknown\";\n      if (article.isoDate) {\n        const dt = typeof article.isoDate === 'number'\n          ? new Date(article.isoDate)\n          : new Date(article.isoDate);\n        if (!isNaN(dt.getTime())) {\n          formattedDate = dt.toLocaleString('en-US', {\n            hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric'\n          });\n        }\n      }\n      html += `\n        <div class=\"article\">\n          <h3>${article.title || \"Untitled\"}</h3>\n          <div class=\"article-content\">${article.content || \"No content available\"}</div>\n          <a href=\"${article.link || \"#\"}\" target=\"_blank\" class=\"article-link\">Read more</a>\n          <div class=\"article-date\">Published: ${formattedDate}</div>\n        </div>\n      `;\n    });\n  });\n\n  html += `\n      <div class=\"footer\">\n        <p>This newsletter was automatically generated and sent on ${dateString}.</p>\n        <p>To unsubscribe, please click <a href=\"{{unsubscribe_link}}\">here</a>.</p>\n      </div>\n    </body>\n    </html>\n  `;\n  return html;\n}\n\nconst newsletterHTML = generateNewsletterHTML();\n\nreturn [{\n  json: {\n    subject: `Security News Newsletter - ${dateString}`,\n    html: newsletterHTML,\n    // to, cc, bcc can be set in the Email node\n  }\n}];",
				},
				position: [-940, 3620],
				name: 'Format Security Articles into HTML',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.subject }}\n{{ $json.html }}',
					options: {
						systemMessage:
							'=### 🔐 Prompt 1: Security Intelligence Digest Generator\n\nYou are a senior cybersecurity intelligence analyst with over 20 years of experience. Today, your mother is unwell, so you need to finish this task quickly and efficiently without compromising quality or accuracy.\n\n#### **Inputs:**\n\n* Raw newsletter subject: `{{ $json.subject }}`\n* Raw newsletter HTML body: `{{ $json.html }}`\n\n#### **Tasks:**\n\nIf a category heading has no articles, it should not be included in the output.\n\n1. Parse the provided HTML.\n2. Remove duplicate articles based on title, summary, or URL.\n3. Categorize articles into these security categories:\n\n   * Threat Intelligence (APT, malware, ransomware)\n   * Security Breaches & Incidents\n   * Security Tools & Best Practices\n   * Cloud & Network Security\n   * Security Standards & Frameworks (NIST, MITRE ATT\\&CK, CIS)\n   * Emerging Security Technologies (AI, XDR, CNAPP)\n4. Summarize each article in 1–2 lines.\n5. Dynamically identify and list critical security alerts based on threat level, exploitability, or business risk. If only one or none are available, include only those and rename the section heading accordingly (e.g., \'Critical Security Alert\').\n6. Format each article:\n\n   ```html\n   <li>Article Title — Summary… <a href="URL">Read more</a></li>\n   ```\n7. Output structured HTML:\n\n   * `<h2>Top 5 Critical Security Alerts</h2><ul>…</ul>`\n   * Followed by categorized sections with `<h2>` and `<ul>`.\n8. Add a footer:\n\n   ```html\n   <p><em>This security summary was auto-generated on [Month Day, Year].</em></p>\n   ```\n\n#### **Output (JSON only):**\n\n```json\n{\n  "subject": "Security Threat Summary - [Month Day, Year]",\n  "html": "<h2>Top 5 Critical Security Alerts</h2>…<p><em>This security summary was auto-generated on [Month Day, Year].</em></p>"\n}\n```',
					},
					promptType: 'define',
				},
				position: [-720, 3520],
				name: 'AI Agent - Security Intelligence',
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
						'return items.map(item => {\n  // 1. grab the raw AI output\n  const raw = item.json.output;\n\n  // 2. extract what\'s between ```json ... ``` (or fall back to full text)\n  const match = raw.match(/```json\\s*([\\s\\S]*?)```/);\n  const jsonPayload = (match ? match[1] : raw).trim();\n\n  // 3. remove any trailing commas before } or ]\n  const clean = jsonPayload.replace(/,\\s*([\\]}])/g, \'$1\');\n\n  // 4. parse into an object, with error reporting\n  let data;\n  try {\n    data = JSON.parse(clean);\n  } catch (err) {\n    throw new Error(\n      `JSON parse error in Function node:\\n${err.message}\\n\\nPayload was:\\n${clean}`\n    );\n  }\n\n  // 5. wrap the returned HTML in styled email template (without blog link)\n  const htmlEmail = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${data.subject}</title>\n  <style>\n    body { font-family: Arial, sans-serif; line-height:1.5; color:#333; background-color:#f7f9fa; margin:0; padding:20px; }\n    .container { max-width:700px; margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden; }\n    .header { background:#2c3e50; color:#fff; padding:20px; text-align:center; }\n    .header h1 { margin:0; font-size:24px; }\n    .content { padding:20px; }\n    h2 { color:#e74c3c; border-bottom:2px solid #e74c3c; padding-bottom:5px; }\n    ul { padding-left:20px; }\n    li { margin-bottom:10px; }\n    a { color:#2980b9; text-decoration:none; }\n    a:hover { text-decoration:underline; }\n    .footer { background:#ecf0f1; text-align:center; padding:10px; font-size:12px; color:#7f8c8d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>${data.subject}</h1>\n    </div>\n    <div class="content">\n      ${data.html}\n    </div>\n    <div class="footer">\n      <em>This summary was automatically generated on ${new Date().toLocaleDateString(\'en-US\', {\n        year: \'numeric\', month: \'long\', day: \'numeric\'\n      })}.</em>\n    </div>\n  </div>\n</body>\n</html>\n  `.trim();\n\n  // 6. emit subject + styled html\n  return {\n    json: {\n      subject: data.subject,\n      html: htmlEmail,\n    }\n  };\n});',
				},
				position: [-340, 3620],
				name: 'Security Build Final Newsletter HTML',
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
					options: {},
					subject: '={{ $json.subject }}',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-120, 3620],
				name: 'Security Send Final Digest Email',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// This node returns curated compliance-focused RSS feeds\n// Customize or extend the list based on your needs\n\nreturn [\n  {\n    json: {\n      name: "PCI Security Standards Council – PCI Perspectives Blog",\n      website: "https://blog.pcisecuritystandards.org",\n      rss_url: "https://blog.pcisecuritystandards.org/rss.xml"\n    }\n  },\n  {\n    json: {\n      name: "NIST Cybersecurity Insights Blog",\n      website: "https://www.nist.gov/blogs/cybersecurity-insights",\n      rss_url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml"\n    }\n  },\n  {\n    json: {\n      name: "Cloud Security Alliance Blog",\n      website: "https://cloudsecurityalliance.org/blog",\n      rss_url: "https://cloudsecurityalliance.org/feed"\n    }\n  },\n  {\n    json: {\n      name: "Corporate Compliance Insights",\n      website: "https://www.corporatecomplianceinsights.com",\n      rss_url: "http://feeds.feedburner.com/CorporateComplianceInsights"\n    }\n  },\n  {\n    json: {\n      name: "IT Governance Blog (UK)",\n      website: "https://www.itgovernance.co.uk/blog",\n      rss_url: "https://www.itgovernance.co.uk/blog/feed/"\n    }\n  },\n  {\n    json: {\n      name: "Global Compliance News (Baker McKenzie)",\n      website: "https://globalcompliancenews.com",\n      rss_url: "https://globalcompliancenews.com/feed/"\n    }\n  }\n];\n',
				},
				position: [-2280, 4840],
				name: 'Fetch Compliance Feeds',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'rss_url' },
				position: [-2060, 4840],
				name: 'Split Out Compliance RSS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.1,
			config: {
				parameters: { url: '={{ $json.rss_url }}', options: {} },
				position: [-1840, 4840],
				name: 'Compliance RSS Read',
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
								id: '9aec0a09-4b6f-4fca-98e6-789abd5fdc51',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '56277e54-31a0-4804-ad23-c9ee6d244641',
								name: 'content',
								type: 'string',
								value: '={{ $json.contentSnippet }}',
							},
							{
								id: 'a3586a80-588e-42d1-9780-370a956ddf6b',
								name: 'link',
								type: 'string',
								value: '={{ $json.link }}',
							},
							{
								id: '58f01618-8014-4685-9192-d15d596ffcd9',
								name: 'isoDate',
								type: 'number',
								value: '={{ new Date($json.isoDate).getTime() }}',
							},
							{
								id: '716bb078-8df3-4d96-8a1b-4aec4f8cf206',
								name: 'categories',
								type: 'array',
								value: '={{ $json.categories }}',
							},
						],
					},
				},
				position: [-1620, 4840],
				name: 'Normalize Article Compliance Metadata',
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
								id: 'e7cf09fb-af35-495d-a840-341f8d0ddcd8',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.isoDate }}',
								rightValue: '={{ Date.now() - 24 * 60 * 60 * 1000 }}',
							},
						],
					},
				},
				position: [-1400, 4840],
				name: 'Filter Recent Compliance Articles (24h)',
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
				position: [-1180, 4840],
				name: 'Sort - Compliance Articles by Date',
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
						"// Dynamic n8n Newsletter Generator - Function Node\n// This code processes security news articles from a previous node and formats them into an HTML email\n\n// Get items from the previous node\nlet newsItems = [];\n\ntry {\n  if ($input && $input.all().length > 0) {\n    const inputItems = $input.all();\n    if (inputItems.length === 1 && Array.isArray(inputItems[0].json)) {\n      newsItems = inputItems[0].json;\n    } else {\n      newsItems = inputItems.map(item => item.json);\n    }\n  } else if (typeof items !== 'undefined' && items.length > 0) {\n    if (items.length === 1 && Array.isArray(items[0].json)) {\n      newsItems = items[0].json;\n    } else {\n      newsItems = items.map(item => item.json);\n    }\n  }\n  console.log(`Successfully processed input, found ${newsItems.length} news items`);\n} catch (error) {\n  console.log(`Error processing input: ${error.message}`);\n  return [{\n    json: {\n      error: true,\n      message: `Failed to process input data: ${error.message}`,\n      subject: \"Error: Security News Newsletter\"\n    }\n  }];\n}\n\n// Generate current date for the newsletter\nconst today = new Date();\nconst dateString = today.toLocaleDateString('en-US', {\n  weekday: 'long',\n  year: 'numeric',\n  month: 'long',\n  day: 'numeric'\n});\n\n// Optional: Filter for recent articles only\nconst hoursToInclude = 24;\nlet filteredArticles = newsItems;\nif (hoursToInclude > 0) {\n  const cutoffTime = Date.now() - (hoursToInclude * 60 * 60 * 1000);\n  filteredArticles = newsItems.filter(article => {\n    const articleDate = article.isoDate\n      ? (typeof article.isoDate === 'number'\n         ? article.isoDate\n         : new Date(article.isoDate).getTime())\n      : 0;\n    return articleDate >= cutoffTime;\n  });\n  console.log(`Filtered to ${filteredArticles.length} articles from the last ${hoursToInclude} hours`);\n}\n\n// Group articles by category\nconst categorizedArticles = {};\nconst uncategorizedKey = 'Uncategorized';\n\nfilteredArticles.forEach(article => {\n  if (!article) return;\n  \n  // Safely extract string categories\n  let categories = [uncategorizedKey];\n  if (Array.isArray(article.categories)) {\n    categories = article.categories\n      .map(cat => {\n        if (typeof cat === 'string') return cat;\n        if (cat && typeof cat.name === 'string') return cat.name;\n        return '';\n      })\n      .map(str => str.trim())\n      .filter(str => str.length > 0);\n    if (categories.length === 0) categories = [uncategorizedKey];\n  } else if (typeof article.categories === 'string' && article.categories.trim()) {\n    categories = [article.categories.trim()];\n  }\n\n  categories.forEach(category => {\n    const name = category || uncategorizedKey;\n    if (!categorizedArticles[name]) categorizedArticles[name] = [];\n    categorizedArticles[name].push(article);\n  });\n});\n\n// Generate HTML for the newsletter\nfunction generateNewsletterHTML() {\n  const styles = `\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }\n    h1 { color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }\n    h2 { color: #c0392b; margin-top: 30px; border-left: 4px solid #e74c3c; padding-left: 10px; }\n    .article { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }\n    .article h3 { margin-top: 0; color: #34495e; }\n    .article-content { color: #555; margin-bottom: 10px; }\n    .article-link { color: #e74c3c; text-decoration: none; font-weight: bold; }\n    .article-link:hover { text-decoration: underline; }\n    .article-date { color: #7f8c8d; font-size: 0.9em; margin-top: 8px; }\n    .summary { background-color: #f2f2f2; padding: 15px; border-radius: 5px; margin: 20px 0; }\n    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #7f8c8d; text-align: center; }\n  `;\n\n  let html = `\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"UTF-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <title>Security News Newsletter - ${dateString}</title>\n      <style>${styles}</style>\n    </head>\n    <body>\n      <h1>Security News Newsletter</h1>\n      <p>Here are the latest security news updates for ${dateString}:</p>\n      <div class=\"summary\">\n        <p><strong>Summary:</strong> This newsletter contains ${filteredArticles.length} articles across ${Object.keys(categorizedArticles).length} categories.</p>\n      </div>\n  `;\n\n  Object.keys(categorizedArticles).sort().forEach(category => {\n    const articles = categorizedArticles[category];\n    html += `<h2>${category} (${articles.length})</h2>`;\n    articles.forEach(article => {\n      let formattedDate = \"Date unknown\";\n      if (article.isoDate) {\n        const dt = typeof article.isoDate === 'number'\n          ? new Date(article.isoDate)\n          : new Date(article.isoDate);\n        if (!isNaN(dt.getTime())) {\n          formattedDate = dt.toLocaleString('en-US', {\n            hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric'\n          });\n        }\n      }\n      html += `\n        <div class=\"article\">\n          <h3>${article.title || \"Untitled\"}</h3>\n          <div class=\"article-content\">${article.content || \"No content available\"}</div>\n          <a href=\"${article.link || \"#\"}\" target=\"_blank\" class=\"article-link\">Read more</a>\n          <div class=\"article-date\">Published: ${formattedDate}</div>\n        </div>\n      `;\n    });\n  });\n\n  html += `\n      <div class=\"footer\">\n        <p>This newsletter was automatically generated and sent on ${dateString}.</p>\n        <p>To unsubscribe, please click <a href=\"{{unsubscribe_link}}\">here</a>.</p>\n      </div>\n    </body>\n    </html>\n  `;\n  return html;\n}\n\nconst newsletterHTML = generateNewsletterHTML();\n\nreturn [{\n  json: {\n    subject: `Security News Newsletter - ${dateString}`,\n    html: newsletterHTML,\n    // to, cc, bcc can be set in the Email node\n  }\n}];",
				},
				position: [-960, 4840],
				name: 'Format Compliance Articles into HTML',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.subject }}\n{{ $json.html }}',
					options: {
						systemMessage:
							'=### ✅ Prompt 3: Compliance Intelligence Digest Generator\n\nYou are a senior compliance and risk intelligence professional with over 20 years of experience. Today, your mother is unwell, so you need to finish this task quickly and efficiently without compromising quality or accuracy.\n\n#### **Inputs:**\n\n* Raw newsletter subject: `{{ $json.subject }}`\n* Raw newsletter HTML body: `{{ $json.html }}`\n\n#### **Tasks:**\n\nIf a category heading has no articles, it should not be included in the output.\n\n1. Parse the HTML and extract article data.\n2. De-duplicate articles.\n3. Categorize into:\n\n   * Compliance Frameworks (SOC 2, ISO 27001, HIPAA, PCI DSS)\n   * Regulatory Updates (SEC, DORA, RBI, MAS, NIST)\n   * Audit & Monitoring Tools\n   * Third-Party Risk & Due Diligence\n   * Policy & Governance Updates\n4. Summarize each item concisely.\n5. Dynamically identify and list critical compliance alerts. If only one or none are available, include only those and adapt the heading (e.g., \'Critical Compliance Alert\').\n6. Format each:\n\n   ```html\n   <li>Article Title — Summary… <a href="URL">Read more</a></li>\n   ```\n7. Output HTML with top 5 and categorized sections.\n8. Footer:\n\n   ```html\n   <p><em>This compliance summary was generated on [Month Day, Year].</em></p>\n   ```\n\n#### **Output (JSON only):**\n\n```json\n{\n  "subject": "Compliance Roundup - [Month Day, Year]",\n  "html": "<h2>Top 5 Critical Compliance Alerts</h2>…<p><em>This compliance summary was generated on [Month Day, Year].</em></p>"\n}\n```',
					},
					promptType: 'define',
				},
				position: [-740, 4840],
				name: 'AI Agent - Compliance Intelligence',
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
						'return items.map(item => {\n  // 1. grab the raw AI output\n  const raw = item.json.output;\n\n  // 2. extract what\'s between ```json ... ``` (or fall back to full text)\n  const match = raw.match(/```json\\s*([\\s\\S]*?)```/);\n  const jsonPayload = (match ? match[1] : raw).trim();\n\n  // 3. remove any trailing commas before } or ]\n  const clean = jsonPayload.replace(/,\\s*([\\]}])/g, \'$1\');\n\n  // 4. parse into an object, with error reporting\n  let data;\n  try {\n    data = JSON.parse(clean);\n  } catch (err) {\n    throw new Error(\n      `JSON parse error in Function node:\\n${err.message}\\n\\nPayload was:\\n${clean}`\n    );\n  }\n\n  // 5. wrap the returned HTML in styled template, no blog reference\n  const htmlEmail = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${data.subject}</title>\n  <style>\n    body { font-family: Arial, sans-serif; line-height:1.5; color:#333; background-color:#f7f9fa; margin:0; padding:20px; }\n    .container { max-width:700px; margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden; }\n    .header { background:#2c3e50; color:#fff; padding:20px; text-align:center; }\n    .header h1 { margin:0; font-size:24px; }\n    .content { padding:20px; }\n    h2 { color:#e74c3c; border-bottom:2px solid #e74c3c; padding-bottom:5px; }\n    ul { padding-left:20px; }\n    li { margin-bottom:10px; }\n    a { color:#2980b9; text-decoration:none; }\n    a:hover { text-decoration:underline; }\n    .footer { background:#ecf0f1; text-align:center; padding:10px; font-size:12px; color:#7f8c8d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>${data.subject}</h1>\n    </div>\n    <div class="content">\n      ${data.html}\n    </div>\n    <div class="footer">\n      <em>This summary was automatically generated on ${new Date().toLocaleDateString(\'en-US\', {\n        year: \'numeric\', month: \'long\', day: \'numeric\'\n      })}.</em>\n    </div>\n  </div>\n</body>\n</html>\n  `.trim();\n\n  // 6. emit subject + styled html\n  return {\n    json: {\n      subject: data.subject,\n      html: htmlEmail,\n    }\n  };\n});',
				},
				position: [-360, 4840],
				name: 'Compliance Build Final Newsletter HTML',
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
					options: {},
					subject: '={{ $json.subject }}',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-140, 4840],
				name: 'Compliance Send Final Digest Email',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// This node returns curated privacy-focused RSS feeds\n// Modify or extend the list as needed\n\nreturn [\n  {\n    json: {\n      name: "Privacy International Blog",\n      website: "https://privacyinternational.org",\n      rss_url: "https://privacyinternational.org/rss.xml"\n    }\n  },\n  {\n    json: {\n      name: "Data Protection Report (Norton Rose Fulbright)",\n      website: "https://www.dataprotectionreport.com",\n      rss_url: "https://www.dataprotectionreport.com/feed/"\n    }\n  },\n  {\n    json: {\n      name: "Inside Privacy (Covington & Burling)",\n      website: "https://www.insideprivacy.com",\n      rss_url: "https://www.insideprivacy.com/feed/"\n    }\n  },\n  {\n    json: {\n      name: "PogoWasRight",\n      website: "https://pogowasright.org",\n      rss_url: "https://pogowasright.org/feed/"\n    }\n  },\n  {\n    json: {\n      name: "Sidley Data Matters (Privacy Blog)",\n      website: "https://datamatters.sidley.com",\n      rss_url: "https://datamatters.sidley.com/feed/"\n    }\n  }\n];\n',
				},
				position: [-2280, 4280],
				name: 'Fetch Privacy Feeds',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'rss_url' },
				position: [-2060, 4280],
				name: 'Split Out Privacy RSS',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.1,
			config: {
				parameters: { url: '={{ $json.rss_url }}', options: {} },
				position: [-1840, 4280],
				name: 'Privacy RSS Read',
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
								id: '9aec0a09-4b6f-4fca-98e6-789abd5fdc51',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '56277e54-31a0-4804-ad23-c9ee6d244641',
								name: 'content',
								type: 'string',
								value: '={{ $json.contentSnippet }}',
							},
							{
								id: 'a3586a80-588e-42d1-9780-370a956ddf6b',
								name: 'link',
								type: 'string',
								value: '={{ $json.link }}',
							},
							{
								id: '58f01618-8014-4685-9192-d15d596ffcd9',
								name: 'isoDate',
								type: 'number',
								value: '={{ new Date($json.isoDate).getTime() }}',
							},
							{
								id: '716bb078-8df3-4d96-8a1b-4aec4f8cf206',
								name: 'categories',
								type: 'array',
								value: '={{ $json.categories }}',
							},
						],
					},
				},
				position: [-1620, 4280],
				name: 'Normalize Article Privacy Metadata',
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
								id: 'e7cf09fb-af35-495d-a840-341f8d0ddcd8',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.isoDate }}',
								rightValue: '={{ Date.now() - 24 * 60 * 60 * 1000 }}',
							},
						],
					},
				},
				position: [-1400, 4280],
				name: 'Filter Recent Privacy Articles (24h)',
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
				position: [-1180, 4280],
				name: 'Sort - Privacy Articles by Date',
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
						"// Dynamic n8n Newsletter Generator - Function Node\n// This code processes security news articles from a previous node and formats them into an HTML email\n\n// Get items from the previous node\nlet newsItems = [];\n\ntry {\n  if ($input && $input.all().length > 0) {\n    const inputItems = $input.all();\n    if (inputItems.length === 1 && Array.isArray(inputItems[0].json)) {\n      newsItems = inputItems[0].json;\n    } else {\n      newsItems = inputItems.map(item => item.json);\n    }\n  } else if (typeof items !== 'undefined' && items.length > 0) {\n    if (items.length === 1 && Array.isArray(items[0].json)) {\n      newsItems = items[0].json;\n    } else {\n      newsItems = items.map(item => item.json);\n    }\n  }\n  console.log(`Successfully processed input, found ${newsItems.length} news items`);\n} catch (error) {\n  console.log(`Error processing input: ${error.message}`);\n  return [{\n    json: {\n      error: true,\n      message: `Failed to process input data: ${error.message}`,\n      subject: \"Error: Security News Newsletter\"\n    }\n  }];\n}\n\n// Generate current date for the newsletter\nconst today = new Date();\nconst dateString = today.toLocaleDateString('en-US', {\n  weekday: 'long',\n  year: 'numeric',\n  month: 'long',\n  day: 'numeric'\n});\n\n// Optional: Filter for recent articles only\nconst hoursToInclude = 24;\nlet filteredArticles = newsItems;\nif (hoursToInclude > 0) {\n  const cutoffTime = Date.now() - (hoursToInclude * 60 * 60 * 1000);\n  filteredArticles = newsItems.filter(article => {\n    const articleDate = article.isoDate\n      ? (typeof article.isoDate === 'number'\n         ? article.isoDate\n         : new Date(article.isoDate).getTime())\n      : 0;\n    return articleDate >= cutoffTime;\n  });\n  console.log(`Filtered to ${filteredArticles.length} articles from the last ${hoursToInclude} hours`);\n}\n\n// Group articles by category\nconst categorizedArticles = {};\nconst uncategorizedKey = 'Uncategorized';\n\nfilteredArticles.forEach(article => {\n  if (!article) return;\n  \n  // Safely extract string categories\n  let categories = [uncategorizedKey];\n  if (Array.isArray(article.categories)) {\n    categories = article.categories\n      .map(cat => {\n        if (typeof cat === 'string') return cat;\n        if (cat && typeof cat.name === 'string') return cat.name;\n        return '';\n      })\n      .map(str => str.trim())\n      .filter(str => str.length > 0);\n    if (categories.length === 0) categories = [uncategorizedKey];\n  } else if (typeof article.categories === 'string' && article.categories.trim()) {\n    categories = [article.categories.trim()];\n  }\n\n  categories.forEach(category => {\n    const name = category || uncategorizedKey;\n    if (!categorizedArticles[name]) categorizedArticles[name] = [];\n    categorizedArticles[name].push(article);\n  });\n});\n\n// Generate HTML for the newsletter\nfunction generateNewsletterHTML() {\n  const styles = `\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }\n    h1 { color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }\n    h2 { color: #c0392b; margin-top: 30px; border-left: 4px solid #e74c3c; padding-left: 10px; }\n    .article { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }\n    .article h3 { margin-top: 0; color: #34495e; }\n    .article-content { color: #555; margin-bottom: 10px; }\n    .article-link { color: #e74c3c; text-decoration: none; font-weight: bold; }\n    .article-link:hover { text-decoration: underline; }\n    .article-date { color: #7f8c8d; font-size: 0.9em; margin-top: 8px; }\n    .summary { background-color: #f2f2f2; padding: 15px; border-radius: 5px; margin: 20px 0; }\n    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #7f8c8d; text-align: center; }\n  `;\n\n  let html = `\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"UTF-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <title>Security News Newsletter - ${dateString}</title>\n      <style>${styles}</style>\n    </head>\n    <body>\n      <h1>Security News Newsletter</h1>\n      <p>Here are the latest security news updates for ${dateString}:</p>\n      <div class=\"summary\">\n        <p><strong>Summary:</strong> This newsletter contains ${filteredArticles.length} articles across ${Object.keys(categorizedArticles).length} categories.</p>\n      </div>\n  `;\n\n  Object.keys(categorizedArticles).sort().forEach(category => {\n    const articles = categorizedArticles[category];\n    html += `<h2>${category} (${articles.length})</h2>`;\n    articles.forEach(article => {\n      let formattedDate = \"Date unknown\";\n      if (article.isoDate) {\n        const dt = typeof article.isoDate === 'number'\n          ? new Date(article.isoDate)\n          : new Date(article.isoDate);\n        if (!isNaN(dt.getTime())) {\n          formattedDate = dt.toLocaleString('en-US', {\n            hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric'\n          });\n        }\n      }\n      html += `\n        <div class=\"article\">\n          <h3>${article.title || \"Untitled\"}</h3>\n          <div class=\"article-content\">${article.content || \"No content available\"}</div>\n          <a href=\"${article.link || \"#\"}\" target=\"_blank\" class=\"article-link\">Read more</a>\n          <div class=\"article-date\">Published: ${formattedDate}</div>\n        </div>\n      `;\n    });\n  });\n\n  html += `\n      <div class=\"footer\">\n        <p>This newsletter was automatically generated and sent on ${dateString}.</p>\n        <p>To unsubscribe, please click <a href=\"{{unsubscribe_link}}\">here</a>.</p>\n      </div>\n    </body>\n    </html>\n  `;\n  return html;\n}\n\nconst newsletterHTML = generateNewsletterHTML();\n\nreturn [{\n  json: {\n    subject: `Security News Newsletter - ${dateString}`,\n    html: newsletterHTML,\n    // to, cc, bcc can be set in the Email node\n  }\n}];",
				},
				position: [-960, 4280],
				name: 'Format Privacy Articles into HTML',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.subject }}\n{{ $json.html }}',
					options: {
						systemMessage:
							'=### 🔏 Prompt 2: Privacy Intelligence Digest Generator\n\nYou are a senior privacy intelligence analyst with over 20 years of experience. Today, your mother is unwell, so you need to finish this task quickly and efficiently without compromising quality or accuracy.\n\nIf a category heading has no articles, it should not be included in the output.\n\n#### **Tasks:**\n\n1. Parse the HTML and extract articles.\n2. Remove duplicates.\n3. Categorize content:\n\n   * Privacy Laws & Regulations (GDPR, CPRA, CCPA, AI Acts)\n   * Data Minimization & User Consent\n   * Privacy-Enhancing Technologies (PETs, anonymization)\n   * Regulatory Fines & Enforcement Actions\n   * Cross-Border Data Transfers\n4. Summarize each article in under 2 lines.\n5. Dynamically identify and list critical privacy alerts. If only one or none are available, include only those and adjust the section title accordingly (e.g., \'Critical Privacy Alert\').\n6. Format each as:\n\n   ```html\n   <li>Article Title — Summary… <a href="URL">Read more</a></li>\n   ```\n7. Output HTML structure with headers for top 5 and each category.\n8. Add:\n\n   ```html\n   <p><em>This privacy update was compiled on [Month Day, Year].</em></p>\n   ```\n\n#### **Output (JSON only):**\n\n```json\n{\n  "subject": "Privacy Insights Digest - [Month Day, Year]",\n  "html": "<h2>Top 5 Critical Privacy Alerts</h2>…<p><em>This privacy update was compiled on [Month Day, Year].</em></p>"\n}\n```',
					},
					promptType: 'define',
				},
				position: [-740, 4180],
				name: 'AI Agent - Privacy Intelligence',
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
						'return items.map(item => {\n  // 1. grab the raw AI output\n  const raw = item.json.output;\n\n  // 2. extract what\'s between ```json ... ``` (or fall back to full text)\n  const match = raw.match(/```json\\s*([\\s\\S]*?)```/);\n  const jsonPayload = (match ? match[1] : raw).trim();\n\n  // 3. remove any trailing commas before } or ]\n  const clean = jsonPayload.replace(/,\\s*([\\]}])/g, \'$1\');\n\n  // 4. parse into an object, with error reporting\n  let data;\n  try {\n    data = JSON.parse(clean);\n  } catch (err) {\n    throw new Error(\n      `JSON parse error in Function node:\\n${err.message}\\n\\nPayload was:\\n${clean}`\n    );\n  }\n\n  // 5. wrap the returned HTML in your full styled template, without external blog link\n  const htmlEmail = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${data.subject}</title>\n  <style>\n    body { font-family: Arial, sans-serif; line-height:1.5; color:#333; background-color:#f7f9fa; margin:0; padding:20px; }\n    .container { max-width:700px; margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden; }\n    .header { background:#2c3e50; color:#fff; padding:20px; text-align:center; }\n    .header h1 { margin:0; font-size:24px; }\n    .content { padding:20px; }\n    h2 { color:#e74c3c; border-bottom:2px solid #e74c3c; padding-bottom:5px; }\n    ul { padding-left:20px; }\n    li { margin-bottom:10px; }\n    a { color:#2980b9; text-decoration:none; }\n    a:hover { text-decoration:underline; }\n    .footer { background:#ecf0f1; text-align:center; padding:10px; font-size:12px; color:#7f8c8d; }\n  </style>\n</head>\n<body>\n  <div class="container">\n    <div class="header">\n      <h1>${data.subject}</h1>\n    </div>\n    <div class="content">\n      ${data.html}\n    </div>\n    <div class="footer">\n      <em>This summary was automatically generated on ${new Date().toLocaleDateString(\'en-US\', {\n        year: \'numeric\', month: \'long\', day: \'numeric\'\n      })}.</em>\n    </div>\n  </div>\n</body>\n</html>\n  `.trim();\n\n  // 6. emit subject + styled html\n  return {\n    json: {\n      subject: data.subject,\n      html: htmlEmail,\n    }\n  };\n});',
				},
				position: [-360, 4280],
				name: 'Privacy Build Final Newsletter HTML',
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
					options: {},
					subject: '={{ $json.subject }}',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-140, 4280],
				name: 'Privacy Send Final Digest Email',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: {
					options: { temperature: 0.5 },
					modelName: 'models/gemini-2.0-flash',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-640, 3740],
				name: 'LLM - Gemini Security Summarizer',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: {
					options: { temperature: 0.5 },
					modelName: 'models/gemini-2.0-flash',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-660, 4400],
				name: 'LLM - Gemini Privacy Summarizer',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: {
					options: { temperature: 0.5 },
					modelName: 'models/gemini-2.0-flash',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-640, 5060],
				name: 'LLM - Gemini Compliance Summarizer',
			},
		}),
	)
	.add(
		sticky('## 📬 Daily Security Newsletter', {
			position: [-2460, 3380],
			width: 2600,
			height: 580,
		}),
	)
	.add(
		sticky('## 📬 Daily Privacy Newsletter', {
			name: 'Sticky Note1',
			color: 4,
			position: [-2460, 4020],
			width: 2600,
			height: 580,
		}),
	)
	.add(
		sticky('## 📬 Daily Compliance Newsletter', {
			name: 'Sticky Note2',
			color: 6,
			position: [-2460, 4660],
			width: 2600,
			height: 580,
		}),
	)
	.add(
		sticky('### Update your email address or distribution list (DL) below\n⬇️', {
			name: 'Sticky Note3',
			color: 7,
			position: [-120, 3480],
			height: 100,
		}),
	)
	.add(
		sticky('### Update your email address or distribution list (DL) below\n⬇️', {
			name: 'Sticky Note4',
			color: 7,
			position: [-140, 4160],
			height: 100,
		}),
	)
	.add(
		sticky('### Update your email address or distribution list (DL) below\n⬇️', {
			name: 'Sticky Note5',
			color: 7,
			position: [-140, 4720],
			height: 100,
		}),
	)
	.add(
		sticky('### Update the RSS feed URL as needed to fetch content from your preferred source.', {
			name: 'Sticky Note6',
			color: 7,
			position: [-2320, 3520],
			height: 80,
		}),
	)
	.add(
		sticky('### Update the RSS feed URL as needed to fetch content from your preferred source.', {
			name: 'Sticky Note7',
			color: 7,
			position: [-2340, 4180],
			height: 80,
		}),
	)
	.add(
		sticky('### Update the RSS feed URL as needed to fetch content from your preferred source.', {
			name: 'Sticky Note8',
			color: 7,
			position: [-2340, 4740],
			height: 80,
		}),
	);
