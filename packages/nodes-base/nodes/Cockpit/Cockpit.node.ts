import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
import {
	collectionFields,
	collectionOperations
} from './CollectionDescription';
import {
	getCollectionEntries,
	saveCollectionEntry
} from './CollectionFunctions';
import {
	formFields,
	formOperations
} from './FormDescription';
import { submitForm } from './FormFunctions';
import { singletonOperations } from "./SingletonDescription";
import { getSingleton } from "./SingletonFunctions";

export class Cockpit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cockpit',
		name: 'cockpit',
		icon: 'file:cockpit.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"] + "/" + $parameter["resourceName"]}}',
		description: 'Consume Cockpit API',
		defaults: {
			name: 'Cockpit',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cockpitApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'collections',
				description: 'Resource to consume.',
				options: [
					{
						name: 'Collection',
						value: 'collections',
					},
					{
						name: 'Form',
						value: 'forms',
					},
					{
						name: 'Singleton',
						value: 'singletons',
					},
				],
			},
			{
				displayName: 'Resource name',
				name: 'resourceName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of resource to consume.'
			},
			...collectionOperations,
			...collectionFields,
			...formOperations,
			...formFields,
			...singletonOperations,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const resource = this.getNodeParameter('resource', 0) as string;
		const resourceName = this.getNodeParameter('resourceName', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < length; i++) {
			if (resource === 'collections') {
				if (operation === 'save') {
					const data = this.getNodeParameter('data', i) as IDataObject;

					responseData = await saveCollectionEntry.call(this, resourceName, data);
				} else if (operation === 'get') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					responseData = await getCollectionEntries.call(this, resourceName, additionalFields);
				} else if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const data = this.getNodeParameter('data', i) as IDataObject;

					responseData = await saveCollectionEntry.call(this, resourceName, data, id);
				}
			} else if (resource === 'forms') {
				if (operation === 'submit') {
					const form = this.getNodeParameter('form', i) as IDataObject;

					responseData = await submitForm.call(this, resourceName, form);
				}
			} else if (resource === 'singletons') {
				if (operation === 'get') {
					responseData = await getSingleton.call(this, resourceName);
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
