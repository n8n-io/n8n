import { get } from 'lodash';

import { IExecuteFunctions } from 'n8n-core';
import {
	GenericValue,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

export class Merge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Merge',
		name: 'merge',
		icon: 'fa:code-branch',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"]}}',
		description: 'Merges data of multiple streams once data from both is available',
		defaults: {
			name: 'Merge',
			color: '#00bbcc',
		},
		inputs: ['main', 'main'],
		outputs: ['main'],
		inputNames: ['Input 1', 'Input 2'],
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
						name: 'Keep Key Matches',
						value: 'keepKeyMatches',
						description: 'Keeps data of input 1 if it does find a match with data of input 2',
					},
					{
						name: 'Merge By Index',
						value: 'mergeByIndex',
						description:
							'Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on the index of the items. So first item of input 1 will be merged with first item of input 2 and so on.',
					},
					{
						name: 'Merge By Key',
						value: 'mergeByKey',
						description:
							'Merges data of both inputs. The output will contain items of input 1 merged with data of input 2. Merge happens depending on a defined key.',
					},
					{
						name: 'Multiplex',
						value: 'multiplex',
						description:
							'Merges each value of one input with each value of the other input. The output will contain (m * n) items where (m) and (n) are lengths of the inputs.',
					},
					{
						name: 'Pass-Through',
						value: 'passThrough',
						description:
							'Passes through data of one input. The output will contain only items of the defined input.',
					},
					{
						name: 'Remove Key Matches',
						value: 'removeKeyMatches',
						description: 'Keeps data of input 1 if it does NOT find match with data of input 2',
					},
					{
						name: 'Wait',
						value: 'wait',
						description:
							'Waits till data of both inputs is available and will then output a single empty item. Source Nodes must connect to both Input 1 and 2. This node only supports 2 Sources, if you need more Sources, connect multiple Merge nodes in series. This node will not output any data.',
					},
				],
				default: 'append',
				description: 'How data of branches should be merged',
			},
			{
				displayName: 'Join',
				name: 'join',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['mergeByIndex'],
					},
				},
				options: [
					{
						name: 'Inner Join',
						value: 'inner',
						description:
							'Merges as many items as both inputs contain. (Example: Input1 = 5 items, Input2 = 3 items | Output will contain 3 items).',
					},
					{
						name: 'Left Join',
						value: 'left',
						description:
							'Merges as many items as first input contains. (Example: Input1 = 3 items, Input2 = 5 items | Output will contain 3 items).',
					},
					{
						name: 'Outer Join',
						value: 'outer',
						description:
							'Merges as many items as input contains with most items. (Example: Input1 = 3 items, Input2 = 5 items | Output will contain 5 items).',
					},
				],
				default: 'left',
				description:
					'How many items the output will contain if inputs contain different amount of items',
			},
			{
				displayName: 'Property Input 1',
				name: 'propertyName1',
				type: 'string',
				default: '',
				hint: 'The name of the field as text (e.g. “id”)',
				required: true,
				displayOptions: {
					show: {
						mode: ['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'],
					},
				},
				description: 'Name of property which decides which items to merge of input 1',
			},
			{
				displayName: 'Property Input 2',
				name: 'propertyName2',
				type: 'string',
				default: '',
				hint: 'The name of the field as text (e.g. “id”)',
				required: true,
				displayOptions: {
					show: {
						mode: ['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'],
					},
				},
				description: 'Name of property which decides which items to merge of input 2',
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
				description: 'Defines of which input the data should be used as output of node',
			},
			{
				displayName: 'Overwrite',
				name: 'overwrite',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['mergeByKey'],
					},
				},
				options: [
					{
						name: 'Always',
						value: 'always',
						description: 'Always overwrites everything',
					},
					{
						name: 'If Blank',
						value: 'blank',
						description: 'Overwrites only values of "null", "undefined" or empty string',
					},
					{
						name: 'If Missing',
						value: 'undefined',
						description: 'Only adds values which do not exist yet',
					},
				],
				default: 'always',
				description: 'Select when to overwrite the values from Input1 with values from Input 2',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode === 'append') {
			// Simply appends the data
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		} else if (mode === 'mergeByIndex') {
			// Merges data by index

			const join = this.getNodeParameter('join', 0) as string;

			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (dataInput1 === undefined || dataInput1.length === 0) {
				if (['inner', 'left'].includes(join)) {
					// When "inner" or "left" join return empty if first
					// input does not contain any items
					return [returnData];
				}

				// For "outer" return data of second input
				return [dataInput2];
			}

			if (dataInput2 === undefined || dataInput2.length === 0) {
				if (['left', 'outer'].includes(join)) {
					// When "left" or "outer" join return data of first input
					return [dataInput1];
				}

				// For "inner" return empty
				return [returnData];
			}

			// Default "left"
			let numEntries = dataInput1.length;
			if (join === 'inner') {
				numEntries = Math.min(dataInput1.length, dataInput2.length);
			} else if (join === 'outer') {
				numEntries = Math.max(dataInput1.length, dataInput2.length);
			}

			let newItem: INodeExecutionData;
			for (let i = 0; i < numEntries; i++) {
				if (i >= dataInput1.length) {
					returnData.push(dataInput2[i]);
					continue;
				}
				if (i >= dataInput2.length) {
					returnData.push(dataInput1[i]);
					continue;
				}

				newItem = {
					json: {},
					pairedItem: [
						dataInput1[i].pairedItem as IPairedItemData,
						dataInput2[i].pairedItem as IPairedItemData,
					],
				};

				if (dataInput1[i].binary !== undefined) {
					newItem.binary = {};
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, dataInput1[i].binary);
				}

				// Create also a shallow copy of the json data
				Object.assign(newItem.json, dataInput1[i].json);

				// Copy json data
				for (const key of Object.keys(dataInput2[i].json)) {
					newItem.json[key] = dataInput2[i].json[key];
				}

				// Copy binary data
				if (dataInput2[i].binary !== undefined) {
					if (newItem.binary === undefined) {
						newItem.binary = {};
					}

					for (const key of Object.keys(dataInput2[i].binary!)) {
						newItem.binary[key] = dataInput2[i].binary![key] ?? newItem.binary[key];
					}
				}

				returnData.push(newItem);
			}
		} else if (mode === 'multiplex') {
			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (!dataInput1 || !dataInput2) {
				return [returnData];
			}

			let entry1: INodeExecutionData;
			let entry2: INodeExecutionData;

			for (entry1 of dataInput1) {
				for (entry2 of dataInput2) {
					returnData.push({
						json: {
							...entry1.json,
							...entry2.json,
						},
						pairedItem: [
							entry1.pairedItem as IPairedItemData,
							entry2.pairedItem as IPairedItemData,
						],
					});
				}
			}
			return [returnData];
		} else if (['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'].includes(mode)) {
			const dataInput1 = this.getInputData(0);
			if (!dataInput1) {
				// If it has no input data from first input return nothing
				return [returnData];
			}

			const propertyName1 = this.getNodeParameter('propertyName1', 0) as string;
			const propertyName2 = this.getNodeParameter('propertyName2', 0) as string;
			const overwrite = this.getNodeParameter('overwrite', 0, 'always') as string;

			const dataInput2 = this.getInputData(1);
			if (!dataInput2 || !propertyName1 || !propertyName2) {
				// Second input does not have any data or the property names are not defined
				if (mode === 'keepKeyMatches') {
					// For "keepKeyMatches" return nothing
					return [returnData];
				}

				// For "mergeByKey" and "removeKeyMatches" return the data from the first input
				return [dataInput1];
			}

			// Get the data to copy
			const copyData: {
				[key: string]: INodeExecutionData;
			} = {};
			let entry: INodeExecutionData;
			for (entry of dataInput2) {
				const key = get(entry.json, propertyName2);
				if (!entry.json || !key) {
					// Entry does not have the property so skip it
					continue;
				}

				copyData[key as string] = entry;
			}

			// Copy data on entries or add matching entries
			let referenceValue: GenericValue;
			let key: string;
			for (entry of dataInput1) {
				referenceValue = get(entry.json, propertyName1);

				if (referenceValue === undefined) {
					// Entry does not have the property

					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" add item
						returnData.push(entry);
					}

					// For "mergeByKey" and "keepKeyMatches" skip item
					continue;
				}

				if (!['string', 'number'].includes(typeof referenceValue)) {
					if (referenceValue !== null && referenceValue.constructor.name !== 'Data') {
						// Reference value is not of comparable type

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}
				}

				if (typeof referenceValue === 'number') {
					referenceValue = referenceValue.toString();
				} else if (referenceValue !== null && referenceValue.constructor.name === 'Date') {
					referenceValue = (referenceValue as Date).toISOString();
				}

				if (copyData.hasOwnProperty(referenceValue as string)) {
					// Item with reference value got found

					if (['null', 'undefined'].includes(typeof referenceValue)) {
						// The reference value is null or undefined

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}

					// Match exists
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can skip the item as it has a match
						continue;
					} else if (mode === 'mergeByKey') {
						// Copy the entry as the data gets changed
						entry = JSON.parse(JSON.stringify(entry));

						for (key of Object.keys(copyData[referenceValue as string].json)) {
							if (key === propertyName2) {
								continue;
							}

							// TODO: Currently only copies json data and no binary one
							const value = copyData[referenceValue as string].json[key];
							if (
								overwrite === 'always' ||
								(overwrite === 'undefined' && !entry.json.hasOwnProperty(key)) ||
								(overwrite === 'blank' && [null, undefined, ''].includes(entry.json[key] as string))
							) {
								entry.json[key] = value;
							}
						}
					} else {
						// For "keepKeyMatches" we add it as it is
						returnData.push(entry);
						continue;
					}
				} else {
					// No item for reference value got found
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can add it if not match got found
						returnData.push(entry);
						continue;
					}
				}

				if (mode === 'mergeByKey') {
					// For "mergeByKey" we always add the entry anyway but then the unchanged one
					returnData.push(entry);
				}
			}

			return [returnData];
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
	}
}
