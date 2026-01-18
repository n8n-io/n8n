const wf = workflow('w9YVsuUtlNgXOEAQ', 'LinkedIn Post Generation & Approval Automation', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-260, 2595] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: { returnFirstMatch: true },
					filtersUI: {
						values: [{ lookupValue: 'Pending', lookupColumn: 'Status' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8/edit?usp=drivesdk',
						cachedResultName: 'LinkedIn Post Automation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-40, 2595],
				name: 'Get Data from Sheets',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.6,
			config: {
				parameters: {
					text: '=# LinkedIn Post Generation\n\n## Post Description:\n{{ $json["Post Description"] }}\n\n## Instructions:\n{{ $json["Instructions"] }}\n\n---\n\n**Task:**\nUsing the information above, generate the content for a LinkedIn post:\n- Use the Description and Instructions to create a new post.\n- Ensure your output is positive, professional, clear, and follows all provided instructions and feedback.\n- Do not include any explanations, just the final post content only, ready to publish on LinkedIn.\n- Limit to 1300 characters.\n- If the user demands to keep the same post as the Post Descrioption (in the instructions), then keep the same post content as provided in the Post Description, and output it.',
					messages: {
						messageValues: [
							{
								message:
									'=You are an expert social media and LinkedIn content writer.\n\nYou will be provided with:\n- A brief post description\n- Specific instructions from the user\n\nPlease follow these steps:\n\n1. Initial Creation:\nIf you are given a post description and instructions, write a polished, professionally worded LinkedIn post suitable for sharing. Strictly follow the instructions and ensure the message is engaging and succinct.\nIf instructed, add a call to action or particular phrase (for example, "Connect with me" at the bottom).\n\n2. Formatting:\nKeep the tone positive, inclusive, and professional.\nAdd relevant hashtags in small case.\nLimit the content to within 1300 characters.\nPlace the call to action or special instruction at the end if requested.\nOutput ONLY the final LinkedIn post content. Do NOT include any explanations, markdown, headings, or commentary—just the post text, ready to copy and share on LinkedIn.',
							},
						],
					},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [180, 2595],
				name: 'Generate Post Content',
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
								id: 'bded6f56-99e2-4f1a-be41-27a8dd417844',
								name: 'Post Content',
								type: 'string',
								value: '={{ $json.text }}',
							},
							{
								id: 'c222c42e-b639-4a74-a1b0-7a3e6e141d55',
								name: 'Post Description',
								type: 'string',
								value: "={{ $('Get Data from Sheets').item.json['Post Description'] }}",
							},
							{
								id: '14775ff7-e005-4a86-9623-c322365f7d3a',
								name: 'Instructions',
								type: 'string',
								value: "={{ $('Get Data from Sheets').item.json.Instructions }}",
							},
						],
					},
				},
				position: [556, 2595],
				name: 'Data Formatting 1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						"=Generated Post:\n{{ $json['Post Content'] }}\n\n----------\n\nPost Description:\n{{ $json['Post Description'] }}\n\n----------\n\nInstructions:\n{{ $json.Instructions }}",
					options: {},
					subject: 'Approval for LinkedIn Post',
					operation: 'sendAndWait',
					formFields: {
						values: [
							{
								fieldType: 'dropdown',
								fieldLabel: 'Confirm  Content?',
								fieldOptions: {
									values: [{ option: 'Yes' }, { option: 'No' }, { option: 'Cancel' }],
								},
								requiredField: true,
							},
							{ fieldType: 'textarea', fieldLabel: 'Any Changes?' },
						],
					},
					responseType: 'customForm',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [776, 2495],
				name: 'Send Content Confirmation',
			},
		}),
	)
	.then(
		switchCase(
			[
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
										id: '9a78220d-35f5-48b6-9ce3-faecaac24b74',
										operator: { type: 'string', operation: 'notEmpty', singleValue: true },
										leftValue: "={{ $('Get Data from Sheets').item.json.Image }}",
										rightValue: '',
									},
								],
							},
						},
						position: [1294, 2220],
						name: 'If Image Provided',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.chainLlm',
					version: 1.6,
					config: {
						parameters: {
							text: "=Apply the modification requests on the following LinkedIn post. Besides applying the reqested modifications, return the same linkedin post.\n\nLinkedIn post:\n```\n{{ $('Data Formatting 1').item.json['Post Content'] }}\n```\n\nChange requests:\n{{ $('Send Content Confirmation').item.json.data['Any Changes?'] }}\n\n**Task:**\nUsing the information above, update the LinkedIn post content:\n- Do not include any explanations, just the final post content only (with all the change requests included in the post), ready to publish on LinkedIn.\n- Limit to 1300 characters.\n- If the user demands to keep the same post as the Post Description (in the instructions), then keep the same post content as provided in the Post Description, and output it.",
							promptType: 'define',
						},
						subnodes: {
							model: languageModel({
								type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
								version: 1.2,
								config: {
									parameters: {
										model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
										options: {},
									},
									credentials: {
										openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
									},
									name: 'OpenAI Chat Model',
								},
							}),
						},
						position: [1216, 2670],
						name: 'Regenerate Post Content',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.5,
					config: {
						parameters: {
							columns: {
								value: {
									Output: '={{ $json.urn }}',
									Status: '=Completed',
									'Post Link': '={{ $json.urn }}',
									row_number: "={{ $('Get Data from Sheets').item.json.row_number }}",
								},
								schema: [
									{
										id: 'Post Description',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Post Description',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Instructions',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Instructions',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Image',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Image',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Status',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'Status',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Output',
										type: 'string',
										display: true,
										required: false,
										displayName: 'Output',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Post Link',
										type: 'string',
										display: true,
										required: false,
										displayName: 'Post Link',
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
								matchingColumns: ['row_number'],
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
									'https://docs.google.com/spreadsheets/d/1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8/edit#gid=0',
								cachedResultName: 'Sheet1',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1EAdLU9-l0ATGDa5_xwTwFO-rPhvZurM2BOSKjH2P-W8/edit?usp=drivesdk',
								cachedResultName: 'LinkedIn Post Automation',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [2032, 2320],
						name: 'Update Google Sheet',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Yes',
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
											id: '99ec185e-80ac-451d-bb69-662f84a7cf52',
											operator: { type: 'string', operation: 'equals' },
											leftValue: "={{ $json.data['Confirm  Content?'] }}",
											rightValue: 'Yes',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'No',
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
											id: '77031007-a912-4b9b-9cca-846c57ffaec8',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: "={{ $json.data['Confirm  Content?'] }}",
											rightValue: 'No',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Cancel',
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
											id: 'e94de530-6451-48aa-892c-924a9c41cfb0',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: "={{ $json.data['Confirm  Content?'] }}",
											rightValue: 'Cancel',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Content Confirmation Logic',
			},
		),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Get Data from Sheets').item.json.Image }}",
					options: {},
				},
				position: [1592, 2120],
				name: 'Get Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Data Formatting 1').item.json['Post Content'] }}",
					person: 'pM247vR8Se',
					additionalFields: {},
					shareMediaCategory: 'IMAGE',
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1812, 2120],
				name: 'Post With Image',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $('Data Formatting 1').item.json['Post Content'] }}",
					person: 'pM247vR8Se',
					additionalFields: {},
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1812, 2320],
				name: 'Post Without Image',
			},
		}),
	)
	.add(
		sticky(
			'## 1. Schedule & Sheet Data Retrieval\n\nThis workflow starts automatically on a defined schedule (e.g., daily or hourly).\n\nIt retrieves the next Google Sheet row marked as ‘Pending’.\n\nThe sheet should include columns like:\n1. Post Description\n2. Instructions\n3. Image\n4. Status\n5. row_number (required for updates)\n\nEnsure your Google Sheets credentials are correctly configured.',
			{ position: [-780, 2480], width: 420, height: 380 },
		),
	)
	.add(
		sticky(
			'## 2. AI-Powered Post Generation & Formatting\n\nUses OpenAI GPT to generate a LinkedIn post based on the sheet’s Post Description and Instructions.\n\nYou can modify the prompt if needed.\nThe generated post is then formatted along with relevant data for easy reference and consistency.',
			{ name: 'Sticky Note1', position: [-220, 3040], width: 420, height: 240 },
		),
	)
	.add(
		sticky(
			'## 3. Gmail Approval Workflow\n\nSends the formatted post to an approver via Gmail.\n\nThe approver can respond with:\n✅ Yes – Approve\n✏️ No – Request changes\n❌ Cancel – Abort the post\n\nSet Gmail credentials and recipient email in the node.',
			{ name: 'Sticky Note2', position: [440, 3040], width: 440, height: 240 },
		),
	)
	.add(
		sticky(
			'## 4. Approval Handling & Regeneration\n\nHandles all approval responses:\n- If Yes, proceed to post.\n- If No, regenerate content based on the feedback and resend.\n- If Cancel, update the Google Sheet as Cancelled.\n\nThis ensures a complete review cycle before posting.',
			{ name: 'Sticky Note3', position: [1120, 3040], width: 440, height: 240 },
		),
	)
	.add(
		sticky(
			'## 5. Image Check, Posting & Sheet Update\n\nChecks if an image URL is provided.\n- If present: Downloads the image and posts with it.\n- If not: Posts content without an image.\n\nAfter posting, it updates the Google Sheet with:\n- Status = Completed or Cancelled\n- LinkedIn post link/output\n\nUses row_number for precise sheet updates.',
			{ name: 'Sticky Note4', position: [1800, 3040], width: 460, height: 320 },
		),
	);
