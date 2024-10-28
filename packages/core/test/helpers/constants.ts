import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeData,
	WorkflowTestData,
} from 'n8n-workflow';
import { If } from '../../../nodes-base/dist/nodes/If/If.node';
import { Merge } from '../../../nodes-base/dist/nodes/Merge/Merge.node';
import { NoOp } from '../../../nodes-base/dist/nodes/NoOp/NoOp.node';
import { Set } from '../../../nodes-base/dist/nodes/Set/Set.node';
import { Start } from '../../../nodes-base/dist/nodes/Start/Start.node';

export const predefinedNodesTypes: INodeTypeData = {
	'n8n-nodes-base.if': {
		type: new If(),
		sourcePath: '',
	},
	'n8n-nodes-base.merge': {
		type: new Merge(),
		sourcePath: '',
	},
	'n8n-nodes-base.noOp': {
		type: new NoOp(),
		sourcePath: '',
	},
	'n8n-nodes-base.set': {
		type: new Set(),
		sourcePath: '',
	},
	'n8n-nodes-base.start': {
		type: new Start(),
		sourcePath: '',
	},
	'n8n-nodes-base.versionTest': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Version Test',
				name: 'versionTest',
				group: ['input'],
				version: 1,
				description: 'Tests if versioning works',
				defaults: {
					name: 'Version Test',
					color: '#0000FF',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Display V1',
						name: 'versionTest',
						type: 'number',
						displayOptions: {
							show: {
								'@version': [1],
							},
						},
						default: 1,
					},
					{
						displayName: 'Display V2',
						name: 'versionTest',
						type: 'number',
						displayOptions: {
							show: {
								'@version': [2],
							},
						},
						default: 2,
					},
				],
			},
			async execute(this: IExecuteFunctions) {
				const items = this.getInputData();
				const returnData: INodeExecutionData[] = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const newItem: INodeExecutionData = {
						json: {
							versionFromParameter: this.getNodeParameter('versionTest', itemIndex),
							versionFromNode: this.getNode().typeVersion,
						},
					};

					returnData.push(newItem);
				}

				return [returnData];
			},
		},
	},
};

