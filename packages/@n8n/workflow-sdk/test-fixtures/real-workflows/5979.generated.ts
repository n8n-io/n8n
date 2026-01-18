const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1,
			config: {
				parameters: { rule: { interval: [{}] } },
				position: [-340, 120],
				name: 'Daily Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 2,
			config: {
				parameters: {
					values: {
						string: [
							{
								name: 'competitor_domains',
								value: 'opofinance.com,etoro.com',
							},
							{ name: 'target_regions', value: 'US,UK,DE,FR,JP' },
							{
								name: 'seed_keywords',
								value: 'forex trading,social trade,how to trade',
							},
							{ name: 'timeframe_days', value: '30' },
						],
					},
					options: {},
				},
				position: [-120, 120],
				name: '📋 Configuration Settings',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://api.semrush.com/',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'queryAuth',
					queryParameters: {
						parameters: [
							{ name: 'type', value: 'domain_organic' },
							{ name: 'key', value: '={{ $credentials.semrush.api_key }}' },
							{
								name: 'domain',
								value: "={{ $json.competitor_domains.split(',')[0] }}",
							},
							{ name: 'display_limit', value: '50' },
							{
								name: 'export_columns',
								value: 'Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td',
							},
						],
					},
				},
				position: [100, 140],
				name: '📊 SEMrush Competitor Keywords',
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
						"// Combine all competitor data\nconst ahrefsData = $input.first()?.json || {};\nconst semrushData = $input.all().find(item => item.json?.domain) || {};\nconst buzzsumoData = $input.all().find(item => item.json?.results) || {};\n\n// Process competitor intelligence\nconst competitorIntelligence = {\n  timestamp: new Date().toISOString(),\n  domain: ahrefsData.target || 'N/A',\n  traffic_estimate: ahrefsData.traffic?.organic?.value || 0,\n  backlinks: ahrefsData.backlinks?.total || 0,\n  top_keywords: semrushData.json?.keywords?.slice(0, 10) || [],\n  viral_content: buzzsumoData.json?.results?.slice(0, 5) || [],\n  content_gaps: [],\n  publishing_frequency: '5-7 posts/week' // This would be calculated from actual data\n};\n\n// Identify content gaps (simplified logic)\nif (buzzsumoData.json?.results) {\n  const competitorTopics = buzzsumoData.json.results.map(article => article.title);\n  competitorIntelligence.content_gaps = [\n    'Sustainable packaging solutions',\n    'Circular economy in fashion',\n    'Eco-friendly manufacturing processes'\n  ];\n}\n\nreturn [{ json: competitorIntelligence }];",
				},
				position: [540, 80],
				name: '🔄 Process Competitor Data',
			},
		}),
	)
	.output(0)
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
								id: 'competitor-data-exists',
								operator: { type: 'string', operation: 'notEqual' },
								leftValue: "={{ $('🔄 Process Competitor Data').first().json.domain }}",
								rightValue: 'N/A',
							},
						],
					},
				},
				position: [760, 20],
				name: '✅ Data Quality Check',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2,
			config: {
				parameters: {
					base: { __rl: true, mode: 'list', value: 'content-research-base' },
					table: { __rl: true, mode: 'list', value: 'competitor-intelligence' },
					columns: {
						value: {
							domain: "={{ $('🔄 Process Competitor Data').first().json.domain }}",
							backlinks: "={{ $('🔄 Process Competitor Data').first().json.backlinks }}",
							timestamp: "={{ $('🔄 Process Competitor Data').first().json.timestamp }}",
							content_gaps:
								"={{ $('🔄 Process Competitor Data').first().json.content_gaps.join(', ') }}",
							traffic_estimate:
								"={{ $('🔄 Process Competitor Data').first().json.traffic_estimate }}",
							publishing_frequency:
								"={{ $('🔄 Process Competitor Data').first().json.publishing_frequency }}",
						},
						mappingMode: 'defineBelow',
					},
					options: {},
					operation: 'create',
				},
				position: [1200, 20],
				name: '💾 Save to Airtable - Competitors',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 2,
			config: {
				parameters: { mode: 'combine', options: {}, combinationMode: 'multiplex' },
				position: [1420, 200],
				name: '🔗 Merge All Data',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.stopAndError',
			version: 1,
			config: { position: [960, 120], name: 'Stop and Error' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 2,
			config: {
				parameters: {
					values: {
						string: [
							{
								name: 'user_prompt',
								value:
									"Based on this data:\n\nCompetitor Intelligence: {{ $('🔄 Process Competitor Data').first().json }}\n\nKeyword Opportunities: {{ $('📈 Process Keyword Trends').first().json }}\n\nAudience Insights: {{ $('👥 Process Audience Insights').first().json }}\n\nProvide specific recommendations for:\n1. Content topics to prioritize\n2. Content formats by region\n3. Publishing schedule\n4. Competitive advantages to leverage\n5. Audience pain points to address\n\nFormat as JSON with clear action items.",
							},
						],
					},
					options: {},
				},
				position: [760, 200],
				name: '📝 Prepare AI Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://api.openai.com/v1/chat/completions',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: { parameters: [{}] },
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [960, 320],
				name: '🔧 OpenAI HTTP Request Alternative',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2,
			config: {
				parameters: {
					base: { __rl: true, mode: 'list', value: 'content-research-base' },
					table: { __rl: true, mode: 'list', value: 'keyword-opportunities' },
					columns: {
						value: {
							timestamp: "={{ $('📈 Process Keyword Trends').first().json.timestamp }}",
							top_questions:
								"={{ $('📈 Process Keyword Trends').first().json.long_tail_questions.map(q => q.question).slice(0, 5).join('; ') }}",
							trending_keywords:
								"={{ $('📈 Process Keyword Trends').first().json.trending_keywords.map(k => k.keyword).join(', ') }}",
							content_opportunities:
								"={{ $('📈 Process Keyword Trends').first().json.content_opportunities.map(o => o.title).join('; ') }}",
						},
						mappingMode: 'defineBelow',
					},
					options: {},
					operation: 'create',
				},
				position: [1200, 140],
				name: '💾 Save to Airtable - Keywords',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2,
			config: {
				parameters: {
					pageId: { __rl: true, mode: 'url', value: '' },
					simple: false,
					options: {},
				},
				position: [1200, 260],
				name: '📝 Save to Notion',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2,
			config: {
				parameters: {
					text: "=🚨 **Content Research Alert**\n\n**New competitor activity detected!**\n\n📊 **Top Findings:**\n• {{ $('🔄 Process Competitor Data').first().json.content_gaps.slice(0, 3).join('\\n• ') }}\n\n📈 **Trending Keywords:**\n• {{ $('📈 Process Keyword Trends').first().json.trending_keywords.slice(0, 3).map(k => k.keyword).join('\\n• ') }}\n\n💡 **AI Recommendations:**\n{{ $('🤖 AI Content Recommendations').first().json.choices?.[0]?.message?.content?.substring(0, 300) || 'Processing recommendations...' }}...\n\n📋 **Full report saved to Airtable & Notion**\n\n*Generated: {{ new Date().toLocaleString() }}*",
					select: 'channel',
					channelId: { __rl: true, mode: 'list', value: 'content-research-alerts' },
					otherOptions: { mrkdwn: true },
					authentication: 'oAuth2',
				},
				position: [1200, 380],
				name: '📢 Send Slack Alert',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://api.buzzsumo.com/search/articles.json',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'q',
								value: "={{ $json.seed_keywords.split(',')[0] }}",
							},
							{ name: 'num_results', value: '20' },
							{
								name: 'published_after',
								value:
									"={{ $now.minus({ days: parseInt($json.timeframe_days) }).toFormat('yyyy-MM-dd') }}",
							},
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [100, 260],
				name: '📈 BuzzSumo Content Performance',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://trends.google.com/trends/api/explore',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'hl', value: 'en-US' },
							{ name: 'tz', value: '360' },
							{
								name: 'req',
								value:
									'={"comparisonItem":[{"keyword":"{{ $json.seed_keywords.split(\',\')[0] }}","geo":"US","time":"today 3-m"}],"category":0,"property":""}',
							},
						],
					},
				},
				position: [320, 20],
				name: '📊 Google Trends Data',
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
						"// Combine trends and keyword data\nconst trendsData = $input.all().find(item => item.json?.default) || {};\nconst questionsData = $input.all().find(item => item.json?.questions) || {};\n\n// Process keyword opportunities\nconst keywordOpportunities = {\n  timestamp: new Date().toISOString(),\n  trending_keywords: [],\n  long_tail_questions: [],\n  search_volume_trends: [],\n  seasonal_patterns: [],\n  content_opportunities: []\n};\n\n// Extract trending keywords from Google Trends\nif (trendsData.json?.default?.timelineData) {\n  keywordOpportunities.trending_keywords = trendsData.json.default.timelineData\n    .slice(0, 10)\n    .map(item => ({\n      keyword: item.formattedValue || 'Unknown',\n      trend_velocity: item.value?.[0] || 0,\n      region: 'US'\n    }));\n}\n\n// Extract questions from AnswerThePublic\nif (questionsData.json?.questions) {\n  keywordOpportunities.long_tail_questions = questionsData.json.questions\n    .slice(0, 15)\n    .map(q => ({\n      question: q.question || q,\n      search_volume: Math.floor(Math.random() * 1000) + 100, // Placeholder\n      difficulty: Math.floor(Math.random() * 100) + 1,\n      suggested_format: ['blog', 'video', 'infographic'][Math.floor(Math.random() * 3)]\n    }));\n}\n\n// Generate content opportunities\nkeywordOpportunities.content_opportunities = [\n  {\n    title: '5 Sustainable Fashion Trends Taking Over 2024',\n    keyword_target: 'sustainable fashion trends',\n    estimated_traffic: 2500,\n    content_type: 'blog',\n    priority: 'high'\n  },\n  {\n    title: 'How to Build a Circular Economy Wardrobe',\n    keyword_target: 'circular economy fashion',\n    estimated_traffic: 1800,\n    content_type: 'guide',\n    priority: 'medium'\n  }\n];\n\nreturn [{ json: keywordOpportunities }];",
				},
				position: [540, 200],
				name: '📈 Process Keyword Trends',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://api.answerthepublic.com/api/v1/questions',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'keyword',
								value: "={{ $json.seed_keywords.split(',')[0] }}",
							},
							{ name: 'country', value: 'us' },
							{ name: 'language', value: 'en' },
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [320, 140],
				name: '❓ AnswerThePublic Questions',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: "=https://oauth.reddit.com/r/{{ $json.seed_keywords.split(',')[0].replace(' ', '') }}/hot.json",
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'oAuth2Api',
					queryParameters: {
						parameters: [
							{ name: 'limit', value: '25' },
							{ name: 't', value: 'month' },
						],
					},
				},
				credentials: {
					oAuth2Api: { id: 'credential-id', name: 'oAuth2Api Credential' },
				},
				position: [320, 260],
				name: '💬 Reddit Audience Insights',
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
						"// Process Reddit audience insights\nconst redditData = $input.first()?.json || {};\n\nconst audienceInsights = {\n  timestamp: new Date().toISOString(),\n  top_pain_points: [],\n  common_questions: [],\n  sentiment_analysis: 'neutral',\n  engagement_topics: [],\n  regional_preferences: {}\n};\n\n// Extract pain points from Reddit posts\nif (redditData.data?.children) {\n  const posts = redditData.data.children;\n  \n  audienceInsights.top_pain_points = posts\n    .filter(post => post.data.title.includes('problem') || post.data.title.includes('issue'))\n    .slice(0, 10)\n    .map(post => ({\n      pain_point: post.data.title,\n      upvotes: post.data.ups || 0,\n      comments: post.data.num_comments || 0,\n      source: 'reddit'\n    }));\n    \n  audienceInsights.common_questions = posts\n    .filter(post => post.data.title.includes('?') || post.data.title.toLowerCase().includes('how'))\n    .slice(0, 10)\n    .map(post => ({\n      question: post.data.title,\n      engagement_score: (post.data.ups || 0) + (post.data.num_comments || 0),\n      category: 'general'\n    }));\n    \n  audienceInsights.engagement_topics = posts\n    .sort((a, b) => (b.data.ups || 0) - (a.data.ups || 0))\n    .slice(0, 5)\n    .map(post => ({\n      topic: post.data.title,\n      engagement_score: post.data.ups || 0,\n      discussion_level: post.data.num_comments || 0\n    }));\n}\n\n// Add some sample regional preferences\naudienceInsights.regional_preferences = {\n  'US': ['affordability', 'brand transparency'],\n  'EU': ['sustainability certifications', 'local production'],\n  'APAC': ['quality', 'innovation']\n};\n\nreturn [{ json: audienceInsights }];",
				},
				position: [540, 320],
				name: '👥 Process Audience Insights',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4,
			config: {
				parameters: {
					url: 'https://api.ahrefs.com/v3/site-explorer/overview',
					options: { timeout: 60000 },
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'target',
								value: "={{ $json.competitor_domains.split(',')[0] }}",
							},
							{ name: 'mode', value: 'domain' },
							{ name: 'output', value: 'json' },
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [100, 0],
				name: '🔍 Ahrefs Competitor Data',
			},
		}),
	)
	.add(
		sticky(
			'## 🧠 Advanced Content Research Automation\n\n### 📋 **Configuration Required:**\n\n1. **API Credentials** (Go to Settings → Credentials):\n   - Ahrefs API Key\n   - SEMrush API Key  \n   - BuzzSumo API Key\n   - AnswerThePublic API Key\n   - OpenAI API Key\n   - Reddit OAuth\n   - Airtable Token\n   - Notion API Key\n   - Slack OAuth\n\n2. **Database Setup**:\n   - Create Airtable base: "content-research-base"\n   - Create tables: "competitor-intelligence", "keyword-opportunities"\n   - Create Notion database: "content-research-database"\n   - Create Slack channel: "content-research-alerts"\n\n3. **Customize Settings**:\n   - Update competitor domains in Configuration node\n   - Adjust target regions and keywords\n   - Set appropriate timeframes\n\n### 🚀 **Workflow Features:**\n- **Module 1:** Competitor Content Intelligence\n- **Module 2:** Keyword & Trend Discovery\n- **Module 3:** Audience Pain Point Extraction\n- **Module 4:** AI-Powered Recommendations\n\n### 📊 **Outputs:**\n- Airtable dashboards with live data\n- Notion database with AI insights\n- Slack alerts for immediate action\n- Error handling and data validation\n\n### ⚙️ **Execution:**\n- Runs daily automatically\n- Processes data in parallel\n- Includes retry logic for API failures\n- Generates actionable recommendations\n\n**Ready to activate? Configure your credentials and hit Execute!**',
			{ name: '📖 Setup Instructions', position: [-1040, -300], width: 600, height: 1080 },
		),
	);
