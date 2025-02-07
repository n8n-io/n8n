import { NodeConnectionType } from 'n8n-workflow';
import type { INodeUi, IWorkflowDataCreate } from './Interface';

export const SAMPLE_SUBWORKFLOW_WORKFLOW: IWorkflowDataCreate = {
	name: 'My Sub-Workflow',
	nodes: [
		{
			id: 'c055762a-8fe7-4141-a639-df2372f30060',
			typeVersion: 1.1,
			name: 'When Executed by Another Workflow',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			position: [260, 340],
			parameters: {},
		},
		{
			id: 'b5942df6-0160-4ef7-965d-57583acdc8aa',
			name: 'Replace me with your logic',
			type: 'n8n-nodes-base.noOp',
			position: [520, 340],
			parameters: {},
		},
	] as INodeUi[],
	connections: {
		'When Executed by Another Workflow': {
			main: [
				[
					{
						node: 'Replace me with your logic',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	},
	settings: {
		executionOrder: 'v1',
	},
	pinData: {},
};

export const SAMPLE_EVALUATION_WORKFLOW: IWorkflowDataCreate = {
	name: 'My Evaluation Sub-Workflow',
	nodes: [
		{
			parameters: {
				inputSource: 'passthrough',
			},
			id: 'c20c82d6-5f71-4fb6-a398-a10a6e6944c5',
			name: 'When called by a test run',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [40, 460],
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'a748051d-ebdb-4fcf-aaed-02756130ce2a',
							name: 'latency',
							value: '={{ $json.totalRuntime }}',
							type: 'number',
						},
					],
				},
				options: {},
			},
			id: '33e2e94a-ec48-4e7b-b750-f56718d5105c',
			name: 'Return metric(s)',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [720, 460],
		},
		{
			parameters: {
				content:
					"### 1. Receive execution data\n\nThis workflow will be passed:\n- The benchmark execution (`$json.originalExecution`)\n- The evaluation execution (`$json.newExecution`) produced by re-running the workflow using trigger data from benchmark execution\n\n\nWe've pinned some example data to get you started\n\n‼️ Don't forget to unpin demo data!",
				height: 498,
				width: 317,
				color: 7,
			},
			id: '55e5e311-e285-4000-bd1e-900bc3a07da3',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-60, 140],
		},
		{
			parameters: {
				content:
					'### 2. Evaluation logic\n\nAdd any logic to perform the tests you want to perform.',
				height: 139,
				width: 317,
				color: 7,
			},
			id: 'ea74e341-ff9c-456a-83f0-c10758f0844a',
			name: 'Sticky Note1',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [280, 140],
		},
		{
			parameters: {
				content:
					'### 3. Return metrics\n\nDefine evaluation metrics you want to show on your report.\n\nFor simple metrics like token counts, you can simply return values from `$json.newExecution` without any evaluation logic\n\n__Notes:__ \n* Metrics need to be numeric\n* Only use 1 metric return node',
				height: 499,
				width: 297,
				color: 7,
			},
			id: '9b3c3408-19e1-43d5-b2bb-29d61bd129b8',
			name: 'Sticky Note2',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [620, 140],
		},
		{
			parameters: {
				content:
					'## Evaluation workflow\nThis workflow is used to define evaluation logic and calculate metrics. You can compare against benchmark executions, use LLMs to evaluate, or write any other logic you choose.',
				height: 105,
				width: 974,
			},
			id: '0fc1356e-6238-4557-a920-e50806c1ec13',
			name: 'Sticky Note3',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-60, 20],
		},
		{
			parameters: {
				jsCode:
					'const testExecutionData = $input.first().json.newExecution;\n\nconst getNodeLatency = (nodeRuns) => {\n\t\tif (nodeRuns[0].data.main === undefined) return 0;\n\t\treturn nodeRuns.reduce((acc, node) => acc + node.executionTime, 0);\n\t};\n\nconst latency = Object.values(testExecutionData).reduce((acc, node) => acc + getNodeLatency(node), 0);\n\nreturn [{ json: { totalRuntime: latency } }];',
			},
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [380, 460],
			id: 'bc32fc97-0184-4aff-9eb2-f75d49c79cfe',
			name: 'Code - Calculate total runtime for all nodes',
		},
		{
			parameters: {
				content:
					'### Example - calculate latency\n\nCalculates how long all nodes took to execute when the workflow was executed during evaluation (`$json.newExecution`)',
				height: 319,
				width: 317,
				color: 7,
			},
			id: 'd9ae1654-0cbe-4c99-adb3-14d155ada179',
			name: 'Sticky Note4',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [280, 320],
		},
		{
			parameters: {
				content:
					'### Example - Evaluate toxicity and sentiment\n\nYou can also use an LLM as a judge to evaluate the outputs of your workflow',
				height: 419,
				width: 637,
				color: 7,
			},
			id: '649e3d82-d1aa-4e76-ad58-8e8af38a2ee9',
			name: 'Sticky Note5',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [280, 680],
		},
		{
			parameters: {
				modelId: {
					__rl: true,
					value: 'gpt-4o-mini',
					mode: 'list',
					cachedResultName: 'GPT-4O-MINI',
				},
				messages: {
					values: [
						{
							content:
								'Objective: Analyze the given text for toxicity providing a score on a 0 to 1 scale.\n\nEvaluate the level of harmful language, including insults, hate speech, threats, or harassment:\n\n0.0: Not toxic (neutral, respectful)\n0.25: Mildly toxic (slightly offensive, impolite)\n0.5: Moderately toxic (strong language, dismissive)\n0.75: Highly toxic (direct attacks, slurs, harassment)\n1.0: Severely toxic (explicit hate speech, threats)\n\nSimply output the numberic value, nothing else',
						},
					],
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.openAi',
			typeVersion: 1.8,
			position: [320, 780],
			id: '7055bfa3-a926-4ca9-8bb8-eb3e71b23ef3',
			name: 'Evaluate toxicity',
		},
		{
			parameters: {
				modelId: {
					__rl: true,
					value: 'gpt-4o-mini',
					mode: 'list',
					cachedResultName: 'GPT-4O-MINI',
				},
				messages: {
					values: [
						{
							content:
								'Objective: Analyze the given text for sentiment, providing a score on a 0 to 1 scale.\n\nMeasure the emotional tone:\n0.0: Strongly negative (anger, hate, extreme sadness)\n0.25: Negative (frustration, criticism)\n0.5: Neutral (factual, balanced)\n0.75: Positive (optimistic, supportive)\n1.0: Strongly positive (joyful, enthusiastic)\n\nSimply output the numberic value, nothing else',
						},
					],
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.openAi',
			typeVersion: 1.8,
			position: [320, 940],
			id: 'a72fe287-9788-49cf-aaa8-08c984246c58',
			name: 'Evaluate sentiment',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'a748051d-ebdb-4fcf-aaed-02756130ce2a',
							name: 'toxicity',
							value: '={{ $json.message.content }}',
							type: 'number',
						},
					],
				},
				options: {},
			},
			id: '4ff1f5ad-b358-435f-8a0e-7c71c171a105',
			name: 'Return metric(s)1',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [720, 780],
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'a748051d-ebdb-4fcf-aaed-02756130ce2a',
							name: 'sentiment',
							value: '={{ $json.message.content }}',
							type: 'number',
						},
					],
				},
				options: {},
			},
			id: 'c2907df5-680e-4b65-af1e-58831f6d9868',
			name: 'Return metric(s)2',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [720, 940],
		},
	],
	connections: {
		'When called by a test run': {
			main: [
				[
					{
						node: 'Code - Calculate total runtime for all nodes',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'Code - Calculate total runtime for all nodes': {
			main: [
				[
					{
						node: 'Return metric(s)',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'Evaluate toxicity': {
			main: [
				[
					{
						node: 'Return metric(s)1',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'Evaluate sentiment': {
			main: [
				[
					{
						node: 'Return metric(s)2',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	},
	pinData: {},
	settings: {
		executionOrder: 'v1',
	},
};
