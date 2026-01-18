const wf = workflow('kZ3wJtLi5OI0WzFF', 'HTX AI Agent v1.02', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-1008, 240],
				name: 'Telegram Trigger',
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
						'if ($input.first().json.message.from.id !== <<Replace>>) { // Replace with your actual ID\n  return {unauthorized: true};\n} else {\n  // Return the original data when authorized\n  return $input.all();\n}',
				},
				position: [-688, 240],
				name: 'User Authentication (Replace Telegram ID)',
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
								id: '47598bf1-e55f-4cc0-ae75-272085e7ce02',
								name: '=sessionId',
								type: 'string',
								value: '={{ $json.message.chat.id }}',
							},
							{
								id: 'daa49d74-e55e-47bc-ac52-8686d591ab83',
								name: 'message',
								type: 'string',
								value: '={{ $json.message.text }}',
							},
						],
					},
				},
				position: [-416, 240],
				name: 'Adds "SessionId"',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '={{ $json.message }}',
					options: {
						systemMessage:
							'You are the **HTX Spot Market Data Agent**.\n\nYou have **HTTP request access** to the official **HTX REST API** (`https://api.huobi.pro`) to retrieve spot market data for any requested trading pair.\n\nYour job is to **fetch and present raw market data only**.  \nYou do **not** analyze, predict, or recommend.\n\n---\n\n## 🔗 Available Endpoints\n\n1. **Live Price (Aggregated Ticker)**  \n   `GET /market/detail/merged`  \n   • Returns best bid/ask, last trade price, volume, turnover.\n\n2. **24h Market Summary**  \n   `GET /market/detail`  \n   • 24h stats: open, high, low, close, volume, amount, count.\n\n3. **Market Depth**  \n   `GET /market/depth`  \n   • Order book bids/asks (step/levels configurable).\n\n4. **Full Order Book**  \n   `GET /market/fullMbp`  \n   • Complete market depth (up to 5000 levels).\n\n5. **Last Trade**  \n   `GET /market/trade`  \n   • Most recent single trade.\n\n6. **Recent Trades**  \n   `GET /market/history/trade`  \n   • List of recent trades.\n\n7. **Klines (Candlesticks)**  \n   `GET /market/history/kline`  \n   • Multiple intervals supported (`1s, 1min, 5min, 15min, 1day, 1week, 1mon, 1year`).  \n   • The AI automatically selects the correct interval (`seconds, minutes, days, weeks, months, years`).\n\n---\n\n## 📤 Output Format\n\nAlways respond in **clean, structured text** (Telegram HTML). Example:\n\n```\n\nBTC-USDT — HTX Spot Data\n\nPrice\n• Last: 58000.12\n• Change (24h): +2.4%\n\n24h Stats\n• Open: 56500 • High: 58500 • Low: 56200\n• Volume: 12,430 BTC • Turnover: 720M USDT\n\nOrder Book (Top 5)\n• Bids: \\[57990 x 0.5], \\[57980 x 1.2], …\n• Asks: \\[58010 x 0.8], \\[58020 x 1.5], …\n\nKlines (15m, latest 5)\n• O/H/L/C: 57800 / 58020 / 57750 / 57990\n\n```\n\n---\n\n## ⚠️ Rules\n\n* Always **call the correct HTX API endpoint**.  \n* Do **not** fabricate or calculate values (except simple formatting).  \n* Do **not** output raw JSON.  \n* Do **not** give advice, predictions, or strategies.  \n* If data is missing, output `N/A`.\n```\n\n',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1.1,
							config: {
								parameters: {
									description:
										'### 🏷 Tool: **Think**\n\n**Purpose:**\n\n* Lightweight **reasoning helper**.\n* Lets the AI Agent process intermediate logic, format outputs, or decide how to combine multiple API results before sending the final report.\n* Does not fetch data itself.\n\n**Use cases:**\n\n* Clean/reshape JSON from Binance endpoints\n* Extract only the needed fields (e.g., `lastPrice`, `volume`)\n* Help prepare data for Telegram message formatting\n\n**n8n setup notes:**\n\n* No API call, just an **AI Tool** node.\n* Connect upstream API results → Think → Report Agent.',
								},
								name: 'Think',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/detail',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **24h Stats (Ticker Detail)**\n\n**Endpoint:** `GET /market/detail`\n**What it does:** Returns the **24h rolling summary** for a single HTX spot symbol: **open/high/low/close**, **amount (base volume)**, **vol (quote turnover)**, and **trade count**.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns (core fields):** `ts`, `tick.open`, `tick.close`, `tick.high`, `tick.low`, `tick.amount`, `tick.vol`, `tick.count`.\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** For all symbols at once, use `GET /market/tickers`.\n",
								},
								name: '24h Stats',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							version: 1,
							config: { name: 'Calculator' },
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/detail/merged',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Best Bid/Ask (Order Book Ticker)**\n\n**Endpoint:** `GET /market/detail/merged`\n\n**What it does:** Returns the best **bid/ask** snapshot along with the latest trade price for a symbol.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns:** `tick.bid` = `[price, qty]`, `tick.ask` = `[price, qty]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** Use lowercase symbols without `-` or `/` (e.g., `btcusdt`).",
								},
								name: 'Best Bid/Ask',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/detail/merged',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Merged Ticker (Bid/Ask/Last)**\n\n**Endpoint:** `GET /market/detail/merged`\n**What it does:** Returns best bid/ask and last price for a symbol. Use Calculator to derive a midpoint `(bid+ask)/2` if you need an average.\n\n**Params:** `symbol` (STRING, required) → lowercase, no dash (e.g., `btcusdt`)\n\n**Returns (key fields):** `tick.bid`, `tick.ask`, `tick.close`, `tick.high`, `tick.low`, `tick.amount`, `tick.vol`, `ts`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** HTX has no direct avg-price endpoint; this is the canonical ticker to pair with Calculator for midpoint.",
								},
								name: 'Average Price',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/history/trade',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
											{
												name: 'size',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `100`, 'number') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Recent Trades**\n\n**Endpoint:** `GET /market/history/trade`\n**What it does:** Returns the most recent trades for a given symbol.\n\n**Params:**\n* `symbol` (STRING, required) → lowercase, no dash (e.g., `btcusdt`)\n* `size` (INT, default 100, max 2000 — we set default 100)\n\n**Returns:** array of trade batches → each batch has `data: [{id, price, amount, direction, ts}]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\nsize   = $fromAI('parameters1_Value', 100, 'number')\n```\n\n**Notes:** Unlike Binance, HTX nests trades inside `data` arrays per batch.",
								},
								name: 'Recent Trades',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/detail/merged',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Price (Latest)**\n\n**Endpoint:** `GET /market/detail/merged`\n\n**What it does:** Returns the **latest trade price**, best bid/ask, and other snapshot details for a symbol.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns:** `tick.close` = last trade price, plus bid/ask/volumes.\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** Use lowercase symbols without `-` or `/` (e.g., `btcusdt`).",
								},
								name: 'Price (Latest)',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/history/kline',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
											{
												name: 'period',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `15min`, 'string') }}",
											},
											{
												name: 'size',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters2_Value', `20`, 'number') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Klines (Candles)**\n\n**Endpoint:** `GET /market/history/kline`\n\n**What it does:** Returns candlestick data for a symbol/interval.\n\n**Params:**\n- `symbol` (STRING, required) → lowercase (e.g., `btcusdt`)\n- `period` (ENUM, required — e.g., `1min,5min,15min,30min,60min,4hour,1day,1mon,1week,1year`)\n- `size` (INT, optional, default 20, max 2000)\n\n**Returns (array per candle):** `[id, open, close, low, high, amount, vol, count]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\nperiod = $fromAI('parameters1_Value', '15min', 'string')\nsize   = $fromAI('parameters2_Value', 20, 'number')\n```\n\n**Notes:**\n- Use lowercase symbols without `-` (e.g., `btcusdt`).\n- If no `size` provided, defaults to 20 latest candles.",
								},
								name: 'Klines (Candles)',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.huobi.pro/market/depth',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'symbol',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `btcusdt`, 'string') }}",
											},
											{
												name: 'type',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `step0`, 'string') }}",
											},
											{
												name: 'depth',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters2_Value', `20`, 'number') }}",
											},
										],
									},
									toolDescription:
										"### 🏷 Tool: **Order Book Depth**\n\n**Endpoint:** `GET /market/depth`\n\n**What it does:** Returns the **order book snapshot** (bids/asks) for a trading pair up to the requested depth level.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n- `type` (STRING, required) → depth aggregation level (`step0`–`step5`)\n  - `step0` = no aggregation (full precision)\n  - `step1` = aggregated to 1 decimal place\n  - … up to `step5`\n- `depth` (INT, optional) → max entries per side (default 20, max 150)\n\n**Returns:** `ts`, `tick.bids: [[price, qty], ...]`, `tick.asks: [[price, qty], ...]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\ntype   = $fromAI('parameters1_Value', 'step0', 'string')\ndepth  = $fromAI('parameters2_Value', 20, 'number')\n```\n\n**Notes:** For lightweight quick book snapshot, use `step0` with smaller depth (20/50).",
								},
								name: 'Order Book Depth',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Simple Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1-mini',
									cachedResultName: 'gpt-4.1-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [-96, 240],
				name: 'HTX AI Agent',
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
						'// Input: assumes incoming message in `item.json.message`\nconst input = $json.output;\nconst chunkSize = 4000;\n\n// Function to split text\nfunction splitMessage(text, size) {\n  const result = [];\n  for (let i = 0; i < text.length; i += size) {\n    result.push(text.substring(i, i + size));\n  }\n  return result;\n}\n\n// Logic\nif (input.length <= chunkSize) {\n  return [{ json: { message: input } }];\n} else {\n  const chunks = splitMessage(input, chunkSize);\n  return chunks.map(chunk => ({ json: { message: chunk } }));\n}',
				},
				position: [464, 240],
				name: 'Splits message is more than 4000 characters',
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
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [896, 240],
				name: 'Telegram',
			},
		}),
	)
	.add(
		sticky(
			'## Trigger Incoming Telegram Command\nNode: Telegram Trigger\n**Listens for new Telegram messages** from users.\nTriggers the full agent process and passes raw user input downstream.',
			{ color: 4, position: [-1072, -32], height: 460 },
		),
	)
	.add(
		sticky(
			'## Validate User Access\nNode: User **Authentication\nChecks incoming Telegram ID** against the approved user list.',
			{ name: 'Sticky Note1', color: 2, position: [-752, -32], height: 460 },
		),
	)
	.add(
		sticky(
			'## Generate Session Metadata\nNode: Add S**essionId\nCreates a sessionId using the Telegram chat_id**.\nThis is passed into all downstream tools for memory and workflow routing.',
			{ name: 'Sticky Note2', color: 5, position: [-464, -32], height: 460 },
		),
	)
	.add(
		sticky(
			'## Main AI Agent: Data Fetcher (HTX)\n\n**Node: HTX Data Agent**\nThis is the **core orchestrator**. It uses OpenAI **only to format and present raw HTX market data**, not to analyze or generate strategies.\n\nIt has direct **HTTP request access** to the **HTX REST API** (`https://api.huobi.pro`) and retrieves:\n\n* **Live Price (Aggregated Ticker)** — `/market/detail/merged`\n  Returns best bid/ask + last trade price, volume, turnover.\n\n* **24h Market Summary** — `/market/detail`\n  Rolling 24-hour stats: open, high, low, close, volume, amount, count.\n\n* **Market Depth** — `/market/depth`\n  Order book bids/asks up to requested step/levels.\n\n* **Full Order Book** — `/market/fullMbp`\n  Complete market depth, up to **5000 levels**, refreshed once per second.\n\n* **Last Trade** — `/market/trade`\n  The latest executed trade.\n\n* **Recent Trades** — `/market/history/trade`\n  Most recent trades list.\n\n* **Klines (Candlesticks)** — `/market/history/kline`\n  Supports multiple intervals (`1s, 1min, 5min, 15min, 1day, 1week, 1mon, 1year`, etc.).\n  The AI chooses the correct interval keyword (`seconds, minutes, days, weeks, months, years`).\n\n',
			{ name: 'Sticky Note3', color: 7, position: [-192, -496], width: 480, height: 932 },
		),
	)
	.add(
		sticky(
			'## Handle Telegram Message Limits\nNode: Code (split logic)\nChecks if the **GPT output exceeds 4000 characters**.\nIf so, it splits the message into safe chunks and passes them on sequentially.',
			{ name: 'Sticky Note4', color: 5, position: [384, -32], width: 260, height: 460 },
		),
	)
	.add(
		sticky(
			'## Send Final Report to Telegram\nNode: Telegram sendMessage\nSends **formatted HTML report (or split chunks)** directly to the authenticated user via Telegram bot.',
			{ name: 'Sticky Note5', color: 4, position: [832, -32], height: 460 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## GPT Model for Reasoning\nNode: OpenAI Chat Model\nModel: **gpt-4o-mini**\nUsed to:\n\nInterpret signal values\n\nGenerate structured HTML\n\n**Recommend spot and leverage trades**\n\n',
			{ name: 'Sticky Note6', position: [-1344, 640], height: 540 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Order Book Depth**\n\n**Endpoint:** `GET /market/depth`\n\n**What it does:** Returns the **order book snapshot** (bids/asks) for a trading pair up to the requested depth level.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n- `type` (STRING, required) → depth aggregation level (`step0`–`step5`)\n  - `step0` = no aggregation (full precision)\n  - `step1` = aggregated to 1 decimal place\n  - … up to `step5`\n- `depth` (INT, optional) → max entries per side (default 20, max 150)\n\n**Returns:** `ts`, `tick.bids: [[price, qty], ...]`, `tick.asks: [[price, qty], ...]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\ntype   = $fromAI('parameters1_Value', 'step0', 'string')\ndepth  = $fromAI('parameters2_Value', 20, 'number')\n```\n\n**Notes:** For lightweight quick book snapshot, use `step0` with smaller depth (20/50).",
			{ name: 'Sticky Note7', color: 6, position: [-480, 512], height: 1076 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Best Bid/Ask (Order Book Ticker)**\n\n**Endpoint:** `GET /market/detail/merged`\n\n**What it does:** Returns the best **bid/ask** snapshot along with the latest trade price for a symbol.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns:** `tick.bid` = `[price, qty]`, `tick.ask` = `[price, qty]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** Use lowercase symbols without `-` or `/` (e.g., `btcusdt`).",
			{ name: 'Sticky Note8', color: 6, position: [128, 512], height: 868 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Short-Term Memory Module\nNode: **Simple Memory\nStores the sessionId**, symbol, and other state data.\nUseful for:\n\nMulti-turn Telegram interactions\n\nTracking indicator agreement across timeframes\n\n',
			{ name: 'Sticky Note9', color: 3, position: [-1072, 640], height: 540 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **24h Stats (Ticker Detail)**\n\n**Endpoint:** `GET /market/detail`\n**What it does:** Returns the **24h rolling summary** for a single HTX spot symbol: **open/high/low/close**, **amount (base volume)**, **vol (quote turnover)**, and **trade count**.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns (core fields):** `ts`, `tick.open`, `tick.close`, `tick.high`, `tick.low`, `tick.amount`, `tick.vol`, `tick.count`.\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** For all symbols at once, use `GET /market/tickers`.\n",
			{ name: 'Sticky Note10', color: 6, position: [-784, 512], height: 884 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n ### **Price (Latest)**\n\n**Endpoint:** `GET /market/detail/merged`\n\n**What it does:** Returns the **latest trade price**, best bid/ask, and other snapshot details for a symbol.\n\n**Params:**\n- `symbol` (STRING, required) → e.g., `btcusdt` (lowercase, no dash)\n\n**Returns:** `tick.close` = last trade price, plus bid/ask/volumes.\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** Use lowercase symbols without `-` or `/` (e.g., `btcusdt`).",
			{ name: 'Sticky Note11', color: 6, position: [-192, 512], height: 820 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Klines (Candles)**\n\n**Endpoint:** `GET /market/history/kline`\n\n**What it does:** Returns candlestick data for a symbol/interval.\n\n**Params:**\n- `symbol` (STRING, required) → lowercase (e.g., `btcusdt`)\n- `period` (ENUM, required — e.g., `1min,5min,15min,30min,60min,4hour,1day,1mon,1week,1year`)\n- `size` (INT, optional, default 20, max 2000)\n\n**Returns (array per candle):** `[id, open, close, low, high, amount, vol, count]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\nperiod = $fromAI('parameters1_Value', '15min', 'string')\nsize   = $fromAI('parameters2_Value', 20, 'number')\n```\n\n**Notes:**\n- Use lowercase symbols without `-` (e.g., `btcusdt`).\n- If no `size` provided, defaults to 20 latest candles.",
			{ name: 'Sticky Note12', color: 6, position: [464, 512], height: 1060 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Merged Ticker (Bid/Ask/Last)**\n\n**Endpoint:** `GET /market/detail/merged`\n**What it does:** Returns best bid/ask and last price for a symbol. Use Calculator to derive a midpoint `(bid+ask)/2` if you need an average.\n\n**Params:** `symbol` (STRING, required) → lowercase, no dash (e.g., `btcusdt`)\n\n**Returns (key fields):** `tick.bid`, `tick.ask`, `tick.close`, `tick.high`, `tick.low`, `tick.amount`, `tick.vol`, `ts`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\n```\n\n**Notes:** HTX has no direct avg-price endpoint; this is the canonical ticker to pair with Calculator for midpoint.",
			{ name: 'Sticky Note13', color: 6, position: [800, 512], height: 900 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Recent Trades**\n\n**Endpoint:** `GET /market/history/trade`\n**What it does:** Returns the most recent trades for a given symbol.\n\n**Params:**\n* `symbol` (STRING, required) → lowercase, no dash (e.g., `btcusdt`)\n* `size` (INT, default 100, max 2000 — we set default 100)\n\n**Returns:** array of trade batches → each batch has `data: [{id, price, amount, direction, ts}]`\n\n**n8n query mapping:**\n```txt\nsymbol = $fromAI('parameters0_Value', 'btcusdt', 'string')\nsize   = $fromAI('parameters1_Value', 100, 'number')\n```\n\n**Notes:** Unlike Binance, HTX nests trades inside `data` arrays per batch.",
			{ name: 'Sticky Note14', color: 6, position: [1136, 512], height: 868 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Calculator**\n\n**Purpose:**\n\n* Perform **math operations** inside the workflow.\n* Supports add/subtract/multiply/divide, percentages, rounding, etc.\n\n**Use cases:**\n\n* Calculate spreads (ask – bid)\n* Compute % changes from open vs. last price\n* Normalize volumes or confidence scores\n\n**n8n setup notes:**\n\n* Node: `Calculator` (n8n built-in)\n* Input fields can come from Binance API JSON\n* Output can be chained into Think → Final Report\n',
			{ name: 'Sticky Note15', color: 6, position: [1440, 512], height: 836 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### **Think**\n\n**Purpose:**\n\n* Lightweight **reasoning helper**.\n* Lets the AI Agent process intermediate logic, format outputs, or decide how to combine multiple API results before sending the final report.\n* Does not fetch data itself.\n\n**Use cases:**\n\n* Clean/reshape JSON from Binance endpoints\n* Extract only the needed fields (e.g., `lastPrice`, `volume`)\n* Help prepare data for Telegram message formatting\n\n**n8n setup notes:**\n\n* No API call, just an **AI Tool** node.\n* Connect upstream API results → Think → Report Agent.',
			{ name: 'Sticky Note16', color: 6, position: [1728, 512], height: 932 },
		),
	)
	.add(
		sticky(
			'# 🧠 HTX Spot Market Data AI Agent – Full System Documentation\n\nA specialized AI automation system for **HTX (Huobi) spot market data retrieval**.\nIt fetches and formats **live market data** only — **no predictions, no strategies**.\nOutputs are structured into **Telegram-ready reports** for traders and analysts.\n\n---\n\n## 🧩 Included Workflows\n\nYou must install and activate **all of the following workflows/tools** for the system to function:\n\n| ✅ Workflow / Tool Name | 📌 Function Description                                                                  |\n| ---------------------- | ---------------------------------------------------------------------------------------- |\n| HTX AI Agent           | Core orchestrator. Calls HTX REST APIs and formats raw data into Telegram-ready reports. |\n| 24h Stats Tool         | Pulls rolling 24-hour OHLC, volume, and trade count for a symbol.                        |\n| Price (Latest) Tool    | Fetches the latest trade price and best bid/ask.                                         |\n| Best Bid/Ask Tool      | Returns top-of-book bid/ask snapshot.                                                    |\n| Order Book Depth Tool  | Retrieves order book bids/asks with configurable depth aggregation.                      |\n| Klines (Candles) Tool  | Returns OHLCV candlestick data for configurable intervals (1m–1y).                       |\n| Recent Trades Tool     | Shows most recent executed trades.                                                       |\n| Average Price Tool     | Computes midpoint between bid/ask using Calculator (HTX has no direct avg-price).        |\n| Calculator             | Performs math inside workflow (e.g., spreads, % changes).                                |\n| Think                  | Lightweight reasoning helper (JSON cleanup, formatting).                                 |\n| Simple Memory          | Stores `sessionId` and symbol state for continuity across Telegram interactions.         |\n\n---\n\n## ⚙️ Installation Instructions\n\n### Step 1: Import Workflows\n\n* Open **n8n Editor UI**\n* Import the JSON file(s) provided (`HTX AI Agent v1.02.json`)\n* Activate the workflows\n\n### Step 2: Set Credentials\n\n* **OpenAI API Credential** → for GPT-4.1-mini (formatting only)\n* **Telegram API Credential** → Bot key for sending/receiving messages\n* **HTX Market Data** → No auth required (public endpoints)\n\n### Step 3: Configure Webhook & Auth\n\n* Update the **Telegram ID Check node** with your personal Telegram ID\n* Only this ID can trigger the agent\n\n### Step 4: Deploy & Test\n\n* Send a symbol (e.g., `btcusdt`) to your Telegram bot\n* Agent retrieves live data and formats into a clean HTML report\n\n---\n\n## 🖥️ System Workflow Overview\n\n```\n[Telegram Trigger]\n→ [User Authentication]\n→ [Add SessionId + Memory]\n→ [HTX AI Agent]\n   ↳ (24h Stats, Price, Best Bid/Ask, Order Book, Klines, Trades)\n   ↳ (Calculator + Think for cleanup/formatting)\n→ [Split Messages > 4000 chars]\n→ [Telegram SendMessage]\n```\n\n---\n\n## 📬 Telegram Output Style\n\n```html\n<b>HTX Market Data – BTCUSDT</b>\n\n<b>Price</b>\n• Last: 58,000.12\n• Best Bid: 57,990 | Best Ask: 58,010\n\n<b>24h Stats</b>\n• Open: 56,500 | High: 58,500 | Low: 56,200\n• Volume: 12,430 BTC | Turnover: 720M USDT\n\n<b>Order Book (Top 5)</b>\n• Bids: [57,990 x 0.5], [57,980 x 1.2] …\n• Asks: [58,010 x 0.8], [58,020 x 1.5] …\n\n<b>Klines (15m, last 3)</b>\n• O/H/L/C: 57,800 / 58,020 / 57,750 / 57,990\n```\n\n---\n\n## ⚠️ Rules\n\n* Only fetch and format data — **no trading signals or advice**\n* Always use lowercase symbols (e.g., `btcusdt`)\n* Do not output raw JSON — must be formatted for Telegram\n* If data missing → show `N/A`\n\n---\n\n## 🚀 Support & Licensing\n\n🔗 **Don Jayamaha – LinkedIn**\n[linkedin.com/in/donjayamahajr](http://linkedin.com/in/donjayamahajr)\n\n© 2025 Treasurium Capital Limited Company. All rights reserved.\nThis system architecture, prompts, and workflow structure are proprietary and protected by **U.S. copyright law**.\nReuse or resale prohibited without license.\n\n',
			{ name: 'Sticky Note17', position: [2128, -992], width: 1200, height: 2464 },
		),
	);
