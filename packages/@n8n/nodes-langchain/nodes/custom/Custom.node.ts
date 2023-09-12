/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { WikipediaQueryRun } from 'langchain/tools';
import { logWrapper } from '../../utils/logWrapper';

export class Custom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom',
		name: 'custom',
		// icon: 'file:wikipedia.svg',
		group: ['transform'],
		version: 1,
		description: 'Custom LangChain Node',
		defaults: {
			name: 'Custom',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#400080',
		},
		codex: {
			categories: ['AI'],
			// subcategories: {
			// 	AI: ['Tools'],
			// },
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: '={{ $parameter.inputs ? $parameter.inputs.input : [] }}',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: '={{ $parameter.outputs ? $parameter.outputs.output : [] }}',
		properties: [
			{
				displayName: 'Inputs',
				name: 'inputs',
				placeholder: 'Add Input',
				type: 'fixedCollection',
				noDataExpression: true,
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The input to add',
				default: {},
				options: [
					{
						name: 'input',
						displayName: 'Input',
						values: [
							{
								displayName: 'Display Name',
								name: 'displayName',
								type: 'string',
								noDataExpression: true,
								default: '',
								required: true,
								placeholder: 'Memory',
								description: 'The name to display',
							},
							{
								displayName: 'Type',
								name: 'type',
								// TODO: Should not be a string, rather options
								type: 'string',
								noDataExpression: true,
								default: '',
								required: true,
								placeholder: 'memory',
								description: 'The name of the input',
							},
							{
								displayName: 'Required',
								name: 'required',
								type: 'boolean',
								noDataExpression: true,
								default: false,
								required: true,
								description: 'Whether the input needs a connection',
							},
						],
					},
				],
			},
			{
				displayName: 'Outputs',
				name: 'outputs',
				placeholder: 'Add Output',
				type: 'fixedCollection',
				noDataExpression: true,
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The output to add',
				default: {},
				options: [
					{
						name: 'output',
						displayName: 'Output',
						values: [
							{
								displayName: 'Display Name',
								name: 'displayName',
								type: 'string',
								noDataExpression: true,
								default: '',
								required: true,
								placeholder: 'Memory',
								description: 'The name to display',
							},
							{
								displayName: 'Type',
								name: 'type',
								// TODO: Should not be a string, rather options
								type: 'string',
								noDataExpression: true,
								default: '',
								required: true,
								placeholder: 'memory',
								description: 'The name of the output',
							},
						],
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new WikipediaQueryRun(), this),
		};
	}
}
