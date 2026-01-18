const wf = workflow('995Zs4albP6ZWzOD', 'The Recap AI - Email Scraper', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Email Scraper',
					formFields: {
						values: [
							{
								fieldLabel: 'Website Url',
								placeholder: 'https://aitools.inc',
								requiredField: true,
							},
						],
					},
				},
				name: 'form_trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.firecrawl.dev/v1/map',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "url": "{{ $json[\'Website Url\'] }}",\n  "search": "about contact company authors team",\n  "limit": 5\n}',
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
				position: [240, 0],
				name: 'map_website',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.firecrawl.dev/v1/batch/scrape',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "urls": {{ JSON.stringify($json.links) }},\n  "formats": ["markdown", "json"],\n  "proxy": "stealth",\n  "jsonOptions": {\n    "prompt": "Extract every unique, fully-qualified email address found in the supplied web page. Normalize common obfuscations where “@” appears as “(at)”, “[at]”, “{at}”, “ at ”, “&#64;” and “.” appears as “(dot)”, “[dot]”, “{dot}”, “ dot ”, “&#46;”. Convert variants such as “user(at)example(dot)com” or “user at example dot com” to “user@example.com”. Ignore addresses hidden inside HTML comments, <script>, or <style> blocks. Deduplicate case-insensitively. The addresses shown in the example output below (e.g., “user@example.com”, “info@example.com”, “support@sample.org”) are placeholders; include them only if they genuinely exist on the web page.",\n    "schema": {\n      "type": "object",\n      "properties": {\n        "email_addresses": {\n          "type": "array",\n          "items": {\n            "type": "string",\n            "format": "email",\n            "description": "A valid email address found and extracted from the page"\n          },\n          "description": "An array of all email addresses found on the web page"\n        }\n      },\n      "required": ["emails"]\n    }\n  }\n}',
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
				position: [500, 0],
				name: 'start_batch_scrape',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [760, 0], name: 'rate_limit_wait' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.firecrawl.dev/v1/batch/scrape/{{ $('start_batch_scrape').item.json.id }}",
					options: {},
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1020, 0],
				name: 'fetch_scrape_results',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: '9efaad04-014a-45a4-9760-1b3edbf51c8d',
										name: 'scraped_email_addresses',
										type: 'array',
										value:
											'={{\n  ($node["fetch_scrape_results"].json.data || [])\n    .flatMap(item => item?.json?.email_addresses || [])\n    .filter(email => typeof email === \'string\' && email.trim())\n}}',
									},
								],
							},
						},
						position: [1900, -20],
						name: 'set_result',
					},
				}),
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
										id: '7e16bcbe-7ea6-48ca-b98e-5b0ec18be8c3',
										operator: { type: 'number', operation: 'gte' },
										leftValue: '={{ $runIndex }}',
										rightValue: 12,
									},
								],
							},
						},
						position: [1580, 160],
						name: 'check_retry_count',
					},
				}),
			],
			{
				version: 2.2,
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
								id: 'cc296f33-b896-49c7-898c-4d8b5f11266a',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'completed',
							},
						],
					},
				},
				name: 'check_scrape_completed',
			},
		),
	)
	.add(
		node({
			type: 'n8n-nodes-base.stopAndError',
			version: 1,
			config: {
				parameters: {
					errorMessage: 'Too many retries when attempting to scrape website.',
				},
				position: [1900, 240],
				name: 'too_many_attempts_error',
			},
		}),
	)
	.add(
		sticky(
			"## Scrape Public Email Addresses\n\n- Takes a website's home page url as input to the automation\n- Uses Firecrawl's `/map` and `/scrape/batch` endpoints to scrape and extract email addresses that exist on the website's HTML\n- Formats the results in array",
			{ name: 'Sticky Note1', color: 4, position: [-60, -260], width: 2180, height: 700 },
		),
	);
