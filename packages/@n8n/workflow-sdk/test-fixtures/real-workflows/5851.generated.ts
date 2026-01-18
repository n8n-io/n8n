const wf = workflow('gkf2gpDVeNbAoCYO', 'Save_your_workflows_into_a_GitHub_repository', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-1180, 240] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.2,
			config: {
				parameters: {
					text: '=Information_source:  Starting Workflow Backup [{{ $execution.id }}]',
					select: 'channel',
					channelId: { __rl: true, mode: 'name', value: '#notifications' },
					otherOptions: { includeLinkToWorkflow: false },
				},
				credentials: {
					slackApi: { id: 'credential-id', name: 'slackApi Credential' },
				},
				position: [-960, 240],
				name: 'Starting Message',
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
								id: '03f51f9c-4681-4423-91d2-d32f4c18d6bc',
								name: 'repo_owner',
								type: 'string',
								value: '',
							},
							{
								id: '0c9b521a-b698-4b43-9eb0-bbf744760158',
								name: 'repo_name',
								type: 'string',
								value: 'n8n-workflows',
							},
							{
								id: '91627e70-a71a-4be0-a6f6-b04d5c8469d8',
								name: 'repo_path',
								type: 'string',
								value: 'n8n-workflows',
							},
							{
								id: '983a2c87-9d69-4d64-ab88-ec1b1117c6e6',
								name: 'sub_path',
								type: 'string',
								value: 'folder',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [-740, 240],
				name: 'Config',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: { filters: {}, requestOptions: {} },
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [-520, 240],
				name: 'Get Workflows',
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
								id: 'bb64ed2c-5193-4b8f-a9e8-55cb83ea244c',
								operator: { type: 'dateTime', operation: 'afterOrEquals' },
								leftValue: '={{ $json.updatedAt }}',
								rightValue: "={{ $now.minus(1, 'days') }}",
							},
						],
					},
				},
				position: [-300, 240],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-80, 240], name: 'Loop Over Items' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.2,
			config: {
				parameters: {
					text: "=✅ Backup has completed - {{ $('Get Workflows').all().length }} workflows have been processed.",
					select: 'channel',
					channelId: { __rl: true, mode: 'name', value: '#notifications' },
					otherOptions: {},
				},
				credentials: {
					slackApi: { id: 'credential-id', name: 'slackApi Credential' },
				},
				position: [140, -160],
				name: 'Completed Notification',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.github',
			version: 1.1,
			config: {
				parameters: {
					owner: {
						__rl: true,
						mode: 'name',
						value: "={{ $('Config').item.json.repo_owner }}",
					},
					filePath:
						"={{ $('Config').item.json.sub_path }}/{{$('Loop Over Items').item.json.name}}.json",
					resource: 'file',
					operation: 'get',
					repository: {
						__rl: true,
						mode: 'name',
						value: "={{ $('Config').item.json.repo_name }}",
					},
					asBinaryProperty: false,
					additionalParameters: {},
				},
				credentials: {
					githubApi: { id: 'credential-id', name: 'githubApi Credential' },
				},
				position: [140, 40],
				name: 'Get a file',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: { url: '={{ $json.download_url }}', options: {} },
						position: [580, 40],
						name: 'Get File',
					},
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 2,
					config: { position: [800, 240], name: 'Merge Items' },
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
								id: '628f6e8f-d817-4c53-89ec-b1acbb3dfef8',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: '={{ $json.content }}',
								rightValue: '',
							},
							{
								id: '63fc68bb-63d0-40a8-92e4-2a62b5a71812',
								operator: { type: 'string', operation: 'notExists', singleValue: true },
								leftValue: '={{ $json.error }}',
								rightValue: '',
							},
						],
					},
				},
				name: 'Is File too large?',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 1,
			config: {
				parameters: {
					jsCode:
						'const orderJsonKeys = (jsonObj) => {\n  const ordered = {};\n  Object.keys(jsonObj).sort().forEach(key => {\n    ordered[key] = jsonObj[key];\n  });\n  return ordered;\n}\n\n// Check if file returned with content\nif (Object.keys($input.all()[0].json).includes("content")) {\n  // Decode base64 content and parse JSON\n  const origWorkflow = JSON.parse(Buffer.from($input.all()[0].json.content, \'base64\').toString());\n  const n8nWorkflow = $input.all()[1].json;\n  \n  // Order JSON objects\n  const orderedOriginal = orderJsonKeys(origWorkflow);\n  const orderedActual = orderJsonKeys(n8nWorkflow);\n\n  // Determine difference\n  if (JSON.stringify(orderedOriginal) === JSON.stringify(orderedActual)) {\n    $input.all()[0].json.github_status = "same";\n  } else {\n    $input.all()[0].json.github_status = "different";\n    $input.all()[0].json.n8n_data_stringy = JSON.stringify(orderedActual, null, 2);\n  }\n  $input.all()[0].json.content_decoded = orderedOriginal;\n// No file returned / new workflow\n} else if (Object.keys($input.all()[0].json).includes("data")) {\n  const origWorkflow = JSON.parse($input.all()[0].json.data);\n  const n8nWorkflow = $input.all()[1].json;\n  \n  // Order JSON objects\n  const orderedOriginal = orderJsonKeys(origWorkflow);\n  const orderedActual = orderJsonKeys(n8nWorkflow);\n\n  // Determine difference\n  if (JSON.stringify(orderedOriginal) === JSON.stringify(orderedActual)) {\n    $input.all()[0].json.github_status = "same";\n  } else {\n    $input.all()[0].json.github_status = "different";\n    $input.all()[0].json.n8n_data_stringy = JSON.stringify(orderedActual, null, 2);\n  }\n  $input.all()[0].json.content_decoded = orderedOriginal;\n\n} else {\n  // Order JSON object\n  const n8nWorkflow = $input.all()[1].json;\n  const orderedActual = orderJsonKeys(n8nWorkflow);\n  \n  // Proper formatting\n  $input.all()[0].json.github_status = "new";\n  $input.all()[0].json.n8n_data_stringy = JSON.stringify(orderedActual, null, 2);\n}\n\n// Return items\nreturn $input.all();\n',
				},
				position: [1020, 240],
				name: 'isDiffOrNew',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.github',
					version: 1,
					config: {
						parameters: {
							owner: {
								__rl: true,
								mode: 'name',
								value: "={{ $('Config').item.json.repo_owner }}",
							},
							filePath:
								"={{ $('Config').item.json.sub_path }}/{{$('Loop Over Items').item.json.name}}.json",
							resource: 'file',
							operation: 'edit',
							repository: { __rl: true, mode: 'name', value: 'n8n-workflows' },
							fileContent: '={{$(\'isDiffOrNew\').item.json["n8n_data_stringy"]}}',
							commitMessage: "={{$('Loop Over Items').item.json.name}} ({{$json.github_status}})",
						},
						credentials: {
							githubApi: { id: 'credential-id', name: 'githubApi Credential' },
						},
						position: [1460, 40],
						name: 'Edit existing file',
					},
				}),
				node({
					type: 'n8n-nodes-base.github',
					version: 1,
					config: {
						parameters: {
							owner: {
								__rl: true,
								mode: 'name',
								value: "={{ $('Config').item.json.repo_owner }}",
							},
							filePath:
								"={{ $('Config').item.json.sub_path }}/{{$('Loop Over Items').item.json.name}}.json",
							resource: 'file',
							repository: {
								__rl: true,
								mode: 'name',
								value: "={{ $('Config').item.json.repo_name }}",
							},
							fileContent: '={{$(\'isDiffOrNew\').item.json["n8n_data_stringy"]}}',
							commitMessage: "={{$('Loop Over Items').item.json.name}} ({{$json.github_status}})",
						},
						credentials: {
							githubApi: { id: 'credential-id', name: 'githubApi Credential' },
						},
						position: [1460, 240],
						name: 'Create new file',
					},
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.3,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: '8d513345-6484-431f-afb7-7cf045c90f4f',
										name: 'Done',
										type: 'boolean',
										value: true,
									},
								],
							},
						},
						position: [1680, 440],
						name: 'Return',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Different',
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
											id: '6655f56f-b447-43eb-84a2-be8b71524af7',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{$json.github_status}}',
											rightValue: 'different',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'New',
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
											id: 'fd0fcdea-e8c0-42be-ba51-5cd2b71ed247',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{$json.github_status}}',
											rightValue: 'new',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Same',
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
											id: 'ca3b1c68-d756-4de5-b69b-147526e19e35',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{$json.github_status}}',
											rightValue: 'same',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
			},
		),
	)
	.add(
		sticky('# Links\n- ## [Github Folder](https://github.com/AndrewBoichenko/n8n-workflows/)', {
			name: 'Sticky Note3',
			position: [-1660, 80],
			width: 400,
			height: 120,
		}),
	)
	.add(
		sticky(
			'# How it works \nThis workflow will backup all instance workflows to GitHub every 24 hours.\n\nThe files are saved into folders using `repo_path` for the directory path and `ID.json` for the filename.\nThe Repo Owner, Repo Name and Main folder are set using the `Config` node in the subworkflow. \n\nThe workflow runs calls itself to help reduce memory usage, Once the workflow has completed it will send an optional notification to Slack.\n\nPlease check out my other items on [gumroad](https://boanse.gumroad.com/?section=k_Sn6LcT_dzJFnp5jmsM5A%3D%3D)\nYou might also like something else☺️',
			{ name: 'Sticky Note4', position: [-1660, 240], width: 400, height: 340 },
		),
	);
