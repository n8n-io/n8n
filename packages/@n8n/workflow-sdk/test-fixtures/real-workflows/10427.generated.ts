const wf = workflow(
	'e1a3hFH38UDCqquQ',
	'01 Analyze Facebook Ad Performance with an AI Media Buyer and Send Insights to Google Sheets',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-3184, 768], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 3,
			config: {
				parameters: {
					table: 'mlkymmbtoa2iz72',
					options: {},
					operation: 'getAll',
					projectId: 'pfhk9mz7b66t5s2',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [-2928, 768],
				name: 'Getting Long-Term Token',
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
						"// Get the first input item (assumes NocoDB returns an array)\nconst tokenData = $input.first()?.json || {};\n\n// Get current time in milliseconds\nconst now = new Date().getTime();\n\n// Parse the token's end date from NocoDB\nconst endDate = new Date(tokenData.end_date).getTime();\n\n// Define 3 days in milliseconds\nconst threeDaysInMs = 3 * 24 * 60 * 60 * 1000;\n\n// Calculate the difference between end date and now\nconst timeToExpiry = endDate - now;\n\n// Determine if the token is within 3 days of expiry and not already expired\nconst needsRefresh = timeToExpiry > 0 && timeToExpiry <= threeDaysInMs;\n\n// Return both the result and debug info\nreturn [{\n  json: {\n    needs_refresh: needsRefresh,\n    time_to_expiry_ms: timeToExpiry,\n    expires_at: tokenData.end_date,\n    checked_at: new Date().toISOString(),\n  }\n}];\n",
				},
				position: [-2704, 768],
				name: 'Does it Need A Token Refresh?',
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
								id: '73f5e309-6f35-413f-a891-a0bc7185ca60',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.needs_refresh }}',
								rightValue: 'true',
							},
						],
					},
				},
				position: [-2464, 768],
				name: 'Does Token Needs Refreshing?',
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
					url: 'https://graph.facebook.com/v22.0/oauth/access_token',
					method: 'POST',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'grant_type', value: 'fb_exchange_token' },
							{ name: 'client_id' },
							{ name: 'client_secret' },
							{ name: 'fb_exchange_token', value: '=' },
						],
					},
				},
				position: [-2240, 704],
				name: 'Getting Long-Lived Access Token1',
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
						"// Input from the previous node\nconst input = $input.first();\nconst tokenData = input.json || {};\n\n// Current time in milliseconds\nconst now = new Date().getTime();\n\n// Token details from input\nconst accessToken = tokenData.access_token || '';\nconst expiresIn = tokenData.expires_in || 5184000; // Default to 60 days (5184000 seconds) if not provided\nconst issuedAt = tokenData.issued_at ? new Date(tokenData.issued_at).getTime() : now; // Use now if issued_at is missing\nconst expiryTime = issuedAt + (expiresIn * 1000); // Convert expires_in to milliseconds\nconst endDate = new Date(expiryTime).toISOString(); // Calculated end date\n\n// Output the end date and access token\nreturn [{\n  json: {\n    access_token: accessToken,\n    end_date: endDate,\n    current_time: new Date().toISOString()\n  }\n}];",
				},
				position: [-2016, 704],
				name: 'Calculating End Date of Token1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 3,
			config: {
				parameters: {
					table: 'mlkymmbtoa2iz72',
					fieldsUi: {
						fieldValues: [
							{
								fieldName: '=Id',
								fieldValue: "={{ $('Getting Long-Term Token').item.json.Id }}",
							},
							{
								fieldName: 'longTermAccessToken',
								fieldValue: '={{ $json.access_token }}',
							},
							{ fieldName: 'end_date', fieldValue: '={{ $json.end_date }}' },
							{
								fieldName: 'current_time',
								fieldValue: '={{ $json.current_time }}',
							},
						],
					},
					operation: 'update',
					projectId: 'pfhk9mz7b66t5s2',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [-1824, 704],
				name: 'Updating Token',
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
								id: 'fe9ab593-0caa-415b-958c-5afea549b1d2',
								name: 'longAccessToken',
								type: 'string',
								value: '={{ $json.longTermAccessToken }}',
							},
						],
					},
				},
				position: [-1600, 704],
				name: 'Extracting Long Term Token',
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
								id: 'a6e2f5e6-eebb-43ea-9c51-9016c673d4da',
								name: 'accessToken',
								type: 'string',
								value: '={{ $json.longAccessToken }}',
							},
						],
					},
				},
				position: [-1360, 800],
				name: 'Extracting Access Token',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://graph.facebook.com/v22.0/act_XXXXXX/insights',
					options: { response: { response: { responseFormat: 'json' } } },
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{ name: 'level', value: 'ad' },
							{
								name: 'fields',
								value:
									'campaign_name,adset_name,ad_name,ad_id,objective,spend,impressions,clicks,actions,action_values,date_start,date_stop',
							},
							{ name: 'date_preset', value: '=last_28d' },
							{ name: 'limit', value: '500' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: '=Bearer {{ $json.accessToken }}',
							},
						],
					},
				},
				position: [-1120, 528],
				name: 'Getting Data For the Past 28 Days Segemented Per Campaign Adset and Ad',
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
						"// --- START OF CODE NODE 1 SCRIPT (Process Raw Data) ---\n// Mode: Run Once for All Items\n\nconst allN8NInputItems = $input.all(); // Gets all n8n items (usually just one from HTTP Request if pagination combines, or one per page)\nconst finalOutputItems = [];\n\n// Iterate over each n8n item received (typically one, or one per page if HTTP node outputs that way)\nfor (const n8nItem of allN8NInputItems) {\n    const facebookResponse = n8nItem.json; // This is an object like: { \"data\": [...], \"paging\": ... }\n\n    // Check if the 'data' array exists in the Facebook response\n    if (facebookResponse && facebookResponse.data && Array.isArray(facebookResponse.data)) {\n        const adsInsightsArray = facebookResponse.data; // This is the array of actual ad insight objects\n\n        // Loop through each ad insight object within the 'data' array\n        for (const fbData of adsInsightsArray) {\n            const output = {};\n\n            // Basic Info\n            output.ad_id = fbData.ad_id; // <<< --- ADDING AD_ID HERE ---\n            output.date_start = fbData.date_start;\n            output.date_stop = fbData.date_stop;\n            output.campaign_name = fbData.campaign_name;\n            output.adset_name = fbData.adset_name;\n            output.ad_name = fbData.ad_name;\n            output.objective = fbData.objective;\n            output.spend = parseFloat(fbData.spend || 0);\n            output.impressions = parseInt(fbData.impressions || 0);\n            output.clicks = parseInt(fbData.clicks || 0);\n\n            // Initialize specific e-commerce metrics\n            output.add_to_carts_count = 0;\n            output.checkouts_initiated_count = 0;\n            output.purchases_count = 0;\n            output.purchase_value_total = 0.0;\n\n            // --- Define your PREFERRED canonical action_types in order of preference ---\n            const PREFERRED_ACTION_ORDER = {\n                atc: ['omni_add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart', 'add_to_cart', 'onsite_web_app_add_to_cart', 'onsite_web_add_to_cart'],\n                checkout: ['omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'onsite_web_initiate_checkout'],\n                purchase_count: ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'web_in_store_purchase', 'onsite_web_purchase', 'onsite_web_app_purchase'],\n                purchase_value: ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'web_in_store_purchase', 'onsite_web_purchase', 'onsite_web_app_purchase']\n            };\n\n            // --- Helper function to get COUNT for a specific metric from 'actions' ---\n            function getActionCount(actionsData, preferredTypes) {\n                if (!actionsData) return 0;\n                let actionsArray = [];\n                if (Array.isArray(actionsData)) {\n                    actionsArray = actionsData;\n                } else if (typeof actionsData === 'object' && actionsData !== null && typeof actionsData.action_type !== 'undefined') {\n                    actionsArray = [actionsData]; // Handle if 'actions' is a single object\n                } else {\n                    return 0; // Invalid actionsData structure or empty\n                }\n\n                for (const type of preferredTypes) {\n                    const action = actionsArray.find(a => a.action_type === type);\n                    if (action) {\n                        return parseInt(action.value || 0);\n                    }\n                }\n                return 0;\n            }\n\n            // --- Helper function to get MONETARY VALUE for purchases from 'action_values' ---\n            function getPurchaseMonetaryValue(actionValuesData, preferredTypes) {\n                if (!actionValuesData || !Array.isArray(actionValuesData)) return 0.0;\n                for (const type of preferredTypes) {\n                    const action = actionValuesData.find(a => a.action_type === type);\n                    if (action) {\n                        if (type === 'web_app_in_store_purchase' && parseFloat(action.value || 0) < 1.00) {\n                            const hasOtherMoreValuablePurchaseType = preferredTypes.some(pt =>\n                                pt !== 'web_app_in_store_purchase' &&\n                                actionValuesData.find(av => av.action_type === pt && parseFloat(av.value || 0) >= 1.00)\n                            );\n                            if (hasOtherMoreValuablePurchaseType) {\n                                continue;\n                            }\n                        }\n                        return parseFloat(action.value || 0);\n                    }\n                }\n                return 0.0;\n            }\n\n            // Populate the e-commerce metrics\n            output.add_to_carts_count = getActionCount(fbData.actions, PREFERRED_ACTION_ORDER.atc);\n            output.checkouts_initiated_count = getActionCount(fbData.actions, PREFERRED_ACTION_ORDER.checkout);\n            output.purchases_count = getActionCount(fbData.actions, PREFERRED_ACTION_ORDER.purchase_count);\n            output.purchase_value_total = getPurchaseMonetaryValue(fbData.action_values, PREFERRED_ACTION_ORDER.purchase_value);\n            \n            finalOutputItems.push({ json: output });\n        }\n    } else {\n        console.error(\"Input data structure is not as expected from HTTP Request. 'data' array not found or not an array.\", facebookResponse);\n        finalOutputItems.push({ json: { error: \"Facebook response parsing error\", details: \"Input 'data' array not found.\" } });\n    }\n}\n\nreturn finalOutputItems;\n// --- END OF CODE NODE 1 SCRIPT (Process Raw Data) ---",
				},
				position: [-896, 528],
				name: 'Splitting Out In Table Format',
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
								id: '7e4103af-52c4-4035-97e5-4f4356312ed6',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.objective }}',
								rightValue: 'OUTCOME_SALES',
							},
						],
					},
				},
				position: [-704, 528],
				name: 'Filtering Only For Sales Campaigns',
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
						"// --- START OF CODE NODE 2 SCRIPT (Aggregate by Ad Creative & KPIs) ---\n// Mode: Run Once for All Items\n// Input: Output from Code Node 1 (which now includes ad_id)\n\nconst allInputItems = $input.all();\nconst aggregatedByAdName = {};\n\n// Step 1: Aggregate metrics by ad_name\nfor (const n8nItem of allInputItems) {\n    const itemData = n8nItem.json; // Data from Code Node 1, includes ad_id\n    const key = itemData.ad_name;\n\n    if (!aggregatedByAdName[key]) {\n        aggregatedByAdName[key] = {\n            ad_name: itemData.ad_name,\n            ad_id: itemData.ad_id, // <<< STORE THE AD_ID OF THE FIRST ENCOUNTERED ITEM\n            objective: itemData.objective,\n            // Initialize all sums\n            total_spend: 0,\n            total_impressions: 0,\n            total_clicks: 0,\n            total_add_to_carts: 0,\n            total_checkouts_initiated: 0,\n            total_purchases: 0,\n            total_purchase_value: 0,\n        };\n    }\n\n    // If the first itemData for an ad_name somehow missed an ad_id (unlikely if Code Node 1 is correct),\n    // but a subsequent one has it, this ensures it gets populated.\n    if (itemData.ad_id && !aggregatedByAdName[key].ad_id) {\n        aggregatedByAdName[key].ad_id = itemData.ad_id;\n    }\n    // Same for objective, if needed\n    if (itemData.objective && !aggregatedByAdName[key].objective) {\n         aggregatedByAdName[key].objective = itemData.objective;\n    }\n\n    // Sum up the metrics\n    aggregatedByAdName[key].total_spend += parseFloat(itemData.spend || 0);\n    aggregatedByAdName[key].total_impressions += parseInt(itemData.impressions || 0);\n    aggregatedByAdName[key].total_clicks += parseInt(itemData.clicks || 0);\n    aggregatedByAdName[key].total_add_to_carts += parseInt(itemData.add_to_carts_count || 0);\n    aggregatedByAdName[key].total_checkouts_initiated += parseInt(itemData.checkouts_initiated_count || 0);\n    aggregatedByAdName[key].total_purchases += parseInt(itemData.purchases_count || 0);\n    aggregatedByAdName[key].total_purchase_value += parseFloat(itemData.purchase_value_total || 0);\n}\n\n// Step 2: Calculate derived metrics and prepare final output\nconst finalOutputArray = [];\nfor (const key in aggregatedByAdName) {\n    const adCreativeData = aggregatedByAdName[key];\n    const outputItem = { ...adCreativeData }; // Includes ad_name, ad_id, objective, and all total_... fields\n\n    // Calculate derived metrics, handling division by zero\n    outputItem.ctr = adCreativeData.total_impressions > 0 ? (adCreativeData.total_clicks / adCreativeData.total_impressions) : 0;\n    outputItem.cpc = adCreativeData.total_clicks > 0 ? (adCreativeData.total_spend / adCreativeData.total_clicks) : 0;\n    outputItem.cpm = adCreativeData.total_impressions > 0 ? (adCreativeData.total_spend / adCreativeData.total_impressions * 1000) : 0;\n    \n    outputItem.cost_per_add_to_cart = adCreativeData.total_add_to_carts > 0 ? (adCreativeData.total_spend / adCreativeData.total_add_to_carts) : 0;\n    outputItem.cost_per_checkout = adCreativeData.total_checkouts_initiated > 0 ? (adCreativeData.total_spend / adCreativeData.total_checkouts_initiated) : 0;\n    outputItem.cost_per_purchase = adCreativeData.total_purchases > 0 ? (adCreativeData.total_spend / adCreativeData.total_purchases) : 0;\n    \n    outputItem.roas = adCreativeData.total_spend > 0 ? (adCreativeData.total_purchase_value / adCreativeData.total_spend) : 0;\n\n    let conversionRateDecimal = adCreativeData.total_clicks > 0 ? (adCreativeData.total_purchases / adCreativeData.total_clicks) : 0;\n    outputItem.average_order_value = adCreativeData.total_purchases > 0 ? (adCreativeData.total_purchase_value / adCreativeData.total_purchases) : 0;\n\n    // Format numbers\n    outputItem.total_spend = parseFloat(outputItem.total_spend.toFixed(2));\n    outputItem.total_purchase_value = parseFloat(outputItem.total_purchase_value.toFixed(2));\n    \n    outputItem.ctr = parseFloat(outputItem.ctr.toFixed(4));\n    outputItem.cpc = parseFloat(outputItem.cpc.toFixed(2));\n    outputItem.cpm = parseFloat(outputItem.cpm.toFixed(2));\n    \n    outputItem.cost_per_add_to_cart = parseFloat(outputItem.cost_per_add_to_cart.toFixed(2));\n    outputItem.cost_per_checkout = parseFloat(outputItem.cost_per_checkout.toFixed(2));\n    outputItem.cost_per_purchase = parseFloat(outputItem.cost_per_purchase.toFixed(2));\n    \n    outputItem.roas = parseFloat(outputItem.roas.toFixed(2));\n\n    outputItem.conversion_rate = (conversionRateDecimal * 100).toFixed(2) + '%';\n    outputItem.average_order_value = parseFloat(outputItem.average_order_value.toFixed(2));\n\n    finalOutputArray.push({ json: outputItem });\n}\n\nreturn finalOutputArray;\n// --- END OF CODE NODE 2 SCRIPT ---",
				},
				position: [-496, 448],
				name: 'Aggregate Metrics by Ad Creative',
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
					sortFieldsUi: {
						sortField: [{ order: 'descending', fieldName: 'total_spend' }],
					},
				},
				position: [-304, 448],
				name: 'Sorting Based on Spends',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl: '',
						cachedResultName: '',
					},
					documentId: { __rl: true, mode: 'url', value: 'XXXX' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [272, -16],
				name: 'Sending Raw Data To A Google Sheet',
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
						"// --- START OF CODE NODE 4 SCRIPT (Stringify Output) ---\n// Mode: Run Once for All Items\n// Input: The array of aggregated ad creative performance objects\n\nconst allAggregatedItems = $input.all(); // This is an array of n8n items\n\n// Extract the .json part from each n8n item to get the actual data objects\nconst dataToConvert = allAggregatedItems.map(item => item.json);\n\n// Stringify the array of data objects\n// The 'null, 2' arguments pretty-print the JSON string with an indent of 2 spaces,\n// which can be helpful for readability if you're inspecting it, but not strictly necessary for an LLM.\n// If the LLM prefers a more compact JSON, you can omit 'null, 2'.\nconst jsonString = JSON.stringify(dataToConvert, null, 2);\n\n// Output a single item containing this string\nreturn [{ json: { all_ads_data_string: jsonString } }];\n// --- END OF CODE NODE 4 SCRIPT ---",
				},
				position: [-96, 448],
				name: 'Stringify Everything',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: { position: [224, 512], name: 'Combining Ad Data and Benchmarking Data' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [400, 512],
				name: 'Combine Ad & Benchmark Data for LLM',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.6,
			config: {
				parameters: {
					text: '=**Role:** You are a Senior Facebook Ads Media Buyer with extensive experience in e-commerce campaign optimization. Your primary goal is to maximize Return on Ad Spend (ROAS) and overall profitability by identifying high-impact ad creatives and categorizing their performance.\n\n**Context:**\nYou are analyzing ad creative performance for an e-commerce client. You have been provided with two sets of data for the past 14 days:\n1.  **"Ad Creative Performance Data"**: A JSON string representing an array of objects. Each object details a unique ad creative and its performance metrics (including `total_spend`, `total_purchases`, `total_purchase_value`).\n2.  **"Overall Account Benchmark Data"**: A JSON string representing a single object. This object contains the aggregated performance and KPIs for all ads in the account over the same period, serving as crucial benchmark values.\n\n**Task:**\nYour task is to rigorously evaluate each ad creative from the "Ad Creative Performance Data" against the "Overall Account Benchmark Data." **For every ad creative you evaluate, you MUST compare its key calculated metrics (CTR, CPC, CPM, Cost Per Add To Cart, Cost Per Checkout, Cost Per Purchase, Conversion Rate, ROAS, Average Order Value) directly against the corresponding values in the benchmark data.**\n\nBased on this comparison and the spend rules below, categorize the performance of **each ad creative**.\n\n**Performance Categorization Rules & Spend Thresholds:**\n\n1.  **Spend Significance:**\n    *   Any ad creative with a `total_spend` of **less than $50** CANNOT be categorized as "HELL YES", "YES", or even "MAYBE", regardless of its other metrics. At best, it can be "NOT REALLY" if ratios are poor, or "INSUFFICIENT DATA/SPEND" if ratios look promising but spend is too low for a definitive positive categorization.\n    *   To be considered for "HELL YES" or "YES" categories, an ad creative **MUST have a `total_spend` of $100 or more.**\n\n2.  **Performance Categories (evaluate against benchmarks AFTER spend rules):**\n    *   **"HELL YES":** Significant spend (>= $100) AND dramatically outperforms benchmarks across ROAS, CVR, and Cost Per Purchase. Clear 80/20 driver.\n    *   **"YES":** Significant spend (>= $100) AND clearly outperforms benchmarks on ROAS, CVR, and Cost Per Purchase. Reliably contributing.\n    *   **"MAYBE":** Shows promise or mixed results. Spend >= $50. Marginally outperforms benchmarks, or strong on some key metrics but not others. Or, spend < $100 but > $50 with very strong ratios. Requires observation/optimization.\n    *   **"NOT REALLY":** Underperforming. Metrics generally at/below benchmarks. Or, spend < $50 with unpromising ratios. Not a clear winner.\n    *   **"WE WASTED MONEY":** Performing very poorly. Likely spent > $30-$50 (use judgment) with significantly worse metrics than benchmarks (very low ROAS, very high CPP). Pause candidate.\n    *   **"INSUFFICIENT DATA/SPEND":** Spend < $50. Ratios might look okay/good, but not enough data for confident positive categorization ("MAYBE", "YES", "HELL YES").\n\n**Input Data:**\n\n**1. Ad Creative Performance Data (JSON String - LLM needs to parse this):**\n\n{{ $json.data[0].all_ads_data_string }}\n\n2. Overall Account Benchmark Data (JSON String - LLM needs to parse this):\n{{ $json.data[1].benchmarkData }}\n',
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: {
								options: {},
								modelName: 'models/gemini-2.5-pro-preview-06-05',
							},
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'[\n  {\n    "ad_id": "XXX",\n    "ad_name": "Insert Ad Name",\n    "total_spend_creative": 490.01,\n    "performance_category": "HELL YES",\n    "justification": "This ad is a \'HELL YES\' performer. With a significant spend of $490.01 driving 93 purchases, its ROAS of 19.82 massively outperforms the benchmark ROAS of 8.5. Furthermore, its Cost Per Purchase of $5.27 is well below the benchmark $7.50, and its 5.26% conversion rate is substantially higher than the benchmark 3.1%. The combination of high volume, exceptional ROAS, and efficiency makes it a clear top driver.",\n    "key_performance_indicators": {\n      "ad_spend": 490.01,\n      "ad_total_purchases": 93,\n      "ad_total_purchase_value": 9709.6,\n      "ad_roas": 19.82,\n      "benchmark_roas": 8.5,\n      "ad_conversion_rate": "5.26%",\n      "benchmark_conversion_rate": "3.1%",\n      "ad_cost_per_purchase": 5.27,\n      "benchmark_cost_per_purchase": 7.50\n    },\n    "recommendation": "Aggressively Scale Budget & Explore New Audiences"\n  }\n]',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [608, 528],
				name: 'Senior Facebook Ads Media Buyer',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: { parameters: { options: {}, fieldToSplitOut: 'output' }, position: [944, 528] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							ad_id: '={{ $json.ad_id }}',
							Justification: '={{ $json.justification }}',
							Recommendation: '={{ $json.recommendation }}',
							'Best Performing Ad': '={{ $json.performance_category }}',
						},
						schema: [
							{
								id: 'ad_name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'ad_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ad_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ad_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'objective',
								type: 'string',
								display: true,
								required: false,
								displayName: 'objective',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_spend',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_spend',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_impressions',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_impressions',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_clicks',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_clicks',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_add_to_carts',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_add_to_carts',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_checkouts_initiated',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_checkouts_initiated',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_purchases',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_purchases',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'total_purchase_value',
								type: 'string',
								display: true,
								required: false,
								displayName: 'total_purchase_value',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ctr',
								type: 'string',
								display: true,
								required: false,
								displayName: 'ctr',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cpc',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cpc',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cpm',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cpm',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cost_per_add_to_cart',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cost_per_add_to_cart',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cost_per_checkout',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cost_per_checkout',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cost_per_purchase',
								type: 'string',
								display: true,
								required: false,
								displayName: 'cost_per_purchase',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'roas',
								type: 'string',
								display: true,
								required: false,
								displayName: 'roas',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'average_order_value',
								type: 'string',
								display: true,
								required: false,
								displayName: 'average_order_value',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'conversion_rate',
								type: 'string',
								display: true,
								required: false,
								displayName: 'conversion_rate',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Best Performing Ad',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Best Performing Ad',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Justification',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Justification',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Recommendation',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Recommendation',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Source_URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Source_URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Asset Type',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Asset Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Transcription',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Transcription',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'hook',
								type: 'string',
								display: true,
								required: false,
								displayName: 'hook',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'purpose',
								type: 'string',
								display: true,
								required: false,
								displayName: 'purpose',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'text_captions',
								type: 'string',
								display: true,
								required: false,
								displayName: 'text_captions',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'disclaimer',
								type: 'string',
								display: true,
								required: false,
								displayName: 'disclaimer',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'focal_point',
								type: 'string',
								display: true,
								required: false,
								displayName: 'focal_point',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'colours',
								type: 'string',
								display: true,
								required: false,
								displayName: 'colours',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'layout',
								type: 'string',
								display: true,
								required: false,
								displayName: 'layout',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'text_elements',
								type: 'string',
								display: true,
								required: false,
								displayName: 'text_elements',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['ad_id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1_9fnWQm3ipnWg3DvP6XD-EnT2e5vZRvVlQyVA0rbNMQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: { __rl: true, mode: 'url', value: 'XXXXXX' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1184, 528],
				name: 'Updating Ad Insights Into Google Sheets',
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
						"// --- START OF CODE NODE 3 SCRIPT ---\n// Input: Output from Code Node 1 (array of processed ad records)\n// Mode: Run Once for All Items\n\nconst allProcessedAdRecords = $input.all(); // Array of n8n items from Code Node 1\n\n// Initialize overall totals\nconst overallTotals = {\n    total_spend: 0,\n    total_impressions: 0,\n    total_clicks: 0,\n    total_add_to_carts: 0,\n    total_checkouts_initiated: 0,\n    total_purchases: 0,\n    total_purchase_value: 0,\n    // We can't really sum 'objective' or 'ad_name' in a meaningful way for an overall summary,\n    // so we'll omit them or set them to a generic value.\n    // We also won't sum date_start/date_stop, but we can determine the overall period.\n};\n\nlet minDateStart = null;\nlet maxDateStop = null;\n\n// Step 1: Sum up fundamental metrics from all processed ad records\nfor (const n8nItem of allProcessedAdRecords) {\n    const adRecord = n8nItem.json; // Each adRecord is an output from Code Node 1\n\n    overallTotals.total_spend += parseFloat(adRecord.spend || 0);\n    overallTotals.total_impressions += parseInt(adRecord.impressions || 0);\n    overallTotals.total_clicks += parseInt(adRecord.clicks || 0);\n    overallTotals.total_add_to_carts += parseInt(adRecord.add_to_carts_count || 0);\n    overallTotals.total_checkouts_initiated += parseInt(adRecord.checkouts_initiated_count || 0);\n    overallTotals.total_purchases += parseInt(adRecord.purchases_count || 0);\n    overallTotals.total_purchase_value += parseFloat(adRecord.purchase_value_total || 0);\n\n    // Determine overall date range\n    if (adRecord.date_start) {\n        const currentStartDate = new Date(adRecord.date_start);\n        if (!minDateStart || currentStartDate < minDateStart) {\n            minDateStart = currentStartDate;\n        }\n    }\n    if (adRecord.date_stop) {\n        const currentStopDate = new Date(adRecord.date_stop);\n        if (!maxDateStop || currentStopDate > maxDateStop) {\n            maxDateStop = currentStopDate;\n        }\n    }\n}\n\n// Add overall date range to the output\nif (minDateStart) {\n    overallTotals.overall_date_start = minDateStart.toISOString().split('T')[0]; // YYYY-MM-DD\n}\nif (maxDateStop) {\n    overallTotals.overall_date_stop = maxDateStop.toISOString().split('T')[0]; // YYYY-MM-DD\n}\n\n\n// Step 2: Calculate overall derived KPIs based on the grand totals\nconst overallKPIs = { ...overallTotals }; // Start with the summed totals\n\noverallKPIs.ctr = overallTotals.total_impressions > 0 ? (overallTotals.total_clicks / overallTotals.total_impressions) : 0;\noverallKPIs.cpc = overallTotals.total_clicks > 0 ? (overallTotals.total_spend / overallTotals.total_clicks) : 0;\noverallKPIs.cpm = overallTotals.total_impressions > 0 ? (overallTotals.total_spend / overallTotals.total_impressions * 1000) : 0;\n\noverallKPIs.cost_per_add_to_cart = overallTotals.total_add_to_carts > 0 ? (overallTotals.total_spend / overallTotals.total_add_to_carts) : 0;\noverallKPIs.cost_per_checkout = overallTotals.total_checkouts_initiated > 0 ? (overallTotals.total_spend / overallTotals.total_checkouts_initiated) : 0;\noverallKPIs.cost_per_purchase = overallTotals.total_purchases > 0 ? (overallTotals.total_spend / overallTotals.total_purchases) : 0;\n\noverallKPIs.roas = overallTotals.total_spend > 0 ? (overallTotals.total_purchase_value / overallTotals.total_spend) : 0;\n\nlet conversionRateDecimal = overallTotals.total_clicks > 0 ? (overallTotals.total_purchases / overallTotals.total_clicks) : 0;\noverallKPIs.average_order_value = overallTotals.total_purchases > 0 ? (overallTotals.total_purchase_value / overallTotals.total_purchases) : 0;\n\n// --- Format numbers for the overall summary ---\noverallKPIs.total_spend = parseFloat(overallKPIs.total_spend.toFixed(2));\noverallKPIs.total_purchase_value = parseFloat(overallKPIs.total_purchase_value.toFixed(2));\n\noverallKPIs.ctr = parseFloat(overallKPIs.ctr.toFixed(4));\noverallKPIs.cpc = parseFloat(overallKPIs.cpc.toFixed(2));\noverallKPIs.cpm = parseFloat(overallKPIs.cpm.toFixed(2));\n\noverallKPIs.cost_per_add_to_cart = parseFloat(overallKPIs.cost_per_add_to_cart.toFixed(2));\noverallKPIs.cost_per_checkout = parseFloat(overallKPIs.cost_per_checkout.toFixed(2));\noverallKPIs.cost_per_purchase = parseFloat(overallKPIs.cost_per_purchase.toFixed(2));\n\noverallKPIs.roas = parseFloat(overallKPIs.roas.toFixed(2));\n\noverallKPIs.conversion_rate = (conversionRateDecimal * 100).toFixed(2) + '%'; // As percentage string\noverallKPIs.average_order_value = parseFloat(overallKPIs.average_order_value.toFixed(2));\n\n// This node will output a single item containing the overall summary\nreturn [{ json: overallKPIs }];\n// --- END OF CODE NODE 3 SCRIPT ---",
				},
				position: [-464, 784],
				name: 'Calculate Account Benchmarks',
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
						"// --- START OF CODE NODE 4 SCRIPT (Stringify Output) ---\n// Mode: Run Once for All Items\n// Input: The array of aggregated ad creative performance objects\n\nconst allAggregatedItems = $input.all(); // This is an array of n8n items\n\n// Extract the .json part from each n8n item to get the actual data objects\nconst dataToConvert = allAggregatedItems.map(item => item.json);\n\n// Stringify the array of data objects\n// The 'null, 2' arguments pretty-print the JSON string with an indent of 2 spaces,\n// which can be helpful for readability if you're inspecting it, but not strictly necessary for an LLM.\n// If the LLM prefers a more compact JSON, you can omit 'null, 2'.\nconst jsonString = JSON.stringify(dataToConvert, null, 2);\n\n// Output a single item containing this string\nreturn [{ json: { benchmarkData: jsonString } }];\n// --- END OF CODE NODE 4 SCRIPT ---",
				},
				position: [-48, 784],
				name: 'Stringify Benchmark Data',
			},
		}),
	)
	.output(1)
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
								id: 'f3604846-252c-438b-8266-36ec0819d3fa',
								name: 'longAccessToken',
								type: 'string',
								value: "={{ $('Getting Long-Term Token').item.json.longTermAccessToken }}",
							},
						],
					},
				},
				position: [-1872, 976],
				name: 'Getting Long-Term Token1',
			},
		}),
	)
	.add(
		sticky(
			"### Step 1: Securely Manage Your Facebook API Token\n\nThis section retrieves your long-term access token and automatically refreshes it if it's about to expire, ensuring the workflow always has valid credentials.\n\n**➡️ Action Required:**\n- Configure the NocoDB nodes with your database details.\n- Alternatively, replace this entire section with your preferred credential management system (e.g., n8n's own credential store).",
			{ name: 'Sticky Note1', color: 4, position: [-2992, 448], width: 1740, height: 756 },
		),
	)
	.add(
		sticky(
			'### Step 3a: Log Processed Data to Google Sheets\n\nThis node takes the cleaned and calculated performance data for each ad creative and sends it to your Google Sheet.\n\n**Why this step is important:**\nIt creates a complete record of your ad metrics and populates the rows that the AI will analyze and update in a later step.\n\n**➡️ Action Required:**\n- **Connect Credentials**: Ensure your Google Sheets account is connected.\n- **Document ID**: Replace `XXXX` in the *Document ID* field with the ID of your Google Sheet (found in the URL).\n- **Sheet Name**: Select the correct sheet where the data should be sent.',
			{ name: 'Sticky Note2', position: [48, -352], width: 752, height: 540 },
		),
	)
	.add(
		sticky(
			"### Step 6: Update Google Sheets with AI Insights\n\nThis final step takes the AI's analysis for each ad and updates your Google Sheet, matching the ad by its unique `ad_id`.\n\n**➡️ Action Required:**\n- Configure both Google Sheets nodes (**Sending Raw Data To A Google Sheet** and this one) with your **Google Sheet ID**.\n- The first node populates the sheet with raw data, and this node adds the AI analysis columns.",
			{ name: 'Sticky Note3', position: [1072, 272], width: 512, height: 620 },
		),
	)
	.add(
		sticky(
			'### Step 2: Fetch Facebook Ad Data\n\nThis node calls the Facebook Graph API to get performance data for all your ads from the last 28 days.\n\n**➡️ Action Required:**\n- In the URL parameter, replace `act_XXXXXX` with your **Facebook Ad Account ID**.',
			{ name: 'Sticky Note4', color: 3, position: [-1232, 272], width: 320, height: 524 },
		),
	)
	.add(
		sticky(
			'### Step 3: Calculate Ad & Benchmark KPIs\n\nThe workflow splits here to perform two crucial calculations in parallel:\n- **Top Path**: Calculates performance metrics for each *individual ad creative*.\n- **Bottom Path**: Calculates the *overall account average* for all sales campaigns to use as a benchmark.\n\nThis comparison is the core of the AI analysis.',
			{ name: 'Sticky Note6', position: [-592, 208], width: 680, height: 744 },
		),
	)
	.add(
		sticky(
			'### Step 4: Prepare Data for AI Analysis\n\nThese nodes take the individual ad data and the overall benchmark data, convert them into clean JSON strings, and merge them together. This prepares a complete package of information to be sent to the AI in a single, context-rich prompt.',
			{ name: 'Sticky Note7', color: 3, position: [160, 272], width: 356, height: 544 },
		),
	)
	.add(
		sticky(
			'## AI-Powered Facebook Ad Analysis for E-commerce\n\nThis workflow automates the analysis of your Facebook ad performance, acting as an AI-powered media buyer to give you actionable insights. It fetches your ad data, calculates account-wide benchmarks, and then uses a Large Language Model (LLM) to categorize each ad creative\'s performance, providing clear justifications and recommendations.\n\n### Who is it for?\nThis template is perfect for:\n- E-commerce Store Owners\n- Digital Marketing Agencies\n- Facebook Ads Media Buyers\n\n### What it does\n1.  **Secure Token Management**: Automatically retrieves and refreshes your Facebook long-term access token.\n2.  **Fetch Ad Data**: Pulls the last 28 days of ad-level performance data from your Facebook Ads account.\n3.  **Process & Clean**: Parses the raw data, standardizes metrics (like purchases and ROAS), and filters for sales-focused campaigns.\n4.  **Benchmark Calculation**: Aggregates all data to create an overall performance benchmark for your account (e.g., average Cost Per Purchase, average ROAS).\n5.  **AI Analysis**: For each ad, it sends its performance data and the account benchmark to an AI. The AI then evaluates the ad, categorizing it as "HELL YES," "YES," "MAYBE," or "WE WASTED MONEY" based on a detailed prompt.\n6.  **Output to Google Sheets**: Updates a Google Sheet with the raw performance data and the new AI-generated insights, including the performance category, justification, and recommendation.\n\n### How to set up\n1.  **Facebook Credentials**:\n    - This workflow uses NocoDB to store and refresh the Facebook token. Set up the **Getting Long-Term Token** and **Updating Token** nodes with your NocoDB credentials, or replace this section with your preferred method for storing credentials.\n2.  **Google Credentials**:\n    - Configure the **Google Sheets** and **Google Gemini** nodes with your respective API credentials.\n3.  **Update Your IDs**:\n    - In the **Getting Data For the Past 28 Days...** node, replace `act_XXXXXX` in the URL with your Facebook Ad Account ID.\n    - In both Google Sheets nodes (**Sending Raw Data...** and **Updating Ad Insights...**), update the *Document ID* with your Google Sheet\'s ID.\n4.  **Run the Workflow**: Once configured, click \'Test workflow\' to run the analysis!',
			{ position: [-3856, 176], width: 608, height: 1024 },
		),
	)
	.add(
		sticky(
			"### Step 5: AI-Powered Ad Creative Analysis\n\nA powerful LLM (Google Gemini) acts as a Senior Media Buyer. It compares each ad's performance against the account benchmarks and categorizes it with a justification and recommendation.\n\n**➡️ Action Required:**\n- Ensure your Google Gemini credentials are correctly configured in the **Google Gemini Chat Model** node.",
			{ name: 'Sticky Note5', color: 7, position: [528, 272], width: 528, height: 624 },
		),
	);
