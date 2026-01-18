const wf = workflow(
	'B4JKMX91miMTZt31',
	'Auto Germany Apartment Search & Apply with Immobilienscout24 & Google Services',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-1600, 60] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 1,
			config: {
				parameters: {
					values: {
						string: [
							{ name: 'CITY', value: 'Berlin' },
							{ name: 'MAX_RENT', value: '1200' },
							{ name: 'ROOMS', value: '2' },
							{ name: 'MY_EMAIL', value: 'user@example.com' },
							{ name: 'MY_NAME', value: 'Max Mustermann' },
							{ name: 'GDRIVE_SCHUFA_FILE_ID', value: 'your-schufa-file-id' },
							{ name: 'GDRIVE_SALARY_FILE_ID', value: 'your-salary-file-id' },
							{ name: 'GOOGLE_SHEET_ID', value: 'your-google-sheet-id' },
						],
					},
					options: {},
				},
				position: [-1400, 100],
				name: 'Set Config',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 1,
			config: {
				parameters: {
					url: 'https://rest.immobilienscout24.de/restapi/api/search/v1.0/region',
					options: {},
					authentication: 'oAuth2',
					queryParametersUi: { parameter: [{ name: 'q', value: '={{$json["CITY"]}}' }] },
				},
				position: [-1200, 100],
				name: 'GeoID Lookup',
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
						'const cityData = items[0].json;\nif (!cityData.regions || cityData.regions.length === 0) {\n  throw new Error(\'No regions found for the given city\');\n}\n// Find the region matching city name (case-insensitive)\nconst region = cityData.regions.find(r => r.name.toLowerCase() === $json["CITY"].toLowerCase()) || cityData.regions[0];\nreturn [{ json: { geoId: region.geoId, CITY: $json["CITY"], MAX_RENT: $json["MAX_RENT"], ROOMS: $json["ROOMS"], MY_EMAIL: $json["MY_EMAIL"], MY_NAME: $json["MY_NAME"], GDRIVE_SCHUFA_FILE_ID: $json["GDRIVE_SCHUFA_FILE_ID"], GDRIVE_SALARY_FILE_ID: $json["GDRIVE_SALARY_FILE_ID"], GOOGLE_SHEET_ID: $json["GOOGLE_SHEET_ID"] }}];',
				},
				position: [-1000, 100],
				name: 'Extract GeoID',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 1,
			config: {
				parameters: {
					url: 'https://rest.immobilienscout24.de/restapi/api/search/v1.0/search/region',
					options: {},
					authentication: 'oAuth2',
					queryParametersUi: {
						parameter: [
							{ name: 'realestatetype', value: 'apartmentrent' },
							{ name: 'geoid', value: '={{$json["geoId"]}}' },
							{ name: 'price', value: 'max:={{$json["MAX_RENT"]}}' },
							{ name: 'numberofrooms', value: 'min:={{$json["ROOMS"]}}' },
						],
					},
				},
				position: [-800, 100],
				name: 'Fetch Listings From immobilienscout24',
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
						'return items.flatMap(item => {\n  if (!item.json.resultList || !item.json.resultList.result) return [];\n  return item.json.resultList.result.map(res => ({ json: res.realEstate }));\n});',
				},
				position: [-600, 100],
				name: 'Extract Listings',
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
						'return items.filter(item => {\n  const price = item.json.price?.value || 0;\n  const rooms = item.json.numberOfRooms || 0;\n  return price <= parseFloat($json["MAX_RENT"]) && rooms >= parseInt($json["ROOMS"]);\n});',
				},
				position: [-400, 100],
				name: 'Filter Results',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 1,
			config: {
				parameters: { options: {}, batchSize: 1 },
				position: [-200, 100],
				name: 'Process Apartments One-by-One',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 1,
			config: {
				parameters: { options: {}, authentication: 'oAuth2' },
				name: 'Fetch Schufa (Google Drive)',
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
						'return [{\n  json: {\n    coverLetter: `Sehr geehrte Damen und Herren,\\n\\nich interessiere mich sehr für die Wohnung mit der Exposé-ID ${$json["exposeId"]} (${ $json["price"].value } EUR, ${ $json["numberOfRooms"] } Zimmer).\\n\\nIm Anhang finden Sie meine Schufa-Auskunft und aktuelle Gehaltsabrechnungen.\\n\\nVielen Dank für Ihre Zeit und ich freue mich auf Ihre Rückmeldung.\\n\\nMit freundlichen Grüßen,\\n${$json["MY_NAME"]}\\n\\nLink zum Exposé: https://www.immobilienscout24.de/expose/${$json["exposeId"]}`\n  },\n  binary: {}\n}];',
				},
				position: [200, 100],
				name: 'Generate Cover Letter',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 1,
			config: {
				parameters: {
					text: '={{$json["coverLetter"]}}',
					options: {},
					subject: 'Wohnungsbewerbung – Interesse an Exposé-ID {{$json["exposeId"]}}',
					toEmail: '={{$json["contactEmail"]}}',
					fromEmail: '={{$json["MY_EMAIL"]}}',
					attachments: [{ binaryPropertyName: 'schufa' }, { binaryPropertyName: 'salary' }],
				},
				position: [400, 100],
				name: 'Send Application Email',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 1,
			config: {
				parameters: {
					range: 'A:E',
					options: {},
					sheetId: '={{$json["GOOGLE_SHEET_ID"]}}',
					authentication: 'oAuth2',
				},
				position: [600, 100],
				name: 'Log to Google Sheet',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 1,
			config: {
				parameters: { options: {}, authentication: 'oAuth2' },
				position: [0, 200],
				name: 'Fetch Salary Slips (Google Drive)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.cron',
			version: 1,
			config: {
				parameters: { triggerTimes: { item: [{ hour: 8 }] } },
				position: [-1600, 160],
				name: 'Cron Trigger',
			},
		}),
	)
	.add(
		sticky('Triggers the workflow every day at 8 AM Berlin time.', {
			name: 'Sticky: Cron Trigger',
			position: [-1720, -60],
		}),
	)
	.add(
		sticky('Set your configuration: city, max rent, rooms, email, file IDs etc.', {
			name: 'Sticky: Set Config',
			position: [-1460, -60],
		}),
	)
	.add(
		sticky('Convert city name to GeoID needed by ImmobilienScout24 API.', {
			name: 'Sticky: GeoID Lookup',
			position: [-1140, -60],
		}),
	)
	.add(
		sticky('Fetch apartment listings from ImmobilienScout24 with filters applied.', {
			name: 'Sticky: Fetch Listings From immobilienscout24',
			position: [-760, -40],
		}),
	)
	.add(
		sticky('Process apartments one by one to send applications.', {
			name: 'Sticky: Process Apartments One-by-One',
			position: [-400, -40],
		}),
	)
	.add(
		sticky('Fetch latest salary slips from Google Drive for application.', {
			name: 'Sticky: Fetch Salary Slips',
			position: [-40, 380],
		}),
	)
	.add(
		sticky('Fetch Schufa report from Google Drive to attach in application.', {
			name: 'Sticky: Fetch Schufa',
			position: [-80, -160],
		}),
	)
	.add(
		sticky('Generate a personalized cover letter with expose ID and applicant name.', {
			name: 'Sticky: Generate Cover Letter',
			position: [140, -40],
		}),
	)
	.add(
		sticky('Send the apartment application email with attachments.', {
			name: 'Sticky: Send Application Email',
			position: [380, -40],
		}),
	)
	.add(
		sticky('Log applied apartments in Google Sheets for tracking.', {
			name: 'Sticky: Log to Google Sheet',
			position: [640, 40],
		}),
	);
