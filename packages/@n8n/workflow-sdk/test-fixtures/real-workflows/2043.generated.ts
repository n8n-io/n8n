const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.1,
			config: {
				parameters: { rule: { interval: [{ field: 'minutes' }] } },
				position: [520, 1279],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 1,
			config: {
				parameters: {
					url: 'https://api.binance.com/api/v1/ticker/24hr',
					options: {},
				},
				position: [680, 1279],
				name: 'Binance 24h Price Change',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.function',
			version: 1,
			config: {
				parameters: {
					functionCode:
						'// Iterate over all coins and check for 10% price change\nconst significantChanges = [];\nfor (const coin of items[0].json) {\n  const priceChangePercent = parseFloat(coin.priceChangePercent);\n  if (Math.abs(priceChangePercent) >= 15) {\n    significantChanges.push({ \n      symbol: coin.symbol, \n      priceChangePercent, \n      lastPrice: coin.lastPrice \n    });\n  }\n}\n\n// Sort the items by percent rate from high to low\nsignificantChanges.sort((a, b) => b.priceChangePercent - a.priceChangePercent);\n\n// Format the sorted data for output\nconst sortedOutput = significantChanges.map(change => ({\n  json: { message: `\\`\\`\\`${change.symbol} Price changed by ${change.priceChangePercent}% \\n Last Price: ${change.lastPrice}\\`\\`\\`` }\n}));\n\nreturn sortedOutput;\n',
				},
				position: [860, 1279],
				name: 'Filter by 10% Change rate',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [1020, 1279],
				name: 'Aggregate',
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
						"// Function to split the data into chunks of approximately 1000 characters\nfunction splitDataIntoChunks(data) {\n    const chunks = [];\n    let currentChunk = \"\";\n\n    data.forEach(item => {\n        // Ensure that each item has a 'message' property\n        if (item && item.message) {\n            const message = item.message + \"\\n\"; // Adding a newline for separation\n            // Check if adding this message to the current chunk would exceed the 1000 characters limit\n            if (currentChunk.length + message.length > 1000) {\n                // If so, push the current chunk to the chunks array and start a new chunk\n                chunks.push({ json: { data: currentChunk } });\n                currentChunk = message;\n            } else {\n                // Otherwise, add the message to the current chunk\n                currentChunk += message;\n            }\n        }\n    });\n\n    // Add the last chunk if it's not empty\n    if (currentChunk) {\n        chunks.push({ json: { data: currentChunk } });\n    }\n\n    return chunks;\n}\n\n// The input data is passed from the previous node\nconst inputData = items[0].json.data; // Accessing the 'data' property\n\n// Process the data\nconst result = splitDataIntoChunks(inputData);\n\n// Output the result\nreturn result;\n",
				},
				position: [1180, 1279],
				name: 'Split By 1K chars',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1,
			config: {
				parameters: {
					text: '={{ $json.data.replaceAll(/(Last Price: \\S+)$/gm,"$1\\n").slice(0,1000) }}',
					chatId: '123456789',
					additionalFields: {},
				},
				position: [1360, 1279],
				name: 'Send Telegram Message',
			},
		}),
	)
	.add(
		sticky(
			"### Workflow Setup Steps:\n1. Ensure the **_Schedule Trigger_** is active to desired cron time (Default 5 minutes).\n2. [_Optional_] Configure the **_Binance 24h Price Change_** node with your API details (Default one is Free Public API Call - Free).\n3. Set up your **Telegram bot** token in the **Telegram node credentials**.\n4. Update the **_Chat ID_** in the **_Send Telegram Message_** node.\n5. Test the workflow to ensure everything is set up correctly.\n* **Notes**: Detailed telegram bot setup instructions are available in the [workflow's n8n page](https://n8n.io/workflows/2043-crypto-market-alert-system-with-binance-and-telegram-integration).",
			{
				color: 5,
				position: [483.54457851446114, 1040],
				width: 1040.928205084989,
				height: 183.94838465674636,
			},
		),
	);
