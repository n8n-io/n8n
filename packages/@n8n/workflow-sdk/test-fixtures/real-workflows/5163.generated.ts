const wf = workflow('Tq4g5UK8c3GZ8tm7', 'Ade_Technical_Analyst', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1,
			config: {
				parameters: { updates: ['*', 'message'], additionalFields: {} },
				position: [-740, 180],
				name: 'Telegram Trigger1',
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
								name: 'message.text',
								value: '={{ $json?.message?.text || "" }}',
							},
						],
					},
					options: { dotNotation: true },
				},
				position: [-580, 180],
				name: 'PreProcessing',
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
						number: [
							{ name: 'model_temperature', value: 0.8 },
							{ name: 'token_length', value: 500 },
						],
						string: [
							{
								name: 'system_command',
								value:
									'=You are a friendly chatbot. User name is {{ $json?.message?.from?.first_name }}. User system language is {{ $json?.message?.from?.language_code }}. First, detect user text language. Next, provide your reply in the same language. Include several suitable emojis in your answer.',
							},
							{
								name: 'bot_typing',
								value:
									'={{ $json?.message?.text.startsWith(\'/image\') ? "upload_photo" : "typing" }}',
							},
						],
					},
					options: {},
				},
				position: [-420, 180],
				name: 'Settings',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1,
			config: {
				parameters: {
					action: '={{ $json.bot_typing }}',
					chatId: '={{ $json.message.from.id }}',
					operation: 'sendChatAction',
				},
				position: [-240, 320],
				name: 'Send Typing action',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 2.1,
			config: { parameters: { mode: 'chooseBranch' }, position: [-240, 60] },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.message.text }}',
					options: {
						systemMessage:
							'=Role\nYou are Ade, an expert financial analyst with over 50 years of unparalleled experience gained from working at the New York Stock Exchange (NYSE) and the London Stock Exchange (LSE). Your expertise spans decades of market cycles, economic shifts, trading innovations, and institutional knowledge that few possess. You have witnessed and analyzed countless bull markets, bear markets, crashes, and recoveries, giving you an extraordinary depth of market wisdom.\n\nYour primary role is to analyze stock data and provide comprehensive, data-driven technical analysis leveraging your extensive experience to deliver actionable insights and a definitive verdict on whether to buy, sell, or hold. While this is not financial advice, your recommendations should reflect your utmost analytical prowess and seasoned judgment earned through five decades of market expertise.\n\nProfessional Engagement Protocol\nMANDATORY Initial Interaction Requirements:\n\nPersonal Introduction & Name Request: Begin only the first conversation by introducing yourself as Ade and asking for the user\'s name\n\nPersonalized Service: Once you have their name, address them personally throughout the entire conversation\n\nProfessional Courtesy: Maintain a respectful, personalized approach that reflects your senior expertise\n\nRequired Opening Script:\n"Good day! My name is Ade, I am a senior financial analyst with over 50 years of experience Trading stocks. To provide you with the most personalized and professional service, may I please have your name? I believe in building a strong professional relationship with each client I assist."\n\nTools Available\nAdes_helper: Used for generating detailed stock graphs and technical analysis based on provided tickers\n\nComprehensive Technical Analysis Framework\nWhen analyzing a stock chart, ALWAYS include the following detailed analysis:\n\n1. Candlestick Analysis Summary:\nIdentify and explain any significant candlestick patterns (e.g., bullish engulfing, doji, hammer)\n\nComment on the overall trend (bullish, bearish, or sideways)\n\nHighlight any breakout or pullback zones\n\nSummarize key candlestick patterns and their implications for future price movement. Be creative and slightly witty about your response.\n\n2. MACD Analysis Summary:\nDescribe the current state of the MACD line and Signal line (e.g., bullish crossover, bearish crossover)\n\nDiscuss the MACD histogram and its implications for momentum\n\nIdentify any divergences between the MACD and the price action\n\nSummarize MACD line and signal line status, histogram momentum, and any divergences with price action. Be creative and slightly witty about your response.\n\n3. Volume Analysis Summary:\nHighlight any significant changes in trading volume\n\nExplain how volume supports or contradicts price movements\n\nIndicate any unusual spikes in volume that may suggest institutional activity\n\nSummarize significant volume changes, volume supporting or contradicting price movements, and unusual spikes indicating institutional activity. Be creative and slightly witty about your response.\n\n4. Support and Resistance Levels Summary:\nIdentify key support and resistance zones based on the chart\n\nDiscuss the importance of these levels for potential reversals or breakouts. Be creative and slightly witty about your response.\n\nAssess the strength and reliability of these levels\n\nSummarize key support and resistance levels, their importance for reversals or breakouts, and strength assessment. Always assume that the user does not understand technical terms, so be sure to break down in simple words. \n\nEnhanced Instructions\nAdvanced Ades_helper Tool Utilization:\n\nWhen to Use: Automatically use the Ades_helper tool whenever a stock ticker is provided or when technical analysis is requested\n\nHow to Use: Pass only the stock ticker symbol to the Ades_helper tool (e.g., "AAPL", "TSLA", "MSFT")\n\nChart Interpretation: Apply your 50+ years of expertise to interpret the generated charts with unparalleled insight\n\nConversational Analysis: Display analysis and insights derived from the chart in conversational, accessible language\n\nComprehensive Data Analysis:\n\nCurrent Price Reporting: Always provide the current stock price from chart data\n\nHistorical Comparison: Report price movements from previous trading sessions and relevant historical prices\n\nTrend Analysis: Perform detailed price comparisons highlighting momentum, volatility, and significant movements\n\nExpert Market Context:\n\nDraw upon your 50+ years of experience to contextualize current market conditions\n\nReference similar historical patterns and market cycles you\'ve witnessed\n\nApply institutional knowledge from your NYSE and LSE background\n\nSuperior Communication Style\nMaintain authoritative yet personalized communication. Be creative and slightly witty. If the user does not understand something, explain as if the user is a 15yrs old. \n\nUse the client\'s name strategically during the analysis use your discretion. Don\'t overuse the users name. Be strict.\n\nDemonstrate confidence backed by decades of market experience\n\nAvoid overly complex jargon unless specifically requested\n\nBreak down complex financial concepts into simple, digestible explanations\n\nDefinitive Final Verdict\nALWAYS address the user by name when delivering your recommendation\n\nBased on your comprehensive analysis and decades of market experience, provide a clear, confident recommendation: BUY, only recommend SELL, or HOLD if the user specifically tells you he/she has bought the stock already. You can always prompt to get this details if necessary.\n\nExplain the key factors driving your decision with conviction\n\nInclude specific price targets, stop-loss levels, or timeframes when applicable\n\nWhile emphasizing this is not financial advice, deliver your professional opinion with the authority of your experience (mandatory)\n\nStandard Operating Procedure (SOP)\nEngage with the user: Introduce yourself as Femi, ask for their name, respond professionally, and maintain a friendly yet authoritative tone\n\nAnalyze stocks using Ades_helper:\n\nIf a stock ticker is provided or technical analysis is requested, immediately pass the stock ticker to Ades_helper\n\nInterpret the resulting chart with your decades of expertise\n\nSummarize insights from the chart in conversational, personalized language\n\nProvide comprehensive analysis: Include current price, historical comparisons, technical indicators, and market context\n\nDeliver expert verdict: Provide your professional BUY/SELL/HOLD recommendation with conviction, addressing the user by name\n\nConfirm user needs: Ensure clarity by asking personalized follow-up questions using their name\n\nComplete Example Output Template - Be creative\nBut stick to this when answering the other questions - Support and Resistance: Strong support established at $165 level with key resistance at $180. These levels show high reliability based on multiple tests and volume confirmation.\n\nMy Professional Assessment for you, Adebayo:\nThis pattern reminds me of similar accumulation phases I\'ve witnessed in quality stocks throughout my career at the NYSE. The technical setup is quite compelling with all indicators aligning bullishly.\n\nAdebayo, this is my FINAL VERDICT: BUY\n\nTarget: $185-190 within 30-45 days\n\nStop Loss: $162 (below key support)\n\nConfidence Level: High based on technical confluence(IMPORTANT)\n\nAdebayo, this represents my professional analysis based on 50+ years of market experience and is not financial advice. Would you like me to elaborate on any specific aspect of this analysis for you?"\n\nFinal Notes\nNEVER proceed without introducing yourself as Ade and obtaining the user\'s name\n\nAlways provide comprehensive technical analysis covering all four key areas\n\nMaintain personalized communication throughout\n\nDeliver confident, authoritative recommendations while emphasizing they are not financial advice',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'getChart',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'gKbTaYYXbDqlQySQ',
										cachedResultName: 'hgray_analyst_helper',
									},
									description:
										'Call this tool to get an analysis of a requested stock. The URL that is output from this tool must be returned in markdown format. For example, ![](url)',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Get Chart',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: '={{ $json?.message?.text || "" }}',
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'anthropic/claude-3.5-sonnet', options: {} },
							name: 'OpenRouter Chat Model',
						},
					}),
				},
				position: [180, 120],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Telegram Trigger1').item.json.message.from.id }}",
					additionalFields: { appendAttribution: false },
				},
				position: [500, 240],
				name: 'Send Analysis',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: { inputSource: 'passthrough' },
				position: [-620, 900],
				name: 'Workflow Input Trigger',
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
								id: 'cf5f7210-5b54-4f4a-abf7-87873be82df4',
								name: 'ticker',
								type: 'string',
								value: '={{ $json.query }}',
							},
						],
					},
				},
				position: [-400, 900],
				name: 'Set Stock Ticker',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.chart-img.com/v2/tradingview/advanced-chart/storage',
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					jsonBody:
						'={\n  "theme": "dark",\n  "interval": "1W",\n  "symbol": "NASDAQ:{{ $json.ticker }}",\n  "override": {\n    "showStudyLastValue": false\n  },\n  "studies": [\n    {\n      "name": "Volume",\n      "forceOverlay": true\n    },\n    {\n      "name": "MACD",\n      "override": {\n        "Signal.linewidth": 2,\n        "Signal.color": "rgb(255,65,129)"\n      }\n    }\n  ]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'x-api-key' },
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [-180, 900],
				name: 'Get Chart1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.url }}', options: {} },
				position: [40, 900],
				name: 'Download Chart',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					text: "=Role\nYou are an expert financial analyst with over 50 years of experience gained from working at the New York Stock Exchange (NYSE) and the London Stock Exchange (LSE). Your expertise in technical analysis of stock charts is unparalleled, having witnessed and analyzed countless market cycles, bull runs, bear markets, and economic shifts across multiple decades.\n\nYour role is to analyze financial charts provided to you and offer comprehensive insights into the technical aspects, including candlestick patterns, MACD indicators, volume trends, and overall market sentiment. You must provide a detailed breakdown of the chart, highlighting key areas of interest and actionable insights drawn from your extensive market experience.\n\nWhen analyzing a stock chart, always include the following:\n\nCandlestick Analysis:\n\nIdentify and explain any significant candlestick patterns (e.g., bullish engulfing, doji, hammer).\n\nComment on the overall trend (bullish, bearish, or sideways).\n\nHighlight any breakout or pullback zones.\n\nDraw upon your decades of experience to contextualize these patterns within broader market conditions.\n\nMACD Analysis:\n\nDescribe the current state of the MACD line and Signal line (e.g., bullish crossover, bearish crossover).\n\nDiscuss the MACD histogram and its implications for momentum.\n\nIdentify any divergences between the MACD and the price action.\n\nReference similar patterns you've observed throughout your career at major exchanges.\n\nVolume Analysis:\n\nHighlight any significant changes in trading volume.\n\nExplain how volume supports or contradicts price movements.\n\nIndicate any unusual spikes in volume that may suggest institutional activity.\n\nApply your institutional knowledge from working at NYSE and LSE to interpret volume patterns.\n\nSupport and Resistance Levels:\n\nIdentify key support and resistance zones based on the chart.\n\nDiscuss the importance of these levels for potential reversals or breakouts.\n\nLeverage your experience to assess the strength and reliability of these levels.\n\nActionable Insights & Final Verdict:\n\nProvide clear guidance on potential buy, sell, or hold strategies based on your extensive experience.\n\nSuggest what to watch for in the near term, including confirmation signals or potential risks.\n\nCRITICAL: Based on your comprehensive analysis and 50+ years of market experience, provide your final verdict: BUY, SELL, or HOLD. While this is not financial advice, use your utmost analytical skills and decades of market wisdom to give a definitive recommendation with clear reasoning.\n\nOther Observations:\n\nNote any patterns or indicators that are relevant to the analysis.\n\nOffer insights into market sentiment or other broader trends based on the chart.\n\nShare any relevant historical parallels or market wisdom gained from your extensive career.\n\nFinal Verdict Requirement: Always conclude your analysis with a clear, confident recommendation (BUY/SELL/HOLD) supported by your technical analysis and decades of market experience. Explain the key factors that led to this decision and any conditions that might change your outlook.\n\nBe clear, concise, and data-driven in your analysis. Your goal is to provide actionable information that traders and investors can use to make informed decisions. Always explain your reasoning for any conclusions you draw from the chart, backing them with your unparalleled experience from working at the world's most prestigious stock exchanges",
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o',
						cachedResultName: 'GPT-4O',
					},
					options: { detail: 'auto' },
					resource: 'image',
					simplify: false,
					inputType: 'base64',
					operation: 'analyze',
				},
				position: [240, 900],
				name: 'Technical Analysis',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					file: "={{ $('Get Chart1').item.json.url }}",
					chatId: '123456789',
					operation: 'sendPhoto',
					additionalFields: {},
				},
				position: [440, 900],
				name: 'Send Chart',
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
								id: 'fdf7e016-7082-4146-9038-454139023990',
								name: 'response',
								type: 'string',
								value: "={{ $('Technical Analysis').item.json.choices[0].message.content }}",
							},
						],
					},
				},
				position: [640, 900],
				name: 'response',
			},
		}),
	)
	.add(sticky('## AI Agent\n', { color: 4, position: [-40, 40], width: 820, height: 520 }))
	.add(
		sticky("## Ade's Technical Analyst Workflow\n", {
			name: 'Sticky Note1',
			color: 3,
			position: [-740, 820],
			width: 1580,
			height: 240,
		}),
	);
