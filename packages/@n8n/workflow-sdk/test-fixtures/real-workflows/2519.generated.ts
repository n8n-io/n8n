const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: { path: 'ETF', options: {} },
				position: [464, 464],
				name: 'When called by Excel Macro',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftExcel',
			version: 2.1,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: '{6C5AA61A-4C2D-DC48-942C-AA9581A0C966}',
						cachedResultUrl:
							"https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58&activeCell='Div%20study'!L1:L2",
						cachedResultName: 'MAJ',
					},
					options: {},
					fieldsUi: {
						values: [
							{
								column: 'Dernière mise à jour',
								fieldValue:
									"={{ new Date().toLocaleString('en-GB', { timeZone: 'Etc/GMT-2', hour12: false }) }}",
							},
						],
					},
					resource: 'table',
					workbook: {
						__rl: true,
						mode: 'list',
						value: '2D96E50BD60B2B58!15370',
						cachedResultUrl:
							'https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58',
						cachedResultName: 'My_investandearnings3',
					},
					worksheet: {
						__rl: true,
						mode: 'list',
						value: '{4ACB3D1D-2C0C-874A-A62F-93FA8C41A216}',
						cachedResultUrl:
							'https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58&activeCell=Div%20study!A1',
						cachedResultName: 'Div study',
					},
				},
				position: [656, 368],
				name: 'Logs the date & time',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftExcel',
			version: 2.1,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'list',
						value: '{B7CA3E16-A781-1145-AAB5-6EFEF4A3162E}',
						cachedResultUrl:
							"https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58&activeCell='Div%20study'!A1:I2",
						cachedResultName: 'DivComp',
					},
					filters: {},
					resource: 'table',
					workbook: {
						__rl: true,
						mode: 'list',
						value: '2D96E50BD60B2B58!15370',
						cachedResultUrl:
							'https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58',
						cachedResultName: 'My_investandearnings3',
					},
					operation: 'getRows',
					returnAll: true,
					worksheet: {
						__rl: true,
						mode: 'list',
						value: '{4ACB3D1D-2C0C-874A-A62F-93FA8C41A216}',
						cachedResultUrl:
							'https://onedrive.live.com/edit.aspx?resid=2D96E50BD60B2B58!14436&activeCell=Div%20study!A1',
						cachedResultName: 'Div study',
					},
				},
				position: [864, 368],
				name: 'Gets rows from table',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://www.justetf.com/fr/etf-profile.html?isin={{ $json.ISIN }}',
					options: {},
				},
				position: [1040, 368],
				name: 'Forge a Get request with ISIN Values',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.html',
			version: 1.2,
			config: {
				parameters: {
					options: {},
					operation: 'extractHtmlContent',
					extractionValues: {
						values: [
							{
								key: 'Dividends',
								cssSelector: '#etf-profile-body > div:nth-child(20)',
							},
							{
								key: 'Frais',
								cssSelector:
									'#etf-profile-body > div:nth-child(1) > div > div:nth-child(3) > div > div:nth-child(1) > div.val.bold',
							},
							{
								key: 'Performance depuis 5 ans',
								cssSelector:
									'#etf-profile-body > div:nth-child(18) > div.columns-2 > div:nth-child(1)',
							},
							{
								key: 'Name',
								cssSelector:
									'#etf-profile-body > div:nth-child(1) > div > div.e_head > div:nth-child(2)',
							},
						],
					},
				},
				position: [1456, 368],
				name: 'Extracts defined values with css selector',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [1616, 368], name: 'Loop Over Items' },
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
								id: 'b6f1d180-798e-444b-bb77-eef25eb898c8',
								name: 'Frais',
								type: 'number',
								value:
									'={{ parseFloat($json["frais"].replace(",", ".").replace("%", "")) / 100 }}\n',
							},
							{
								id: 'b523d38b-cbd8-45aa-9f97-a5ecc0d0c6ec',
								name: 'Rendement de départ',
								type: 'number',
								value:
									'={{ parseFloat($json["rendementActuelDeDistribution"].replace(",", ".").replace("%", "")) / 100 }}\n',
							},
							{
								id: 'e9a841f7-2b10-46a1-abcc-1ce69df53299',
								name: 'Performance depuis 5 ans',
								type: 'number',
								value:
									'={{ parseFloat($json["performance5Years"].replace(",", ".").replace("%", "")) / 100 }}',
							},
							{
								id: 'dc6972cc-6200-4015-bc72-ab53122814d4',
								name: 'Dividende 12 mois',
								type: 'number',
								value: '={{ $json.historicDividends[0].dividendInEUR.replace(",", ".") }}\n',
							},
							{
								id: 'df80be9b-89ff-49e3-9900-cf41ca2f540d',
								name: 'Dividende année précédente',
								type: 'number',
								value: '={{ $json.historicDividends[1].dividendInEUR.replace(",", ".") }}',
							},
							{
								id: '17b91ea7-f2f8-495e-8080-8e406454f0e0',
								name: 'Dividende il y a 2 ans',
								type: 'number',
								value: '={{ $json.historicDividends[2].dividendInEUR.replace(",", ".") }}',
							},
							{
								id: 'bbeb633c-d73c-4a5d-ae77-308e400a8c6b',
								name: 'Dividende il y a 3 ans',
								type: 'number',
								value: '={{ $json.historicDividends[3].dividendInEUR.replace(",", ".") }}',
							},
							{
								id: 'f71492ae-7ceb-4c0a-94cb-f712454d9941',
								name: 'Dividende il y a 4 ans',
								type: 'number',
								value: '={{ $json.historicDividends[4].dividendInEUR.replace(",", ".") }}',
							},
							{
								id: '04baa12a-5910-44de-ba6b-7695c3562b02',
								name: 'Nom',
								type: 'string',
								value: '={{ $json.nameOnly }}',
							},
						],
					},
				},
				position: [1824, 240],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.microsoftExcel',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					fieldsUi: {
						values: [
							{ column: 'Frais', fieldValue: '={{ $json.Frais }}' },
							{
								column: 'Rendement de départ',
								fieldValue: "={{ $json['Rendement de départ'] }}",
							},
							{
								column: 'Performance depuis 5 ans',
								fieldValue: "={{ $json['Performance depuis 5 ans'] }}",
							},
							{
								column: 'Dividende 12 mois',
								fieldValue: "={{ $json['Dividende 12 mois'] }}",
							},
							{
								column: 'Dividende année précédente',
								fieldValue: "={{ $json['Dividende année précédente'] }}",
							},
							{
								column: 'Dividende il y a 2 ans',
								fieldValue: "={{ $json['Dividende il y a 2 ans'] }}",
							},
							{
								column: 'Dividende il y a 3 ans',
								fieldValue: "={{ $json['Dividende il y a 3 ans'] }}",
							},
							{
								column: 'Dividende il y a 4 ans',
								fieldValue: "={{ $json['Dividende il y a 4 ans'] }}",
							},
							{ column: 'Nom', fieldValue: '={{ $json.Nom }}' },
						],
					},
					resource: 'worksheet',
					workbook: {
						__rl: true,
						mode: 'list',
						value: '2D96E50BD60B2B58!15370',
						cachedResultUrl:
							'https://onedrive.live.com/personal/2d96e50bd60b2b58/_layouts/15/doc.aspx?resid=d60b2b58-e50b-2096-802d-0a3c00000000&cid=2d96e50bd60b2b58',
						cachedResultName: 'My_investandearnings3',
					},
					operation: 'update',
					worksheet: {
						__rl: true,
						mode: 'list',
						value: '{4ACB3D1D-2C0C-874A-A62F-93FA8C41A216}',
						cachedResultUrl:
							'https://onedrive.live.com/edit.aspx?resid=2D96E50BD60B2B58!14436&activeCell=Div%20study!A1',
						cachedResultName: 'Div study',
					},
					valueToMatchOn: "={{ $('Gets rows from table').item.json.ISIN }}",
					columnToMatchOn: 'ISIN',
				},
				position: [2016, 240],
				name: 'Updates my table',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Get all incoming input data from the previous node\nconst allData = $input.all();\n\n// Extract the \"Dividends\" data from the first item in the input array\nconst dividendData = allData[0].json['Dividends'] || '';\n\n// Use regex to extract dividends for the past years (1-year, 2023, 2022, 2021, and 2020)\nconst dividendMatches = [...dividendData.matchAll(/(1 an|2024|2023|2022|2021) EUR ([0-9,.]+) ([0-9,.]+%)/g)];\n\n// Format the extracted dividend data\nconst historicDividends = dividendMatches.map(match => ({\n  period: match[1],\n  dividendInEUR: match[2],\n  yieldInPercentage: match[3]\n}));\n\n// Extract the \"Performance depuis 5 ans\" data from the first item in the input array\nconst performanceDataRaw = allData[0].json['Performance depuis 5 ans'] || '';\n\n// Use regex to extract the performance for \"5 ans\"\nconst performance5YearsMatch = performanceDataRaw.match(/5 ans ([+-]?[0-9,.]+%)/);\nconst performance5Years = performance5YearsMatch ? performance5YearsMatch[1] : null;\n\n// Use regex to extract \"Rendement actuel de distribution\"\nconst rendementMatch = dividendData.match(/Rendement actuel de distribution ([0-9,.]+%)/);\nconst rendementActuelDeDistribution = rendementMatch ? rendementMatch[1] : null;\n\n// Use regex to extract \"Frais\"\nconst fraisMatch = allData[0].json['Frais'] ? allData[0].json['Frais'].match(/([\\d,.]+%)/) : null;\nconst frais = fraisMatch ? fraisMatch[1].replace(' p.a.', '') : null; // Clean the fees to return just the percentage\n\n//return the name\nconst fullName = $json[\"Name\"];\nconst nameOnly = fullName.split('\\n')[0].trim();\n\n\n// Return the structured output\nreturn {\n  historicDividends,\n  performance5Years, // Now returns just the performance for 5 years\n  rendementActuelDeDistribution,\n  frais,\n  nameOnly\n};\n\n\n",
				},
				position: [1872, 464],
				name: 'Extracts defined values in better format',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [448, 288], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.add(
		sticky(
			'# 📊 Automate Your ETF Comparison: Real-Time Data & Analysis 📈\n\nThis workflow automates ETF research by pulling fresh profile data into Excel whenever you click “Update Table.” It fetches rows from your “Div study” table, grabs ETF details via ISIN, extracts dividends/fees/performance, then writes everything back—keeping your analysis current with one click. (112 words)\n\n## How it works\n1. **Trigger**: Clicking “Update Table” fires a webhook.  \n2. **Excel**: Updates “Last updated” (GMT-2) and pulls “Div study” rows.  \n3. **HTTP**: Requests ETF profile HTML using each row’s ISIN.  \n4. **Process**: Parses HTML → extracts dividends, fees, 5-year performance.  \n5. **Excel**: Writes transformed values back to “Div study” (performance, dividend growth, etc.).\n\n## Setup steps\n1. Add **“Update Table”** button in worksheet → link to webhook URL.  \n2. Ensure **“Div study”** table has columns: ISIN, Last updated, Div yield, Fees, 5Y perf, etc.  \n3. Configure workflow: Webhook → Excel (update timestamp + list rows) → HTTP (GET profile by ISIN) → Parse HTML → Excel (update rows).  \n4. Test with one ISIN; verify timestamp and fields refresh.',
			{ position: [-288, 16], width: 678, height: 584 },
		),
	)
	.add(
		sticky(
			'### Trigger \n- Trigger manually \nor \n- Trigger using a web hook (called with a macro in excel for my part)',
			{ name: 'Sticky Note1', color: 5, position: [400, 144], width: 230, height: 456 },
		),
	)
	.add(
		sticky(
			'### Excel data\n- start by logging the date and time of execution\n- Retrieve the rows of the table with the ETF ISIN\n- Forge a GET request to have data from https://justetf.com\n',
			{ name: 'Sticky Note2', color: 5, position: [640, 144], width: 758, height: 456 },
		),
	)
	.add(
		sticky(
			'### Html content extraction\n- Extract html content into human readable text from the css selectors on just etf website\n- append or update data to your table',
			{ name: 'Sticky Note3', color: 5, position: [1408, 144], width: 742, height: 456 },
		),
	);
