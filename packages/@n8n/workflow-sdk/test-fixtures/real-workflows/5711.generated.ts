const wf = workflow('6Bn6KSpg1le9mG4Y', 'Alapaca Trade automation', {
	timezone: 'Asia/Jerusalem',
	callerPolicy: 'workflowsFromSameOwner',
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: { interval: [{ triggerAtHour: 16, triggerAtMinute: 45 }] },
				},
				position: [-360, 680],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://paper-api.alpaca.markets/v2/account',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpCustomAuth',
					queryParameters: { parameters: [{}] },
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' },
				},
				position: [-140, 680],
				name: 'Alpaca-get-account-info',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							date: '={{$today}}\n',
							change: '={{($json.equity- $json.last_equity)/ $json.last_equity}}',
							balance: '={{ $json.equity }}',
						},
						schema: [
							{
								id: 'date',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'balance',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'balance',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'change',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'change',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['date'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: { useAppend: true },
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 449152551,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit#gid=449152551',
						cachedResultName: 'balance',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit?usp=drivesdk',
						cachedResultName: 'Stock Sentiment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [80, 680],
				name: 'write_account_balace_today',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [{ lookupValue: '={{$today}}\n', lookupColumn: 'date' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit#gid=0',
						cachedResultName: 'sentiments',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit?usp=drivesdk',
						cachedResultName: 'Stock Sentiment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [300, 680],
				name: 'read_sentiments_score_today',
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
						"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\n// Sort the array by sentimentScore in descending order\nconst sortedItems = $input.all().sort((a, b) => b.json.sentimentScore - a.json.sentimentScore);\n\n// Get the top 4 items\nconst top4Items = sortedItems.slice(0, 4);\n\n// Return the result in the n8n expected format\nreturn top4Items\n\n\n",
				},
				position: [520, 680],
				name: 'filter_top_sentiment_score',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://paper-api.alpaca.markets/v2/positions',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpCustomAuth',
					queryParameters: { parameters: [{}] },
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' },
				},
				position: [740, 680],
				name: 'Alpaca_get_open_positions',
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
						'// Accessing data from the previous nodes\nconst openPositions = $(\'Alpaca_get_open_positions\').all();\nconst topSentiment = $("filter_top_sentiment_score").all();\n\n// Extracting the symbols for easier comparison\nconst openPositionSymbols = openPositions.map(pos => pos.json.symbol);\nconst topSentimentSymbols = topSentiment.map(sen => sen.json.stock);\n\n// Table 1: Open positions not in the top sentiment filter\nconst positionsNotInTopSentiment = openPositions\n  .filter(pos => !topSentimentSymbols.includes(pos.json.symbol))\n  .map(pos => ({\n    symbol: pos.json.symbol,\n    market_value: pos.json.market_value,\n    qty: pos.json.qty,\n    asset_id : pos.json.asset_id\n  }));\n\n// Table 2: Symbols from top sentiment not in open positions\nconst symbolsNotInOpenPositions = topSentiment\n  .filter(sen => !openPositionSymbols.includes(sen.json.stock))\n  .map(sen => ({\n    symbol: sen.json.stock,\n  }));\n\n// Calculate the total market value of the first table\nconst totalMarketValue = positionsNotInTopSentiment.reduce((sum, pos) => {\n  return sum + parseFloat(pos.market_value);\n}, 0);\n\n// Calculate the value to be assigned to each symbol in the second table\nconst valuePerSymbol = symbolsNotInOpenPositions.length > 0\n  ? totalMarketValue / symbolsNotInOpenPositions.length\n  : 0;\n\n// Add the calculated value to each symbol in the second table\nconst symbolsWithMarketValue = symbolsNotInOpenPositions.map(item => ({\n  ...item,\n  market_value_per_symbol: valuePerSymbol,\n}));\n\n// Returning the two tables as separate outputs\nreturn [\n  {\n    json: {\n      positions_not_in_top_sentiment: positionsNotInTopSentiment,\n    \n    symbols_not_in_open_positions: symbolsWithMarketValue,\n    \n  }}\n];',
				},
				position: [960, 680],
				name: 'create_positions_to_close_and_positions_two_open',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					options: {},
					fieldToSplitOut: 'positions_not_in_top_sentiment',
				},
				position: [1400, 580],
				name: 'positions_to_close',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://paper-api.alpaca.markets/v2/positions/{{$json.asset_id}}',
					method: 'DELETE',
					options: {},
					sendBody: true,
					sendQuery: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: { parameters: [{}] },
					genericAuthType: 'httpCustomAuth',
					queryParameters: { parameters: [{}] },
					headerParameters: { parameters: [{}] },
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' },
				},
				position: [1620, 580],
				name: 'Alpaca-post-order-sell',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [1840, 680], name: 'merge_orders_to_write_to_sheets' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							date: '={{ $today }}',
							order: '={{ $json.side }}',
							value:
								'={{ $if( $json.side == "buy",$json.notional,$(\'positions_to_close\').item.json.market_value) }}',
							symbol: '={{ $json.symbol }}',
						},
						schema: [
							{
								id: 'date',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'symbol',
								type: 'string',
								display: true,
								required: false,
								displayName: 'symbol',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'order',
								type: 'string',
								display: true,
								required: false,
								displayName: 'order',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'value',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'value',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['date'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 486231870,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit#gid=486231870',
						cachedResultName: 'positions',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tQDBVDqn5v08GOsjupjV8o3Jzqd4-fKoSoGhWLEOTww/edit?usp=drivesdk',
						cachedResultName: 'Stock Sentiment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2060, 680],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					options: {},
					fieldToSplitOut: 'symbols_not_in_open_positions',
				},
				position: [1180, 780],
				name: 'positions_to_open',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 2 }, position: [1400, 780] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://paper-api.alpaca.markets/v2/orders',
					method: 'POST',
					options: {},
					sendBody: true,
					sendQuery: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'symbol', value: '={{ $json.symbol }}' },
							{
								name: 'notional',
								value: '={{ $json.market_value_per_symbol.toFixed(2) }}',
							},
							{ name: 'side', value: 'buy' },
							{ name: 'type', value: 'market' },
							{ name: 'time_in_force', value: 'day' },
						],
					},
					genericAuthType: 'httpCustomAuth',
					queryParameters: { parameters: [{}] },
					headerParameters: { parameters: [{}] },
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' },
				},
				position: [1620, 780],
				name: 'Alpaca-post-order-buy',
			},
		}),
	)
	.add(
		sticky(
			'## Alpaca Trading 📈\nthis workflow takes the sentiment analysis made by our sentiment analysis bot workflow ([template link](https://n8n.io/workflows/5369-automated-stock-sentiment-analysis-with-google-gemini-and-eodhd-news-api/)) and translates it into automated trading actions using a paper trading account on Alpaca. It manages the portfolio by selling underperforming assets and buying stocks with high positive sentiment.',
			{ name: 'Sticky Note2', position: [-920, 380], width: 400, height: 380 },
		),
	)
	.add(
		sticky(
			'## 1. Daily Trigger and Account Snapshot 📈\n**Schedule Trigger:** The workflow is automatically triggered every day at 4:45 PM (Asia/Jerusalem time). The time is set so it will run after the stock market in the US open\n\n**Alpaca-get-account-info:** It starts by fetching your current Alpaca paper trading account information, like your equity and balance.\n\n**write_account_balace_today:** This node logs your account balance for the day into a Google Sheet named "balance". It also calculates and records the daily percentage change in your balance, allowing you to track performance over time.',
			{ name: 'Sticky Note1', color: 6, position: [-400, 380], width: 620, height: 560 },
		),
	)
	.add(
		sticky(
			'## 2. Sentiment-Based Stock Selection 👍👎\n**read_sentiments_score_today:** The workflow reads the sentiment scores from a google sheet the scores were generated by a "Sentiment Analysis Bot"([template link](https://n8n.io/workflows/5369-automated-stock-sentiment-analysis-with-google-gemini-and-eodhd-news-api/)) for the current day from the "sentiments" sheet in a sentiment analysis Google Sheet.\n\n**filter_top_sentiment_score:** This code block selects the top four stocks with the highest sentiment scores from the list, focusing your trading strategy on the most promising assets.\n\n**Alpaca_get_open_positions:** It then retrieves a list of all currently open positions in your Alpaca account to compare against the top sentiment stocks.',
			{ name: 'Sticky Note3', position: [260, 380], width: 620, height: 560 },
		),
	)
	.add(
		sticky(
			'## 3. Trading Logic and Execution ⚙️\n**create_positions_to_close_and_positions_two_open:** This is the core logic of your trading strategy. The code compares the stocks you currently hold with the top four sentiment stocks for the day.\n\nIt identifies which of your current positions are no longer in the top four and marks them to be sold.\n\nIt identifies which of the top four sentiment stocks you do not currently own and marks them to be bought.\n\nIt calculates the total market value of the positions to be sold and divides that amount equally among the new stocks to be purchased.\n\n**positions_to_close:** This node takes the list of stocks to be sold and processes them one by one.\n\n**Alpaca-post-order-sell:** For each stock in the "to-sell" list, this node sends a "sell" order to Alpaca to close the position.\n\n**Wait:** A two-minute pause is implemented to ensure that the sell orders are processed and the funds are available before the buy orders are placed.\n\n**positions_to_open:** This node takes the list of top-sentiment stocks that you don\'t currently own.\n\n**Alpaca-post-order-buy:** For each of these stocks, a "buy" order is sent to Alpaca using the allocated portion of the funds from the sold assets.',
			{ name: 'Sticky Note4', color: 3, position: [920, 100], width: 840, height: 840 },
		),
	)
	.add(
		sticky(
			'## 4. Logging and Record-Keeping 📝\n**merge_orders_to_write_to_sheets:** This node gathers the results from both the buy and sell orders.\n\n**Google Sheets (Append):** Finally, the details of every trade (date, symbol, order type, and value) are logged in the "positions" sheet of your Google Sheet, providing a complete record of all trading activity.',
			{ name: 'Sticky Note5', color: 4, position: [1800, 420], width: 520, height: 520 },
		),
	);
