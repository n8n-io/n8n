import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const PLAYGROUND_1: WorkflowDataCreate = {
	meta: {
		templateId: '37_onboarding_experiments_batch_aug11-1_filter_data',
	},
	name: '▶️ 1. Filter data coming from an API',
	nodes: [
		{
			parameters: {},
			type: 'n8n-nodes-base.merge',
			typeVersion: 3.2,
			position: [448, 176],
			id: '01f2f222-4ff2-41ec-afd9-68496d2e0cb3',
			name: 'Merge',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-768, 192],
			id: 'e5ef1b32-ce8a-4c71-aa14-6885a09feabe',
			name: 'When clicking ‘Execute workflow’',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '2fd0b039-7dd9-4666-bc24-d3a81e6d4b68',
							name: 'quote_category',
							value: 'Personal',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [160, 272],
			id: '42d065cd-1580-4b2a-8cc6-796be9a1da2a',
			name: 'Set Category = Personal',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '1ff91e4a-8460-4991-a273-c5f24b4038e9',
							name: 'quote_category',
							value: 'team',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [160, 64],
			id: 'a5259694-11ed-442c-be2a-e0000926fb30',
			name: 'Set Category = Team',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'c014a174-3f17-41bf-9fa5-19e822427346',
							name: 'author',
							value: "={{ $('Make an API request to get a random quote').item.json.author }}",
							type: 'string',
						},
						{
							id: '1d60a497-d964-406b-96fc-0206c82d5742',
							name: 'quote',
							value: "={{ $('Make an API request to get a random quote').item.json.quote }}",
							type: 'string',
						},
						{
							id: '5faf3496-8aa3-4a71-934c-6c5e3f08100b',
							name: 'quote_category',
							value: '={{ $json.quote_category }}',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [736, 176],
			id: '82b78022-f986-4bb0-aac8-f34558d46e5d',
			name: 'Quote with category',
		},
		{
			parameters: {
				content:
					'The node below is an `HTTP Node`. It makes a request to an API, which returns a single random quote. ',
				height: 512,
				width: 304,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-512, -48],
			id: 'd6145c80-0504-4a0b-bfd7-5e85867b3d76',
			name: 'Sticky Note3',
		},
		{
			parameters: {
				content:
					'The `Filter node` checks if the quote contains "you" or "your" , to categorise the quote.\n\nIf matched, we create a `quote_category` variable in the `Set node` , with the value to "Team"',
				height: 512,
				width: 496,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-160, -48],
			id: '75efc471-b2a7-4cb0-8299-f7ad710ff67e',
			name: 'Sticky Note5',
		},
		{
			parameters: {
				content:
					'You can reference data input from earlier nodes.  We use here the `author` variable which was returned from the first node, the API request.\n\n',
				height: 512,
				width: 288,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [640, -48],
			id: '9df256c6-a437-4a53-a760-e6964e73c5c3',
			name: 'Sticky Note6',
		},
		{
			parameters: {
				content: 'The `Merge` combines the outputs of both branches into a single list.\n',
				height: 512,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [368, -48],
			id: 'ad7ec1f3-7a95-444f-a5b8-363fc1224f95',
			name: 'Sticky Note8',
		},
		{
			parameters: {
				content:
					'### ⏩ Next up: \n\n- Tweak and edit this workflow. It\'s made for you to hack up! \n*Example: Try adding the quote `id` to the final output in the "Quote with category" node.*\n\n- Try out the other workflows in the Playground \n\n\n\n\n',
				height: 240,
				width: 400,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [960, 96],
			id: '0d9362fd-e399-4ce5-ba47-c9ab59b452de',
			name: 'Sticky Note9',
		},
		{
			parameters: {
				content:
					'**Tip: Ressources**\n- Use the `n8n Assistant` or any LLM like `ChatGPT` to explain a screenshot, fix issues, or create workflows for you\n- Learn and get inspired with [templates](https://n8n.io/workflows/)\n- Follow the [n8n Courses](https://docs.n8n.io/courses/) or find tutorials on Youtube\n- Ask [the community](https://community.n8n.io/) for help \n',
				height: 176,
				width: 400,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [960, 480],
			id: '724338d8-3e2b-43a1-8a3d-a38be2a50ed3',
			name: 'Sticky Note7',
		},
		{
			parameters: {
				content:
					'## ▶ Click to start\n\n1. Click the orange `Execute Workflow` button  \n2. Double-click nodes to view data flows\n2. Re-run to see results change',
				height: 448,
				width: 368,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-912, -48],
			id: 'a05fb79b-a6e6-498d-bdb2-c73ff7898233',
			name: 'Sticky Note11',
		},
		{
			parameters: {
				conditions: {
					options: {
						caseSensitive: false,
						leftValue: '',
						typeValidation: 'strict',
						version: 2,
					},
					conditions: [
						{
							id: '4b2c3ebb-ad22-4d62-a64e-fdc2837565bc',
							leftValue: '={{ $json.quote }}',
							rightValue: 'you',
							operator: {
								type: 'string',
								operation: 'contains',
							},
						},
						{
							id: 'da268099-9c51-4e93-bc02-d8f0eda03ffd',
							leftValue: '={{ $json.quote }}',
							rightValue: 'your',
							operator: {
								type: 'string',
								operation: 'contains',
							},
						},
					],
					combinator: 'or',
				},
				options: {
					ignoreCase: true,
				},
			},
			type: 'n8n-nodes-base.if',
			typeVersion: 2.2,
			position: [-96, 192],
			id: 'f2dda369-4176-493e-8c6e-c3390a6968a3',
			name: 'Filter the quote',
		},
		{
			parameters: {
				url: 'https://dummyjson.com/quotes/random',
				options: {},
			},
			id: 'c4437d01-a813-48a7-ac9a-366740d44428',
			name: 'Make an API request to get a random quote',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [-400, 192],
		},
	],
	connections: {
		Merge: {
			main: [
				[
					{
						node: 'Quote with category',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'When clicking ‘Execute workflow’': {
			main: [
				[
					{
						node: 'Make an API request to get a random quote',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Set Category = Personal': {
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
		'Set Category = Team': {
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
		'Filter the quote': {
			main: [
				[
					{
						node: 'Set Category = Team',
						type: 'main',
						index: 0,
					},
				],
				[
					{
						node: 'Set Category = Personal',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Make an API request to get a random quote': {
			main: [
				[
					{
						node: 'Filter the quote',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};
