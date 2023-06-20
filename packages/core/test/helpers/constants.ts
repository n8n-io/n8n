import set from 'lodash/set';

import type {
	INodeExecutionData,
	INodeParameters,
	INodeTypeData,
	NodeParameterValue,
	WorkflowTestData,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import type { IExecuteFunctions } from '@/Interfaces';

export const predefinedNodesTypes: INodeTypeData = {
	'n8n-nodes-base.if': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'If',
				name: 'if',
				group: ['transform'],
				version: 1,
				description: 'Splits a stream depending on defined compare operations.',
				defaults: {
					name: 'IF',
					color: '#408000',
				},
				inputs: ['main'],
				outputs: ['main', 'main'],
				properties: [
					{
						displayName: 'Conditions',
						name: 'conditions',
						placeholder: 'Add Condition',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						description: 'The type of values to compare.',
						default: {},
						options: [
							{
								name: 'boolean',
								displayName: 'Boolean',
								values: [
									{
										displayName: 'Value 1',
										name: 'value1',
										type: 'boolean',
										default: false,
										description: 'The value to compare with the second one.',
									},
									{
										displayName: 'Operation',
										name: 'operation',
										type: 'options',
										options: [
											{
												name: 'Equal',
												value: 'equal',
											},
											{
												name: 'Not Equal',
												value: 'notEqual',
											},
										],
										default: 'equal',
										description: 'Operation to decide where the the data should be mapped to.',
									},
									{
										displayName: 'Value 2',
										name: 'value2',
										type: 'boolean',
										default: false,
										description: 'The value to compare with the first one.',
									},
								],
							},
							{
								name: 'number',
								displayName: 'Number',
								values: [
									{
										displayName: 'Value 1',
										name: 'value1',
										type: 'number',
										default: 0,
										description: 'The value to compare with the second one.',
									},
									{
										displayName: 'Operation',
										name: 'operation',
										type: 'options',
										options: [
											{
												name: 'Smaller',
												value: 'smaller',
											},
											{
												name: 'Smaller Equal',
												value: 'smallerEqual',
											},
											{
												name: 'Equal',
												value: 'equal',
											},
											{
												name: 'Not Equal',
												value: 'notEqual',
											},
											{
												name: 'Larger',
												value: 'larger',
											},
											{
												name: 'Larger Equal',
												value: 'largerEqual',
											},
											{
												name: 'Is Empty',
												value: 'isEmpty',
											},
										],
										default: 'smaller',
										description: 'Operation to decide where the the data should be mapped to.',
									},
									{
										displayName: 'Value 2',
										name: 'value2',
										type: 'number',
										displayOptions: {
											hide: {
												operation: ['isEmpty'],
											},
										},
										default: 0,
										description: 'The value to compare with the first one.',
									},
								],
							},
							{
								name: 'string',
								displayName: 'String',
								values: [
									{
										displayName: 'Value 1',
										name: 'value1',
										type: 'string',
										default: '',
										description: 'The value to compare with the second one.',
									},
									{
										displayName: 'Operation',
										name: 'operation',
										type: 'options',
										options: [
											{
												name: 'Contains',
												value: 'contains',
											},
											{
												name: 'Ends With',
												value: 'endsWith',
											},
											{
												name: 'Equal',
												value: 'equal',
											},
											{
												name: 'Not Contains',
												value: 'notContains',
											},
											{
												name: 'Not Equal',
												value: 'notEqual',
											},
											{
												name: 'Regex',
												value: 'regex',
											},
											{
												name: 'Starts With',
												value: 'startsWith',
											},
											{
												name: 'Is Empty',
												value: 'isEmpty',
											},
										],
										default: 'equal',
										description: 'Operation to decide where the the data should be mapped to.',
									},
									{
										displayName: 'Value 2',
										name: 'value2',
										type: 'string',
										displayOptions: {
											hide: {
												operation: ['isEmpty', 'regex'],
											},
										},
										default: '',
										description: 'The value to compare with the first one.',
									},
									{
										displayName: 'Regex',
										name: 'value2',
										type: 'string',
										displayOptions: {
											show: {
												operation: ['regex'],
											},
										},
										default: '',
										placeholder: '/text/i',
										description: 'The regex which has to match.',
									},
								],
							},
						],
					},
					{
						displayName: 'Combine',
						name: 'combineOperation',
						type: 'options',
						options: [
							{
								name: 'ALL',
								description: 'Only if all conditions are met it goes into "true" branch.',
								value: 'all',
							},
							{
								name: 'ANY',
								description: 'If any of the conditions is met it goes into "true" branch.',
								value: 'any',
							},
						],
						default: 'all',
						description:
							'If multiple rules got set this settings decides if it is true as soon as ANY condition matches or only if ALL get meet.',
					},
				],
			},
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const returnDataTrue: INodeExecutionData[] = [];
				const returnDataFalse: INodeExecutionData[] = [];

				const items = this.getInputData();

				let item: INodeExecutionData;
				let combineOperation: string;

				// The compare operations
				const compareOperationFunctions: {
					[key: string]: (value1: NodeParameterValue, value2: NodeParameterValue) => boolean;
				} = {
					contains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 || '').toString().includes((value2 || '').toString()),
					notContains: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						!(value1 || '').toString().includes((value2 || '').toString()),
					endsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 as string).endsWith(value2 as string),
					equal: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 === value2,
					notEqual: (value1: NodeParameterValue, value2: NodeParameterValue) => value1 !== value2,
					larger: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 || 0) > (value2 || 0),
					largerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 || 0) >= (value2 || 0),
					smaller: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 || 0) < (value2 || 0),
					smallerEqual: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 || 0) <= (value2 || 0),
					startsWith: (value1: NodeParameterValue, value2: NodeParameterValue) =>
						(value1 as string).startsWith(value2 as string),
					isEmpty: (value1: NodeParameterValue) => [undefined, null, ''].includes(value1 as string),
					regex: (value1: NodeParameterValue, value2: NodeParameterValue) => {
						const regexMatch = (value2 || '').toString().match(new RegExp('^/(.*?)/([gimusy]*)$'));

						let regex: RegExp;
						if (!regexMatch) {
							regex = new RegExp((value2 || '').toString());
						} else if (regexMatch.length === 1) {
							regex = new RegExp(regexMatch[1]);
						} else {
							regex = new RegExp(regexMatch[1], regexMatch[2]);
						}

						return !!(value1 || '').toString().match(regex);
					},
				};

				// The different dataTypes to check the values in
				const dataTypes = ['boolean', 'number', 'string'];

				// Iterate over all items to check which ones should be output as via output "true" and
				// which ones via output "false"
				let dataType: string;
				let compareOperationResult: boolean;
				itemLoop: for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					item = items[itemIndex];

					let compareData: INodeParameters;

					combineOperation = this.getNodeParameter('combineOperation', itemIndex) as string;

					// Check all the values of the different dataTypes
					for (dataType of dataTypes) {
						// Check all the values of the current dataType
						for (compareData of this.getNodeParameter(
							`conditions.${dataType}`,
							itemIndex,
							[],
						) as INodeParameters[]) {
							// Check if the values passes
							compareOperationResult = compareOperationFunctions[compareData.operation as string](
								compareData.value1 as NodeParameterValue,
								compareData.value2 as NodeParameterValue,
							);

							if (compareOperationResult && combineOperation === 'any') {
								// If it passes and the operation is "any" we do not have to check any
								// other ones as it should pass anyway. So go on with the next item.
								returnDataTrue.push(item);
								continue itemLoop;
							} else if (!compareOperationResult && combineOperation === 'all') {
								// If it fails and the operation is "all" we do not have to check any
								// other ones as it should be not pass anyway. So go on with the next item.
								returnDataFalse.push(item);
								continue itemLoop;
							}
						}
					}

					if (combineOperation === 'all') {
						// If the operation is "all" it means the item did match all conditions
						// so it passes.
						returnDataTrue.push(item);
					} else {
						// If the operation is "any" it means the the item did not match any condition.
						returnDataFalse.push(item);
					}
				}

				return [returnDataTrue, returnDataFalse];
			},
		},
	},
	'n8n-nodes-base.merge': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Merge',
				name: 'merge',
				icon: 'fa:clone',
				group: ['transform'],
				version: 1,
				description: 'Merges data of multiple streams once data of both is available',
				defaults: {
					name: 'Merge',
					color: '#00cc22',
				},
				inputs: ['main', 'main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{
								name: 'Append',
								value: 'append',
								description:
									'Combines data of both inputs. The output will contain items of input 1 and input 2.',
							},
							{
								name: 'Pass-through',
								value: 'passThrough',
								description:
									'Passes through data of one input. The output will contain only items of the defined input.',
							},
							{
								name: 'Wait',
								value: 'wait',
								description:
									'Waits till data of both inputs is available and will then output a single empty item.',
							},
						],
						default: 'append',
						description:
							'How data should be merged. If it should simply<br />be appended or merged depending on a property.',
					},
					{
						displayName: 'Output Data',
						name: 'output',
						type: 'options',
						displayOptions: {
							show: {
								mode: ['passThrough'],
							},
						},
						options: [
							{
								name: 'Input 1',
								value: 'input1',
							},
							{
								name: 'Input 2',
								value: 'input2',
							},
						],
						default: 'input1',
						description: 'Defines of which input the data should be used as output of node.',
					},
				],
			},
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				// const itemsInput2 = this.getInputData(1);

				const returnData: INodeExecutionData[] = [];

				const mode = this.getNodeParameter('mode', 0) as string;

				if (mode === 'append') {
					// Simply appends the data
					for (let i = 0; i < 2; i++) {
						returnData.push.apply(returnData, this.getInputData(i));
					}
				} else if (mode === 'passThrough') {
					const output = this.getNodeParameter('output', 0) as string;

					if (output === 'input1') {
						returnData.push.apply(returnData, this.getInputData(0));
					} else {
						returnData.push.apply(returnData, this.getInputData(1));
					}
				} else if (mode === 'wait') {
					returnData.push({ json: {} });
				}

				return [returnData];
			},
		},
	},
	'n8n-nodes-base.noOp': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'No Operation, do nothing',
				name: 'noOp',
				icon: 'fa:arrow-right',
				group: ['organization'],
				version: 1,
				description: 'No Operation',
				defaults: {
					name: 'NoOp',
					color: '#b0b0b0',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			},
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();
				return this.prepareOutputData(items);
			},
		},
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
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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

				return this.prepareOutputData(returnData);
			},
		},
	},
	'n8n-nodes-base.set': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Set',
				name: 'set',
				group: ['input'],
				version: 1,
				description: 'Sets a value',
				defaults: {
					name: 'Set',
					color: '#0000FF',
				},
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Keep Only Set',
						name: 'keepOnlySet',
						type: 'boolean',
						default: false,
						description:
							'If only the values set on this node should be<br />kept and all others removed.',
					},
					{
						displayName: 'Values to Set',
						name: 'values',
						placeholder: 'Add Value',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						description: 'The value to set.',
						default: {},
						options: [
							{
								name: 'boolean',
								displayName: 'Boolean',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: 'propertyName',
										description:
											'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'boolean',
										default: false,
										description: 'The boolean value to write in the property.',
									},
								],
							},
							{
								name: 'number',
								displayName: 'Number',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: 'propertyName',
										description:
											'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'number',
										default: 0,
										description: 'The number value to write in the property.',
									},
								],
							},
							{
								name: 'string',
								displayName: 'String',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: 'propertyName',
										description:
											'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The string value to write in the property.',
									},
								],
							},
						],
					},

					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						placeholder: 'Add Option',
						default: {},
						options: [
							{
								displayName: 'Dot Notation',
								name: 'dotNotation',
								type: 'boolean',
								default: true,
								description:
									'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.</p><p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>',
							},
						],
					},
				],
			},
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();

				if (items.length === 0) {
					items.push({ json: {} });
				}

				const returnData: INodeExecutionData[] = [];

				let item: INodeExecutionData;
				let keepOnlySet: boolean;
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
					item = items[itemIndex];
					const options = this.getNodeParameter('options', itemIndex, {});

					const newItem: INodeExecutionData = {
						json: {},
					};

					if (!keepOnlySet) {
						if (item.binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							newItem.binary = {};
							Object.assign(newItem.binary, item.binary);
						}

						newItem.json = deepCopy(item.json);
					}

					// Add boolean values
					(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach(
						(setItem) => {
							if (options.dotNotation === false) {
								newItem.json[setItem.name as string] = !!setItem.value;
							} else {
								set(newItem.json, setItem.name as string, !!setItem.value);
							}
						},
					);

					// Add number values
					(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach(
						(setItem) => {
							if (options.dotNotation === false) {
								newItem.json[setItem.name as string] = setItem.value;
							} else {
								set(newItem.json, setItem.name as string, setItem.value);
							}
						},
					);

					// Add string values
					(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach(
						(setItem) => {
							if (options.dotNotation === false) {
								newItem.json[setItem.name as string] = setItem.value;
							} else {
								set(newItem.json, setItem.name as string, setItem.value);
							}
						},
					);

					returnData.push(newItem);
				}

				return this.prepareOutputData(returnData);
			},
		},
	},
	'n8n-nodes-base.start': {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Start',
				name: 'start',
				group: ['input'],
				version: 1,
				description: 'Starts the workflow execution from this node',
				defaults: {
					name: 'Start',
					color: '#553399',
				},
				inputs: [],
				outputs: ['main'],
				properties: [],
			},
			async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const items = this.getInputData();

				return this.prepareOutputData(items);
			},
		},
	},
};

export const predefinedWorkflowExecuteTests: WorkflowTestData[] = [
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
];
