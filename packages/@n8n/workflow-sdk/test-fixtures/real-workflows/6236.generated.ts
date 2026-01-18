const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-144, 240], name: 'Start Test!' },
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
								id: '12345',
								name: 'name',
								type: 'string',
								value: 'Clark Kent',
							},
							{
								id: '67890',
								name: 'city',
								type: 'string',
								value: 'Metropolis',
							},
							{ id: 'abcde', name: 'level', type: 'number', value: 99 },
							{
								id: 'fghij',
								name: 'tools',
								type: 'array',
								value: '["Typewriter","Glasses","n8n"]',
							},
							{
								id: 'klmno',
								name: 'address',
								type: 'object',
								value: '{"street":"123 Main St","zip":"10001"}',
							},
							{
								id: 'pqrst',
								name: 'tasks',
								type: 'array',
								value:
									'[{"name":"Write Article","status":"Done"},{"name":"Review PR","status":"Pending"},{"name":"Save the World","status":"Pending"}]',
							},
						],
					},
				},
				position: [176, 240],
				name: 'Source Data',
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'user_city',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [496, 240],
				name: 'Test - Basic Access',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [992, 128], name: 'Success - Basic Access' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								"Incorrect. Hint: Use the format `{{ $('Source Data').item.json.city }}` to get the city value.",
						},
						position: [992, 448],
						name: 'Error - Basic Access',
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
								id: '5ac1af5c-2769-42f8-9df7-ec092d2fec05',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.user_city }}',
								rightValue: "={{ $('Source Data').last().json.city }}",
							},
							{
								id: 'd4f115a2-6713-4beb-8b4e-4371686ca6ea',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - Basic Access').isExecuted || $('Test - Basic Access').params.assignments.assignments[0].value.includes('.city') }}",
								rightValue: '{{ $json.city }}',
							},
						],
					},
				},
				name: 'Check - Basic Access',
			},
		),
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'third_tool',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [1312, 240],
				name: 'Test - Array Access',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [1808, 128], name: 'Success - Array Access' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								'Incorrect. Hint: Remember that arrays are zero-indexed. The third item is at index `[2]`.',
						},
						position: [1808, 448],
						name: 'Error - Array Access',
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
								id: '5ac1af5c-2769-42f8-9df7-ec092d2fec05',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.third_tool }}',
								rightValue: "={{ $('Source Data').item.json.tools[2] }}",
							},
							{
								id: '193a01cb-64c3-456a-bee4-4febaae63e66',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - Array Access').isExecuted || $('Test - Array Access').params.assignments.assignments[0].value.includes('.tools') }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'Check - Array Access',
			},
		),
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'street_address',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [2128, 240],
				name: 'Test - Nested Object',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [2624, 128], name: 'Success - Nested Object' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								'Incorrect. Hint: Chain the keys using dots, like `...json.address.street`.',
						},
						position: [2624, 448],
						name: 'Error - Nested Object',
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
								id: 'd4e5f6a7-8901-2345-6789-0abcdef12345',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.street_address }}',
								rightValue: "={{ $('Source Data').item.json.address.street }}",
							},
							{
								id: 'b84f01c8-0b9f-4dd5-a983-e7455fafe1ce',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - Nested Object').isExecuted || $('Test - Nested Object').params.assignments.assignments[0].value.includes('.address.street') }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'Check - Nested Object',
			},
		),
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'second_task_name',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [2944, 240],
				name: 'Test - Array of Objects',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [3440, 128], name: 'Success - Array of Objects' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								'Incorrect. Hint: Combine array access `[1]` with object access `.name`.',
						},
						position: [3440, 448],
						name: 'Error - Array of Objects',
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
								id: 'e1234567-890a-bcde-f123-456789012345',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.second_task_name }}',
								rightValue: "={{ $('Source Data').item.json.tasks[1].name }}",
							},
							{
								id: '8ea84d9f-102e-44aa-b87d-96fc413af915',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - Array of Objects').isExecuted || $('Test - Array of Objects').params.assignments.assignments[0].value.includes('.tasks') }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'Check - Array of Objects',
			},
		),
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'uppercase_name',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [3760, 240],
				name: 'Test - JS Function',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [4256, 128], name: 'Success - JS Function' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								'Incorrect. Hint: Add `.toUpperCase()` to the end of your expression, inside the `{{ }}`.',
						},
						position: [4256, 448],
						name: 'Error - JS Function',
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
								id: 'b0123456-7890-abcd-ef12-345678901234',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.uppercase_name }}',
								rightValue: "={{ $('Source Data').item.json.name.toUpperCase() }}",
							},
							{
								id: '7c1238db-4849-4525-b293-4f453b70fa21',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - JS Function').isExecuted || $('Test - JS Function').params.assignments.assignments[0].value.includes('.toUpperCase()') }}",
								rightValue:
									"={{ !$('Test - Array of Objects').isExecuted || $('Test - Array of Objects').params.assignments.assignments[0].value.includes('.tasks') }}",
							},
						],
					},
				},
				name: 'Check - JS Function',
			},
		),
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
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'summary',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [4576, 240],
				name: 'Test - Final',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [5072, 112], name: 'Success - Final' },
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage:
								"Incorrect. Hint: Combine static text and expressions like this: `Some text '{{ expression1 }}' and '{{ expression2 }}`.",
						},
						position: [5072, 448],
						name: 'Error - Final',
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
								id: 'a1234567-890a-bcde-f123-456789012345',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.summary }}',
								rightValue:
									"=The status of task '{{ $('Source Data').item.json.tasks[1].name }}' is {{ $('Source Data').item.json.tasks[1].status }}.",
							},
							{
								id: '18e1e8e4-0539-4c4f-85fe-1fa8759717ad',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{ !$('Test - Final').isExecuted || ($('Test - Final').params.assignments.assignments[0].value.includes('.name') && $('Test - Final').params.assignments.assignments[0].value.includes('.status')) }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'Check - Final',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.html',
			version: 1.2,
			config: {
				parameters: {
					html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Success</title>\n</head>\n<body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background-color: #f0f2f5; display: flex; align-items: center; justify-content: center; height: 100vh;">\n\n    <!-- The main success card -->\n    <div style="background-color: #ffffff; padding: 40px 50px; border-radius: 12px; box-shadow: 0 5px 25px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; margin: 20px;">\n\n        <!-- Circular Green Checkmark -->\n        <div style="width: 100px; height: 100px; background-color: #28a745; border-radius: 50%; margin: 0 auto 25px auto; display: flex; align-items: center; justify-content: center;">\n            <span style="color: white; font-size: 60px; line-height: 1;">✔</span>\n        </div>\n\n        <!-- Main Text -->\n        <h1 style="font-size: 36px; font-weight: 600; color: #333; margin: 0 0 10px 0;">\n            Success!\n        </h1>\n\n        <!-- Call to Action Text & Link -->\n        <p style="font-size: 16px; color: #555; line-height: 1.5; margin: 0;">\n            You\'ve mastered n8n expressions!\n         </p>\n        <p style="font-size: 16px; color: #555; line-height: 1.5; margin: 0;">\n            <a href="https://n8n.io/creators/lucaspeyrin" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none; font-weight: 500;">Check out more templates</a>.\n        </p>\n\n    </div>\n\n</body>\n</html>',
				},
				position: [5424, 224],
				name: '🎉 SUCCESS 🎉',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'user_city',
								type: 'string',
								value: "={{ $('Source Data').item.json.city }}",
							},
							{
								id: '28ef996b-d7e7-4d29-b4b5-f245de00d2c0',
								name: 'other_solution',
								type: 'string',
								value: '={{ $json.city }}',
							},
						],
					},
				},
				position: [496, 608],
				name: 'Answer - Basic Access',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'third_tool',
								type: 'string',
								value: "={{ $('Source Data').item.json.tools[2] }}",
							},
						],
					},
				},
				position: [1312, 608],
				name: 'Answer - Array Access',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'street_address',
								type: 'string',
								value: "={{ $('Source Data').item.json.address.street }}",
							},
						],
					},
				},
				position: [2128, 608],
				name: 'Answer - Nested Object',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'second_task_name',
								type: 'string',
								value: "={{ $('Source Data').item.json.tasks[1].name }}",
							},
						],
					},
				},
				position: [2944, 608],
				name: 'Answer - Array of Objects',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'uppercase_name',
								type: 'string',
								value: "={{ $('Source Data').item.json.name.toUpperCase() }}",
							},
						],
					},
				},
				position: [3760, 592],
				name: 'Answer - JS Function',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'e87952cb-878e-4feb-8261-342eaf887838',
								name: 'summary',
								type: 'string',
								value:
									"=The status of task '{{ $('Source Data').item.json.tasks[1].name }}' is {{ $('Source Data').item.json.tasks[1].status }}.",
							},
						],
					},
				},
				position: [4576, 592],
				name: 'Answer - Final',
			},
		}),
	)
	.add(
		sticky(
			'## Expressions Knowledge Test\n\nWelcome to the practical test for n8n Expressions! The goal is to use expressions to pull specific data from the **"Source Data"** node.\n\n**How to use this test:**\n1.  For each step, read the instructions on the purple sticky note.\n2.  Modify the corresponding **"Test - ..."** node by writing the correct expression in the value field.\n3.  Click **"Execute Workflow"** to check your answers.\n4.  A green path means a correct answer, a red path means it\'s incorrect. Keep trying until the path turns green!\n\n\nGood luck!',
			{ name: 'Sticky Note13', position: [-400, -112], width: 460, height: 552 },
		),
	)
	.add(
		sticky(
			'### Step 1: Basic Access\n\nModify the **"Test - Basic Access"** node.\n\n**Task:** Create a new field named `user_city`. Its value should be an expression that gets the `city` from the **"Source Data"** node.',
			{
				name: 'Instruction - Basic Access',
				color: 6,
				position: [400, 16],
				width: 300,
				height: 428,
			},
		),
	)
	.add(
		sticky(
			'### Step 2: Array Access\n\nModify the **"Test - Array Access"** node.\n\n**Task:** Create a field `third_tool`. Its value should be an expression that gets the *third* item from the `tools` array.',
			{
				name: 'Instruction - Array Access',
				color: 6,
				position: [1216, 16],
				width: 300,
				height: 428,
			},
		),
	)
	.add(
		sticky(
			'### Step 3: Nested Object\n\nModify the **"Test - Nested Object"** node.\n\n**Task:** Create a field `street_address`. Its value should be an expression that gets the `street` from inside the `address` object.',
			{
				name: 'Instruction - Nested Object',
				color: 6,
				position: [2032, 16],
				width: 300,
				height: 428,
			},
		),
	)
	.add(
		sticky(
			'### Step 4: Array of Objects\n\nModify the **"Test - Array of Objects"** node.\n\n**Task:** Create a field `second_task_name`. Its value should be an expression that gets the `name` of the *second* object in the `tasks` array.',
			{
				name: 'Instruction - Array of Objects',
				color: 6,
				position: [2848, 16],
				width: 300,
				height: 428,
			},
		),
	)
	.add(
		sticky(
			'### Step 5: JS Function\n\nModify the **"Test - JS Function"** node.\n\n**Task:** Create a field `uppercase_name`. Its value should be an expression that gets the `name` and converts it to `UPPERCASE`.',
			{
				name: 'Instruction - JS Function',
				color: 6,
				position: [3664, 16],
				width: 300,
				height: 412,
			},
		),
	)
	.add(
		sticky(
			"### Final Challenge!\n\nModify the **\"Test - Final\"** node.\n\n**Task:** Create a field `summary`. Its value should be a single string that reads:\n`The status of task 'Review PR' is Pending.`\n\nYou'll need to combine static text with expressions.",
			{ name: 'Instruction - Final', color: 6, position: [4480, -48], width: 300, height: 476 },
		),
	)
	.add(
		sticky(
			'![Source](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExendjcXhicnQ1bzljNnVkdWlucThyanBvbndmcm8zd3FkdjJ6bGNsdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohzdZO0nAL1H2LdMA/giphy.gif)',
			{
				name: 'Instruction - Basic Access1',
				color: 6,
				position: [80, 128],
				width: 300,
				height: 316,
			},
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **Basic Access** step. You can use it as a reference if you get stuck.',
			{
				name: 'Answer Note - Basic Access',
				color: 7,
				position: [400, 464],
				width: 304,
				height: 320,
			},
		),
	)
	.add(
		sticky("✅ **Correct!**\n\nGreat start. Let's access an array next.", {
			name: 'Feedback Correct1',
			color: 7,
			position: [928, 0],
			height: 272,
		}),
	)
	.add(
		sticky(
			"❌ **Incorrect.**\n\n**Hint:** Use the format\n`{{ $('Source Data').item.json.city }}`\nto get the city value.",
			{ name: 'Feedback Incorrect1', color: 7, position: [928, 288], height: 320 },
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **Array Access** step. You can use it as a reference if you get stuck.',
			{
				name: 'Answer Note - Array Access',
				color: 7,
				position: [1216, 464],
				width: 304,
				height: 320,
			},
		),
	)
	.add(
		sticky('✅ **Correct!**\n\nPerfect. Now for nested data.', {
			name: 'Feedback Correct2',
			color: 7,
			position: [1728, 0],
			width: 256,
			height: 272,
		}),
	)
	.add(
		sticky(
			'❌ **Incorrect.**\n\n**Hint:** Remember that arrays are zero-indexed. The third item is at index `[2]`.',
			{ name: 'Feedback Incorrect2', color: 7, position: [1728, 288], width: 256, height: 320 },
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **Nested Object** step. You can use it as a reference if you get stuck.',
			{
				name: 'Answer Note - Nested Object',
				color: 7,
				position: [2032, 464],
				width: 304,
				height: 320,
			},
		),
	)
	.add(
		sticky("✅ **Correct!**\n\nExcellent. Let's combine arrays and objects.", {
			name: 'Feedback Correct3',
			color: 7,
			position: [2544, 0],
			width: 256,
			height: 272,
		}),
	)
	.add(
		sticky(
			'❌ **Incorrect.**\n\n**Hint:** Chain the keys using dots, like `...json.address.street`.',
			{ name: 'Feedback Incorrect3', color: 7, position: [2544, 288], width: 256, height: 320 },
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **Array of Objects** step. You can use it as a reference if you get stuck.',
			{
				name: 'Answer Note - Array of Objects',
				color: 7,
				position: [2848, 464],
				width: 304,
				height: 320,
			},
		),
	)
	.add(
		sticky("✅ **Correct!**\n\nYou're getting the hang of this. Time for some JavaScript magic.", {
			name: 'Feedback Correct4',
			color: 7,
			position: [3360, 0],
			width: 256,
			height: 272,
		}),
	)
	.add(
		sticky(
			'❌ **Incorrect.**\n\n**Hint:** Combine array access `[1]` with object access `.name`.',
			{ name: 'Feedback Incorrect4', color: 7, position: [3360, 288], width: 256, height: 320 },
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **JS Function** step. You can use it as a reference if you get stuck.',
			{
				name: 'Answer Note - JS Function',
				color: 7,
				position: [3664, 448],
				width: 304,
				height: 336,
			},
		),
	)
	.add(
		sticky('✅ **Correct!**\n\nAwesome! One final challenge to bring it all together.', {
			name: 'Feedback Correct5',
			color: 7,
			position: [4176, 0],
			width: 256,
			height: 272,
		}),
	)
	.add(
		sticky(
			'❌ **Incorrect.**\n\n**Hint:** Add `.toUpperCase()` to the end of your expression, inside the `{{ }}`.',
			{ name: 'Feedback Incorrect5', color: 7, position: [4176, 288], width: 256, height: 320 },
		),
	)
	.add(
		sticky(
			'💡 **Answer Key**\n\nThis node contains the correct expression for the **Final** step. You can use it as a reference if you get stuck.',
			{ name: 'Answer Note - Final', color: 7, position: [4480, 448], width: 304, height: 336 },
		),
	)
	.add(
		sticky('✅ **YOU DID IT!**', {
			name: 'Feedback Correct6',
			color: 7,
			position: [4992, 32],
			width: 256,
			height: 240,
		}),
	)
	.add(
		sticky(
			"❌ **Incorrect.**\n\n**Hint:** Combine static text and expressions like this:\n`Some text '{{ expression1 }}' and {{ expression2 }}`.",
			{ name: 'Feedback Incorrect6', color: 7, position: [4992, 288], width: 256, height: 320 },
		),
	)
	.add(
		sticky(
			"🎉 **Congratulations! You've passed the test!**\n\nYou have successfully demonstrated your understanding of all the basic JSON data types.\n\nYou are now ready to work with data in n8n.\n\n-- Well done! --",
			{ name: 'Congratulations!', color: 4, position: [5264, 32], width: 416, height: 576 },
		),
	)
	.add(
		sticky(
			"## Was this helpful? Let me know!\n[![clic](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/clic_down_lucas.gif)](https://n8n.ac)\n\nI really hope this test helped you check your Expressions understanding fully. Your feedback is incredibly valuable and helps me create better resources for the n8n community.\n\n### **Share Your Thoughts & Ideas**\n\nWhether you have a suggestion, found a typo, or just want to say thanks, I'd love to hear from you!\nHere's a simple n8n form built for this purpose:\n\n#### ➡️ **[Click here to give feedback](https://api.ia2s.app/form/templates/feedback?template=Expressions%20Test)**\n\n### **Ready to Build Something Great?**\n\nIf you're looking to take your n8n skills or business automation to the next level, I can help.\n\n**🎓 n8n Coaching:** Want to become an n8n pro? I offer one-on-one coaching sessions to help you master workflows, tackle specific problems, and build with confidence.\n#### ➡️ **[Book a Coaching Session](https://api.ia2s.app/form/templates/coaching?template=Expressions%20Test)**\n\n**💼 n8n Consulting:** Have a complex project, an integration challenge, or need a custom workflow built for your business? Let's work together to create a powerful automation solution.\n#### ➡️ **[Inquire About Consulting Services](https://api.ia2s.app/form/templates/consulting?template=Expressions%20Test)**\n\n---\n\nHappy Automating!\nLucas Peyrin | [n8n Academy](https://n8n.ac)",
			{ name: 'Sticky Note10', color: 3, position: [5712, -384], width: 540, height: 1280 },
		),
	)
	.add(
		sticky(
			'[![Test Skills](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/n8n_animation.gif)](https://n8n.io/creators/lucaspeyrin)',
			{ name: 'Sticky Note16', color: 4, position: [5344, 384], width: 272, height: 184 },
		),
	);
