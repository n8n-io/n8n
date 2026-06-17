import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const PLAYGROUND_3: WorkflowDataCreate = {
	meta: {
		templateId: '37_onboarding_experiments_batch_aug11-3_check_weather_by_location',
	},
	name: '▶️ 3. Check weather based on user location',
	settings: {
		executionOrder: 'v1',
	},
	nodes: [
		{
			parameters: {
				jsCode:
					'const today = new Date().toISOString().slice(0, 10);\nconst daily = $json.daily;\nconst index = daily.time.indexOf(today);\n\nif (index === -1) {\n  throw new Error("Today\'s forecast not found in response.");\n}\n\nreturn [{\n  date: today,\n  temp_max: daily.temperature_2m_max[index],\n  temp_min: daily.temperature_2m_min[index]\n}];\n',
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [336, -128],
			id: 'd6463e70-9921-4e6f-acaa-c8d6153254ea',
			name: "Get today's high and low",
		},
		{
			parameters: {
				content:
					'**Tip: n8n 🧡 LLM**\n\nUse the n8n Assistant or ChatGPT, Claude, etc. to explain, edit, or create Javascript code for you.',
				height: 112,
				width: 272,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [240, 96],
			id: '30ebd1b4-55c2-45fd-ae30-2b974eee226f',
			name: 'Sticky Note1',
		},
		{
			parameters: {
				content:
					'## ▶ Start here \n\n1. Click the orange `Execute Worfklow` button \n2. Double-click nodes to view data flows\n3. Note: The form doesn’t show up because it runs with [pinned](https://docs.n8n.io/data/data-pinning/) test data (purple highlights)\n3. Unpin the data to run the form normally',
				height: 208,
				width: 352,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-1056, -512],
			id: '152278ea-a817-4f6d-8053-f129d9038604',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				content:
					'The `Code` node lets you run Javascript code in your workflow.\n\nWe use it here to extract today’s date, max temp, and min temp from the API response.',
				height: 352,
				width: 272,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [240, -272],
			id: '5fcff69f-e059-4827-9241-081e4a7e4a6b',
			name: 'Sticky Note3',
		},
		{
			parameters: {
				content:
					'This `HTTP node` calls an API to get the city’s latitude and longitude.\n\nThe user city input is used as a URL variable.',
				height: 352,
				width: 272,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-704, -272],
			id: '28813de7-3311-4c46-8b88-946c4c14a99e',
			name: 'Sticky Note4',
		},
		{
			parameters: {
				content:
					'Another `HTTP node` calls a weather API using the latitude and longitude in the URL.',
				height: 352,
				width: 272,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-96, -272],
			id: 'bc28c149-c4bd-4d68-b597-f7cf2f0ab0c4',
			name: 'Sticky Note5',
		},
		{
			parameters: {
				content: 'This `Limit` node keeps only the first item returned by the API.',
				height: 352,
				width: 256,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-400, -272],
			id: '1d23e68c-5d5c-4383-b6b8-ca552ad3a889',
			name: 'Sticky Note6',
		},
		{
			parameters: {
				formTitle: "What's the weather where you live",
				formFields: {
					values: [
						{
							fieldLabel: 'Which city do you live in ? ',
							fieldType: 'textarea',
							placeholder: 'Paris',
							requiredField: true,
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.formTrigger',
			typeVersion: 2.2,
			position: [-944, -128],
			id: 'beba8fc9-9213-43bb-8f78-08800d629270',
			name: 'Trigger when user submits form',
			webhookId: 'a460df1e-c73b-4654-9a21-2987cea55b14',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.limit',
			typeVersion: 1,
			position: [-320, -128],
			id: 'aa0b1683-0586-465a-bcf2-38cf0617a6fc',
			name: 'Limit to first item',
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
			position: [0, -128],
			id: '73b40790-3ef6-4091-9cd3-cab673276a7a',
			name: 'Get weather for that latitude and longitude',
		},
		{
			parameters: {
				content:
					'**Tip: Edit pinned data**\n\nWhen data is pinned, click the ✏ icon in the top right to edit it. Try changing “London” to “Berlin” and rerun the workflow.',
				height: 128,
				width: 288,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-1056, 96],
			id: 'd9390b71-3bf2-4094-b603-3f43988675e9',
			name: 'Sticky Note',
		},
		{
			parameters: {
				url: "=https://nominatim.openstreetmap.org/search?q={{ $json['Which city do you live in ? '] }}&format=json",
				options: {
					response: {
						response: {},
					},
				},
			},
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [-624, -128],
			id: 'e3ce382a-c21b-4ee8-b366-b28cfe2b1b37',
			name: 'Get city latitude and longitude',
		},
		{
			parameters: {
				content: 'This `Limit` node keeps only the first item returned by the API.',
				height: 352,
				width: 288,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-1056, -272],
			id: '305eea3e-c853-4a8c-a7d4-dd10d81bf099',
			name: 'Sticky Note7',
		},
	],
	pinData: {
		'Trigger when user submits form': [
			{
				json: {
					'Which city do you live in ? ': 'London',
					submittedAt: '2025-08-01T12:06:25.400+02:00',
					formMode: 'test',
				},
			},
		],
	},
	connections: {
		'Trigger when user submits form': {
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
		'Limit to first item': {
			main: [
				[
					{
						node: 'Get weather for that latitude and longitude',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Get weather for that latitude and longitude': {
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
		'Get city latitude and longitude': {
			main: [
				[
					{
						node: 'Limit to first item',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};
