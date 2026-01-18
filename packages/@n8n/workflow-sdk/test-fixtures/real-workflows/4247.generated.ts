const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-200, 405], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.readWriteFile',
			version: 1,
			config: {
				parameters: {
					options: {},
					fileSelector:
						'=E:/SentIImenta AI/SentIImenta AI Website/White Willow/Invoice Validator/May Invoices/Jumax TWW Daily PO Invoices 05_05_2025/661.pdf',
				},
				position: [20, 405],
				name: 'Read/Write Files from Disk',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [240, 405],
				name: 'Extract from File',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '=- You must respond ONLY with valid raw rendered JSON.\n- Do NOT include the word "json".\n- Do NOT include the word "```json".\n- Do NOT use triple backticks or markdown formatting.\n- Do NOT wrap the response in any key like "output".\n- Do NOT write anything starting at output directly start with valid root-level JSON.\n- Only respond with a valid, root-level JSON object.\n- Do NOT skip any line item. Continue extracting all line items until the sum of all line_total values exactly equals the total sale amount extracted from the invoice. This verification ensures that all items are fully extracted and no entries are missed. If the totals do not match, keep parsing and extracting additional line items until they do. Only then stop.\n\nText to convert: {{ $json.text }}',
					options: {
						systemMessage:
							"=You are a document parsing assistant designed to extract structured data from invoice PDFs for automated uploading and validation in a financial system.\n\nExtract the following fields from the invoice text:\n\ninvoice_number: Extract from the 'Invoice No' field.\n\nvendor_name: Company name issuing the invoice.\n\ninvoice_date: Format as DD/MM/YYYY.\n\npo_number: Extract the PO number or return null if not found.\n\npo_date: Extract the PO date in DD/MM/YYYY format or return null if not found.\n\ntotal_amount: Extract the invoice total as a float.\n\ntax_details: Include total CGST, total SGST.\n\nline_items: List of all items in the invoice. For each item, extract:\n\n  Serial No.: Item Serial No. In invoice.\n\n  code: The TWW word and its postfix only (e.g., TWW, TWW-Cover, TWW-HPCN). Do not include HSN code or numbers. This field must always be present.\n\n  description: Item description, never include HSN code of product in product description.\n\n  last character: This is a single word/character string found just after or around the line item, typically at the end of the price line or just on the next line. It will never be a number, HSN code, GST %, or unit (like PCS). Examples: G, C, S, 5C, .C If nothing is present (only digits or blank), return \"\". Check the next 1–2 lines after each item if it's not found on the same line.\n\n  quantity: Quantity value.\n\n  unit_price: Price per unit.\n\n  line_total: Total price for the line.\n\n  hsn_code: HSN code of the item.\n\n  cgst: Only extract the CGST percentage (e.g., 9%, 6%) as written in the invoice. Do not calculate based on line total.\n\n  sgst: Only extract the SGST percentage (e.g., 9%, 6%) as written in the invoice. Do not calculate based on line total.\n\nImportant: Double-check that all line items are extracted without omission.\n\nDo NOT skip any line item. Continue extracting all line items until the sum of all line_total values exactly equals the total_amount extracted from the invoice. This verification ensures that all items are fully extracted and no entries are missed. If the totals do not match, keep parsing and extracting additional line items until they do. Only then stop.",
					},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'deepseek/deepseek-chat-v3-0324', options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model',
						},
					}),
				},
				position: [460, 420],
				name: 'Text Extractor',
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
						"const output = $input.first().json.output;\nlet raw = output.result || output.completion || output.text || JSON.stringify(output);\n\n// Step 1: Remove backticks if present\nraw = raw.trim();\nif (raw.startsWith(\"```json\")) {\n  raw = raw.replace(/^```json\\s*/, '').replace(/```$/, '').trim();\n} else if (raw.startsWith(\"```\")) {\n  raw = raw.replace(/^```\\s*/, '').replace(/```$/, '').trim();\n}\n\n// Step 2: Find full JSON block from first { to last }\nconst start = raw.indexOf('{');\nconst end = raw.lastIndexOf('}');\nif (start === -1 || end === -1 || end <= start) {\n  return [{\n    json: {\n      error: \"No valid JSON block found\",\n      raw_output: raw\n    }\n  }];\n}\n\nlet jsonCandidate = raw.substring(start, end + 1).trim();\n\n// Step 3: Unescape characters\njsonCandidate = jsonCandidate\n  .replace(/\\\\n/g, '')\n  .replace(/\\\\t/g, '')\n  .replace(/\\\\\"/g, '\"')\n  .replace(/\\\\'/g, \"'\")\n  .replace(/\\\\\\\\/g, '\\\\');\n\n// Step 4: Parse JSON safely\ntry {\n  let parsed = JSON.parse(jsonCandidate);\n\n  // Only double-parse if it looks like stringified JSON\n  if (typeof parsed === \"string\" && parsed.trim().startsWith('{') && parsed.trim().endsWith('}')) {\n    parsed = JSON.parse(parsed);\n  }\n\n  return [{ json: parsed }];\n} catch (e) {\n  return [{\n    json: {\n      error: \"JSON parsing failed\",\n      raw_output: raw,\n      attempted_extraction: jsonCandidate,\n      message: e.message\n    }\n  }];\n}\n",
				},
				position: [880, 380],
				name: 'Post-Processing',
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
								id: 'e73c23b4-39e9-4719-8a72-53808eefe607',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.error }}',
								rightValue: 'JSON parsing failed',
							},
							{
								id: 'b3b7d3d4-c709-40fe-8782-ffd34180ba8b',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.error }}',
								rightValue: 'No valid JSON block found',
							},
						],
					},
				},
				position: [1100, 340],
			},
		}),
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
								id: '18f61f00-03e8-4fd4-b305-f3742bb32d17',
								name: 'text',
								type: 'string',
								value: "={{ $('Extract from File').item.json.text }}",
							},
						],
					},
				},
				position: [1340, 520],
				name: 'Send Raw Text Again',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: { parameters: { options: {}, fieldToSplitOut: 'line_items' }, position: [1276, 280] },
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
								id: '1907451f-cc09-45d7-a04f-113f8f94d918',
								name: 'Unique Key',
								type: 'string',
								value: '={{ $(\'If\').item.json.invoice_number + "-" + $itemIndex }}',
							},
						],
					},
				},
				position: [1496, 280],
				name: 'Generate Unique Key',
			},
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
							HSN: "={{ $('Split Out').item.json.hsn_code }}",
							Qty: "={{ $('Split Out').item.json.quantity }}",
							'CGST%': "={{ $('Split Out').item.json.cgst }}",
							'SGST%': "={{ $('Split Out').item.json.sgst }}",
							'SR No.': "={{ $('Split Out').item.json['serial_no'] }}",
							'PO Date': "={{ $('Post-Processing').item.json.po_date }}",
							'PO Number': "={{ $('Post-Processing').item.json.po_number }}",
							'Unique Key': "={{ $json['Unique Key'] }}",
							'Invoice No.': "={{ $('Post-Processing').item.json.invoice_number }}",
							'Sale Amount': "={{ $('Split Out').item.json.line_total }}",
							'Invoice Date': "={{ $('Post-Processing').item.json.invoice_date }}",
							'Rate (Vendor)': "={{ $('Split Out').item.json.unit_price }}",
							'TWW Description':
								'={{ \n  $node["Split Out"].json["code"] + " " + \n  $node["Split Out"].json["description"] + " " + \n  ($node["Split Out"].json["last character"] ?? $node["Split Out"].json["last_character"] ?? "") \n}}',
						},
						schema: [
							{
								id: 'SR No.',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'SR No.',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice No.',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice No.',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Unique Key',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Unique Key',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice Date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PO Number',
								type: 'string',
								display: true,
								required: false,
								displayName: 'PO Number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PO Date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'PO Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'TWW Description',
								type: 'string',
								display: true,
								required: false,
								displayName: 'TWW Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'HSN',
								type: 'string',
								display: true,
								required: false,
								displayName: 'HSN',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Qty',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Qty',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rate (Vendor)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Rate (Vendor)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Sale Amount',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Sale Amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CGST%',
								type: 'string',
								display: true,
								required: false,
								displayName: 'CGST%',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SGST%',
								type: 'string',
								display: true,
								required: false,
								displayName: 'SGST%',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Matched Cost (Actual Price)',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Matched Cost (Actual Price)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Matched Unit Price (Vendor Price)',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Matched Unit Price (Vendor Price)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Price Difference (₹)',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Price Difference (₹)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Total Loss/Gain (₹)',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Total Loss/Gain (₹)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Mismatch Note',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Mismatch Note',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SKU Matched',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'SKU Matched',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ASIN',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ASIN',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Taxable Amount',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Taxable Amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice Amount',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Invoice Amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Total Quantity',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Total Quantity',
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
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk/edit?usp=drivesdk',
						cachedResultName: 'Invoice Validation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1716, 280],
				name: 'Send Invoice Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 305288444,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1ZBODB_mwa17Amtxnme5l8MxyEcWHYy9SSjQ6atPJXhc/edit#gid=305288444',
						cachedResultName: 'Cost-Priority sheet-GPT',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1ZBODB_mwa17Amtxnme5l8MxyEcWHYy9SSjQ6atPJXhc',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1ZBODB_mwa17Amtxnme5l8MxyEcWHYy9SSjQ6atPJXhc/edit?usp=drivesdk',
						cachedResultName: 'Mapping Sheet Final',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1980, 280],
				name: 'Fetch Master Data',
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
						"// --- Helper: Levenshtein Distance ---\nfunction levenshtein(a, b) {\n  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);\n  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;\n\n  for (let i = 1; i <= b.length; i++) {\n    for (let j = 1; j <= a.length; j++) {\n      const cost = a[j - 1] === b[i - 1] ? 0 : 1;\n      matrix[i][j] = Math.min(\n        matrix[i - 1][j] + 1,\n        matrix[i][j - 1] + 1,\n        matrix[i - 1][j - 1] + cost\n      );\n    }\n  }\n  return matrix[b.length][a.length];\n}\n\n// --- Helper: Clean String ---\nfunction cleanString(str) {\n  if (str && typeof str === 'string') {\n    return str\n      .replace(/(^\"|\"$|\\[|\\])/g, '') // remove unwanted chars\n      .replace(/\\s{2,}/g, ' ')       // replace multiple spaces with one\n      .toLowerCase()\n      .trim();\n  }\n  return '';\n}\n\n// --- 1. Get all SKUs from \"Split Out\" and corresponding Unique Keys ---\nconst splitOutItems = $items('Split Out');\nconst uniqueKeyItems = $items('Generate Unique Key');\n\nconst inputSKUs = splitOutItems.map((item, index) => {\n  const uniqueKeyItem = uniqueKeyItems[index];\n\n  const code = cleanString(item.json.code);\n  const description = cleanString(item.json.description);\n  // handle both possible keys for last character\n  const lastCharacter = cleanString(item.json['last_character'] ?? item.json['last character'] ?? '');\n\n  let sku = `${code} ${description}`;\n\n  if (lastCharacter) {\n    if (/^[a-z0-9]+$/i.test(lastCharacter)) {\n      // Append directly without space if alphanumeric postfix\n      sku += lastCharacter;\n    } else {\n      // Otherwise, add a space\n      sku += ` ${lastCharacter}`;\n    }\n  }\n  \n  sku = sku.trim().replace(/\\s{2,}/g, ' ');\n\n  return {\n    Unique_Key: uniqueKeyItem ? uniqueKeyItem.json['Unique Key'] || uniqueKeyItem.json.Unique_Key || '' : '',\n    serial_no: item.json['Serial No.'] ?? item.json['Serial_No.'] ?? '',\n    sku,\n    quantity: item.json.quantity,\n    unit_price: item.json.unit_price,\n    line_total: item.json.line_total,\n    hsn_code: item.json.hsn_code,\n    cgst: item.json.cgst,\n    sgst: item.json.sgst\n  };\n});\n\n// --- 2. Get all rows from \"Google Sheets\" ---\nconst sheetRows = $items('Fetch Master Data').map(i => i.json);\n\n// --- 3. Set Levenshtein match threshold ---\nconst threshold = 5;\nconst results = [];\n\nfor (const inputSKU of inputSKUs) {\n  let bestMatch = null;\n  let lowestDistance = Infinity;\n\n  for (const row of sheetRows) {\n    const descriptionRaw = row['Jumax PDF Description'] || '';\n    const description = cleanString(descriptionRaw);\n    if (!description) continue;\n\n    const distance = levenshtein(inputSKU.sku, description);\n\n    if (distance < lowestDistance) {\n      lowestDistance = distance;\n      bestMatch = row;\n    }\n  }\n\n  if (bestMatch && lowestDistance <= threshold) {\n    const jumaxASIN = cleanString(bestMatch['ASIN']);\n    const tASIN = cleanString(bestMatch['TWW ASIN']);\n    const cost = Number(bestMatch['Cost '] || bestMatch['Cost'] || bestMatch['Rate']);\n    const unitPrice = Number(inputSKU.unit_price);\n\n    const asinMatch = jumaxASIN === tASIN;\n    const costMatch = cost === unitPrice;\n    const allConditionsMet = asinMatch && costMatch;\n\n    results.push({\n      json: {\n        Unique_Key: inputSKU.Unique_Key,\n        serial_no: inputSKU.serial_no,\n        matchedSKU: inputSKU.sku,\n        matchedRow: bestMatch,\n        distance: lowestDistance,\n        Jumax_ASIN: jumaxASIN,\n        T_ASIN: tASIN,\n        asinMatch,\n        costMatch,\n        quantity: inputSKU.quantity,\n        unit_price: inputSKU.unit_price,\n        costFromSheet: cost,\n        line_total: inputSKU.line_total,\n        hsn_code: inputSKU.hsn_code,\n        cgst: inputSKU.cgst,\n        sgst: inputSKU.sgst,\n        message: allConditionsMet\n          ? '✅ Match found, ASINs match, and Cost matches Unit Price'\n          : asinMatch\n            ? '⚠️ ASINs match but Cost does not match Unit Price'\n            : '❌ Match found but ASINs do not match',\n        All_Conditions_Met: allConditionsMet\n      }\n    });\n  } else {\n    results.push({\n      json: {\n        Unique_Key: inputSKU.Unique_Key,\n        serial_no: inputSKU.serial_no,\n        matchedSKU: inputSKU.sku,\n        matchedRow: null,\n        message: `❌ No match found for SKU: ${inputSKU.sku}`,\n        closestDistance: lowestDistance,\n        quantity: inputSKU.quantity,\n        unit_price: inputSKU.unit_price,\n        line_total: inputSKU.line_total,\n        hsn_code: inputSKU.hsn_code,\n        cgst: inputSKU.cgst,\n        sgst: inputSKU.sgst,\n        All_Conditions_Met: false\n      }\n    });\n  }\n}\n\n// --- 4. Return final results ---\nreturn results;\n",
				},
				position: [2156, 280],
				name: 'Validation',
			},
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
							'Unique Key': '={{ $json.Unique_Key }}',
							'Mismatch Note': "={{ $('Validation').item.json.message }}",
							'Total Loss/Gain (₹)':
								'={{ ($json.unit_price - $json.costFromSheet) * $json.quantity}}',
							'Price Difference (₹)': '={{ $json.unit_price - $json.costFromSheet }}',
							'Matched Cost (Actual Price)': '={{ $json.costFromSheet }}',
							'Matched Unit Price (Vendor Price)': "={{ $('Validation').item.json.unit_price }}",
						},
						schema: [
							{
								id: 'SR No.',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'SR No.',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice No.',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Invoice No.',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Unique Key',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Unique Key',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice Date',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Invoice Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PO Number',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'PO Number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PO Date',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'PO Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'TWW Description',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'TWW Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'HSN',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'HSN',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Qty',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Qty',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rate (Vendor)',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Rate (Vendor)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Sale Amount',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Sale Amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CGST%',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CGST%',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SGST%',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'SGST%',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Matched Cost (Actual Price)',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Matched Cost (Actual Price)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Matched Unit Price (Vendor Price)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Matched Unit Price (Vendor Price)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Price Difference (₹)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Price Difference (₹)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Total Loss/Gain (₹)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Total Loss/Gain (₹)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Mismatch Note',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Mismatch Note',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Unique Key'],
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
							'https://docs.google.com/spreadsheets/d/1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1L2DN1aGp1uhLhNm7TrI54tC0Yuk4ER9y2DU-jbHrSrk/edit?usp=drivesdk',
						cachedResultName: 'Invoice Validation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2460, 280],
				name: 'Update Results',
			},
		}),
	)
	.add(
		sticky("## Reading Invoice's PDF File Locally", {
			color: 7,
			position: [-240, 320],
			width: 620,
			height: 280,
		}),
	)
	.add(
		sticky('## Extracting Details From Invoice PDF', {
			name: 'Sticky Note1',
			color: 7,
			position: [400, 320],
			width: 380,
			height: 280,
		}),
	)
	.add(
		sticky('## Processing Output', {
			name: 'Sticky Note2',
			color: 7,
			position: [800, 320],
			height: 220,
		}),
	)
	.add(
		sticky('## Fallback On Error', {
			name: 'Sticky Note3',
			color: 7,
			position: [1280, 460],
			width: 220,
			height: 220,
		}),
	)
	.add(
		sticky('## Extracting Line Items', {
			name: 'Sticky Note4',
			color: 7,
			position: [1240, 220],
			width: 400,
			height: 220,
		}),
	)
	.add(
		sticky('## Sending Data To G-Sheet', {
			name: 'Sticky Note5',
			color: 7,
			position: [1660, 200],
			width: 220,
			height: 240,
		}),
	)
	.add(
		sticky('## Fetch Master Data & Validating Invoice Extracted Data', {
			name: 'Sticky Note6',
			color: 7,
			position: [1900, 200],
			width: 440,
			height: 240,
		}),
	)
	.add(
		sticky('## Update Validation Result', {
			name: 'Sticky Note7',
			color: 7,
			position: [2360, 200],
			width: 300,
			height: 240,
		}),
	);
