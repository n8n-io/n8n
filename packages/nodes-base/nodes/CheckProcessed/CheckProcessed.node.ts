import {
	ICheckProcessedOutput,
	IExecuteFunctions,
	ProcessedDataContext,
	ProcessedDataMode,
} from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class CheckProcessed implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Check Processed',
		name: 'checkProcessed',
		icon: 'fa:pen',
		group: ['input'],
		version: 1,
		description: 'Checks if data got already processed',
		defaults: {
			name: 'CheckProcessed',
			color: '#0000FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a processed value',
					},
					{
						name: 'Filter Out',
						value: 'filterOut',
						description: 'Filter out processed items',
					},
					{
						name: 'Remove',
						value: 'remove',
						description: 'Remove a processed value',
					},
				],
				default: 'filterOut',
			},
			{
				displayName: 'Check Mode',
				name: 'checkMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Entries',
						value: 'entries',
					},
					{
						name: 'Latest',
						value: 'latest',
					},
				],
				default: 'latest',
			},
			{
				displayName: 'Check Value',
				name: 'checkValue',
				type: 'string',
				default: '',
				description: 'The value to check if it got processed already',
			},
			{
				displayName: 'Add Processed Value',
				name: 'addProcessedValue',
				type: 'boolean',
				noDataExpression: true,
				displayOptions: {
					show: {
						mode: ['filterOut'],
					},
				},
				default: true,
				description: 'Whether the previously unprocessed value should be recorded as processed',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Node',
						value: 'node',
					},
					{
						name: 'Workflow',
						value: 'workflow',
					},
				],
				default: 'workflow',
			},
			{
				displayName: 'Max Entries',
				name: 'maxEntries',
				type: 'number',
				noDataExpression: true,
				displayOptions: {
					show: {
						mode: ['add', 'filterOut'],
						checkMode: ['entries'],
					},
				},
				default: 50,
				description: 'How many entries will be saved max',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as string;
		const checkMode = this.getNodeParameter('checkMode', 0) as ProcessedDataMode;
		const context = this.getNodeParameter('context', 0, 'workflow') as ProcessedDataContext;

		if (!['node', 'workflow'].includes(context)) {
			throw new NodeOperationError(
				this.getNode(),
				`The context '${context}' is not supported. Please select either "node" or "workflow".`,
			);
		}

		const node = this.getNode();
		console.log('\nEXECUTE NODE: ', node.name);

		let checkValue: string;
		const itemMapping: {
			[key: string]: INodeExecutionData[];
		} = {};

		let returnData: INodeExecutionData[];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			checkValue = this.getNodeParameter('checkValue', itemIndex, '')?.toString() || '';
			if (itemMapping[checkValue]) {
				itemMapping[checkValue].push(items[itemIndex]);
			} else {
				itemMapping[checkValue] = [items[itemIndex]];
			}
			// TODO: Add continueOnFail, where should it and up?
		}

		if (mode === 'add') {
			const maxEntries = this.getNodeParameter('maxEntries', 0) as number;
			await this.helpers.checkProcessedAndRecord(Object.keys(itemMapping), context, {
				mode: checkMode,
				maxEntries,
			});
			return [items];
		} else if (mode === 'remove') {
			await this.helpers.removeProcessed(Object.keys(itemMapping), context);
			return [items];
		} else {
			// mode: filterOut
			const maxEntries = this.getNodeParameter('maxEntries', 0) as number;
			const addProcessedValue = this.getNodeParameter('addProcessedValue', 0) as string;

			let itemsProcessed: ICheckProcessedOutput;
			if (addProcessedValue) {
				itemsProcessed = await this.helpers.checkProcessedAndRecord(
					Object.keys(itemMapping),
					context,
					{ mode: checkMode, maxEntries },
				);
			} else {
				itemsProcessed = await this.helpers.checkProcessed(Object.keys(itemMapping), context);
			}

			returnData = itemsProcessed.new
				.map((key) => {
					return itemMapping[key];
				})
				.flat();

			return [returnData];
		}
	}
}