export const legacyWorkflowExecuteTests: WorkflowTestData[] = [
	{
		description:
			'should run complicated multi node workflow where multiple Merge-Node have missing data and complex dependency structure',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: '21593a8c-07c1-435b-93a6-75317ee3bf67',
						name: 'IF4',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [880, 1240],
					},
					{
						parameters: {},
						id: 'a9af6b9f-011c-4b34-a367-0cfa5ad4c865',
						name: 'NoOp2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [1320, 1060],
					},
					{
						parameters: {},
						id: '429d1a51-65f0-4701-af76-b73611774952',
						name: 'Merge3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1100, 1060],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: 'ed08db0f-f747-4f87-af62-051fc53f955c',
						name: 'IF3',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 1100],
					},
					{
						parameters: {},
						id: 'e80d2aac-cbd4-4e7c-9817-83db52a617d4',
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [940, 900],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'a',
									},
								],
							},
						},
						id: '766dad6b-4326-41b5-a02a-0b3b7d879eb4',
						name: 'IF2',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 900],
					},
					{
						parameters: {},
						id: '0c0cd5bb-eb44-48fe-b66a-54a3c541ea57',
						name: 'Merge7',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [2180, 1180],
					},
					{
						parameters: {},
						id: '863a00e5-7be4-43f3-97da-07cf552d7c0e',
						name: 'Merge6',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1840, 1200],
					},
					{
						parameters: {},
						id: '8855d0ca-1deb-4ad8-958b-2379d3a87160',
						name: 'Merge5',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1600, 1040],
					},
					{
						parameters: {},
						id: 'ea37e388-c77a-4a2f-a527-4585f24371d5',
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1180, 880],
					},
					{
						parameters: {},
						id: 'e3c814e9-9a92-4e12-96d5-85634fe76dc9',
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [940, 720],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: 'a21a3932-8a3f-464f-8393-309d3233433a',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 720],
					},
					{
						parameters: {
							values: {
								string: [
									{
										name: 'test',
										value: 'a',
									},
								],
							},
							options: {},
						},
						id: '12d33a38-baeb-41de-aea0-d8a7477f5aa6',
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 720],
					},
					{
						parameters: {},
						id: '41589b0b-0521-41ae-b0c6-80a016af803e',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [160, 240],
					},
				],
				connections: {
					IF4: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 1,
								},
							],
							[
								{
									node: 'Merge6',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					NoOp2: {
						main: [
							[
								{
									node: 'Merge5',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge3: {
						main: [
							[
								{
									node: 'NoOp2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF3: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'IF4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge2: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					IF2: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge6: {
						main: [
							[
								{
									node: 'Merge7',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge5: {
						main: [
							[
								{
									node: 'Merge6',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge4: {
						main: [
							[
								{
									node: 'Merge5',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF2',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'IF1',
				'IF2',
				'IF3',
				'Merge2',
				'IF4',
				'Merge1',
				'Merge4',
				'Merge3',
				'NoOp2',
				'Merge5',
				'Merge6',
			],
			nodeData: {
				Merge1: [[{}]],
				Merge2: [
					[
						{
							test: 'a',
						},
					],
				],
				Merge3: [[{}]],
				Merge4: [
					[
						{},
						{
							test: 'a',
						},
					],
				],
				Merge5: [
					[
						{},
						{
							test: 'a',
						},
						{},
					],
				],
				Merge6: [
					[
						{},
						{
							test: 'a',
						},
						{},
						{
							test: 'a',
						},
					],
				],
			},
		},
	},
	{
		description: 'should simply execute the next multi-input-node (totally ignoring the runIndex)',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {
							values: {
								number: [
									{
										name: 'counter',
										value: '={{ ($input.first().json.counter || 0) + 1 }}',
									},
								],
							},
							options: {},
						},
						id: '18191406-b56b-4388-9d4b-ff5b22fdc02c',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [640, 660],
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $json.counter }}',
										value2: 3,
									},
								],
							},
						},
						id: '0c6f239b-f9f5-4a20-b554-c69e7bc692b1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [900, 660],
					},
					{
						parameters: {},
						id: '463194c3-4fcb-4da4-bba0-bc58462ac59a',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2.1,
						position: [1180, 760],
					},
					{
						parameters: {
							values: {
								number: [
									{
										name: 'counter',
										value: '={{ ($input.first().json.counter || 0) + 1 }}',
									},
								],
							},
							options: {},
						},
						id: '8b5177c1-34ab-468f-8cb1-ff1d253562dc',
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [640, 320],
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $json.counter }}',
										value2: 3,
									},
								],
							},
						},
						id: '455663ab-bc3b-4674-9769-7428c85918c3',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [860, 320],
					},
					{
						parameters: {},
						id: 'ffc0d327-5cbc-4cf3-8fb0-77c087b391c1',
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2.1,
						position: [1180, 420],
					},
					{
						parameters: {},
						id: '9a5b13a4-eba1-4a18-a4c6-36bedb07d975',
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2.1,
						position: [1500, 600],
					},
					{
						parameters: {},
						id: '89a78e50-2ec6-48bf-be5f-3838600cd08a',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [-20, 700],
					},
				],
				connections: {
					Set: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
							[
								{
									node: 'Merge',
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
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'Set',
				'IF1',
				'IF',
				'Set1',
				'Set',
				'Merge1',
				'IF1',
				'IF',
				'Set1',
				'Set',
				'Merge1',
				'IF1',
				'IF',
				'Merge',
				'Merge2',
				'Merge2',
			],
			nodeData: {
				Start: [[{}]],
				Set1: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[
						{
							counter: 3,
						},
					],
				],
				Set: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[
						{
							counter: 3,
						},
					],
				],
				IF1: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[],
				],
				IF: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[],
				],
				Merge1: [
					[
						{
							counter: 1,
						},
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
						{
							counter: 2,
						},
					],
				],
				Merge: [
					[
						{
							counter: 3,
						},
						{},
					],
				],
				Merge2: [
					[
						{
							counter: 1,
						},
						{
							counter: 1,
						},
						{
							counter: 3,
						},
						{},
					],
					[
						{
							counter: 2,
						},
						{
							counter: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run basic two node workflow',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
						},
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [280, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set'],
			nodeData: {
				Set: [
					[
						{
							value1: 1,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run node twice when it has two input connections3',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 250],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								number: [
									{
										name: 'value2',
										value: 2,
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [500, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set1', 'Set2', 'Set2'],
			nodeData: {
				Set1: [
					[
						{
							value1: 1,
						},
					],
				],
				Set2: [
					[
						{
							value2: 2,
						},
					],
					[
						{
							value1: 1,
							value2: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run complicated multi node workflow',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {
							mode: 'passThrough',
						},
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1150, 500],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value2',
										value: 2,
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [290, 400],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								number: [
									{
										name: 'value4',
										value: 4,
									},
								],
							},
						},
						name: 'Set4',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [850, 200],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								number: [
									{
										name: 'value3',
										value: 3,
									},
								],
							},
						},
						name: 'Set3',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [650, 200],
					},
					{
						id: 'uuid-5',
						parameters: {
							mode: 'passThrough',
						},
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1150, 500],
					},
					{
						id: 'uuid-6',
						parameters: {},
						name: 'Merge3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1000, 400],
					},
					{
						id: 'uuid-7',
						parameters: {
							mode: 'passThrough',
							output: 'input2',
						},
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [700, 400],
					},
					{
						id: 'uuid-8',
						parameters: {},
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [500, 300],
					},
					{
						id: 'uuid-9',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-10',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
				],
				connections: {
					Set2: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
								{
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set4: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set3: {
						main: [
							[
								{
									node: 'Set4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge3: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge2: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge4',
									type: 'main',
									index: 1,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'Set2',
				'Set3',
				'Merge1',
				'Set4',
				'Merge2',
				'Merge3',
				'Merge4',
			],
			nodeData: {
				Set1: [
					[
						{
							value1: 1,
						},
					],
				],
				Set2: [
					[
						{
							value2: 2,
						},
					],
				],
				Set3: [
					[
						{
							value1: 1,
							value3: 3,
						},
					],
				],
				Set4: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
					],
				],
				Merge1: [
					[
						{
							value1: 1,
						},
						{
							value2: 2,
						},
					],
				],
				Merge2: [
					[
						{
							value2: 2,
						},
					],
				],
				Merge3: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
						{
							value2: 2,
						},
					],
				],
				Merge4: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
						{
							value2: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run workflow also if node has multiple input connections and one is empty',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						id: 'uuid-1',
						position: [250, 450],
					},
					{
						parameters: {
							conditions: {
								boolean: [],
								number: [
									{
										value1: '={{Object.keys($json).length}}',
										operation: 'notEqual',
									},
								],
							},
						},
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						id: 'uuid-2',
						position: [650, 350],
					},
					{
						parameters: {},
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						id: 'uuid-3',
						position: [1150, 450],
					},
					{
						parameters: {
							values: {
								string: [
									{
										name: 'test1',
										value: 'a',
									},
								],
							},
							options: {},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						id: 'uuid-4',
						position: [450, 450],
					},
					{
						parameters: {
							values: {
								string: [
									{
										name: 'test2',
										value: 'b',
									},
								],
							},
							options: {},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						id: 'uuid-1',
						position: [800, 250],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set2: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set1', 'IF', 'Set2', 'Merge1'],
			nodeData: {
				Merge1: [
					[
						{
							test1: 'a',
							test2: 'b',
						},
						{
							test1: 'a',
						},
					],
				],
			},
		},
	},
	{
		description: 'should use empty data if second input does not have any data',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						id: 'uuid-2',
						parameters: {},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [800, 450],
					},
					{
						id: 'uuid-3',
						parameters: {},
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1000, 300],
					},
					{
						id: 'uuid-4',
						parameters: {
							conditions: {
								boolean: [
									{
										value2: true,
									},
								],
								string: [
									{
										value1: '={{$json["key"]}}',
										value2: 'a',
									},
								],
							},
							combineOperation: 'any',
						},
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [600, 600],
						alwaysOutputData: false,
					},
					{
						id: 'uuid-5',
						parameters: {
							values: {
								number: [
									{
										name: 'number0',
									},
								],
								string: [
									{
										name: 'key',
										value: 'a',
									},
								],
							},
							options: {},
						},
						name: 'Set0',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 300],
					},
					{
						id: 'uuid-6',
						parameters: {
							values: {
								number: [
									{
										name: 'number1',
										value: 1,
									},
								],
								string: [
									{
										name: 'key',
										value: 'b',
									},
								],
							},
							options: {},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 450],
					},
					{
						id: 'uuid-7',
						parameters: {
							values: {
								number: [
									{
										name: 'number2',
										value: 2,
									},
								],
								string: [
									{
										name: 'key',
										value: 'c',
									},
								],
							},
							options: {},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 600],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set0',
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
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					IF: {
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
					Set0: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
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
					Set2: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set0', 'Set2', 'IF', 'Set1', 'Merge', 'Merge1'],
			nodeData: {
				Merge: [
					[
						{
							number1: 1,
							key: 'b',
						},
					],
				],
				Merge1: [
					[
						{
							number0: 0,
							key: 'a',
						},
						{
							number1: 1,
							key: 'b',
						},
					],
				],
			},
		},
	},
	{
		description: 'should use empty data if input of sibling does not receive any data from parent',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{$json["value1"]}}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [650, 300],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								string: [],
								number: [
									{
										name: 'value2',
										value: 2,
									},
								],
							},
							options: {},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [850, 450],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
							options: {},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 300],
					},
					{
						id: 'uuid-5',
						parameters: {},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1050, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set2: {
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
					Set1: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set1', 'IF', 'Set2', 'Merge'],
			nodeData: {
				Merge: [
					[
						{
							value1: 1,
						},
						{
							value2: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should not use empty data in sibling if parent did not send any data',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [250, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
									},
								],
							},
							options: {},
						},
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [450, 300],
					},
					{
						id: 'uuid-3',
						parameters: {},
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1050, 250],
					},
					{
						id: 'uuid-4',
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{$json["value1"]}}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [650, 300],
					},
					{
						id: 'uuid-5',
						parameters: {},
						name: 'NoOpTrue',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [850, 150],
					},
					{
						id: 'uuid-6',
						parameters: {},
						name: 'NoOpFalse',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [850, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'NoOpTrue',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
							[
								{
									node: 'NoOpFalse',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					NoOpTrue: {
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
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set', 'IF', 'NoOpFalse'],
			nodeData: {
				IF: [[]],
				NoOpFalse: [
					[
						{
							value1: 0,
						},
					],
				],
			},
		},
	},
	{
		description:
			'should display the correct parameters and so correct data when simplified node-versioning is used',
		input: {
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [240, 300],
					},
					{
						id: 'uuid-2',
						parameters: {},
						name: 'VersionTest1a',
						type: 'n8n-nodes-base.versionTest',
						typeVersion: 1,
						position: [460, 300],
					},
					{
						id: 'uuid-3',
						parameters: {
							versionTest: 11,
						},
						name: 'VersionTest1b',
						type: 'n8n-nodes-base.versionTest',
						typeVersion: 1,
						position: [680, 300],
					},
					{
						id: 'uuid-4',
						parameters: {},
						name: 'VersionTest2a',
						type: 'n8n-nodes-base.versionTest',
						typeVersion: 2,
						position: [880, 300],
					},
					{
						id: 'uuid-5',
						parameters: {
							versionTest: 22,
						},
						name: 'VersionTest2b',
						type: 'n8n-nodes-base.versionTest',
						typeVersion: 2,
						position: [1080, 300],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'VersionTest1a',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					VersionTest1a: {
						main: [
							[
								{
									node: 'VersionTest1b',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					VersionTest1b: {
						main: [
							[
								{
									node: 'VersionTest2a',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					VersionTest2a: {
						main: [
							[
								{
									node: 'VersionTest2b',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'VersionTest1a',
				'VersionTest1b',
				'VersionTest2a',
				'VersionTest2b',
			],
			nodeData: {
				VersionTest1a: [
					[
						{
							versionFromNode: 1,
							versionFromParameter: 1,
						},
					],
				],
				VersionTest1b: [
					[
						{
							versionFromNode: 1,
							versionFromParameter: 11,
						},
					],
				],
				VersionTest2a: [
					[
						{
							versionFromNode: 2,
							versionFromParameter: 2,
						},
					],
				],
				VersionTest2b: [
					[
						{
							versionFromNode: 2,
							versionFromParameter: 22,
						},
					],
				],
			},
		},
	},
	{
		description: 'should execute nodes in the correct order, breath-first & order of connection',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {},
						id: '3e4ab8bb-2e22-45d9-9287-0265f2ee9c4b',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [300, 620],
					},
					{
						parameters: {
							options: {},
						},
						id: '444650ce-464a-4630-9e24-109056105167',
						name: 'Wait',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 420],
						webhookId: '1f4118f8-591a-48fe-a68d-6fec3c99b7a8',
					},
					{
						parameters: {
							values: {
								number: [
									{
										name: 'wait',
									},
								],
							},
							options: {},
						},
						id: '7a74a097-6563-4f1e-a327-97e5a43b8acb',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [480, 620],
					},
					{
						parameters: {
							options: {},
						},
						id: '9039eebf-6c11-4ce0-b8ad-0812774019d4',
						name: 'Wait1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 800],
						webhookId: '35ceb27a-3fb1-47a9-8678-2df16dcecbcb',
					},
					{
						parameters: {
							options: {},
						},
						id: '7f130b16-8fac-4d93-a0ef-56dfe575f952',
						name: 'Wait2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [940, 420],
						webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
					},
					{
						parameters: {
							options: {},
						},
						id: '063e2097-b27a-4775-923c-5b839c434640',
						name: 'Wait3',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1300, 420],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'ec908b56-8829-4566-a0b7-ced4bd16c550',
						name: 'Wait4',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [940, 800],
						webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
					},
					{
						parameters: {
							options: {},
						},
						id: 'a7d279bd-7241-4744-8ef6-41468131dfa7',
						name: 'Wait5',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1140, 800],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'f620aff1-7d9c-453f-a2c1-6e3b9a1664d3',
						name: 'Wait6',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [760, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '1d9bac9b-8197-4ad9-9189-f947068f1a46',
						name: 'Wait7',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1060, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '9ad0cc8c-4922-440e-913c-39c8570ddcbc',
						name: 'Wait8',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 600],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'af0ca700-b6ed-40c1-8c62-bbadb6fd81f7',
						name: 'Wait9',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1040, 580],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'f2553f9f-670f-4b54-8b89-84dd5a27a244',
						name: 'Wait10',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1660, 340],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '0f4475cb-87db-4ed7-a7a0-8a67043c320b',
						name: 'Wait11',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1660, 540],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '815f7b2a-1789-48a3-be61-931e643e6d89',
						name: 'Wait12',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1920, 340],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'be1e11af-b8e4-40cb-af36-03613e384b5e',
						name: 'Wait13',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1240, 580],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {},
						id: 'cf72f99c-612f-4b76-bc8e-d77612e4faa9',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1300, 220],
					},
					{
						parameters: {
							options: {},
						},
						id: 'bfe1dfca-a060-4c37-94d0-058739e7cfca',
						name: 'Wait14',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1520, 220],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $itemIndex }}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						id: 'bf7d7e54-db5f-4f20-bf3e-b07224096872',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [1780, -220],
					},
					{
						parameters: {
							options: {},
						},
						id: 'd340f2ad-3a6a-4412-bd15-9a7dde1fcb8c',
						name: 'Wait15',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, -300],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '913a3c9c-1704-433d-9790-21ad0922e5e1',
						name: 'Wait16',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, -140],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $itemIndex }}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						id: 'df1fba53-92af-4351-b471-114dda12bef9',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [1780, 120],
					},
					{
						parameters: {
							options: {},
						},
						id: '8b3c7e63-8cd8-469d-b6d4-bf5c1953af11',
						name: 'Wait17',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'e74c4b7c-fc76-4e48-9a0e-3195b19ce1a0',
						name: 'Wait18',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, 40],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait: {
						main: [
							[
								{
									node: 'Wait2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set: {
						main: [
							[
								{
									node: 'Wait',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait6',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait7',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait8',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait9',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait1: {
						main: [
							[
								{
									node: 'Wait4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait2: {
						main: [
							[
								{
									node: 'Wait3',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Wait3: {
						main: [
							[
								{
									node: 'Wait10',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait11',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait4: {
						main: [
							[
								{
									node: 'Wait5',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait7: {
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
					Wait9: {
						main: [
							[
								{
									node: 'Wait13',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait10: {
						main: [
							[
								{
									node: 'Wait12',
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
									node: 'Wait14',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait14: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Wait15',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Wait16',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Wait17',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Wait18',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set',
				'Wait',
				'Wait1',
				'Wait6',
				'Wait7',
				'Wait8',
				'Wait9',
				'Wait2',
				'Wait4',
				'Wait13',
				'Wait3',
				'Merge',
				'Wait5',
				'Wait10',
				'Wait11',
				'Wait14',
				'Wait12',
				'IF',
				'IF1',
				'Wait15',
				'Wait16',
				'Wait17',
				'Wait18',
			],
			nodeData: {},
		},
	},
];

export const v1WorkflowExecuteTests: WorkflowTestData[] = [
	{
		description: 'should run node twice when it has two input connections',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 250],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								number: [
									{
										name: 'value2',
										value: 2,
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [500, 400],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set1', 'Set2', 'Set2'],
			nodeData: {
				Set1: [
					[
						{
							value1: 1,
						},
					],
				],
				Set2: [
					[
						{
							value1: 1,
							value2: 2,
						},
					],
					[
						{
							value2: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run complicated multi node workflow',
		input: {
			// Leave the workflowData in regular JSON to be able to easily
			// copy it from/in the UI
			workflowData: {
				nodes: [
					{
						id: 'uuid-1',
						parameters: {
							mode: 'passThrough',
						},
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1150, 500],
					},
					{
						id: 'uuid-2',
						parameters: {
							values: {
								number: [
									{
										name: 'value2',
										value: 2,
									},
								],
							},
						},
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [290, 400],
					},
					{
						id: 'uuid-3',
						parameters: {
							values: {
								number: [
									{
										name: 'value4',
										value: 4,
									},
								],
							},
						},
						name: 'Set4',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [850, 200],
					},
					{
						id: 'uuid-4',
						parameters: {
							values: {
								number: [
									{
										name: 'value3',
										value: 3,
									},
								],
							},
						},
						name: 'Set3',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [650, 200],
					},
					{
						id: 'uuid-5',
						parameters: {
							mode: 'passThrough',
						},
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1150, 500],
					},
					{
						id: 'uuid-6',
						parameters: {},
						name: 'Merge3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [1000, 400],
					},
					{
						id: 'uuid-7',
						parameters: {
							mode: 'passThrough',
							output: 'input2',
						},
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [700, 400],
					},
					{
						id: 'uuid-8',
						parameters: {},
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 1,
						position: [500, 300],
					},
					{
						id: 'uuid-9',
						parameters: {
							values: {
								number: [
									{
										name: 'value1',
										value: 1,
									},
								],
							},
						},
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 200],
					},
					{
						id: 'uuid-10',
						parameters: {},
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 300],
					},
				],
				connections: {
					Set2: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
								{
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set4: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set3: {
						main: [
							[
								{
									node: 'Set4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge3: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge2: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set2',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge4',
									type: 'main',
									index: 1,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'Set3',
				'Set4',
				'Set2',
				'Merge1',
				'Merge2',
				'Merge3',
				'Merge4',
			],
			nodeData: {
				Set1: [
					[
						{
							value1: 1,
						},
					],
				],
				Set2: [
					[
						{
							value2: 2,
						},
					],
				],
				Set3: [
					[
						{
							value1: 1,
							value3: 3,
						},
					],
				],
				Set4: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
					],
				],
				Merge1: [
					[
						{
							value1: 1,
						},
						{
							value2: 2,
						},
					],
				],
				Merge2: [
					[
						{
							value2: 2,
						},
					],
				],
				Merge3: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
						{
							value2: 2,
						},
					],
				],
				Merge4: [
					[
						{
							value1: 1,
							value3: 3,
							value4: 4,
						},
						{
							value2: 2,
						},
					],
				],
			},
		},
	},
	{
		description:
			'should execute nodes in the correct order, depth-first & the most top-left one first',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {},
						id: '3e4ab8bb-2e22-45d9-9287-0265f2ee9c4b',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [300, 620],
					},
					{
						parameters: {
							options: {},
						},
						id: '444650ce-464a-4630-9e24-109056105167',
						name: 'Wait',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 420],
						webhookId: '1f4118f8-591a-48fe-a68d-6fec3c99b7a8',
					},
					{
						parameters: {
							values: {
								number: [
									{
										name: 'wait',
									},
								],
							},
							options: {},
						},
						id: '7a74a097-6563-4f1e-a327-97e5a43b8acb',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [480, 620],
					},
					{
						parameters: {
							options: {},
						},
						id: '9039eebf-6c11-4ce0-b8ad-0812774019d4',
						name: 'Wait1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 800],
						webhookId: '35ceb27a-3fb1-47a9-8678-2df16dcecbcb',
					},
					{
						parameters: {
							options: {},
						},
						id: '7f130b16-8fac-4d93-a0ef-56dfe575f952',
						name: 'Wait2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [940, 420],
						webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
					},
					{
						parameters: {
							options: {},
						},
						id: '063e2097-b27a-4775-923c-5b839c434640',
						name: 'Wait3',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1300, 420],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'ec908b56-8829-4566-a0b7-ced4bd16c550',
						name: 'Wait4',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [940, 800],
						webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
					},
					{
						parameters: {
							options: {},
						},
						id: 'a7d279bd-7241-4744-8ef6-41468131dfa7',
						name: 'Wait5',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1140, 800],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'f620aff1-7d9c-453f-a2c1-6e3b9a1664d3',
						name: 'Wait6',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [760, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '1d9bac9b-8197-4ad9-9189-f947068f1a46',
						name: 'Wait7',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1060, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '9ad0cc8c-4922-440e-913c-39c8570ddcbc',
						name: 'Wait8',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [740, 600],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'af0ca700-b6ed-40c1-8c62-bbadb6fd81f7',
						name: 'Wait9',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1040, 580],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'f2553f9f-670f-4b54-8b89-84dd5a27a244',
						name: 'Wait10',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1660, 340],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '0f4475cb-87db-4ed7-a7a0-8a67043c320b',
						name: 'Wait11',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1660, 540],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '815f7b2a-1789-48a3-be61-931e643e6d89',
						name: 'Wait12',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1920, 340],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'be1e11af-b8e4-40cb-af36-03613e384b5e',
						name: 'Wait13',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1240, 580],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {},
						id: 'cf72f99c-612f-4b76-bc8e-d77612e4faa9',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1300, 220],
					},
					{
						parameters: {
							options: {},
						},
						id: 'bfe1dfca-a060-4c37-94d0-058739e7cfca',
						name: 'Wait14',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1520, 220],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $itemIndex }}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						id: 'bf7d7e54-db5f-4f20-bf3e-b07224096872',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [1780, -220],
					},
					{
						parameters: {
							options: {},
						},
						id: 'd340f2ad-3a6a-4412-bd15-9a7dde1fcb8c',
						name: 'Wait15',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, -300],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: '913a3c9c-1704-433d-9790-21ad0922e5e1',
						name: 'Wait16',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, -140],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $itemIndex }}',
										operation: 'equal',
										value2: 1,
									},
								],
							},
						},
						id: 'df1fba53-92af-4351-b471-114dda12bef9',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [1780, 120],
					},
					{
						parameters: {
							options: {},
						},
						id: '8b3c7e63-8cd8-469d-b6d4-bf5c1953af11',
						name: 'Wait17',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, 200],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
					{
						parameters: {
							options: {},
						},
						id: 'e74c4b7c-fc76-4e48-9a0e-3195b19ce1a0',
						name: 'Wait18',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [2020, 40],
						webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait: {
						main: [
							[
								{
									node: 'Wait2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set: {
						main: [
							[
								{
									node: 'Wait',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait6',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait7',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait8',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait9',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait1: {
						main: [
							[
								{
									node: 'Wait4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait2: {
						main: [
							[
								{
									node: 'Wait3',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Wait3: {
						main: [
							[
								{
									node: 'Wait10',
									type: 'main',
									index: 0,
								},
								{
									node: 'Wait11',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait4: {
						main: [
							[
								{
									node: 'Wait5',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait7: {
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
					Wait9: {
						main: [
							[
								{
									node: 'Wait13',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait10: {
						main: [
							[
								{
									node: 'Wait12',
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
									node: 'Wait14',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Wait14: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Wait15',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Wait16',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Wait17',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Wait18',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set',
				'Wait6',
				'Wait7',
				'Wait',
				'Wait2',
				'Merge',
				'Wait14',
				'IF',
				'Wait15',
				'Wait16',
				'IF1',
				'Wait18',
				'Wait17',
				'Wait3',
				'Wait10',
				'Wait12',
				'Wait11',
				'Wait9',
				'Wait13',
				'Wait8',
				'Wait1',
				'Wait4',
				'Wait5',
			],
			nodeData: {},
		},
	},
	{
		description: 'should simply execute the next multi-input-node (totally ignoring the runIndex)',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {
							values: {
								number: [
									{
										name: 'counter',
										value: '={{ ($input.first().json.counter || 0) + 1 }}',
									},
								],
							},
							options: {},
						},
						id: '18191406-b56b-4388-9d4b-ff5b22fdc02c',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [640, 660],
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $json.counter }}',
										value2: 3,
									},
								],
							},
						},
						id: '0c6f239b-f9f5-4a20-b554-c69e7bc692b1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [900, 660],
					},
					{
						parameters: {},
						id: '463194c3-4fcb-4da4-bba0-bc58462ac59a',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1180, 760],
					},
					{
						parameters: {
							values: {
								number: [
									{
										name: 'counter',
										value: '={{ ($input.first().json.counter || 0) + 1 }}',
									},
								],
							},
							options: {},
						},
						id: '8b5177c1-34ab-468f-8cb1-ff1d253562dc',
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 2,
						position: [640, 320],
					},
					{
						parameters: {
							conditions: {
								number: [
									{
										value1: '={{ $json.counter }}',
										value2: 3,
									},
								],
							},
						},
						id: '455663ab-bc3b-4674-9769-7428c85918c3',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [860, 320],
					},
					{
						parameters: {},
						id: 'ffc0d327-5cbc-4cf3-8fb0-77c087b391c1',
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1180, 420],
					},
					{
						parameters: {},
						id: '9a5b13a4-eba1-4a18-a4c6-36bedb07d975',
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1500, 600],
					},
					{
						parameters: {},
						id: '89a78e50-2ec6-48bf-be5f-3838600cd08a',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [-20, 700],
					},
				],
				connections: {
					Set: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
							[
								{
									node: 'Merge',
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
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Merge',
									type: 'main',
									index: 1,
								},
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'IF1',
				'Set1',
				'IF1',
				'Set1',
				'IF1',
				'Set',
				'IF',
				'Merge1',
				'Set',
				'IF',
				'Merge1',
				'Set',
				'IF',
				'Merge',
				'Merge2',
				'Merge2',
			],
			nodeData: {
				Start: [[{}]],
				Set1: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[
						{
							counter: 3,
						},
					],
				],
				Set: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[
						{
							counter: 3,
						},
					],
				],
				IF1: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[],
				],
				IF: [
					[
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
					],
					[],
				],
				Merge1: [
					[
						{
							counter: 1,
						},
						{
							counter: 1,
						},
					],
					[
						{
							counter: 2,
						},
						{
							counter: 2,
						},
					],
				],
				Merge: [
					[
						{
							counter: 3,
						},
						{},
					],
				],
				Merge2: [
					[
						{
							counter: 1,
						},
						{
							counter: 1,
						},
						{
							counter: 3,
						},
						{},
					],
					[
						{
							counter: 2,
						},
						{
							counter: 2,
						},
					],
				],
			},
		},
	},
	{
		description: 'should run keep on executing even if data from input 1 is missing',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {},
						id: '9c0cb647-5d60-40dc-b791-4946ee260a5d',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [180, 240],
					},
					{
						parameters: {
							values: {
								string: [
									{
										name: 'test',
										value: 'a',
									},
								],
							},
							options: {},
						},
						id: '2bed3b26-0907-465b-a416-9dc993c2e302',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 240],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: 'eca22a12-fb0c-4a4f-ab97-74544c178714',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 240],
					},
					{
						parameters: {},
						id: '8d63caea-8d89-450e-87ae-6097b9821a70',
						name: 'NoOp',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [860, 160],
					},
					{
						parameters: {},
						id: 'bd0e79e4-7b7a-4016-ace3-6f54f46b41c3',
						name: 'NoOp1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [860, 300],
					},
					{
						parameters: {},
						id: '975966f6-8e59-41d8-a69e-7223476a7c50',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1140, 220],
					},
				],
				connections: {
					Start: {
						main: [
							[
								{
									node: 'Set',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Set: {
						main: [
							[
								{
									node: 'IF',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF: {
						main: [
							[
								{
									node: 'NoOp',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'NoOp1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					NoOp: {
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
					NoOp1: {
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
				},
			},
		},
		output: {
			nodeExecutionOrder: ['Start', 'Set', 'IF', 'NoOp1', 'Merge'],
			nodeData: {
				Merge: [
					[
						{
							test: 'a',
						},
					],
				],
			},
		},
	},
	{
		description:
			'should run complicated multi node workflow where multiple Merge-Node have missing data and complex dependency structure',
		input: {
			workflowData: {
				nodes: [
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: '21593a8c-07c1-435b-93a6-75317ee3bf67',
						name: 'IF4',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [880, 1240],
					},
					{
						parameters: {},
						id: 'a9af6b9f-011c-4b34-a367-0cfa5ad4c865',
						name: 'NoOp2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [1320, 1060],
					},
					{
						parameters: {},
						id: '429d1a51-65f0-4701-af76-b73611774952',
						name: 'Merge3',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1100, 1060],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: 'ed08db0f-f747-4f87-af62-051fc53f955c',
						name: 'IF3',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 1060],
					},
					{
						parameters: {},
						id: 'e80d2aac-cbd4-4e7c-9817-83db52a617d4',
						name: 'Merge2',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [940, 900],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'a',
									},
								],
							},
						},
						id: '766dad6b-4326-41b5-a02a-0b3b7d879eb4',
						name: 'IF2',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 900],
					},
					{
						parameters: {},
						id: '0c0cd5bb-eb44-48fe-b66a-54a3c541ea57',
						name: 'Merge7',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [2180, 1180],
					},
					{
						parameters: {},
						id: '863a00e5-7be4-43f3-97da-07cf552d7c0e',
						name: 'Merge6',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1840, 1200],
					},
					{
						parameters: {},
						id: '8855d0ca-1deb-4ad8-958b-2379d3a87160',
						name: 'Merge5',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1600, 1040],
					},
					{
						parameters: {},
						id: 'ea37e388-c77a-4a2f-a527-4585f24371d5',
						name: 'Merge4',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [1180, 880],
					},
					{
						parameters: {},
						id: 'e3c814e9-9a92-4e12-96d5-85634fe76dc9',
						name: 'Merge1',
						type: 'n8n-nodes-base.merge',
						typeVersion: 2,
						position: [940, 720],
					},
					{
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json["test"] }}',
										value2: 'b',
									},
								],
							},
						},
						id: 'a21a3932-8a3f-464f-8393-309d3233433a',
						name: 'IF1',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [620, 720],
					},
					{
						parameters: {
							values: {
								string: [
									{
										name: 'test',
										value: 'a',
									},
								],
							},
							options: {},
						},
						id: '12d33a38-baeb-41de-aea0-d8a7477f5aa6',
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [400, 720],
					},
					{
						parameters: {},
						id: '41589b0b-0521-41ae-b0c6-80a016af803e',
						name: 'Start',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [160, 240],
					},
				],
				connections: {
					IF4: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 1,
								},
							],
							[
								{
									node: 'Merge6',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					NoOp2: {
						main: [
							[
								{
									node: 'Merge5',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge3: {
						main: [
							[
								{
									node: 'NoOp2',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF3: {
						main: [
							[
								{
									node: 'Merge3',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'IF4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge2: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					IF2: {
						main: [
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge2',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge6: {
						main: [
							[
								{
									node: 'Merge7',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Merge5: {
						main: [
							[
								{
									node: 'Merge6',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge4: {
						main: [
							[
								{
									node: 'Merge5',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Merge1: {
						main: [
							[
								{
									node: 'Merge4',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					IF1: {
						main: [
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 0,
								},
							],
							[
								{
									node: 'Merge1',
									type: 'main',
									index: 1,
								},
							],
						],
					},
					Set1: {
						main: [
							[
								{
									node: 'IF1',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF2',
									type: 'main',
									index: 0,
								},
								{
									node: 'IF3',
									type: 'main',
									index: 0,
								},
							],
						],
					},
					Start: {
						main: [
							[
								{
									node: 'Set1',
									type: 'main',
									index: 0,
								},
							],
						],
					},
				},
			},
		},
		output: {
			nodeExecutionOrder: [
				'Start',
				'Set1',
				'IF1',
				'IF2',
				'IF3',
				'IF4',
				'Merge1',
				'Merge2',
				'Merge4',
				'Merge5',
				'Merge6',
				'Merge7',
			],
			nodeData: {
				Merge1: [
					[
						{
							test: 'a',
						},
					],
				],
				Merge2: [
					[
						{
							test: 'a',
						},
					],
				],
				Merge4: [
					[
						{
							test: 'a',
						},
						{
							test: 'a',
						},
					],
				],
				Merge5: [
					[
						{
							test: 'a',
						},
						{
							test: 'a',
						},
					],
				],
				Merge6: [
					[
						{
							test: 'a',
						},
						{
							test: 'a',
						},
						{
							test: 'a',
						},
					],
				],
				Merge7: [
					[
						{
							test: 'a',
						},
						{
							test: 'a',
						},
						{
							test: 'a',
						},
					],
				],
			},
		},
	},
];
