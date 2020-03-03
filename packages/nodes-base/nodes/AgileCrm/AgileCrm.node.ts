import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	agileCrmApiRequest,
 } from './GenericFunctions';
import {
	contactOperations,
	contactFields,
} from './ContactDescription';
import { IContact } from './ContactInterface';

export class AgileCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgileCRM',
		name: 'agileCrm',
		icon: 'file:agileCrm.png',
		group: ['output'],
		version: 1,
		subtitle: '',
		description: 'Consume AgileCRM API',
		defaults: {
			name: 'AgileCRM',
			color: '#6eabd8',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'agileCrmApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				description: 'Resource to consume.',
			},

			// Contact
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'contact') {
				if (operation === 'get') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					try {
						const endpoint = `/contacts/${contactId}`;
						responseData = await agileCrmApiRequest.call(this, 'GET', endpoint);
					} catch (err) {
						throw new Error(`AgileCrm Error: ${JSON.stringify(err)}`);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
