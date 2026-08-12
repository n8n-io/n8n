import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const PLAYGROUND_4: WorkflowDataCreate = {
	meta: {
		templateId: '37_onboarding_experiments_batch_aug11-4_create_personalized_email',
	},
	name: '🔌 4. Create a personalized email',
	settings: {
		executionOrder: 'v1',
	},
	nodes: [
		{
			parameters: {
				url: '=https://nominatim.openstreetmap.org/search?q={{ $json.City }}&format=json',
				options: {
					response: {
						response: {},
					},
				},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-336, -16],
			id: 'd6ea9452-7fa4-41f6-b9cd-7f12b8e3b686',
			name: 'Get city latitude and longitude',
		},
		{
			parameters: {
				url: '=https://api.open-meteo.com/v1/forecast?latitude={{ $json.lat }}&longitude={{ $json.lon }}&daily=temperature_2m_max,temperature_2m_min',
				options: {
					response: {
						response: {
							responseFormat: 'json',
						},
					},
				},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [48, -16],
			id: 'db233160-3f63-47fa-998a-41977a51c2f6',
			name: 'Get weather',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'ea110fbf-b67b-4270-8e55-ffec2f9ddafe',
							name: 'City',
							value: 'Paris',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [-640, -16],
			id: 'e3c93ca5-2628-41f4-81ea-50c87403b285',
			name: 'Set your location',
		},
		{
			parameters: {
				numberInputs: 3,
			},
			type: 'n8n-nodes-base.merge',
			typeVersion: 3.2,
			position: [416, -208],
			id: '21021c33-7b93-4cbe-a592-f7b277ad332e',
			name: 'Merge',
			notesInFlow: false,
		},
		{
			parameters: {
				aggregate: 'aggregateAllItemData',
				options: {},
			},
			type: 'n8n-nodes-base.aggregate',
			typeVersion: 1,
			position: [688, -192],
			id: '65312cc9-b31e-4ad3-b5b9-7ccfe066f0fb',
			name: 'Aggregate',
		},
		{
			parameters: {
				jsCode:
					'const today = new Date().toISOString().slice(0, 10);\nconst daily = $json.daily;\nconst index = daily.time.indexOf(today);\n\nif (index === -1) {\n  throw new Error("Today\'s forecast not found in response.");\n}\n\nreturn [{\n  date: today,\n  temp_max: daily.temperature_2m_max[index],\n  temp_min: daily.temperature_2m_min[index]\n}];\n',
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [224, -16],
			id: '8defc8b4-a50f-41ff-bfb0-bd114e5fcd7c',
			name: "Get today's high and low",
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.limit',
			typeVersion: 1,
			position: [-112, -16],
			id: 'a346a114-2981-4c82-91a5-4656b345b0d1',
			name: 'Limit',
		},
		{
			parameters: {
				content:
					'### Bonus task!\n\nUse the `Gmail node` to send the workflow result via email:\n\n1. Connect the "output" node to the Gmail node\n2. Create your credentials to connect to Gmail ',
				height: 448,
				width: 288,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [1168, -464],
			id: '5398ab1d-4d6b-4308-8129-a3e1ebe7c11c',
			name: 'Sticky Note5',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-1008, -192],
			id: 'e378d189-974a-4d8e-a5bc-dd84fe4bc1c1',
			name: "1. Click 'Execute workflow’",
			notesInFlow: false,
			notes: '\n',
		},
		{
			parameters: {
				content:
					'## ▶ Start here \n\n1. Click the orange `Execute Worfklow` button \n2. Double-click nodes to view data flows\n3. Try changing variables in `Set your location` node (e.g. set location to London instead of Berlin)',
				height: 416,
				width: 336,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-1136, -416],
			id: '6ef3cee5-4c05-4611-9372-233b89aedbb9',
			name: 'Sticky Note6',
		},
		{
			parameters: {
				content:
					'The `Set nodes` below define variables used later  in the workflow:\n\n1. Today’s day and month\n2. Currency: EUR to USD\n3. Location: Berlin',
				height: 784,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-720, -624],
			id: '8d1e0f28-328c-46e7-86a4-d7a063eab933',
			name: 'Sticky Note',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '904f0394-6f4a-498f-98a7-b0526dfd63f0',
							name: 'current month',
							value: "={{$now.format('M')}}",
							type: 'string',
						},
						{
							id: 'c4fd79aa-e889-49c1-86f1-4e5ad672048f',
							name: 'current day',
							value: "={{$now.format('d')}}",
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [-640, -384],
			id: '503e303a-99ca-4a88-885b-2738f2067aac',
			name: 'Set current day and month',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '8c17e5ba-1747-46e3-ae41-8f1e9046aa7a',
							name: 'Convert from currency',
							value: 'EUR',
							type: 'string',
						},
						{
							id: 'e14ae5dd-7559-4e14-8e25-e627f11d8094',
							name: 'Convert to currency',
							value: 'USD',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [-640, -192],
			id: 'bc6f48f0-21a1-417a-9724-64eafce2ec1f',
			name: 'Set exchange currency',
		},
		{
			parameters: {
				content:
					'The `HTTP nodes` below call separate APIs using the previously defined variables to retrieve:\n\n1. Historical events on the same day/month\n2. Currency exchange rate\n3. Weather data ',
				height: 784,
				width: 256,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-416, -624],
			id: '02b09b86-be1b-47fd-b083-ee6c31b5a83f',
			name: 'Sticky Note1',
		},
		{
			parameters: {
				url: '=http://numbersapi.com/{{ $json["current month"] }}/{{ $json["current day"] }}/date?json',
				options: {},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-336, -384],
			id: '0cb9f4df-42db-49b8-b545-e3a7bad28a8f',
			name: 'Get a historical fact',
		},
		{
			parameters: {
				url: "=https://api.frankfurter.dev/v1/latest?base={{ $json['Convert from currency'] }}&symbols={{ $json['Convert to currency'] }}",
				options: {},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-336, -192],
			id: 'df332c72-8600-4458-a40f-020422bf7818',
			name: 'Get exchange rates',
		},
		{
			parameters: {
				content:
					'These nodes are explained in the previous workflow:  \n▶ 3. Check weather based on user location',
				height: 80,
				width: 480,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-128, 144],
			id: 'e3c29b04-39d5-4d4d-9021-f4eb26e54d95',
			name: 'Sticky Note7',
		},
		{
			parameters: {
				content:
					'The `Merge` node combines data from the 3  streams, once data for all streams is available.',
				height: 352,
				width: 224,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [352, -368],
			id: '02c84a53-c933-4ad7-a0ce-9a53fbd6b407',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				content:
					'The `Aggregate` node take the 3 separate items and  groups them together into a single item.',
				height: 352,
				width: 208,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [624, -368],
			id: '0ce70667-9587-49d5-96b3-d477fef517b1',
			name: 'Sticky Note3',
		},
		{
			parameters: {
				content: 'The `Set node` let us pick the data',
				height: 352,
				width: 192,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [880, -368],
			id: '3587d9df-9ccc-462f-a4b6-e2b3ddaa0e89',
			name: 'Sticky Note8',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '4b651566-5b0d-4f7e-b1d4-ea95dee7fbb5',
							name: 'On this day',
							value: '={{ $json.data[0].text }}',
							type: 'string',
						},
						{
							id: 'cef5bfc7-be8b-4ac4-911d-2b9721c8666d',
							name: 'Exchange rate',
							value:
								'={{ $json.data[1].rates[$("Set exchange currency").item.json["Convert to currency"]] }}',
							type: 'string',
						},
						{
							id: '02358dea-7351-49ea-923c-9695ba7003c8',
							name: 'Daily high',
							value: '={{ $json.data[2].temp_max }}°C',
							type: 'string',
						},
						{
							id: 'a8886281-896b-4713-82dd-8a1573b3d1df',
							name: 'Daily low',
							value: '={{ $json.data[2].temp_min }}°C',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [928, -192],
			id: 'cef89e73-fa8b-48c1-ad2d-293ac61be2ff',
			name: 'Select output for the email',
		},
		{
			parameters: {
				content:
					'**Tip: Use credentials**\nAdd [credentials](https://docs.n8n.io/credentials) in n8n to connect apps like Gmail, Slack, or OpenAI and use them in your workflows.',
				height: 112,
				width: 288,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [1168, 16],
			id: '14969990-acce-46f3-a1ab-219ab4a1a858',
			name: 'Sticky Note9',
		},
		{
			parameters: {
				subject: 'Daily fact and data',
				emailType: 'text',
				message:
					"=Hey,\n\nToday in {{ $('Set your location').item.json.City }}:\n- Daily high: {{ $json['Daily high'] }}\n- Daily low: {{ $json['Daily low'] }}\n\n{{ $('Set exchange currency').item.json['Convert from currency'] }} to {{ $('Set exchange currency').item.json['Convert to currency'] }} exchange rate: {{ $json['Exchange rate'] }}\n\nImpress your colleagues by reminding them that: {{ $json['On this day'] }}\n\n(Historical fact generated by numbersapi.com)\n",
				options: {},
			},
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.1,
			position: [1264, -192],
			id: '4a23b2b5-21f7-4a63-a1ab-9f18d6ce2e6a',
			name: 'Send output via email using Gmail',
			webhookId: '65c7b462-bb4a-400c-a556-ef408efcd208',
			notesInFlow: true,
			notes: 'Double-click here to connect!',
		},
	],
	pinData: {},
	connections: {
		'Get city latitude and longitude': {
			main: [
				[
					{
						node: 'Limit',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Get weather': {
			main: [
				[
					{
						node: "Get today's high and low",
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Set your location': {
			main: [
				[
					{
						node: 'Get city latitude and longitude',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		Merge: {
			main: [
				[
					{
						node: 'Aggregate',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		Aggregate: {
			main: [
				[
					{
						node: 'Select output for the email',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		"Get today's high and low": {
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
		Limit: {
			main: [
				[
					{
						node: 'Get weather',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		"1. Click 'Execute workflow’": {
			main: [
				[
					{
						node: 'Set current day and month',
						type: 'main',
						index: 0,
					},
					{
						node: 'Set your location',
						type: 'main',
						index: 0,
					},
					{
						node: 'Set exchange currency',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Set current day and month': {
			main: [
				[
					{
						node: 'Get a historical fact',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Set exchange currency': {
			main: [
				[
					{
						node: 'Get exchange rates',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Get a historical fact': {
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
		'Get exchange rates': {
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
		'Select output for the email': {
			main: [[]],
		},
	},
};
