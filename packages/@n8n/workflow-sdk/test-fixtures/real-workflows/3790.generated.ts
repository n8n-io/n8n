const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: { values: [{ name: 'ticker' }, { name: 'chart_style' }] },
				},
				position: [740, 800],
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
								value: '={{ $json.ticker }}',
							},
							{
								id: '9f008c4b-60e2-4d99-a119-b0170ec28358',
								name: 'TwelveData_API_Key',
								type: 'string',
								value: '',
							},
						],
					},
				},
				position: [960, 800],
				name: 'Set Stock Symbol and API Key',
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
					url: 'https://api.chart-img.com/v2/tradingview/advanced-chart/storage',
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					jsonBody:
						'={\n  "style": "candle",\n  "theme": "light",\n  "interval": "1W",\n  "symbol": "NASDAQ:{{ $json.ticker }}",\n  "override": {\n    "showStudyLastValue": false\n  },\n  "studies": [\n    {\n      "name": "Volume",\n      "forceOverlay": true\n    },\n    {\n      "name": "Moving Average Exponential",\n      "inputs": {\n        "length": 200\n      }\n    },\n    {\n      "name": "Relative Strength Index"\n    }\n  ]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1320, 520],
				name: 'Get Chart URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.url }}', options: {} },
				position: [1540, 520],
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
					text: '=# Role\nYou are a visual chart analyst.  \nYour only input is a weekly candlestick chart image that shows:\n- Price candles and volume bars  \n- One short-term EMA line  \n- An RSI panel with its live value  \n\n# Task\nInspect the image and produce a **structured JSON** object with the following keys:\n\n{\n  "rsiNumeric": number,          // exact RSI value from the chart\n  "rsiState": "overbought" | "oversold" | "neutral",\n  "rsiDivergence": "bullish" | "bearish" | "none",\n  "trendDirection": "up" | "down" | "sideways",\n  "candlestickPatterns": [ "pattern1", "pattern2", ... ],   // max 3\n  "emaRelation": "aboveEMA" | "belowEMA" | "testingEMA",\n  "volumeNotes": "string",        // brief comment on recent volume behavior\n  "priceZones": {                 // visually inferred areas\n      "potentialSupport": [number, ...],  // up to 2 levels taken from visible lows\n      "potentialResistance": [number, ...]// up to 2 levels taken from visible highs\n  }\n}\n\n# Style Rules\n- Derive every value only from what is visible in the chart\n- Do not mention any external data or speculation\n- Return the JSON object only, nothing else\n',
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
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1820, 520],
				name: 'First Technical Analysis',
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
								name: 'ai_agent_visual_analysis',
								type: 'string',
								value: "={{ $('First Technical Analysis').item.json.choices[0].message.content }}",
							},
						],
					},
				},
				position: [2040, 520],
				name: 'Set Variable',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [2440, 800],
				name: 'Merge-2',
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
						'/**\n * INPUT: items[0].json (Original JSON)\n * OUTPUT: { textPayload: "```json\\n{ ... }\\n```" }\n */\n\nconst pretty = JSON.stringify(items[0].json, null, 2);\nconst wrapped = `\\`\\`\\`json\\n${pretty}\\n\\`\\`\\``;\n\nreturn [\n  {\n    json: {\n      textPayload: wrapped\n    }\n  }\n];\n',
				},
				position: [2660, 800],
				name: 'Warp as JSON for GPT',
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
						value: 'gpt-4o',
						cachedResultName: 'GPT-4O',
					},
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'# Role\nYou are a senior technical analyst who merges visual insights with quantitative indicators.\n\n# Inputs\n1. Visual JSON from Agent 1:\n   {\n     "ai_agent_visual_analysis": "..."\n   }\n2. Technical-indicator JSON in the format:\n   {\n     "ticker": "...",\n     "currentPrice": "...",\n     "timestamp": "...",\n     "technicalAnalysis": {\n       "fibonacci": { ... },\n       "supportResistance": { ... },\n       "bollingerBands": { ... },\n       "macd": { ... }\n     },\n     "summary": { ... }\n   }\n\n# Expected Sections\nWrite five titled sections exactly in this order:\n\n1. Quick Stats  \n   - Ticker, current price, timestamp  \n   - Overall recommendation from technical JSON, if present\n\n2. Candles and EMA  \n   - Use Agent 1 data: trendDirection, candlestickPatterns, emaRelation, volumeNotes\n\n3. RSI  \n   - Report rsiNumeric and rsiState from Agent 1  \n   - Mention rsiDivergence and its implication\n\n4. Indicator Synthesis  \n   - Fibonacci – cite closest level above and below price  \n   - Bollinger Bands – quote upper, middle, lower and note price position  \n   - MACD – quote macd, signal, histogram, note cross or momentum if numbers are valid  \n   - Support-Resistance – use technicalAnalysis plus priceZones from Agent 1 to highlight the nearest levels\n\n5. Actionable Takeaway  \n   - One sentence bias (bullish, bearish, neutral)  \n   - Clear next step such as watch for break above X or pullback to Y\n\n# Style Rules\n- Be concise and strictly data driven  \n- Every statement must reference either a value from the inputs or a specific visual observation from Agent 1  \n- No speculation beyond supplied data  \n- End after the Takeaway section – output nothing else',
							},
							{ content: '={{ $json.textPayload }}' },
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [2900, 800],
				name: 'ChatGPT 4o',
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
								value: '={{ $json.message.content }}',
							},
							{
								id: '4e5afd49-67c2-40ab-bc8c-565dea3850ed',
								name: 'image',
								type: 'string',
								value: "={{ $('Download Chart').item.json.url }}",
							},
						],
					},
				},
				position: [3280, 800],
				name: 'Set Final Response',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: '=https://api.twelvedata.com/time_series',
					options: { response: { response: { responseFormat: 'json' } } },
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'symbol', value: '={{ $json.ticker }}' },
							{ name: 'interval', value: '1day' },
							{ name: 'outputsize', value: '180' },
							{ name: 'apikey', value: '={{ $json.TwelveData_API_Key }}' },
						],
					},
				},
				position: [1320, 800],
				name: 'Get Price History',
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
						'// Get historical price data\nconst data = $input.item.json;\n\n// Check if data exists\nif (!data.values || data.values.length === 0) {\n  return { json: { error: "No price data available", ticker: data.meta?.symbol } };\n}\n\n// Convert prices to numbers\nconst prices = data.values.map(v => parseFloat(v.close)).reverse();\n\n// Function to calculate Fibonacci levels\nfunction calculateFibonacciLevels() {\n  // Find min and max prices\n  const max = Math.max(...prices);\n  const min = Math.min(...prices);\n  const diff = max - min;\n  \n  return {\n    level_0: min.toFixed(2),\n    level_0_236: (min + diff * 0.236).toFixed(2),\n    level_0_382: (min + diff * 0.382).toFixed(2),\n    level_0_5: (min + diff * 0.5).toFixed(2),\n    level_0_618: (min + diff * 0.618).toFixed(2),\n    level_0_786: (min + diff * 0.786).toFixed(2),\n    level_1: max.toFixed(2)\n  };\n}\n// Function to identify support and resistance levels\nfunction findSupportResistanceLevels() {\n  // We need at least 30 data points\n  if (prices.length < 30) {\n    return { support: [], resistance: [] };\n  }\n  \n  const supportLevels = [];\n  const resistanceLevels = [];\n  \n  // Check each point (except edges) if it\'s a local minimum or maximum\n  const lookback = 5; // how many points to check in each direction\n  \n  for (let i = lookback; i < prices.length - lookback; i++) {\n    // Check for local minimum (support)\n    let isMinimum = true;\n    for (let j = i - lookback; j < i; j++) {\n      if (prices[j] <= prices[i]) {\n        isMinimum = false;\n        break;\n      }\n    }\n    \n    for (let j = i + 1; j <= i + lookback; j++) {\n      if (prices[j] <= prices[i]) {\n        isMinimum = false;\n        break;\n      }\n    }\n    \n    if (isMinimum) {\n      supportLevels.push(prices[i]);\n    }\n    \n    // Check for local maximum (resistance)\n    let isMaximum = true;\n    for (let j = i - lookback; j < i; j++) {\n      if (prices[j] >= prices[i]) {\n        isMaximum = false;\n        break;\n      }\n    }\n    \n    for (let j = i + 1; j <= i + lookback; j++) {\n      if (prices[j] >= prices[i]) {\n        isMaximum = false;\n        break;\n      }\n    }\n    \n    if (isMaximum) {\n      resistanceLevels.push(prices[i]);\n    }\n  }\n  \n  // Sort and remove duplicates\n  const uniqueSupports = [...new Set(supportLevels)];\n  const uniqueResistances = [...new Set(resistanceLevels)];\n  \n  // Return only significant levels (up to 5 of each)\n  return {\n    support: uniqueSupports.sort((a, b) => b - a).slice(0, 5).map(p => p.toFixed(2)),\n    resistance: uniqueResistances.sort((a, b) => a - b).slice(0, 5).map(p => p.toFixed(2))\n  };\n}\n\n// Calculate levels\nconst fibonacciLevels = calculateFibonacciLevels();\nconst supportResistanceLevels = findSupportResistanceLevels();\n\n// Return information with additional stock data\nreturn {\n  json: {\n    ticker: data.meta.symbol,\n    currentPrice: parseFloat(data.values[0].close).toFixed(2),\n    fibonacci: fibonacciLevels,\n    supportResistance: supportResistanceLevels,\n    dataPoints: prices.length\n  }\n};',
				},
				position: [1540, 800],
				name: 'Calculate Support Resistance',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: { parameters: { numberInputs: 3 }, position: [1820, 960], name: 'Merge' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Getting data from different sources\n// Checking existence of objects before trying to access them\nconst items = $input.all();\nconst fibData = $input.first().json;\n\n// Trying to locate bband and MACD data if they exist\nlet bbandsData = null;\nlet macdData = null;\n\n// Trying to check if there is data in additional items\nif (items.length > 1 && items[1] && items[1].json) {\n  bbandsData = items[1].json;\n}\n\nif (items.length > 2 && items[2] && items[2].json) {\n  macdData = items[2].json;\n}\n\n// Creating data structure for the response - ensure all fields exist\nconst result = {\n  ticker: fibData.ticker || "לא ידוע",\n  currentPrice: fibData.currentPrice || "0",\n  timestamp: new Date().toISOString(),\n  technicalAnalysis: {\n    fibonacci: fibData.fibonacci || {},\n    supportResistance: fibData.supportResistance || { support: [], resistance: [] },\n    bollingerBands: {},\n    macd: {}\n  }\n};\n\n// Adding Bollinger Bands data - only if they exist\nif (bbandsData && bbandsData.values && bbandsData.values.length > 0) {\n  const bbands = bbandsData.values[0];\n  result.technicalAnalysis.bollingerBands = {\n    upperBand: parseFloat(bbands.upper_band).toFixed(2),\n    middleBand: parseFloat(bbands.middle_band).toFixed(2),\n    lowerBand: parseFloat(bbands.lower_band).toFixed(2)\n  };\n} else if (bbandsData && bbandsData.status === "ok") {\n  // If returning another data format\n  result.technicalAnalysis.bollingerBands = {\n    upperBand: bbandsData.upperBand || bbandsData.upper_band || "0",\n    middleBand: bbandsData.middleBand || bbandsData.middle_band || "0",\n    lowerBand: bbandsData.lowerBand || bbandsData.lower_band || "0"\n  };\n}\n\n// Adding MACD data - only if they exist\nif (macdData && macdData.values && macdData.values.length > 0) {\n  const macd = macdData.values[0];\n  result.technicalAnalysis.macd = {\n    macd: parseFloat(macd.macd).toFixed(2),\n    signal: parseFloat(macd.signal).toFixed(2),\n    histogram: parseFloat(macd.hist).toFixed(2)\n  };\n} else if (macdData && macdData.status === "ok") {\n  // If returning another data format\n  result.technicalAnalysis.macd = {\n    macd: macdData.macd || "0",\n    signal: macdData.signal || "0",\n    histogram: macdData.histogram || macdData.hist || "0"\n  };\n}\n\n// Creating summary and recommendation\nlet bullishFactors = [];\nlet bearishFactors = [];\n\n// Analyzing Bollinger Bands - only if data exists\nconst bbands = result.technicalAnalysis.bollingerBands;\nif (bbands.upperBand && bbands.lowerBand) {\n  const currentPrice = parseFloat(result.currentPrice);\n  const upperBand = parseFloat(bbands.upperBand);\n  const lowerBand = parseFloat(bbands.lowerBand);\n  \n  if (!isNaN(currentPrice) && !isNaN(upperBand) && !isNaN(lowerBand)) {\n    if (currentPrice > upperBand) {\n      bearishFactors.push("מחיר מעל רצועת בולינגר העליונה - אפשרות לקנייה יתר");\n    } else if (currentPrice < lowerBand) {\n      bullishFactors.push("מחיר מתחת לרצועת בולינגר התחתונה - אפשרות למכירה יתר");\n    }\n  }\n}\n\n// Analyzing MACD - only if data exists\nconst macdInfo = result.technicalAnalysis.macd;\nif (macdInfo.macd && macdInfo.signal) {\n  const macd = parseFloat(macdInfo.macd);\n  const signal = parseFloat(macdInfo.signal);\n  \n  if (!isNaN(macd) && !isNaN(signal)) {\n    if (macd > signal) {\n      bullishFactors.push("MACD מעל קו האיתות - אינדיקציה חיובית");\n    } else {\n      bearishFactors.push("MACD מתחת לקו האיתות - אינדיקציה שלילית");\n    }\n  }\n}\n\n// Analyzing support and resistance levels - only if data exists\nconst supportResistance = result.technicalAnalysis.supportResistance;\nif (supportResistance.support && supportResistance.resistance) {\n  const currentPrice = parseFloat(result.currentPrice);\n  \n  if (!isNaN(currentPrice)) {\n    const supports = supportResistance.support.map(s => parseFloat(s)).filter(s => !isNaN(s));\n    const resistances = supportResistance.resistance.map(r => parseFloat(r)).filter(r => !isNaN(r));\n    \n    // Finding the closest support level\n    let closestSupport = null;\n    let minSupportDist = Infinity;\n    for (const support of supports) {\n      if (support < currentPrice) {\n        const dist = currentPrice - support;\n        if (dist < minSupportDist) {\n          minSupportDist = dist;\n          closestSupport = support;\n        }\n      }\n    }\n    \n    // Finding the closest resistance level\n    let closestResistance = null;\n    let minResistanceDist = Infinity;\n    for (const resistance of resistances) {\n      if (resistance > currentPrice) {\n        const dist = resistance - currentPrice;\n        if (dist < minResistanceDist) {\n          minResistanceDist = dist;\n          closestResistance = resistance;\n        }\n      }\n    }\n    \n    // Adding support/resistance analysis\n    if (closestSupport !== null) {\n      const supportPercentage = ((currentPrice - closestSupport) / currentPrice * 100).toFixed(2);\n      if (supportPercentage < 5) {\n        bullishFactors.push(`המחיר קרוב לרמת תמיכה (${supportPercentage}%) - אפשרות להיפוך כלפי מעלה`);\n      }\n    }\n    \n    if (closestResistance !== null) {\n      const resistancePercentage = ((closestResistance - currentPrice) / currentPrice * 100).toFixed(2);\n      if (resistancePercentage < 5) {\n        bearishFactors.push(`המחיר קרוב לרמת התנגדות (${resistancePercentage}%) - אפשרות להיפוך כלפי מטה`);\n      }\n    }\n  }\n}\n\n// Analyzing Fibonacci - only if data exists\nconst fibonacci = result.technicalAnalysis.fibonacci;\nif (fibonacci && Object.keys(fibonacci).length > 0) {\n  const currentPrice = parseFloat(result.currentPrice);\n  \n  if (!isNaN(currentPrice)) {\n    const fibLevels = Object.values(fibonacci).map(level => parseFloat(level)).filter(level => !isNaN(level));\n    fibLevels.sort((a, b) => a - b);\n    \n    // Checking which Fibonacci level the price is at\n    for (let i = 0; i < fibLevels.length - 1; i++) {\n      if (currentPrice >= fibLevels[i] && currentPrice <= fibLevels[i+1]) {\n        // If the price is close to a Fibonacci resistance level\n        if (Math.abs(currentPrice - fibLevels[i+1]) / currentPrice * 100 < 2) {\n          bearishFactors.push(`המחיר קרוב לרמת פיבונאצ\'י ${[0, 23.6, 38.2, 50, 61.8, 78.6, 100][Math.min(i+1, 6)]}% - אפשרות להתנגדות`);\n        }\n        // If the price is close to a Fibonacci support level\n        if (Math.abs(currentPrice - fibLevels[i]) / currentPrice * 100 < 2) {\n          bullishFactors.push(`המחיר קרוב לרמת פיבונאצ\'י ${[0, 23.6, 38.2, 50, 61.8, 78.6, 100][Math.min(i, 6)]}% - אפשרות לתמיכה`);\n        }\n        break;\n      }\n    }\n  }\n}\n\n// Adding general recommendation based on factors\nlet recommendation = "";\nif (bullishFactors.length > bearishFactors.length) {\n  recommendation = "חיובית";\n} else if (bearishFactors.length > bullishFactors.length) {\n  recommendation = "שלילית";\n} else {\n  recommendation = "נייטרלית";\n}\n\n// Adding summary to the result\nresult.summary = {\n  recommendation: recommendation,\n  bullishFactors: bullishFactors,\n  bearishFactors: bearishFactors\n};\n\nreturn { json: result };',
				},
				position: [2040, 960],
				name: 'Organizing Data',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: '=https://api.twelvedata.com/bbands',
					options: { response: { response: { responseFormat: 'json' } } },
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'symbol', value: '={{ $json.ticker }}' },
							{ name: 'interval', value: '1day' },
							{ name: 'outputsize', value: '1' },
							{ name: 'apikey', value: '={{ $json.TwelveData_API_Key }}' },
						],
					},
				},
				position: [1320, 960],
				name: 'Get Bollinger Bands',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: '=https://api.twelvedata.com/macd',
					options: { response: { response: { responseFormat: 'json' } } },
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'symbol', value: '={{ $json.ticker }}' },
							{ name: 'interval', value: '1day' },
							{ name: 'outputsize', value: '1' },
							{ name: 'apikey', value: '={{ $json.TwelveData_API_Key }}' },
						],
					},
				},
				position: [1320, 1120],
				name: 'Get MACD',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{}] } },
				position: [2560, -20],
				name: 'Schedule Trigger1',
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
						"// Function to generate yesterday's date in the required format\nfunction getYesterdayDateFormat() {\n  // Create a current date object\n  const today = new Date();\n  \n  // Set the date to the previous day (yesterday)\n  today.setDate(today.getDate() - 1);\n  \n  // Reset hours, minutes, seconds and milliseconds to 00:00:00.000\n  today.setHours(0, 0, 0, 0);\n  \n  // Extract components\n  const year = today.getFullYear();\n  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months in JS start from 0\n  const day = String(today.getDate()).padStart(2, '0');\n  const hours = String(today.getHours()).padStart(2, '0');\n  const minutes = String(today.getMinutes()).padStart(2, '0');\n  \n  // Build the string in the required format\n  return `${year}${month}${day}T${hours}${minutes}`;\n}\n// Calculate the date\nconst yesterdayDate = getYesterdayDateFormat();\n// Return the result in the format required by n8n - array of objects\nreturn [\n  {\n    json: {\n      wanted_date: yesterdayDate\n    }\n  }\n];",
				},
				position: [2760, -20],
				name: 'Generate Variables For API',
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
						number: [{ name: 'wantedDate', value: '={{ $json.wanted_date }}' }],
						string: [
							{
								name: 'stockSymbol',
								value: "={{ $('Workflow Input Trigger').item.json.ticker }}",
							},
							{ name: 'apikey' },
						],
					},
					options: {},
				},
				position: [2920, -20],
				name: 'Set Variables',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.1,
			config: {
				parameters: {
					url: '=https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={{ $json.stockSymbol }}&sort=RELEVANCE&time_from={{ $json.wantedDate }}&apikey={{ $json.apikey }}',
					options: {},
				},
				position: [3100, -20],
				name: 'Get News Data',
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
						'/**\n * Custom code for n8n Code node to analyze news data from Alpha Vantage\n * \n * - The code receives API data from the previous node\n * - Analyzes sentiment, leading articles, and hot topics\n * - Returns a structured JSON object for further processing\n */\n\nconst stockSymbol = $(\'Set Variables\').first().json.stockSymbol\nconst allNews = $input.first().json.feed\n  ;\nconst today = new Date().toISOString().split(\'T\')[0]; // Current date in YYYY-MM-DD format\n\n// Filter articles relevant to the stock\nconst relevantArticles = allNews.filter(article => {\n  return article.ticker_sentiment && article.ticker_sentiment.some(ticker => \n    ticker.ticker === stockSymbol\n  );\n});\n\n// Sentiment analysis\nlet sentimentCounts = {\n  "Bullish": 0,\n  "Somewhat-Bullish": 0,\n  "Neutral": 0,\n  "Somewhat-Bearish": 0,\n  "Bearish": 0\n};\n\nlet totalSentimentScore = 0;\nlet totalRelevanceScore = 0;\n\nrelevantArticles.forEach(article => {\n  const stockTicker = article.ticker_sentiment.find(ticker => ticker.ticker === stockSymbol);\n  if (stockTicker) {\n    sentimentCounts[stockTicker.ticker_sentiment_label]++;\n    totalSentimentScore += parseFloat(stockTicker.ticker_sentiment_score) * parseFloat(stockTicker.relevance_score);\n    totalRelevanceScore += parseFloat(stockTicker.relevance_score);\n  }\n});\n\nconst avgSentimentScore = totalRelevanceScore > 0 ? totalSentimentScore / totalRelevanceScore : 0;\n\n// Determining overall sentiment\nlet overallSentiment;\nif (avgSentimentScore >= 0.35) {\n  overallSentiment = "חיובי מאוד";\n} else if (avgSentimentScore >= 0.15) {\n  overallSentiment = "חיובי";\n} else if (avgSentimentScore > -0.15) {\n  overallSentiment = "נייטרלי";\n} else if (avgSentimentScore > -0.35) {\n  overallSentiment = "שלילי";\n} else {\n  overallSentiment = "שלילי מאוד";\n}\n\n// Most influential articles\nconst topArticles = relevantArticles\n  .map(article => {\n    const stockTicker = article.ticker_sentiment.find(ticker => ticker.ticker === stockSymbol);\n    return {\n      title: article.title,\n      url: article.url,\n      source: article.source,\n      date: formatDate(article.time_published),\n      sentiment_label: stockTicker ? stockTicker.ticker_sentiment_label : "N/A",\n      sentiment_score: stockTicker ? parseFloat(stockTicker.ticker_sentiment_score) : 0,\n      relevance_score: stockTicker ? parseFloat(stockTicker.relevance_score) : 0,\n      impact_score: stockTicker ? Math.abs(parseFloat(stockTicker.ticker_sentiment_score) * parseFloat(stockTicker.relevance_score)) : 0\n    };\n  })\n  .sort((a, b) => b.impact_score - a.impact_score)\n  .slice(0, 5);\n\n// Analysis of main topics\nconst topicsMap = {};\n\nrelevantArticles.forEach(article => {\n  if (article.topics) {\n    article.topics.forEach(topic => {\n      if (!topicsMap[topic.topic]) {\n        topicsMap[topic.topic] = {\n          count: 0,\n          relevance: 0\n        };\n      }\n      topicsMap[topic.topic].count++;\n      topicsMap[topic.topic].relevance += parseFloat(topic.relevance_score);\n    });\n  }\n});\n\nconst hotTopics = Object.entries(topicsMap)\n  .map(([topic, data]) => ({\n    topic,\n    article_count: data.count,\n    average_relevance: (data.relevance / data.count).toFixed(2)\n  }))\n  .sort((a, b) => b.article_count - a.article_count)\n  .slice(0, 5);\n\n// Creating result object\nconst analysisResult = {\n  stock_symbol: stockSymbol,\n  analysis_date: today,\n  sentiment_analysis: {\n    overall_sentiment: overallSentiment,\n    sentiment_score: parseFloat(avgSentimentScore.toFixed(4)),\n    sentiment_distribution: sentimentCounts\n  },\n  top_articles: topArticles.map(article => ({\n    title: article.title,\n    source: article.source,\n    url: article.url,\n    date: article.date,\n    sentiment: article.sentiment_label,\n    impact_score: article.impact_score.toFixed(4)\n  })),\n  hot_topics: hotTopics,\n  recent_trends: {\n    description: getTrendDescription(overallSentiment, hotTopics),\n    market_outlook: getMarketOutlook(overallSentiment)\n  }\n};\n\n// Helper functions\nfunction formatDate(dateStr) {\n  if (!dateStr) return "N/A";\n  \n  try {\n    // Format: 20250418T152049 -> 2025-04-18\n    const year = dateStr.substring(0, 4);\n    const month = dateStr.substring(4, 6);\n    const day = dateStr.substring(6, 8);\n    return `${year}-${month}-${day}`;\n  } catch (e) {\n    return dateStr;\n  }\n}\n\nfunction getTrendDescription(sentiment, topics) {\n  let description = "";\n  \n  if (sentiment === "חיובי מאוד" || sentiment === "חיובי") {\n    description = "מגמה חיובית כאשר משקיעים מתמקדים בעיקר ב";\n  } else if (sentiment === "שלילי מאוד" || sentiment === "שלילי") {\n    description = "מגמה שלילית כאשר החששות העיקריים מתמקדים ב";\n  } else {\n    description = "מגמה מעורבת עם התמקדות ב";\n  }\n  \n  if (topics.length > 0) {\n    const topThreeTopics = topics.slice(0, Math.min(3, topics.length));\n    description += topThreeTopics.map(t => t.topic).join(", ");\n  } else {\n    description += "מגוון נושאים";\n  }\n  \n  return description + ".";\n}\n\nfunction getMarketOutlook(sentiment) {\n  if (sentiment === "חיובי מאוד") {\n    return "תחזית שוק חיובית מאוד. הסנטימנט הכללי מצביע על אמון משקיעים גבוה ופוטנציאל לעלייה בטווח הקצר.";\n  } else if (sentiment === "חיובי") {\n    return "תחזית שוק חיובית. ישנן אינדיקציות לאופטימיות זהירה בקרב משקיעים.";\n  } else if (sentiment === "נייטרלי") {\n    return "תחזית שוק מעורבת. קיימים כוחות מאזנים של אופטימיות ופסימיות בשוק.";\n  } else if (sentiment === "שלילי") {\n    return "תחזית שוק שלילית. ישנן דאגות בקרב משקיעים שעשויות להשפיע על המניה בטווח הקצר.";\n  } else {\n    return "תחזית שוק שלילית מאוד. קיימת אווירת זהירות משמעותית ונטייה למכירות.";\n  }\n}\n\n// Return the object for further flow in n8n\nreturn {\n  json: analysisResult\n};',
				},
				position: [3280, -20],
				name: 'Analyse API Input',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {
						appendAttribution: true,
						respondWithOptions: {
							values: {
								formSubmittedText:
									'Success! Check your inbox (or spam folder) for your analysis report.',
							},
						},
					},
					formTitle: 'Advance Stock Analysis',
					formFields: {
						values: [
							{
								fieldLabel: 'Ticker symbol:',
								placeholder: 'TSLA',
								requiredField: true,
							},
							{
								fieldType: 'email',
								fieldLabel: 'Email:',
								placeholder: 'user@example.com',
								requiredField: true,
							},
						],
					},
					responseMode: 'lastNode',
					formDescription:
						'Please enter the company’s NASDAQ ticker symbol (e.g. AAPL) to get a weekly email with combined technical-and-news sentiment analysis from our AI agent',
				},
				position: [720, -100],
				name: 'On form submission',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Ticker = {{ $json["Ticker symbol:"] }}',
					options: {
						systemMessage:
							'=# Overview\nYou are an AI agent specialized in stock analysis. You provide technical analysis and sentiment for stock investments by combining chart data and news sentiment.\n\n# Instructions\n1. When a user requests an analysis of a stock with its symbol:\n  - Send the stock symbol to both tools **technical_analysis** and **trends_analysis**\n  - Analyze the combined data and prepare a JSON report with your insights\n  - Provide a clear recommendation (positive, neutral, or negative)\n2. Your output must be in the format of a structured JSON object that will be used to fill an HTML template.\n3. Translate the article titles in topArticles to Hebrew\n4. Translate the sentimentHebrew results to only one of these values:\n"חיובי-חזק/חיובי-חלש/נייטרלי/שלילי-חלש/שלילי-חזק". Somewhat=חלש.\n5. Write the Date value in each article: "topArticles" only in this format: "DD/MM/YYYY".\n6. Update the technicalAnalysis value as a detailed technical analysis of three paragraphs, which explains even to those who don\'t understand economics what you did and how you reached your conclusions. Touch on all the indicators examined (Volume, EMA, RSI, Fibonacci retracement, MACD, Bollinger bands, Resistance and support levels)\n7. Ensure that the text in the technicalAnalysis value is written in proper Hebrew, like a professional analyst. Use the think tool\n8. In the Recommendation value - recommend to buy or sell only if you think with high probability that there will be a rise or fall. Use the think tool to verify your Recommendation based on recommendationText. Advise something only if you really believe it. Your default is the "ממליץ לחכות" value.\n\n## Tools\n- **technical_analysis**: Generates technical analysis based on stock charts\n- **trends_analysis**: Analyzes news sentiment for the requested stock\n\n## Response Format\nYou must respond with a JSON object containing exactly the following keys to fill the HTML template:\n\n```json\n{\n "stockSymbol": "סימול",\n "analysisDate": "DD/MM/YYYY",\n "recommendationClass": "positive/neutral/negative",\n "recommendationTitle": "כותרת המלצה בעברית",\n "recommendationText": "הסבר מפורט של ההמלצה בעברית",\n "bullishCount": 0,\n "neutralCount": 0, \n "bearishCount": 0,\n "bullishHeight": 0,\n "neutralHeight": 0,\n "bearishHeight": 0,\n "overallSentiment": "חיובי/נייטרלי/שלילי",\n "Recommendation": "ממליץ לקנות/ ממליץ לחכות/ ממליץ למכור",\n "sentimentScore": 0.00,\n "chartImageUrl": "URL_PLACEHOLDER",\n "technicalAnalysis": "ניתוח טכני מפורט בעברית עם תגי <p>",\n "topArticles": [\n   {\n     "title": "כותרת המאמר בעברית",\n     "url": "כתובת URL של המאמר",\n     "source": "שם המקור באנגלית",\n     "date": "DD/MM/YYYY",\n     "sentimentClass": "bullish/neutral/bearish",\n     "sentimentHebrew": "חיובי-חזק/חיובי-חלש/נייטרלי/שלילי-חלש/שלילי-חזק"\n   }\n ],\n "hotTopics": [\n   {\n     "topic": "שם הנושא בעברית",\n     "article_count": 0,\n     "average_relevance": "0.00"\n   }\n ]\n}',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Think' },
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'trends_analysis',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'jnlklBcNkky9yFoc',
										cachedResultName: 'trends_analysis',
									},
									description:
										"Call this tool to get an analysis of a requested stock. It'll be obligatory to pass ticker.",
									workflowInputs: {
										value: {
											ticker:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('ticker', ``, 'string') }}",
										},
										schema: [
											{
												id: 'ticker',
												type: 'string',
												display: true,
												required: false,
												displayName: 'ticker',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'chart_style',
												type: 'string',
												display: true,
												removed: true,
												required: false,
												displayName: 'chart_style',
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
								name: 'Trends Analysis Tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'technical_analysis',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'GDXsoM9kWq3cz53Y',
										cachedResultName: 'technical_analysis',
									},
									description:
										"Call this tool to get an analysis of a requested stock. It'll be obligatory to pass ticker.",
									workflowInputs: {
										value: {
											ticker:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('ticker', ``, 'string') }}",
										},
										schema: [
											{
												id: 'ticker',
												type: 'string',
												display: true,
												required: false,
												displayName: 'ticker',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'chart_style',
												type: 'string',
												display: true,
												removed: true,
												required: false,
												displayName: 'chart_style',
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
								name: 'Technical Analysis Tool',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4o',
									cachedResultName: 'gpt-4o',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'GPT 4o',
						},
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: { sessionKey: '=335458847', sessionIdType: 'customKey' },
							name: 'Window Buffer Memory',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n  "stockSymbol": "סימול",\n  "analysisDate": "DD/MM/YYYY",\n  "recommendationClass": "positive/neutral/negative",\n  "recommendationTitle": "כותרת המלצה בעברית",\n  "recommendationText": "הסבר מפורט של ההמלצה בעברית",\n  "bullishCount": 0,\n  "neutralCount": 0, \n  "bearishCount": 0,\n  "bullishHeight": 0,\n  "neutralHeight": 0,\n  "bearishHeight": 0,\n  "overallSentiment": "חיובי/נייטרלי/שלילי",\n  "Recommendation": "ממליץ לקנות/ ממליץ לחכות/ ממליץ למכור",\n  "sentimentScore": 0.00,\n  "chartImageUrl": "URL_PLACEHOLDER",\n  "technicalAnalysis": "ניתוח טכני מפורט בעברית עם תגי <p>",\n  "topArticles": [\n    {\n      "title": "כותרת המאמר",\n      "url": "כתובת URL של המאמר",\n      "source": "שם המקור",\n      "date": "DD/MM/YYYY",\n      "sentimentClass": "bullish/neutral/bearish",\n      "sentimentHebrew": "חיובי-חזק/חיובי-חלש/נייטרלי/שלילי-חלש/שלילי-חזק"\n    }\n  ],\n  "hotTopics": [\n    {\n      "topic": "שם הנושא בעברית",\n      "article_count": 0,\n      "average_relevance": "0.00"\n    }\n  ]\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [1080, -100],
				name: 'AI Agent',
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
						value: 'gpt-4o',
						cachedResultName: 'GPT-4O',
					},
					options: {},
					messages: {
						values: [
							{
								content: '="technicalAnalysis": {{ $json.output.technicalAnalysis }}',
							},
							{
								content: '="recommendationText":  {{ $json.output.recommendationText }}',
							},
							{
								role: 'system',
								content:
									'Ensure that the text in the "recommendationText" "technicalAnalysis" values is written in proper Hebrew, like a professional analyst.\nReturn the same JSON format, but rewrite "recommendationText" "technicalAnalysis" values better.\nשים לב שכותבים "רצועות בולינגר" ולא "חגורות בולינגר"',
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1520, -100],
				name: 'Refine Text',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.html',
			version: 1.2,
			config: {
				parameters: {
					html: '<!DOCTYPE html>\n<html dir="rtl" lang="he">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>ניתוח מניית {{ $(\'AI Agent\').item.json.output.stockSymbol }}</title>\n</head>\n<body style="margin: 0; padding: 0; font-family: \'Segoe UI\', \'Helvetica Neue\', Helvetica, Arial, sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; -webkit-font-smoothing: antialiased; font-size: 16px; text-align: right; direction: rtl;">\n    <!-- עוטף ראשי -->\n    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin-top: 30px; margin-bottom: 30px; text-align: right; direction: rtl;">\n        \n        <!-- כותרת עליונה -->\n        <div style="background: linear-gradient(135deg, #0057ff 0%, #00b2ff 100%); padding: 30px 40px; text-align: center; position: relative; overflow: hidden; margin-bottom: 20px;">\n            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: url(\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSgzMCkiPjxwYXRoIGQ9Ik0wIDEwIEw0MCAxMCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==\'); opacity: 0.2;"></div>\n            <h1 style="color: #ffffff; font-weight: 700; font-size: 28px; margin: 0 0 5px 0; letter-spacing: -0.5px; position: relative;">ניתוח מניית {{ $(\'AI Agent\').item.json.output.stockSymbol }}</h1>\n            <div style="color: rgba(255,255,255,0.85); font-size: 15px; position: relative;">תאריך: {{ $(\'AI Agent\').item.json.output.analysisDate }}</div>\n        </div>\n        \n        <!-- תוכן המייל -->\n        <div style="padding: 40px; text-align: right; direction: rtl;">\n            \n            <!-- תיבת המלצה -->\n            <div style="background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); padding: 25px; margin-bottom: 40px; position: relative; overflow: hidden; text-align: right;">\n                <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 6px; background-color: #f7b955;"></div>\n                <div style="position: absolute; right: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(247, 185, 85, 0.07) 0%, rgba(247, 185, 85, 0) 50%);"></div>\n                <div style="text-align: center; position: relative;">\n                    <div style="display: inline-block; width: 40px; height: 40px; border-radius: 50%; margin-bottom: 10px; background-color: rgba(247, 185, 85, 0.15); text-align: center;">\n                        <span style="font-size: 20px; line-height: 40px;">⚖️</span>\n                    </div>\n                    <h2 style="margin: 0 0 10px 0; color: #f7b955; font-size: 22px; font-weight: 700; text-align: center;">{{ $(\'AI Agent\').item.json.output.recommendationTitle }}</h2>\n                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4a5568; text-align: right;">{{ $json.message.content.recommendationText }}</p>\n                    <div style="margin-top: 25px;">\n                        <a style="display: inline-block; background-color: #29cc7a; color: white; font-weight: 600; font-size: 16px; padding: 12px 30px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px rgba(41, 204, 122, 0.25); transition: all 0.2s ease;">{{ $(\'AI Agent\').item.json.output.Recommendation }}</a>\n                    </div>\n                </div>\n            </div>\n\n            <!-- ניתוח טכני -->\n            <div style="margin-bottom: 40px; text-align: right;">\n                <h2 style="font-size: 20px; color: #1a202c; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #edf2f7; font-weight: 700; text-align: right;">ניתוח טכני</h2>\n                \n                <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 25px;">\n                    <img src="{{ $(\'AI Agent\').item.json.output.chartImageUrl }}" alt="גרף טכני {{ $(\'AI Agent\').item.json.output.stockSymbol }}" style="width: 100%; display: block; max-height: 450px; object-fit: contain;">\n                </div>\n                \n                <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; font-size: 15px; line-height: 1.6; color: #4a5568; text-align: right;">\n                    {{ $json.message.content.technicalAnalysis }}\n                </div>\n            </div>\n                      \n            <!-- ניתוח סנטימנט -->\n            <div style="margin-bottom: 40px; text-align: right;">\n                <h2 style="font-size: 20px; color: #1a202c; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #edf2f7; font-weight: 700; text-align: right;">ניתוח סנטימנט שוק</h2>\n                \n                <!-- גרף סנטימנט - עם טבלה במקום flex -->\n                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin: 45px 0 30px 0;">\n                    <tr valign="bottom" align="center">\n                        <td width="33%" style="text-align: center; padding: 0 10px;">\n                            <div style="font-weight: 600; margin-bottom: 10px; color: #29cc7a;">{{ $(\'AI Agent\').item.json.output.bullishCount }}</div>\n                            <div style="background-color: #29cc7a; border-radius: 8px 8px 0 0; width: 100%; height: {{ $(\'AI Agent\').item.json.output.bullishHeight }}px; margin: 0 auto; opacity: 0.85;"></div>\n                            <div style="font-size: 14px; color: #4a5568; margin-top: 10px;">חיובי</div>\n                        </td>\n                        <td width="33%" style="text-align: center; padding: 0 10px;">\n                            <div style="font-weight: 600; margin-bottom: 10px; color: #f7b955;">{{ $(\'AI Agent\').item.json.output.neutralCount }}</div>\n                            <div style="background-color: #f7b955; border-radius: 8px 8px 0 0; width: 100%; height: {{ $(\'AI Agent\').item.json.output.neutralHeight }}px; margin: 0 auto; opacity: 0.85;"></div>\n                            <div style="font-size: 14px; color: #4a5568; margin-top: 10px;">נייטרלי</div>\n                        </td>\n                        <td width="33%" style="text-align: center; padding: 0 10px;">\n                            <div style="font-weight: 600; margin-bottom: 10px; color: #f55e5e;">{{ $(\'AI Agent\').item.json.output.bearishCount }}</div>\n                            <div style="background-color: #f55e5e; border-radius: 8px 8px 0 0; width: 100%; height: {{ $(\'AI Agent\').item.json.output.bearishHeight }}px; margin: 0 auto; opacity: 0.85;"></div>\n                            <div style="font-size: 14px; color: #4a5568; margin-top: 10px;">שלילי</div>\n                        </td>\n                    </tr>\n                </table>\n                \n                <div style="background-color: #f8fafc; border-radius: 10px; padding: 15px; text-align: center; font-size: 15px;">\n                    הסנטימנט הכללי למניית <strong>{{ $(\'AI Agent\').item.json.output.stockSymbol }}</strong> הוא \n                    <span style="font-weight: 600; color: #f7b955;">{{ $(\'AI Agent\').item.json.output.overallSentiment }}</span> \n                    עם ציון של <strong>{{ $(\'AI Agent\').item.json.output.sentimentScore }}</strong>\n                </div>\n            </div>\n            \n            <!-- מאמרים משפיעים -->\n            <div style="margin-bottom: 40px; text-align: right;">\n                <h2 style="font-size: 20px; color: #1a202c; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #edf2f7; font-weight: 700; text-align: right;">מאמרים משפיעים</h2>\n                \n                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">\n                    <!-- מאמר 1 -->\n                    <tr>\n                        <td style="padding-bottom: 16px;">\n                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">\n                                <tr>\n                                    <td width="4" style="background-color: #f7b955;"></td>\n                                    <td style="padding: 18px 22px;">\n                                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: right;">\n                                            <a href="{{ $(\'AI Agent\').item.json.output.topArticles[0].url }}" target="_blank" style="color: #2b6cb0; text-decoration: none;">{{ $(\'AI Agent\').item.json.output.topArticles[0].title }}</a>\n                                        </h3>\n                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 10px;">\n                                            <tr>\n                                                <td style="font-size: 13px; color: #718096; text-align: right;">{{ $(\'AI Agent\').item.json.output.topArticles[0].source }} | {{ $(\'AI Agent\').item.json.output.topArticles[0].date }}</td>\n                                                <td style="text-align: left;">\n                                                    <div style="display: inline-block; padding: 3px 10px; border-radius: 30px; font-weight: 500; font-size: 12px; background-color: rgba(247, 185, 85, 0.1); color: #f7b955;">\n                                                        {{ $(\'AI Agent\').item.json.output.topArticles[0].sentimentHebrew }}\n                                                    </div>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                    \n                    <!-- מאמר 2 -->\n                    <tr>\n                        <td style="padding-bottom: 16px;">\n                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">\n                                <tr>\n                                    <td width="4" style="background-color: #f7b955;"></td>\n                                    <td style="padding: 18px 22px;">\n                                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: right;">\n                                            <a href="{{ $(\'AI Agent\').item.json.output.topArticles[1].url }}" target="_blank" style="color: #2b6cb0; text-decoration: none;">{{ $(\'AI Agent\').item.json.output.topArticles[1].title }}</a>\n                                        </h3>\n                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 10px;">\n                                            <tr>\n                                                <td style="font-size: 13px; color: #718096; text-align: right;">{{ $(\'AI Agent\').item.json.output.topArticles[1].source }} | {{ $(\'AI Agent\').item.json.output.topArticles[1].date }}</td>\n                                                <td style="text-align: left;">\n                                                    <div style="display: inline-block; padding: 3px 10px; border-radius: 30px; font-weight: 500; font-size: 12px; background-color: rgba(247, 185, 85, 0.1); color: #f7b955;">\n                                                        {{ $(\'AI Agent\').item.json.output.topArticles[1].sentimentHebrew }}\n                                                    </div>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                    \n                    <!-- מאמר 3 -->\n                    <tr>\n                        <td style="padding-bottom: 16px;">\n                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">\n                                <tr>\n                                    <td width="4" style="background-color: #f7b955;"></td>\n                                    <td style="padding: 18px 22px;">\n                                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: right;">\n                                            <a href="{{ $(\'AI Agent\').item.json.output.topArticles[2].url }}" target="_blank" style="color: #2b6cb0; text-decoration: none;">{{ $(\'AI Agent\').item.json.output.topArticles[2].title }}</a>\n                                        </h3>\n                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 10px;">\n                                            <tr>\n                                                <td style="font-size: 13px; color: #718096; text-align: right;">{{ $(\'AI Agent\').item.json.output.topArticles[2].source }} | {{ $(\'AI Agent\').item.json.output.topArticles[2].date }}</td>\n                                                <td style="text-align: left;">\n                                                    <div style="display: inline-block; padding: 3px 10px; border-radius: 30px; font-weight: 500; font-size: 12px; background-color: rgba(247, 185, 85, 0.1); color: #f7b955;">\n                                                        {{ $(\'AI Agent\').item.json.output.topArticles[2].sentimentHebrew }}\n                                                    </div>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                    \n                    <!-- מאמר 4 -->\n                    <tr>\n                        <td style="padding-bottom: 16px;">\n                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">\n                                <tr>\n                                    <td width="4" style="background-color: #f7b955;"></td>\n                                    <td style="padding: 18px 22px;">\n                                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: right;">\n                                            <a href="{{ $(\'AI Agent\').item.json.output.topArticles[3].url }}" target="_blank" style="color: #2b6cb0; text-decoration: none;">{{ $(\'AI Agent\').item.json.output.topArticles[3].title }}</a>\n                                        </h3>\n                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 10px;">\n                                            <tr>\n                                                <td style="font-size: 13px; color: #718096; text-align: right;">{{ $(\'AI Agent\').item.json.output.topArticles[3].source }} | {{ $(\'AI Agent\').item.json.output.topArticles[3].date }}</td>\n                                                <td style="text-align: left;">\n                                                    <div style="display: inline-block; padding: 3px 10px; border-radius: 30px; font-weight: 500; font-size: 12px; background-color: rgba(247, 185, 85, 0.1); color: #f7b955;">\n                                                        {{ $(\'AI Agent\').item.json.output.topArticles[3].sentimentHebrew }}\n                                                    </div>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                    \n                    <!-- מאמר 5 -->\n                    <tr>\n                        <td style="padding-bottom: 16px;">\n                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">\n                                <tr>\n                                    <td width="4" style="background-color: #f7b955;"></td>\n                                    <td style="padding: 18px 22px;">\n                                        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: right;">\n                                            <a href="{{ $(\'AI Agent\').item.json.output.topArticles[4].url }}" target="_blank" style="color: #2b6cb0; text-decoration: none;">{{ $(\'AI Agent\').item.json.output.topArticles[4].title }}</a>\n                                        </h3>\n                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-top: 10px;">\n                                            <tr>\n                                                <td style="font-size: 13px; color: #718096; text-align: right;">{{ $(\'AI Agent\').item.json.output.topArticles[4].source }} | {{ $(\'AI Agent\').item.json.output.topArticles[4].date }}</td>\n                                                <td style="text-align: left;">\n                                                    <div style="display: inline-block; padding: 3px 10px; border-radius: 30px; font-weight: 500; font-size: 12px; background-color: rgba(247, 185, 85, 0.1); color: #f7b955;">\n                                                        {{ $(\'AI Agent\').item.json.output.topArticles[4].sentimentHebrew }}\n                                                    </div>\n                                                </td>\n                                            </tr>\n                                        </table>\n                                    </td>\n                                </tr>\n                            </table>\n                        </td>\n                    </tr>\n                </table>\n            </div>\n              \n    <!-- נושאים חמים - גרסה משופרת למובייל -->\n    <div style="margin-bottom: 30px; text-align: right;">\n        <h2 style="font-size: 20px; color: #1a202c; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #edf2f7; font-weight: 700; text-align: right;">נושאים חמים</h2>\n        \n        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px 25px; text-align: right;">\n            <p style="margin: 0 0 15px 0; font-size: 15px; color: #4a5568; text-align: right;">הנושאים המרכזיים שמופיעים בחדשות על {{ $(\'AI Agent\').item.json.output.stockSymbol }}:</p>\n            \n            <!-- נושא 1 -->\n            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #edf2f7;">\n                <div style="display: table; width: 100%; margin-bottom: 8px;">\n                    <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; font-size: 15px;">\n                        {{ $(\'AI Agent\').item.json.output.hotTopics[0].topic }}\n                    </div>\n                    <div style="display: table-cell; vertical-align: middle; text-align: left; white-space: nowrap;">\n                        <div style="display: inline-block; background-color: #edf2f7; border-radius: 30px; padding: 4px 12px; font-size: 13px; color: #4a5568; text-align: center;">\n                            <strong>{{ $(\'AI Agent\').item.json.output.hotTopics[0].article_count }}</strong> מאמרים\n                        </div>\n                    </div>\n                </div>\n                <div style="background-color: #e2e8f0; height: 4px; width: 100%; border-radius: 2px; overflow: hidden;">\n                    <div style="background-color: #4299e1; height: 100%; width: calc({{ $(\'AI Agent\').item.json.output.hotTopics[0].average_relevance }} * 100%);"></div>\n                </div>\n                <div style="text-align: left; font-size: 12px; color: #718096; margin-top: 4px;">רלוונטיות: {{ $(\'AI Agent\').item.json.output.hotTopics[0].average_relevance }}</div>\n            </div>\n            \n            <!-- נושא 2 -->\n            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #edf2f7;">\n                <div style="display: table; width: 100%; margin-bottom: 8px;">\n                    <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; font-size: 15px;">\n                        {{ $(\'AI Agent\').item.json.output.hotTopics[1].topic }}\n                    </div>\n                    <div style="display: table-cell; vertical-align: middle; text-align: left; white-space: nowrap;">\n                        <div style="display: inline-block; background-color: #edf2f7; border-radius: 30px; padding: 4px 12px; font-size: 13px; color: #4a5568; text-align: center;">\n                            <strong>{{ $(\'AI Agent\').item.json.output.hotTopics[1].article_count }}</strong> מאמרים\n                        </div>\n                    </div>\n                </div>\n                <div style="background-color: #e2e8f0; height: 4px; width: 100%; border-radius: 2px; overflow: hidden;">\n                    <div style="background-color: #4299e1; height: 100%; width: calc({{ $(\'AI Agent\').item.json.output.hotTopics[1].average_relevance }} * 100%);"></div>\n                </div>\n                <div style="text-align: left; font-size: 12px; color: #718096; margin-top: 4px;">רלוונטיות: {{ $(\'AI Agent\').item.json.output.hotTopics[1].average_relevance }}</div>\n            </div>\n            \n            <!-- נושא 3 -->\n            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #edf2f7;">\n                <div style="display: table; width: 100%; margin-bottom: 8px;">\n                    <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; font-size: 15px;">\n                        {{ $(\'AI Agent\').item.json.output.hotTopics[2].topic }}\n                    </div>\n                    <div style="display: table-cell; vertical-align: middle; text-align: left; white-space: nowrap;">\n                        <div style="display: inline-block; background-color: #edf2f7; border-radius: 30px; padding: 4px 12px; font-size: 13px; color: #4a5568; text-align: center;">\n                            <strong>{{ $(\'AI Agent\').item.json.output.hotTopics[2].article_count }}</strong> מאמרים\n                        </div>\n                    </div>\n                </div>\n                <div style="background-color: #e2e8f0; height: 4px; width: 100%; border-radius: 2px; overflow: hidden;">\n                    <div style="background-color: #4299e1; height: 100%; width: calc({{ $(\'AI Agent\').item.json.output.hotTopics[2].average_relevance }} * 100%);"></div>\n                </div>\n                <div style="text-align: left; font-size: 12px; color: #718096; margin-top: 4px;">רלוונטיות: {{ $(\'AI Agent\').item.json.output.hotTopics[2].average_relevance }}</div>\n            </div>\n            \n            <!-- נושא 4 -->\n            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #edf2f7;">\n                <div style="display: table; width: 100%; margin-bottom: 8px;">\n                    <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; font-size: 15px;">\n                        {{ $(\'AI Agent\').item.json.output.hotTopics[3].topic }}\n                    </div>\n                    <div style="display: table-cell; vertical-align: middle; text-align: left; white-space: nowrap;">\n                        <div style="display: inline-block; background-color: #edf2f7; border-radius: 30px; padding: 4px 12px; font-size: 13px; color: #4a5568; text-align: center;">\n                            <strong>{{ $(\'AI Agent\').item.json.output.hotTopics[3].article_count }}</strong> מאמרים\n                        </div>\n                    </div>\n                </div>\n                <div style="background-color: #e2e8f0; height: 4px; width: 100%; border-radius: 2px; overflow: hidden;">\n                    <div style="background-color: #4299e1; height: 100%; width: calc({{ $(\'AI Agent\').item.json.output.hotTopics[3].average_relevance }} * 100%);"></div>\n                </div>\n                <div style="text-align: left; font-size: 12px; color: #718096; margin-top: 4px;">רלוונטיות: {{ $(\'AI Agent\').item.json.output.hotTopics[3].average_relevance }}</div>\n            </div>\n            \n            <!-- נושא 5 -->\n            <div style="margin-bottom: 0;">\n                <div style="display: table; width: 100%; margin-bottom: 8px;">\n                    <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; font-size: 15px;">\n                        {{ $(\'AI Agent\').item.json.output.hotTopics[4].topic }}\n                    </div>\n                    <div style="display: table-cell; vertical-align: middle; text-align: left; white-space: nowrap;">\n                        <div style="display: inline-block; background-color: #edf2f7; border-radius: 30px; padding: 4px 12px; font-size: 13px; color: #4a5568; text-align: center;">\n                            <strong>{{ $(\'AI Agent\').item.json.output.hotTopics[4].article_count }}</strong> מאמרים\n                        </div>\n                    </div>\n                </div>\n                <div style="background-color: #e2e8f0; height: 4px; width: 100%; border-radius: 2px; overflow: hidden;">\n                    <div style="background-color: #4299e1; height: 100%; width: calc({{ $(\'AI Agent\').item.json.output.hotTopics[4].average_relevance }} * 100%);"></div>\n                </div>\n                <div style="text-align: left; font-size: 12px; color: #718096; margin-top: 4px;">רלוונטיות: {{ $(\'AI Agent\').item.json.output.hotTopics[4].average_relevance }}</div>\n            </div>\n        </div>\n    </div>\n	        \n        <!-- פוטר -->\n        <div style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #edf2f7;">\n            <div style="font-size: 13px; color: #718096; line-height: 1.6;">\n                <p style="margin: 0 0 8px 0;">דוח זה נוצר באופן אוטומטי ואינו מהווה המלצת השקעה.</p>\n                <p style="margin: 0;">יש להתייעץ עם יועץ השקעות מורשה לפני קבלת החלטות השקעה.</p>\n            </div>\n            <div style="margin-top: 20px;">\n                נבנה ב-❤️ ע"י <a href="https://www.linkedin.com/in/elay-g" style="display: inline-block; text-decoration: none;">עילי גז</a>\n            </div>\n        </div>\n        \n    </div>\n\n</body>\n</html>',
				},
				position: [1860, -100],
				name: 'Generate HTML',
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
						"// New function to remove topics with only one article - ultra-simple approach\nfunction removeSingleArticleTopics(html) {\n  // First, see if there are any topics with exactly 1 article\n  if (!html.includes('<strong>1</strong> מאמרים')) {\n    console.log('No topics with 1 article found');\n    return html;\n  }\n\n  // Find each line that contains the \"נושא\" comment\n  // and check if it has exactly 1 article mentioned\n  const lines = html.split('\\n');\n  const linesToRemove = [];\n\n  // For each line containing \"1 מאמרים\", find the topic it belongs to\n  for (let i = 0; i < lines.length; i++) {\n    if (lines[i].includes('<strong>1</strong> מאמרים')) {\n      console.log(`Found line ${i} with 1 article mention`);\n      \n      // Go back to find the start of this topic\n      let startLine = -1;\n      for (let j = i; j >= 0; j--) {\n        if (lines[j].includes('<!-- נושא') || \n            lines[j].includes('<div style=\"margin-bottom: 15px; padding-bottom: 15px; border-bottom:')) {\n          startLine = j;\n          break;\n        }\n      }\n      \n      if (startLine === -1) {\n        console.log(`Couldn't find start of topic for line ${i}`);\n        continue;\n      }\n      \n      // Go forward to find the end of this topic\n      let endLine = -1;\n      let divCount = 0;\n      for (let j = startLine; j < lines.length; j++) {\n        // Count opening divs\n        const openMatches = lines[j].match(/<div/g);\n        if (openMatches) {\n          divCount += openMatches.length;\n        }\n        \n        // Count closing divs\n        const closeMatches = lines[j].match(/<\\/div>/g);\n        if (closeMatches) {\n          divCount -= closeMatches.length;\n        }\n        \n        // When divCount returns to 0, we've found the end\n        if (divCount === 0 && j > startLine) {\n          endLine = j;\n          break;\n        }\n      }\n      \n      if (endLine === -1) {\n        console.log(`Couldn't find end of topic for line ${i}`);\n        continue;\n      }\n      \n      // Now we have the start and end lines of the topic\n      console.log(`Found topic from line ${startLine} to ${endLine}`);\n      \n      // Mark these lines for removal\n      for (let j = startLine; j <= endLine; j++) {\n        linesToRemove.push(j);\n      }\n    }\n  }\n  \n  // Remove the marked lines\n  const newLines = [];\n  for (let i = 0; i < lines.length; i++) {\n    if (!linesToRemove.includes(i)) {\n      newLines.push(lines[i]);\n    }\n  }\n  \n  console.log(`Removed ${linesToRemove.length} lines in total`);\n  return newLines.join('\\n');\n}// Code for updating colors according to sentiment - for n8n\n\n// Define colors by sentiment type\nconst colors = {\n  positive: {\n    main: '#29cc7a',          // Green\n    background: 'rgba(41, 204, 122, 0.15)',\n    gradient: 'rgba(41, 204, 122, 0.07)',\n    accent: 'rgba(41, 204, 122, 0.1)'\n  },\n  neutral: {\n    main: '#f7b955',          // Orange\n    background: 'rgba(247, 185, 85, 0.15)',\n    gradient: 'rgba(247, 185, 85, 0.07)',\n    accent: 'rgba(247, 185, 85, 0.1)'\n  },\n  negative: {\n    main: '#f55e5e',          // Red\n    background: 'rgba(245, 94, 94, 0.15)',\n    gradient: 'rgba(245, 94, 94, 0.07)',\n    accent: 'rgba(245, 94, 94, 0.1)'\n  }\n};\n\n// Function to identify sentiment type from text\nfunction getSentimentType(text) {\n  if (!text) return 'neutral';\n  \n  const lowerText = text.toLowerCase();\n  \n  // Negative keywords - check first because there are expressions with both \"positive\" and \"negative\" together\n  if (lowerText.includes('שלילי') || lowerText.includes('negative') || \n      lowerText.includes('bearish') || lowerText.includes('ירידה') || \n      lowerText.includes('דובי') || lowerText.includes('מכירה') || \n      lowerText.includes('שלילי-חזק') || lowerText.includes('שלילי-חלש') ||\n      lowerText.includes('שלילית')) {\n    return 'negative';\n  }\n  \n  // Positive keywords\n  if (lowerText.includes('חיובי') || lowerText.includes('positive') || \n      lowerText.includes('bullish') || lowerText.includes('עלייה') || \n      lowerText.includes('שורי') || lowerText.includes('קנייה') || \n      lowerText.includes('חיובי-חזק') || lowerText.includes('חיובי-חלש') ||\n      lowerText.includes('חיובית')) {\n    return 'positive';\n  }\n  \n  // Additional check for expressions containing only \"strong\" or \"weak\"\n  if (lowerText.includes('חזק')) {\n    // If no negative word, assume it's positive\n    return 'positive';\n  }\n  \n  // Default - neutral\n  return 'neutral';\n}\n\n// Function to check if a specific text belongs to a sentiment - used for bug fixing\nfunction debugSentiment(text) {\n  console.log(`Sentiment check: \"${text}\" => ${getSentimentType(text)}`);\n}\n\n// New function to remove undefined articles from HTML\nfunction removeUndefinedArticles(html) {\n  // Find all article blocks\n  const articleBlocksRegex = /<tr>\\s*<td style=\"padding-bottom: 16px;\">\\s*<table[^>]*>[\\s\\S]*?<\\/table>\\s*<\\/td>\\s*<\\/tr>/g;\n  const articleBlocks = Array.from(html.matchAll(articleBlocksRegex));\n  \n  // No articles found\n  if (!articleBlocks || articleBlocks.length === 0) {\n    console.log(\"No article blocks found\");\n    return html;\n  }\n  \n  // Function to check if an article is fully undefined\n  function isFullyUndefinedArticle(articleHtml) {\n    // An article is considered fully undefined if:\n    // 1. It has href=\"undefined\"\n    // 2. It has link text that is \"undefined\"\n    // 3. It has \"undefined | undefined\" (source and date)\n    return articleHtml.includes('href=\"undefined\"') && \n           articleHtml.includes('>undefined</a>') &&\n           articleHtml.includes('undefined | undefined');\n  }\n  \n  // Identify blocks to remove\n  const blocksToRemove = [];\n  for (const match of articleBlocks) {\n    const block = match[0];\n    if (isFullyUndefinedArticle(block)) {\n      console.log(\"Found undefined article, will remove\");\n      blocksToRemove.push(match);\n    } else {\n      console.log(\"Found valid article, keeping it\");\n    }\n  }\n  \n  // If no blocks to remove, return original HTML\n  if (blocksToRemove.length === 0) {\n    console.log(\"No undefined articles found to remove\");\n    return html;\n  }\n  \n  console.log(`Found ${blocksToRemove.length} undefined articles to remove`);\n  \n  // Create a new string by removing the matches from end to start (to avoid index shifting)\n  let cleanedHtml = html;\n  for (let i = blocksToRemove.length - 1; i >= 0; i--) {\n    const match = blocksToRemove[i];\n    cleanedHtml = cleanedHtml.slice(0, match.index) + cleanedHtml.slice(match.index + match[0].length);\n  }\n  \n  return cleanedHtml;\n}\n\n// Get the HTML from the specified parameter\nconst html = $input.first().json.html;\nlet updatedHtml = html;\n\n// Bug checks - check several keywords\ndebugSentiment(\"חיובי\");\ndebugSentiment(\"שלילי\");\ndebugSentiment(\"נייטרלי\");\ndebugSentiment(\"חיובי-חזק\");\ndebugSentiment(\"שלילי-חזק\");\ndebugSentiment(\"חיובי-חלש\");\ndebugSentiment(\"שלילי-חלש\");\n\n// 1. Update colors in the recommendation title\nconst titleMatch = html.match(/<h2 style=\"[^\"]*color: #[a-f0-9]+;[^\"]*\">([^<]+)<\\/h2>/i);\nif (titleMatch) {\n  const titleText = titleMatch[1].trim();\n  const titleSentiment = getSentimentType(titleText);\n  \n  // Update title color\n  updatedHtml = updatedHtml.replace(\n    /(<h2 style=\"[^\"]*color: )#[a-f0-9]+(;[^\"]*\">)/i,\n    `$1${colors[titleSentiment].main}$2`\n  );\n  \n  // Update side bar color\n  updatedHtml = updatedHtml.replace(\n    /(<div style=\"position: absolute; right: 0; top: 0; bottom: 0; width: 6px; background-color: )#[a-f0-9]+(;\"><\\/div>)/i,\n    `$1${colors[titleSentiment].main}$2`\n  );\n  \n  // Update gradient color\n  updatedHtml = updatedHtml.replace(\n    /(<div style=\"position: absolute; right: 0; top: 0; width: 100%; height: 100%; background: linear-gradient\\(90deg, )rgba\\([^)]+\\)( 0%, )rgba\\([^)]+\\)( 50%\\);\"><\\/div>)/i,\n    `$1${colors[titleSentiment].gradient}$2${colors[titleSentiment].gradient.replace('0.07', '0')}$3`\n  );\n  \n  // Update icon background color\n  updatedHtml = updatedHtml.replace(\n    /(<div style=\"display: inline-block; width: 40px; height: 40px; border-radius: 50%; margin-bottom: 10px; background-color: )rgba\\([^)]+\\)(; text-align: center;\">)/i,\n    `$1${colors[titleSentiment].background}$2`\n  );\n}\n\n// 2. Update overall sentiment color\nconst sentimentMatch = updatedHtml.match(/<span style=\"[^\"]*font-weight: 600; color: #[a-f0-9]+;[^\"]*\">([^<]+)<\\/span>/i);\nif (sentimentMatch) {\n  const sentimentText = sentimentMatch[1].trim();\n  const sentimentType = getSentimentType(sentimentText);\n  \n  updatedHtml = updatedHtml.replace(\n    /(<span style=\"[^\"]*font-weight: 600; color: )#[a-f0-9]+(;[^\"]*\">)/i,\n    `$1${colors[sentimentType].main}$2`\n  );\n}\n\n// 3. Update article colors\nconst articleBlocks = updatedHtml.match(/<tr>\\s*<td style=\"padding-bottom: 16px;\">\\s*<table[^>]*>[\\s\\S]*?<\\/table>\\s*<\\/td>\\s*<\\/tr>/g);\nif (articleBlocks) {\n  for (const block of articleBlocks) {\n    // Check if this is a fully undefined article before skipping\n    const isUndefined = block.includes('href=\"undefined\"') && \n                        block.includes('>undefined</a>') && \n                        block.includes('undefined | undefined');\n    \n    // Skip if this is a completely undefined article\n    if (isUndefined) {\n      console.log(\"Skipping color update for undefined article\");\n      continue;\n    }\n    \n    // Find sentiment within the block\n    const articleSentimentMatch = block.match(/<div style=\"[^\"]*padding: 3px 10px;[^\"]*\">([^<]+)<\\/div>/i);\n    if (articleSentimentMatch) {\n      const articleSentimentText = articleSentimentMatch[1].trim();\n      const articleSentimentType = getSentimentType(articleSentimentText);\n      \n      // Debug check - log the identified sentiment\n      debugSentiment(articleSentimentText);\n      \n      // Create updated block\n      let updatedBlock = block;\n      \n      // Update side line color\n      updatedBlock = updatedBlock.replace(\n        /(<td width=\"4\" style=\"background-color: )#[a-f0-9]+(;\"><\\/td>)/i,\n        `$1${colors[articleSentimentType].main}$2`\n      );\n      \n      // Update sentiment tag colors (background and text color)\n      updatedBlock = updatedBlock.replace(\n        /(<div style=\"[^\"]*background-color: )rgba\\([^)]+\\)(; color: )#[a-f0-9]+(;[^\"]*\">)/i,\n        `$1${colors[articleSentimentType].accent}$2${colors[articleSentimentType].main}$3`\n      );\n      \n      // Replace the block with its updated version\n      updatedHtml = updatedHtml.replace(block, updatedBlock);\n    }\n  }\n}\n\n// 4. Update recommendation button color\nconst buttonMatch = updatedHtml.match(/<a style=\"[^\"]*background-color: #[a-f0-9]+;[^\"]*\">([^<]+)<\\/a>/i);\nif (buttonMatch) {\n  const buttonText = buttonMatch[1].trim();\n  let buttonSentiment = 'neutral'; // Default\n  \n  // Determine sentiment based on button text\n  if (buttonText.includes(\"ממליץ לקנות\")) {\n    buttonSentiment = 'positive';\n  } else if (buttonText.includes(\"ממליץ למכור\")) {\n    buttonSentiment = 'negative';\n  } else if (buttonText.includes(\"ממליץ לחכות\")) {\n    buttonSentiment = 'neutral';\n  }\n  \n  // Update button background color\n  updatedHtml = updatedHtml.replace(\n    /(<a style=\"[^\"]*background-color: )#[a-f0-9]+(;[^\"]*\">)/i,\n    `$1${colors[buttonSentiment].main}$2`\n  );\n  \n  // Update box-shadow color\n  const boxShadowRgba = `rgba(${parseInt(colors[buttonSentiment].main.substring(1, 3), 16)}, ${parseInt(colors[buttonSentiment].main.substring(3, 5), 16)}, ${parseInt(colors[buttonSentiment].main.substring(5, 7), 16)}, 0.25)`;\n  updatedHtml = updatedHtml.replace(\n    /(box-shadow: 0 4px 6px )rgba\\([^)]+\\)(;[^\"]*\">)/i,\n    `$1${boxShadowRgba}$2`\n  );\n}\n\n// 5. Remove undefined articles\nupdatedHtml = removeUndefinedArticles(updatedHtml);\n\n// 6. Remove topics with only one article\nupdatedHtml = removeSingleArticleTopics(updatedHtml);\n\n// Return updated HTML\nreturn { html: updatedHtml };",
				},
				position: [2080, -100],
				name: 'Adjust HTML Colors',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: '={{ $json.html }}',
					options: {},
					subject:
						"=הסקירה היומית של מניית {{ $('AI Agent').item.json.output.stockSymbol }}: {{ $('AI Agent').item.json.output.analysisDate }}",
					toEmail: '={{ $(\'On form submission\').item.json["Email:"] }}',
					fromEmail: "Elay's AI Assistant <user@example.com>",
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [2280, -100],
				name: 'Send Stock Analysis',
			},
		}),
	)
	.add(
		sticky(
			'# AI Agent\nAI agent powered by GPT-4o that analyses stocks by combining technical analysis and news sentiment, generating detailed reports in Hebrew with data-driven investment recommendations',
			{ color: 4, position: [680, -220], width: 1820, height: 580 },
		),
	)
	.add(
		sticky(
			"# Technical Analysis Tool\nA tool that performs in-depth technical analysis of stock charts by combining visual pattern recognition with quantitative indicators. It fetches data from Chart-img API for generating visual charts, Twelve Data API for historical prices and technical indicators (Bollinger Bands, MACD), and uses OpenAI's GPT-4o for visual chart pattern recognition.\nThe system synthesizes this multi-source data into a comprehensive technical assessment with actionable trading insights based on support/resistance levels, Fibonacci retracements, and candlestick patterns.",
			{ name: 'Sticky Note1', position: [680, 380], width: 2820, height: 920 },
		),
	)
	.add(
		sticky(
			"# Trends Analysis Tool\nA tool that analyses news sentiment for requested stocks by fetching recent financial news articles, calculating sentiment metrics, identifying influential stories, and extracting trending topics. It processes data from Alpha Vantage's news API, determines overall market sentiment, and delivers structured analysis on stock sentiment, relevance, and market outlook.",
			{ name: 'Sticky Note2', position: [2520, -220], width: 980, height: 580 },
		),
	)
	.add(
		sticky('### Replace OpenAI Credentials', {
			name: 'Sticky Note8',
			color: 3,
			position: [940, 260],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace Alphavantage API Key', {
			name: 'Sticky Note16',
			color: 3,
			position: [2900, 120],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace OpenAI Credentials', {
			name: 'Sticky Note14',
			color: 3,
			position: [1800, 680],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace OpenAI Credentials', {
			name: 'Sticky Note15',
			color: 3,
			position: [2900, 920],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace Chart-img API Key', {
			name: 'Sticky Note17',
			color: 3,
			position: [1300, 680],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace TwelveData API Key', {
			name: 'Sticky Note19',
			color: 3,
			position: [920, 980],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('### Replace SMTP Credentials', {
			name: 'Sticky Note13',
			color: 3,
			position: [2280, 60],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky(
			'# Advance Stock Analysis (both Technical and Trends) Using GPT4o Powered AI Agent\n\n## Built by  [Elay Guez](https://www.linkedin.com/in/elay-g)',
			{ name: 'Sticky Note3', color: 7, position: [220, -220], width: 440, height: 300 },
		),
	)
	.add(
		sticky(
			"### Overview ###\n\nGet comprehensive stock analysis with this AI-powered workflow that provides actionable insights for your investment decisions. On a weekly basis, this workflow:\n\n- Analyzes stock data from multiple sources (Chart-img, Twelve Data API, Alphavantage)\n- Performs technical analysis using advanced indicators (RSI, MACD, Bollinger Bands, Resistance and Support Levels)\n- Scans financial news from Alpha Vantage to capture market sentiment\n- Uses OpenAI's GPT-4o to identify patterns, trends, and trading opportunities\n- Generates a fully styled, responsive HTML email (with proper RTL layout) in Hebrew\n- Sends detailed recommendations directly to your inbox\n\n**Perfect for investors, traders, and financial analysts who want data-driven stock insights - combining technical indicators with news sentiment for more informed decisions.**\n\n### Setup Instructions ###\n\n**Estimated setup time:**\n- 15 minutes\n\n**Required credentials:**\n- OpenAI API Key\n- Chart-img API Key (free tier)\n- Twelve Data API Key (free tier)\n- Alpha Vantage API Key (free tier)\n- SMTP credentials (for email delivery)\n\n**Steps:**\n\n1. Import this template into your n8n instance.\n2. Add your API keys under credentials.\n3. Configure the SMTP Email node with: Host (e.g., smtp.gmail.com), Port (465 or 587), Username (your email), Password (app-specific password or login).\n4. Activate the workflow.\n5. Fill in the Form.\n6. **Enjoy!** (Check your Spam mailbox)\n\n### Important Note: ###\nThis report is being generated automatically and does not constitute an investment recommendation. **Please consult a licensed investment advisor before making any investment decisions.**",
			{ name: 'Sticky Note4', color: 7, position: [220, 100], width: 440, height: 1200 },
		),
	);
