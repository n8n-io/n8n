import type { IConnections, INode, IRun } from 'n8n-workflow';
import { createDeferredPromise, Workflow } from 'n8n-workflow';
import { WorkflowExecute } from '@/WorkflowExecute';

import * as Helpers from './Helpers';
import { initLogger } from './utils';

describe('WorkflowExecute', () => {
	beforeAll(() => {
		initLogger();
	});

	describe('run', () => {
		const tests: Array<{
			description: string;
			input: {
				workflowData: {
					nodes: INode[];
					connections: IConnections;
				};
			};
			output: {
				nodeExecutionOrder: string[];
				nodeData: {
					[key: string]: any[][];
				};
			};
		}> = [
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
					'should run workflow also if node has multiple input connections and one is empty',
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
				description:
					'should use empty data if input of sibling does not receive any data from parent',
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
				description: 'should execute nodes in the correct order, the most top-left one first',
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: 'e54a3b2d-2c4c-49ce-a848-ef24edc9ace5',
								name: 'Start',
								type: 'n8n-nodes-base.start',
								typeVersion: 1,
								position: [700, 400],
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '06067cb5-ff05-419e-8856-63c00d0898d5',
								name: 'Wait',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1140, 200],
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
								id: '619c674c-db46-4857-8452-ecc50507bbe2',
								name: 'Set',
								type: 'n8n-nodes-base.set',
								typeVersion: 2,
								position: [880, 400],
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '5e12bc05-f8e6-4bda-adc6-8673e29d40e4',
								name: 'Wait1',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1140, 580],
								webhookId: '35ceb27a-3fb1-47a9-8678-2df16dcecbcb',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '9edd3617-7fb9-4fb2-951f-c1829a59d5c9',
								name: 'Wait2',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1340, 200],
								webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '1da12a45-1f4d-40ca-a3ae-dc39857807db',
								name: 'Wait3',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1700, 200],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'be500276-f45f-406c-92d0-36e2d97cddc1',
								name: 'Wait4',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1340, 580],
								webhookId: 'cc8e2fd2-afc8-4a17-afda-fda943f4bd83',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'b8aeaaa3-deb9-4d56-9622-5b8375d4d3cd',
								name: 'Wait5',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1540, 580],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '0232d87d-b8ed-46c9-b6c5-d73458c50850',
								name: 'Wait6',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1160, -20],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '37858cc0-ab60-41ad-a99c-5b0f7a32a430',
								name: 'Wait7',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1460, -20],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '0adbee99-f590-4d45-9727-f09d3ae95200',
								name: 'Wait8',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1140, 380],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'c013966b-77a2-411d-bff7-9a15f8acae78',
								name: 'Wait9',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1440, 360],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'a84a870a-4d9e-4d39-87a0-ecddfb33d9e0',
								name: 'Wait10',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [2060, 120],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'f03a419c-85d1-45d2-a5a7-2cb7b2cf42fd',
								name: 'Wait11',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [2060, 320],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '7065e27e-d82c-41da-a820-75aed1b68ae3',
								name: 'Wait12',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [2320, 120],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: '245b7d38-435c-4c97-b328-f4e6932485d6',
								name: 'Wait13',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1640, 360],
								webhookId: '35400ecf-3e53-4b2d-9fd7-2663bbfd830f',
							},
							{
								parameters: {},
								id: 'df76a874-c51f-4619-ba6e-b1e1abdeb336',
								name: 'Merge',
								type: 'n8n-nodes-base.merge',
								typeVersion: 2.1,
								position: [1700, 0],
							},
							{
								parameters: {
									amount: "={{ $('Set').item.json.wait }}",
									unit: 'seconds',
								},
								id: 'ad8e52ab-46fa-43a0-bf80-8d7c96ee354b',
								name: 'Wait14',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [1920, 0],
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
		];

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise();

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new Error(`Data for node "${nodeName}" is missing!`);
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});

					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});
});
