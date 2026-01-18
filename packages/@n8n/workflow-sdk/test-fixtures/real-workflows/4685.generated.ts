const wf = workflow('Dbzu6lmK6zWsyyQP', 'Lead 1', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Leads Search',
					formFields: {
						values: [
							{ fieldLabel: 'Job Title', requiredField: true },
							{ fieldLabel: 'Location', requiredField: true },
							{
								fieldType: 'number',
								fieldLabel: 'Number of Leads',
								requiredField: true,
							},
						],
					},
				},
				position: [220, 140],
				name: 'On form submission',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.apollo.io/api/v1/mixed_people/search',
					method: 'POST',
					options: { response: { response: {} } },
					jsonBody:
						'={\n  "person_locations": ["{{ $json.Location }}"],\n  "person_titles": ["{{ $json[\'Job Title\'] }}"],\n  "page": 1,\n  "per_page": {{$json[\'Number of Leads\']}},\n  "projection": ["id", "name", "linkedin_url", "title"]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Cache-Control', value: 'no-cache' },
							{ name: 'accept', value: 'application/json' },
							{ name: 'x-api-key', value: '"your-api_key_here"' },
						],
					},
				},
				position: [460, 140],
				name: 'Generate Leads with Apollo.io1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'people' },
				position: [660, 140],
				name: 'Split Out',
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
								id: 'e3bfe30e-9136-4ac9-b3da-c26eb678153b',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: 'd45c81fb-1461-45fd-be95-d5d9901d72d7',
								name: 'name',
								type: 'string',
								value: '={{ $json.name }}',
							},
							{
								id: 'b4b8f660-7758-4a5f-a8f6-dc8ab6355132',
								name: 'linkedin_url',
								type: 'string',
								value: '={{ $json.linkedin_url }}',
							},
							{
								id: '399f533a-6e6b-4f40-8ed8-aa5dd39017cd',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
							{
								id: '227d34c5-17db-4436-b0c2-f74e5ae453f2',
								name: 'organization',
								type: 'string',
								value: '={{ $json.employment_history[0].organization_name }}',
							},
						],
					},
				},
				position: [880, 140],
				name: 'Clean Data',
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
							name: '={{ $json.name }}',
							title: '={{ $json.title }}',
							apollo_id: '={{ $json.id }}',
							linkedin_url: '={{ $json.linkedin_url }}',
							organization: '={{ $json.organization }}',
							posts_scrape_status: 'pending',
							contacts_scrape_status: 'pending',
							profile_summary_scrape: 'pending',
							extract_username_status: 'pending',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'posts_scrape_status',
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
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1080, 140],
				name: 'Add Leads to Google Sheet',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [20, 580],
				name: 'Google Sheets Trigger2',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'pending',
								lookupColumn: 'contacts_scrape_status',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [260, 580],
				name: 'Get Pending Email Statuses',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.apollo.io/api/v1/people/match',
					method: 'POST',
					options: {},
					sendBody: true,
					sendQuery: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [{ name: 'id', value: '={{ $json.apollo_id }}' }],
					},
					queryParameters: {
						parameters: [
							{ name: 'reveal_personal_emails', value: 'true' },
							{ name: 'reveal_phone_number', value: 'false' },
						],
					},
					headerParameters: {
						parameters: [
							{ name: 'Cache-Control', value: 'no-cache' },
							{ name: 'accept', value: 'application/json' },
							{ name: 'x-api-key', value: '"your_api_key"' },
						],
					},
				},
				position: [480, 580],
				name: 'Get Email from Apollo11',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.mails.so/v1/validate?email={{ $json.person.email }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{
								name: 'x-mails-api-key',
								value: '83bd75d6-5fd4-4ea9-8554-5e2b1ba90893',
							},
						],
					},
				},
				position: [740, 580],
				name: 'Confirm Email Validity',
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
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'dd16c397-c6f6-4a91-b92c-24a1f24b707f',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.data.mx_record }}',
								rightValue: 'null',
							},
							{
								id: 'bc3200af-7ae4-4944-b410-ebb459e2d927',
								operator: { type: 'string', operation: 'contains' },
								leftValue: '={{ $json.data.result }}',
								rightValue: 'deliverable',
							},
						],
					},
					looseTypeValidation: true,
				},
				position: [1000, 580],
				name: 'If',
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
					columns: {
						value: {
							apollo_id: "={{ $('Get Pending Email Statuses').item.json.apollo_id }}",
							email_address: '={{ $json.data.email }}',
							contacts_scrape_status: 'finished',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1340, 500],
				name: 'Add Email Address',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							apollo_id: "={{ $('Get Pending Email Statuses').item.json.apollo_id }}",
							contacts_scrape_status: 'invalid_email',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1340, 700],
				name: 'Mark Invalid Email',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [-40, 1060],
				name: 'Google Sheets Trigger3',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'pending',
								lookupColumn: 'profile_summary_scrape',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [220, 1060],
				name: 'Get Pending About and Posts Rows',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: { parameters: { maxItems: 2 }, position: [440, 1060], name: 'Limit' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://linkedin-data-api.p.rapidapi.com',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [{ name: 'username', value: '={{ $json.linkedin_username }}' }],
					},
					headerParameters: {
						parameters: [
							{
								name: 'x-rapidapi-host',
								value: 'linkedin-data-api.p.rapidapi.com',
							},
							{
								name: 'x-rapidapi-key',
								value: 'faf88fbfc9msh9af1ccc8b3e2f05p11283cjsnc5302b552c5e',
							},
						],
					},
				},
				position: [760, 1060],
				name: 'Get About Profile',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						'return {\n  summary: $json.summary || null,\n  headline: $json.headline || null,\n  nationality: $json.geo?.country || null,\n  language: $json.languages?.[0]?.name || null,\n  education: $json.educations?.[0]?.schoolName || null,\n  fieldOfStudy: $json.educations?.[0]?.fieldOfStudy || null,\n  employment_company: $json.position?.[0]?.companyName || null,\n  company_industry: $json.position?.[0]?.companyIndustry || null,\n  position: $json.position?.[0]?.title || null,\n  company_location: $json.position?.[0]?.location || null,\n  employment_description_1: $json.position?.[0]?.description || null,\n};\n',
				},
				position: [-60, 1360],
				name: 'Clean Profile Data',
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
					mode: 'runOnceForEachItem',
					jsCode:
						'const profile = item.json;\n\nreturn {\n  json: {\n    profileString: JSON.stringify(profile, null, 2) // Pretty print with 2-space indentation\n  }\n};',
				},
				position: [200, 1280],
				name: 'Stringify Profile Data1',
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
						value: 'gpt-3.5-turbo',
						cachedResultName: 'GPT-3.5-TURBO',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=Please summarize the following linkedin profile data {{ $json.profileString }} for a lead I want to cold email. I want to combine this summary with another information about them to send personalied emails, so please make sure you include relevant bits in the summary',
							},
						],
					},
					simplify: false,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [420, 1280],
				name: 'AI Profile Summarizer',
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
							apollo_id: "={{ $('Get Pending About and Posts Rows').item.json.apollo_id }}",
							about_linkedin_profile: '={{ $json.choices[0].message.content }}',
							profile_summary_scrape: 'completed',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [900, 1280],
				name: 'Update Profile Summary',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							apollo_id: "={{ $('Get Pending About and Posts Rows').item.json.apollo_id }}",
							profile_summary_scrape: 'failed',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [200, 1440],
				name: 'update status to failed',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [-80, 1900],
				name: 'Google Sheets Trigger4',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'unscraped',
								lookupColumn: 'posts_scrape_status',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [160, 1900],
				name: 'Get Pending About and Posts Rows1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: { parameters: { maxItems: 8 }, position: [380, 1900], name: 'Limit1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://linkedin-data-api.p.rapidapi.com/get-profile-posts',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{ name: 'username', value: '={{ $json.linkedin_username }}' },
							{ name: 'start', value: '0' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'x-rapidapi-host',
								value: 'linkedin-data-api.p.rapidapi.com',
							},
							{
								name: 'x-rapidapi-key',
								value: 'faf88fbfc9msh9af1ccc8b3e2f05p11283cjsnc5302b552c5e',
							},
						],
					},
				},
				position: [640, 1900],
				name: 'Get Profile Posts',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						'const data = $json.data || [];\n\nfunction getText(post, reshared = false) {\n  if (!post) return "";\n  return reshared ? (post.resharedPost?.text || "") : (post.text || "");\n}\n\nfunction getDate(post) {\n  if (!post) return "";\n  return post.postedDate || post.postedDateTimestamp || "";\n}\n\nreturn {\n  json: {\n    post_1: getText(data[0]),\n    post_1_date: getDate(data[0]),\n\n    post_2: getText(data[1]),\n    post_2_date: getDate(data[1]),\n\n    post_3: getText(data[2]),\n    post_3_date: getDate(data[2]),\n\n    \n  }\n};\n',
				},
				position: [920, 1900],
				name: 'Clean Posts Data',
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
					mode: 'runOnceForEachItem',
					jsCode:
						'const profile = item.json;\n\nreturn {\n  json: {\n    postsString: JSON.stringify(profile, null, 2) // Pretty print with 2-space indentation\n  }\n};',
				},
				position: [1320, 1820],
				name: 'Stringify Posts Data',
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
						value: 'gpt-3.5-turbo',
						cachedResultName: 'GPT-3.5-TURBO',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=Below are the most recent posts and reposts from a LinkedIn user. Summarize them collectively in no more than two short paragraphs. Focus on capturing the main themes, tone, and any recurring interests or professional concerns.\n\nAvoid listing each post separately — instead, synthesize the information into a narrative that gives a clear idea of what this person is currently focused on or passionate about.\n\nPosts: {{ $json.postsString }}\n\nKeep it insightful but brief — no more than 2 concise paragraphs.',
							},
						],
					},
					simplify: false,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1560, 1820],
				name: 'Posts AI Summarizer',
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
							apollo_id: "={{ $('Get Pending About and Posts Rows1').item.json.apollo_id }}",
							posts_scrape_status: 'scraped',
							recent_posts_summary: '={{ $json.choices[0].message.content }}',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2020, 1820],
				name: 'Update Posts Summary',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							apollo_id: "={{ $('Get Pending About and Posts Rows1').item.json.apollo_id }}",
							posts_scrape_status: 'failed',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1320, 1980],
				name: 'Google Sheets',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [1200, 2420],
				name: 'Google Sheets Trigger5',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'finished',
								lookupColumn: 'contacts_scrape_status',
							},
							{
								lookupValue: 'completed',
								lookupColumn: 'profile_summary_scrape',
							},
							{ lookupValue: 'scraped', lookupColumn: 'posts_scrape_status' },
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1420, 2420],
				name: 'Get Completely Enriched Profiles',
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
							Position: '={{ $json.title }}',
							'Lead Name': '={{ $json.name }}',
							'Email Address': '={{ $json.email_address }}',
							'Company/Organization': '={{ $json.organization }}',
							'Recent Posts Summary': '={{ $json.recent_posts_summary }}',
							'Linkedin Profile Summary': '={{ $json.about_linkedin_profile }}',
						},
						schema: [
							{
								id: 'Lead Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Lead Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Email Address',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Email Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Company/Organization',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Company/Organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Position',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Position',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Linkedin Profile Summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Linkedin Profile Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Recent Posts Summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Recent Posts Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Email Address'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1npW6ZR6a7hDhxXcKUPPSRfE9em9ZZ2-qiOxmbscYnjc/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1npW6ZR6a7hDhxXcKUPPSRfE9em9ZZ2-qiOxmbscYnjc',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1npW6ZR6a7hDhxXcKUPPSRfE9em9ZZ2-qiOxmbscYnjc/edit?usp=drivesdk',
						cachedResultName: 'Enriched Leads Database',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1620, 2420],
				name: 'Append to Enriched Leads Database',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [
							{
								field: 'weeks',
								triggerAtDay: [2],
								triggerAtHour: 8,
								weeksInterval: 4,
							},
						],
					},
				},
				position: [2120, 340],
				name: 'Schedule Trigger2',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'failed',
								lookupColumn: 'profile_summary_scrape',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2340, 340],
				name: 'get_failed_profile_summary_rows',
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
							apollo_id: '={{ $json.apollo_id }}',
							profile_summary_scrape: 'pending',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2560, 340],
				name: 'update_to_pending1',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [
							{
								field: 'weeks',
								triggerAtDay: [2],
								triggerAtHour: 8,
								weeksInterval: 4,
							},
						],
					},
				},
				position: [2180, 800],
				name: 'Schedule Trigger3',
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
					filtersUI: {
						values: [{ lookupValue: 'failed', lookupColumn: 'posts_scrape_status' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2400, 800],
				name: 'get_failed_posts_summary_rows1',
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
							apollo_id: '={{ $json.apollo_id }}',
							posts_scrape_status: 'unscraped',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2600, 800],
				name: 'update_to_unscraped',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [
							{
								field: 'weeks',
								triggerAtDay: [2],
								triggerAtHour: 8,
								weeksInterval: 4,
							},
						],
					},
				},
				position: [2140, 1180],
				name: 'Schedule Trigger1',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'invalid_email',
								lookupColumn: 'contacts_scrape_status',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2360, 1180],
				name: 'get invalid email rows',
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
							apollo_id: '={{ $json.apollo_id }}',
							contacts_scrape_status: 'pending',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1d99PlHkp9RPeSAtmATgQ4OC4Selcp8JSFLNuKx-n1EQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2580, 1180],
				name: 'update_to_pending',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [260, 380],
				name: 'Google Sheets Trigger',
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
					filtersUI: {
						values: [
							{
								lookupValue: 'pending',
								lookupColumn: 'extract_username_status',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Xv9-U2Em_C-M5qTGCZGpSM9HJcchBQGKU6PQusLJEcM/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [500, 380],
				name: 'Get Pending Username Row',
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
						value: 'gpt-3.5-turbo',
						cachedResultName: 'GPT-3.5-TURBO',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=remove the http or https://www.linkedin.com/in/ from this  {{ $json.linkedin_url }}',
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [740, 380],
				name: 'OpenAI1',
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
							apollo_id: "={{ $('Get Pending Username Row').item.json.apollo_id }}",
							linkedin_username: '={{ $json.message.content }}',
							extract_username_status: 'finished',
						},
						schema: [
							{
								id: 'apollo_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'apollo_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'organization',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'organization',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'linkedin_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin_username',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'linkedin_username',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'extract_username_status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'extract_username_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'email_address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'email_address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'contacts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'contacts_scrape_status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'about_linkedin_profile',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'about_linkedin_profile',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'profile_summary_scrape',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'profile_summary_scrape',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'recent_posts_summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'recent_posts_summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'posts_scrape_status',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'posts_scrape_status',
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
						matchingColumns: ['apollo_id'],
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
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1iGBmgNtQ1FOfEKQ2WvQIjzd0YMa800Ir43Rp0Tm7bBE/edit?usp=drivesdk',
						cachedResultName: 'Apollo.ai leads and enrichment',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1080, 380],
				name: 'Add Linkedin Username',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://blessed-gently-stag.ngrok-free.app/contacts',
					options: {},
				},
				position: [520, 5040],
				name: 'HTTP Request',
			},
		}),
	)
	.add(
		sticky(
			'## Automated Lead Generation and Enrichment Workflow\n\nDescription: This workflow automates lead generation by collecting job title, location, and lead count via a form, using Apollo.io to fetch leads, and OpenAI to extract LinkedIn usernames. It stores and updates lead data in Google Sheets, validating email addresses and tracking scrape statuses for efficient lead management.\n',
			{ name: 'Sticky Note1', position: [-200, -60], width: 1820, height: 1020 },
		),
	)
	.add(
		sticky(
			'## LinkedIn Profile Summary Enrichment Workflow\nThis workflow automates the enrichment of lead data by fetching LinkedIn profile details for records marked as "pending" in a Google Sheets document, using the LinkedIn Data API. It cleans and summarizes the profile data with OpenAI, then updates the Google Sheet with the summarized profile and status, marking failed attempts if errors occur.',
			{ name: 'Sticky Note4', color: 6, position: [-180, 960], width: 1320, height: 700 },
		),
	)
	.add(
		sticky(
			'## LinkedIn Posts Scraping and Lead Enrichment Workflow\nThis workflow retrieves recent LinkedIn posts for leads marked "unscraped" in a Google Sheet, using the LinkedIn Data API, and summarizes them with OpenAI to enhance lead profiles for personalized outreach. It updates the Google Sheet with post summaries, tracks failed attempts, and transfers fully enriched profiles (with validated emails, profile summaries, and post summaries) to a separate Enriched Leads Database.',
			{ name: 'Sticky Note6', color: 4, position: [-220, 1680], width: 2420, height: 560 },
		),
	)
	.add(
		sticky('## Update Completely Enriched Profile to Final Database', {
			color: 4,
			position: [1060, 2300],
			width: 960,
			height: 360,
		}),
	)
	.add(
		sticky('## Update posts summary status from failed back to pending', {
			name: 'Sticky Note10',
			color: 7,
			position: [2040, 660],
			width: 800,
			height: 360,
		}),
	)
	.add(
		sticky('## Update Contact Scrape Status from Invalid back to Pending', {
			name: 'Sticky Note3',
			color: 5,
			position: [2040, 1100],
			width: 800,
			height: 360,
		}),
	)
	.add(
		sticky('## Update profile summary status from failed back to pending', {
			name: 'Sticky Note8',
			color: 6,
			position: [2000, 220],
			width: 820,
			height: 360,
		}),
	)
	.add(
		sticky(
			'## Scheduled Lead Status Reset Workflow\nThis workflow runs on a schedule every four weeks to identify Google Sheets rows with invalid email addresses or failed post summary scrapes. It updates the status of these rows to "pending" for email revalidation and "unscraped" for post rescraping, enabling automated retry attempts for lead enrichment.',
			{ name: 'Sticky Note2', color: 4, position: [1720, 40], width: 1280, height: 1540 },
		),
	);
