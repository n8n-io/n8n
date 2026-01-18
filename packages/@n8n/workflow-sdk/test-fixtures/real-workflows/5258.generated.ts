const wf = workflow('WczQxQgtvjjk1HC1', 'LinkedIn Profile Enrichment With Error Handling', {
	executionOrder: 'v1',
	saveManualExecutions: true,
})
	.add(
		trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [160, 80] } }),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 2,
			config: {
				parameters: {
					limit: 15,
					table: 'NOCODB_TABLEID',
					options: {
						where: '(LinkedIn,isnot,null)~and(linkedin_headline,is,null)',
					},
					operation: 'getAll',
					projectId: 'NOCODB_PROJECTID',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [380, 180],
				name: 'Get Guests with LinkedIn',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/runs',
					method: 'POST',
					options: {},
					jsonBody: '={"profileUrls": ["{{$json.LinkedIn}}"]}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
				},
				position: [680, 180],
				name: 'Run Apify LinkedIn Scraper',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/runs/{{$json.data.id}}',
					options: { timeout: 300000 },
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					queryParameters: { parameters: [{ name: 'waitForFinish', value: '240' }] },
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
				},
				position: [900, 180],
				name: 'Wait for Completion',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							mode: 'runOnceForEachItem',
							jsCode:
								"// Get the dataset ID from the previous node\nconst datasetId = $json.data.defaultDatasetId;\n\ntry {\n  // Get the Apify token\n  const apifyToken = '[YOUR APIFY TOKEN]';\n  \n  // Make the HTTP request to get the dataset\n  const response = await this.helpers.httpRequest({\n    method: 'GET',\n    url: `https://api.apify.com/v2/datasets/${datasetId}/items?token=YOUR_TOKEN_HERE\n    json: true\n  });\n\n  // Check if we have valid data\n  if (!Array.isArray(response) || response.length === 0) {\n    // No data found - this is a 404 profile\n    throw new Error('Empty dataset - LinkedIn profile not found or inaccessible');\n  }\n\n  // Check if the profile data is actually valid\n  const firstItem = response[0];\n  if (!firstItem || !firstItem.linkedinUrl || !firstItem.fullName) {\n    throw new Error('Invalid LinkedIn profile data');\n  }\n\n  // IMPORTANT: For runOnceForEachItem mode, we must return a single object\n  // n8n will handle the array data by flattening it\n  // We need to pass the array as a property of an object\n  return {\n    linkedinData: response\n  };\n} catch (error) {\n  // For HTTP errors (like 404 on dataset endpoint)\n  if (error.response && error.response.statusCode === 404) {\n    throw new Error('Dataset not found - LinkedIn profile not accessible');\n  }\n  // Re-throw other errors to route to error output\n  throw error;\n}",
						},
						position: [1340, 80],
						name: 'Get Scraper Results',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							mode: 'runOnceForEachItem',
							jsCode:
								"// Get the guest ID and error info\nlet guestId = null;\nlet errorMessage = 'Unknown error';\n\ntry {\n  guestId = $('Get Guests with LinkedIn').item.json.Id;\n  \n  // Try to get error details from the failed request\n  if ($json.error) {\n    errorMessage = $json.error.message || $json.error;\n  } else if ($json.data && $json.data.status === 'FAILED') {\n    errorMessage = 'Apify scraper failed';\n  }\n} catch (error) {\n  errorMessage = error.message;\n}\n\n// Get the current timestamp\nconst currentTimestamp = new Date().toISOString();\n\n// Return error update data\nreturn {\n  Id: guestId,\n  linkedin_scrape_status: 'error',\n  linkedin_scrape_error_reason: errorMessage,\n  linkedin_scrape_last_attempt: currentTimestamp\n};",
						},
						position: [1640, 620],
						name: 'Handle Scraper Error',
					},
				}),
			],
			{
				version: 2,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 1,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '93d97f85-c98a-4c0d-b7a4-e7c1c9a5e0a1',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.data.status }}',
								rightValue: 'SUCCEEDED',
							},
						],
					},
				},
				name: 'Check Run Status',
			},
		),
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
						"// Extract the LinkedIn data from the wrapped response\nconst dataArray = $json.linkedinData;\nif (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {\n  throw new Error('No LinkedIn data found');\n}\n\n// Get the first (and should be only) item from the array\nconst linkedinData = dataArray[0];\n\n// Get the guest ID from the original NocoDB data\nlet guestId = null;\n\ntry {\n  guestId = $('Get Guests with LinkedIn').item.json.Id;\n} catch (error) {\n  throw new Error('Could not find guest ID. Error: ' + error.message);\n}\n\nif (!guestId) {\n  throw new Error('Guest ID is null or undefined');\n}\n\n// Get the current timestamp\nconst currentTimestamp = new Date().toISOString();\n\n// Transform the data to match our NocoDB fields\nconst transformedData = {\n  Id: guestId,\n  linkedin_url: linkedinData.linkedinUrl || '',\n  linkedin_full_name: linkedinData.fullName || '',\n  linkedin_first_name: linkedinData.firstName || '',\n  linkedin_headline: linkedinData.headline || '',\n  linkedin_email: linkedinData.email || '',\n  linkedin_bio: linkedinData.about || '',\n  linkedin_profile_pic: linkedinData.profilePicHighQuality || linkedinData.profilePic || '',\n  linkedin_current_role: linkedinData.jobTitle || '',\n  linkedin_current_company: linkedinData.companyName || '',\n  linkedin_country: linkedinData.addressCountryOnly || '',\n  linkedin_skills: linkedinData.topSkillsByEndorsements || '',\n  linkedin_company_website: linkedinData.companyWebsite || '',\n  linkedin_experiences: JSON.stringify(linkedinData.experiences || []),\n  linkedin_personal_website: JSON.stringify(linkedinData.creatorWebsite || {}),\n  linkedin_publications: JSON.stringify(linkedinData.publications || []),\n  linkedin_last_modified: currentTimestamp,\n  linkedin_scrape_status: 'success',\n  linkedin_scrape_last_attempt: currentTimestamp\n};\n\nreturn transformedData;",
				},
				position: [1640, -100],
				name: 'Transform Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 2,
			config: {
				parameters: {
					id: '={{$json.Id}}',
					table: 'NOCODB_TABLEID',
					operation: 'update',
					projectId: 'NOCODB_PROJECTID',
					dataToSend: 'autoMapInputData',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [1860, -100],
				name: 'Update Guest Success',
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
					mode: 'runOnceForEachItem',
					jsCode:
						"// Get the guest ID from the original NocoDB data\nlet guestId = null;\nlet linkedinUrl = null;\n\ntry {\n  guestId = $('Get Guests with LinkedIn').item.json.Id;\n  linkedinUrl = $('Get Guests with LinkedIn').item.json.LinkedIn;\n} catch (error) {\n  throw new Error('Could not find guest data. Error: ' + error.message);\n}\n\nif (!guestId) {\n  throw new Error('Guest ID is null or undefined');\n}\n\n// Get the current timestamp\nconst currentTimestamp = new Date().toISOString();\n\n// Return data to clear the broken LinkedIn URL\nreturn {\n  Id: guestId,\n  LinkedIn: null, // Clear the LinkedIn field\n  linkedin_scrape_status: 'invalid_url',\n  linkedin_scrape_error_reason: 'Profile not found or inaccessible (404)',\n  linkedin_last_modified: currentTimestamp\n};",
				},
				position: [1660, 260],
				name: 'Clear Broken LinkedIn URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 2,
			config: {
				parameters: {
					id: '={{$json.Id}}',
					table: 'NOCODB_TABLEID',
					operation: 'update',
					projectId: 'NOCODB_PROJECTID',
					dataToSend: 'autoMapInputData',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [1880, 260],
				name: 'Update Guest - Clear URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.nocoDb',
			version: 2,
			config: {
				parameters: {
					id: '={{$json.Id}}',
					table: 'NOCODB_TABLEID',
					operation: 'update',
					projectId: 'NOCODB_PROJECTID',
					dataToSend: 'autoMapInputData',
					authentication: 'nocoDbApiToken',
				},
				credentials: {
					nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' },
				},
				position: [1860, 620],
				name: 'Update Guest - Error Status',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [160, 280] },
		}),
	)
	.add(
		sticky('## Data enrichment flow', {
			color: 4,
			position: [1540, -220],
			width: 580,
			height: 320,
		}),
	)
	.add(
		sticky('## Remove 404 linkedin URL', {
			name: 'Sticky Note1',
			position: [1540, 140],
			width: 580,
			height: 320,
		}),
	)
	.add(
		sticky('## Apify error/timeout', {
			name: 'Sticky Note2',
			color: 3,
			position: [1540, 500],
			width: 580,
			height: 320,
		}),
	)
	.add(
		sticky('## Get LinkedIn URL', {
			name: 'Sticky Note3',
			color: 5,
			position: [320, 120],
			width: 220,
			height: 240,
		}),
	)
	.add(
		sticky('## Get LinkedIn profile data', {
			name: 'Sticky Note4',
			color: 5,
			position: [620, 120],
			width: 420,
			height: 240,
		}),
	)
	.add(sticky('', { name: 'Sticky Note5', position: [1680, 280] }))
	.add(sticky('', { name: 'Sticky Note6', position: [1680, 280] }))
	.add(
		sticky(
			'## Required fields in NocoDB table:\n\n**Input field:**\n* LinkedIn\n\n**Output fields:**\n* linkedin_url\n* linkedin_full_name\n* linkedin_first_name: \n* linkedin_headline:\n* linkedin_email:\n* linkedin_bio:\n* linkedin_profile_pic\n* linkedin_current_role\n* linkedin_current_company\n* linkedin_country\n* linkedin_skills\n* linkedin_company_website\n* linkedin_experiences\n* linkedin_personal_website\n* linkedin_publications\n* linkedin_scrape_error_reason\n* linkedin_scrape_last_attempt\n* linkedin_scrape_status\n* linkedin_last_modified',
			{ name: 'Sticky Note7', color: 7, position: [2180, 20], width: 440, height: 600 },
		),
	);
