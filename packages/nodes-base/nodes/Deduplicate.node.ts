import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeParameterValue,
} from 'n8n-workflow';

function deterministicStringify<T>(value: T): string {
	const sortObj = <T>(obj: T): T  => (
		  obj === null || typeof obj !== 'object'
		  ? obj
		  : Array.isArray(obj)
		  ? obj.map(sortObj)
		  : Object.assign({}, 
					...Object.entries(obj)
					  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
					  .map(([k, v]) => ({ [k]: sortObj(v) }),
					  ))
	);
	return JSON.stringify(sortObj(value));
}


export class Deduplicate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Deduplicate',
		name: 'deduplicate',
		icon: 'fa:clone',
		group: ['transform'],
		version: 1,
		description: 'Deduplicate items passed through',
		subtitle: 'unique({{$parameter["mode"]}})',
		defaults: {
			name: 'Deduplicate',
			description: 'Deduplicates items',
			color: '#506000',
		},
		inputs: ['main'],
		outputs: ['main'],
		outputNames: ['deduped'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Unique expression',
						value: 'uniqueexpr',
						description: 'Dedupe based on some unique identifier',
					},
					{
						name: 'Timestamp sorting',
						value: 'timestamp',
						description: 'Dedupe based on a timestamp field',
					},
					{
						name: 'Hash of JSON',
						value: 'json',
						description: 'Simple but potentially expensive hash of whole item',
					},
				],
				default: 'uniqueexpr',
				description: 'How data should be deduplicated',
			},


			// ----------------------------------
			//         mode:uniqueexpr
			// ----------------------------------
			{
				displayName: 'Unique expression',
				name: 'field',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'uniqueexpr',
						],
					},
				},
				default: '',
				description: 'The expression to identify items by',
			},
			// ----------------------------------
			//         mode:timestamp
			// ----------------------------------
			{
				displayName: 'Timestamp',
				name: 'field',
				type: 'dateTime',
				displayOptions: {
					show: {
						mode: [
							'timestamp',
						],
					},
				},
				default: 0,
				description: 'The timestamp expression in the item to dedupe by',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[][] = [
			[],
		];

		// Converts the input data of a dateTime into a number for easy compare
		const convertDateTime = (value: NodeParameterValue): number => {
			let returnValue: number | undefined = undefined;
			if (typeof value === 'string') {
				returnValue = new Date(value).getTime();
			} else if (typeof value === 'number') {
				returnValue = value;
			} if ((value as unknown as object) instanceof Date) {
				returnValue = (value as unknown as Date).getTime();
			}
		
			if (returnValue === undefined || isNaN(returnValue)) {
				throw new NodeOperationError(this.getNode(), `The value "${value}" is not a valid DateTime.`);
			}
		
			return returnValue;
		};

		const items = this.getInputData();

		let item: INodeExecutionData;
		let tsField: NodeParameterValue;

		const checkIndexRange = (index: number) => {
			if (index < 0 || index >= returnData.length) {
				throw new NodeOperationError(this.getNode(), `The ouput ${index} is not allowed. It has to be between 0 and ${returnData.length - 1}!`);
			}
		};

		const staticData = this.getWorkflowStaticData('node');
		const mode = this.getNodeParameter('mode', 0) as string;
		if (mode === 'uniqueexpr') {
			staticData.seenVals = staticData.seenVals || new Set();
		}
		const seenVals = staticData.seenVals as Set<string>;
		// Iterate over all items to check to which output they should be routed to
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {

				item = items[itemIndex];

				if (mode === 'uniqueexpr' || mode === 'json') {
					const val = mode === 'uniqueexpr' ? this.getNodeParameter('field', itemIndex) as string : deterministicStringify(item);
					if (seenVals.has(val)) {
						continue;
					} else {
						seenVals.add(val);
						returnData[0].push(item);
					}
				} else if (mode === 'timestamp') {
					tsField = convertDateTime(this.getNodeParameter('field', itemIndex) as NodeParameterValue);
					if (staticData.lastTs && staticData.lastTs > tsField) {
						continue;
					} else {
						staticData.lastTs = tsField;
						returnData[0].push(item);
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}
}
