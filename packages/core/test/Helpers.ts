import { set } from 'lodash';

import {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IRun,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowHooks,
} from 'n8n-workflow';

import {
	Credentials,
	IDeferredPromise,
	IExecuteFunctions,
} from '../src';


export class CredentialsHelper extends ICredentialsHelper {
	getDecrypted(name: string, type: string): ICredentialDataDecryptedObject {
		return {};
	}

	getCredentials(name: string, type: string): Credentials {
		return new Credentials('', '', [], '');
	}

	async updateCredentials(name: string, type: string, data: ICredentialDataDecryptedObject): Promise<void> {}
}


class NodeTypesClass implements INodeTypes {

	nodeTypes: INodeTypeData = {
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
									description: 'Combines data of both inputs. The output will contain items of input 1 and input 2.',
								},
								{
									name: 'Pass-through',
									value: 'passThrough',
									description: 'Passes through data of one input. The output will conain only items of the defined input.',
								},
								{
									name: 'Wait',
									value: 'wait',
									description: 'Waits till data of both inputs is available and will then output a single empty item.',
								},
							],
							default: 'append',
							description: 'How data should be merged. If it should simply<br />be appended or merged depending on a property.',
						},
						{
							displayName: 'Output Data',
							name: 'output',
							type: 'options',
							displayOptions: {
								show: {
									mode: [
										'passThrough',
									],
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
							description: 'If only the values set on this node should be<br />kept and all others removed.',
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
									name: 'number',
									displayName: 'Number',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											description: 'Name of the property to write data to.<br />Supports dot-notation.<br />Example: "data.person[0].name"',
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
							],
						},
					],
				},
				execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
					const items = this.getInputData();

					const returnData: INodeExecutionData[] = [];
					let item: INodeExecutionData;
					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						item = items[itemIndex];

						const newItem: INodeExecutionData = {
							json: JSON.parse(JSON.stringify(item.json)),
						};

						// Add number values
						(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach((setItem) => {
							set(newItem.json, setItem.name as string, setItem.value);
						});

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
				execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
					const items = this.getInputData();

					return this.prepareOutputData(items);
				},
			},
		},
	};

	async init(nodeTypes: INodeTypeData): Promise<void> { }

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	getByName(nodeType: string): INodeType {
		return this.nodeTypes[nodeType].type;
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;


export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
		nodeTypesInstance.init({});
	}

	return nodeTypesInstance;
}


export function WorkflowExecuteAdditionalData(waitPromise: IDeferredPromise<IRun>, nodeExecutionOrder: string[]): IWorkflowExecuteAdditionalData {
	const hookFunctions = {
		nodeExecuteAfter: [
			async (nodeName: string, data: ITaskData): Promise<void> => {
				nodeExecutionOrder.push(nodeName);
			},
		],
		workflowExecuteAfter: [
			async (fullRunData: IRun): Promise<void> => {
				waitPromise.resolve(fullRunData);
			},
		],
	};

	const workflowData: IWorkflowBase = {
		name: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		active: true,
		nodes: [],
		connections: {},
	};

	return {
		credentials: {},
		credentialsHelper: new CredentialsHelper({}, ''),
		hooks: new WorkflowHooks(hookFunctions, 'trigger', '1', workflowData),
		executeWorkflow: async (workflowInfo: IExecuteWorkflowInfo): Promise<any> => {}, // tslint:disable-line:no-any
		restApiUrl: '',
		encryptionKey: 'test',
		timezone: 'America/New_York',
		webhookBaseUrl: 'webhook',
		webhookTestBaseUrl: 'webhook-test',
	};
}
