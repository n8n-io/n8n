/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */
import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const PLAYGROUND_2: WorkflowDataCreate = {
	meta: {
		templateId: '37_onboarding_experiments_batch_aug11-2_process_user_answers',
	},
	settings: {
		executionOrder: 'v1',
	},
	name: '▶️ 2. Process user answers from a form',
	nodes: [
		{
			parameters: {
				numberInputs: 3,
			},
			type: 'n8n-nodes-base.merge',
			typeVersion: 3.2,
			position: [960, 336],
			id: 'f6f94912-64a3-4671-9bda-abb03f4dc42e',
			name: 'Merge',
		},
		{
			parameters: {
				content:
					'## ▶ Click to start \n\n1. Click the orange `Execute Worfklow` button\n2. Submit the form\n3. Double-click nodes to view data flows\n4. Try different answers',
				height: 432,
				width: 352,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-992, 160],
			id: 'e5382a25-e813-4fba-bd8e-c16918521da7',
			name: 'Sticky Note11',
		},
		{
			parameters: {
				content:
					'The `Switch` node routes the workflow based on the selected meal type: chicken, vegetarian, or surprise.',
				height: 432,
				width: 272,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-592, 160],
			id: 'ab955ee5-03ea-45cb-afbb-4b36ccfdbda6',
			name: 'Sticky Note',
		},
		{
			parameters: {
				rules: {
					values: [
						{
							conditions: {
								options: {
									caseSensitive: false,
									leftValue: '',
									typeValidation: 'strict',
									version: 2,
								},
								conditions: [
									{
										id: 'c90e7527-e4ff-41a8-9177-ffdf7d25c72e',
										leftValue:
											"={{ $json['What type of meal would you like to cook tonight ? '] }}",
										rightValue: 'chicken',
										operator: {
											type: 'string',
											operation: 'contains',
										},
									},
								],
								combinator: 'and',
							},
							renameOutput: true,
							outputKey: 'chicken',
						},
						{
							conditions: {
								options: {
									caseSensitive: false,
									leftValue: '',
									typeValidation: 'strict',
									version: 2,
								},
								conditions: [
									{
										leftValue:
											"={{ $json['What type of meal would you like to cook tonight ? '] }}",
										rightValue: 'vegetarian',
										operator: {
											type: 'string',
											operation: 'contains',
										},
										id: '18bd7d98-f5e3-46df-96c6-8d1c5fea7cf2',
									},
								],
								combinator: 'and',
							},
							renameOutput: true,
							outputKey: 'vegetarian',
						},
						{
							conditions: {
								options: {
									caseSensitive: false,
									leftValue: '',
									typeValidation: 'strict',
									version: 2,
								},
								conditions: [
									{
										id: '74441f58-e5e5-487c-972d-ec7f9107436d',
										leftValue:
											"={{ $json['What type of meal would you like to cook tonight ? '] }}",
										rightValue: 'surprise',
										operator: {
											type: 'string',
											operation: 'contains',
										},
									},
								],
								combinator: 'and',
							},
							renameOutput: true,
							outputKey: 'surprise',
						},
					],
				},
				options: {
					ignoreCase: true,
				},
			},
			type: 'n8n-nodes-base.switch',
			typeVersion: 3.2,
			position: [-512, 336],
			id: '6cbc178b-a420-4d57-a107-247600ae00c8',
			name: 'Route based on meal preference',
		},
		{
			parameters: {
				url: '=https://dummyjson.com/recipes/{{$today.weekday}}',
				options: {},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-160, 560],
			id: '98e4c862-5bf8-4cd9-8548-62d30b3c548a',
			name: 'Get a random recipe from the API',
		},
		{
			parameters: {
				url: "=https://dummyjson.com/recipes/search?q={{ $json['What type of meal would you like to cook tonight ? '] }}",
				options: {},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-160, 352],
			id: '52d53f34-9036-48f8-a71c-f501cc7e37b0',
			name: 'Get vegetarian recipes from the API',
		},
		{
			parameters: {
				url: '=https://dummyjson.com/recipes/search?q=chicken',
				options: {},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-160, 144],
			id: '240a9947-81fb-48ba-ac46-27381f4f67b6',
			name: 'Get chicken recipes from the API',
		},
		{
			parameters: {
				content: 'These `HTTP nodes` call the API to get recipes based on the user’s choice.',
				height: 816,
				width: 304,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-272, -48],
			id: 'f27030aa-9cca-4872-b672-b7ab8f307584',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				content:
					'In the Chicken branch, the API returns an array with 8 chicken recipes.\n\nThe `Split Out` node splits the array into separate items: 8 items, one per recipe.',
				height: 576,
				width: 224,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [80, -48],
			id: 'e4bc5319-ae92-4a72-878e-8c83ca80d203',
			name: 'Sticky Note4',
		},
		{
			parameters: {
				content: 'The `Form node` displays the selected recipe on the completion screen',
				height: 384,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [1152, 208],
			id: '6eb7f690-756d-46df-b927-91426e9635da',
			name: 'Sticky Note5',
		},
		{
			parameters: {
				content: 'The `Merge` node combines data from all three recipe branches.',
				height: 384,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [864, 208],
			id: '8e52483c-c740-454b-898b-cf457af693a8',
			name: 'Sticky Note6',
		},
		{
			parameters: {
				formTitle: 'n8n Form',
				formFields: {
					values: [
						{
							fieldLabel: 'What type of meal would you like to cook tonight ? ',
							fieldType: 'dropdown',
							fieldOptions: {
								values: [
									{
										option: 'Chicken-based',
									},
									{
										option: 'Vegetarian',
									},
									{
										option: 'Surprise me! ',
									},
								],
							},
							requiredField: true,
						},
						{
							fieldLabel: "What's your name? ",
							requiredField: true,
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.formTrigger',
			typeVersion: 2.2,
			position: [-864, 352],
			id: '3e5b2d36-5126-45f7-a81c-c1cfc82a392d',
			name: 'Trigger when user submits form',
			webhookId: 'd9a8c65e-486f-4304-a34d-87e9d68aa868',
		},
		{
			parameters: {
				content:
					'We want to suggest 1 recipe only, not 8.\nSo we sort by cooking time with the `Sort` node, and then pick the recipe  with lowest cooking time using `Limit` node',
				height: 384,
				width: 416,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [368, -48],
			id: '520e150e-9b22-4ed8-b3f2-1d128ed9e4c2',
			name: 'Sticky Note7',
		},
		{
			parameters: {
				sortFieldsUi: {
					sortField: [
						{
							fieldName: 'cookTimeMinutes',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.sort',
			typeVersion: 1,
			position: [432, 144],
			id: '17834d09-5d83-420f-9109-105e92baffef',
			name: 'Sort by cooking time',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.limit',
			typeVersion: 1,
			position: [624, 144],
			id: '9db21680-c947-44c1-8194-48e42f995755',
			name: 'Limit to recipe with lowest cooking time',
		},
		{
			parameters: {
				operation: 'completion',
				completionTitle: 'Recipe',
				completionMessage:
					"=Hey {{ $('Trigger when user submits form').item.json['What\\'s your name? '] }}, <br /><br />\n\nWhat about cooking a <b>{{ $json.name }}</b> tonight? <br /><br />\n\nIt shouldn't take you more than {{ $json.prepTimeMinutes }} minutes to prepare.<br /><br />\n\n<h3>What you'll need:</h3><br />\n\n<ul>{{ $json.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('') }}</ul><br /><br />\n\n<h3>Instructions</h3><br />\n\n{{ $json.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('<br />') }}\n",
				options: {
					customCss:
						":root {\n\t--font-family: 'Open Sans', sans-serif;\n\t--font-weight-normal: 400;\n\t--font-weight--bold: 600;\n\t--font-size-body: 12px;\n\t--font-size--lgabel: 14px;\n\t--font-size-test-notice: 12px;\n\t--font-size-input: 14px;\n\t--font-size-header: 20px;\n\t--font-size-paragraph: 14px;\n\t--font-size--lgink: 12px;\n\t--font-size-error: 12px;\n\t--font-size-html-h1: 28px;\n\t--font-size-html-h2: 20px;\n\t--font-size-html-h3: 16px;\n\t--font-size-html-h4: 14px;\n\t--font-size-html-h5: 12px;\n\t--font-size-html-h6: 10px;\n\t--font-size--smubheader: 14px;\n\n\t/* Colors */\n\t--color-background: #fbfcfe;\n\t--color-test-notice-text: #e6a23d;\n\t--color-test-notice-bg: #fefaf6;\n\t--color-test-notice-border: #f6dcb7;\n\t--color-card-bg: #ffffff;\n\t--color-card-border: #dbdfe7;\n\t--color-card-shadow: rgba(99, 77, 255, 0.06);\n\t--color-link: #7e8186;\n\t--color-header: #525356;\n\t--color-label: #555555;\n\t--color-input-border: #dbdfe7;\n\t--color-input-text: #71747A;\n\t--color-focus-border: rgb(90, 76, 194);\n\t--color-submit-btn-bg: #ff6d5a;\n\t--color-submit-btn-text: #ffffff;\n\t--color-error: #ea1f30;\n\t--color-required: #ff6d5a;\n\t--color-clear-button-bg: #7e8186;\n\t--color-html-text: #555;\n\t--color-html-link: #ff6d5a;\n\t--color-header-subtext: #7e8186;\n\n\t/* Border Radii */\n\t--border-radius-card: 8px;\n\t--border-radius-input: 6px;\n\t--border-radius-clear-btn: 50%;\n\t--card-border-radius: 8px;\n\n\t/* Spacing */\n\t--padding-container-top: 24px;\n\t--padding-card: 24px;\n\t--padding-test-notice-vertical: 12px;\n\t--padding-test-notice-horizontal: 24px;\n\t--margin-bottom-card: 16px;\n\t--padding-form-input: 12px;\n\t--card-padding: 24px;\n\t--card-margin-bottom: 16px;\n\n\t/* Dimensions */\n\t--container-width: 448px;\n\t--submit-btn-height: 48px;\n\t--checkbox-size: 18px;\n\n\t/* Others */\n\t--box-shadow-card: 0px 4px 16px 0px var(--color-card-shadow);\n\t--opacity-placeholder: 0.5;\n}\n\n.card {\n  text-align: left;\n}\n\nul {\n  padding-left: 20px;\n}\n\nh4, ul, li {\n  text-color: #7e8186!important;\n}\n\n",
				},
			},
			type: 'n8n-nodes-base.form',
			typeVersion: 1,
			position: [1216, 352],
			id: 'f1291ce7-161a-49bf-9c0c-5bc1227b986c',
			name: 'Show completion screen with the recipe suggestion',
			webhookId: '593b279d-6426-48a0-b28c-44056660bca9',
		},
		{
			parameters: {
				content:
					'**Tip: Send data to n8n**\nYou can trigger a workflow in many ways – not just with forms. For example, using a webhook or when a new row is added to a Google Sheet.',
				height: 96,
				width: 352,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-992, 608],
			id: '16f3bf2a-943d-4399-946f-6444616e8e57',
			name: 'Sticky Note8',
		},
		{
			parameters: {
				fieldToSplitOut: 'recipes',
				options: {},
			},
			type: 'n8n-nodes-base.splitOut',
			typeVersion: 1,
			position: [144, 352],
			id: '05c93482-4bd4-464c-b7ee-909a0fd0bada',
			name: 'Split Out the results into separate items',
		},
		{
			parameters: {
				fieldToSplitOut: 'recipes',
				options: {},
			},
			type: 'n8n-nodes-base.splitOut',
			typeVersion: 1,
			position: [144, 144],
			id: '503526fd-c317-4d77-916c-2ff5eb6f63f9',
			name: 'Split Out the array into 8 items',
		},
	],
	connections: {
		Merge: {
			main: [
				[
					{
						node: 'Show completion screen with the recipe suggestion',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Route based on meal preference': {
			main: [
				[
					{
						node: 'Get chicken recipes from the API',
						type: 'main',
						index: 0,
					},
				],
				[
					{
						node: 'Get vegetarian recipes from the API',
						type: 'main',
						index: 0,
					},
				],
				[
					{
						node: 'Get a random recipe from the API',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Get a random recipe from the API': {
			main: [
				[
					{
						node: 'Merge',
						type: 'main',
						index: 2,
					},
				],
			],
		},
		'Get vegetarian recipes from the API': {
			main: [
				[
					{
						node: 'Split Out the results into separate items',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Get chicken recipes from the API': {
			main: [
				[
					{
						node: 'Split Out the array into 8 items',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Trigger when user submits form': {
			main: [
				[
					{
						node: 'Route based on meal preference',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Sort by cooking time': {
			main: [
				[
					{
						node: 'Limit to recipe with lowest cooking time',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Limit to recipe with lowest cooking time': {
			main: [
				[
					{
						node: 'Merge',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Show completion screen with the recipe suggestion': {
			main: [[]],
		},
		'Split Out the results into separate items': {
			main: [
				[
					{
						node: 'Merge',
						type: 'main',
						index: 1,
					},
				],
			],
		},
		'Split Out the array into 8 items': {
			main: [
				[
					{
						node: 'Sort by cooking time',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};
