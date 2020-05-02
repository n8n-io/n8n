import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
    INodeTypeDescription,
    IDataObject
} from 'n8n-workflow';

import {
	contactOperations,
	contactFields
} from './ContactDescription';
import { agileCrmApiRequest, validateJSON} from './GenericFunctions';
import { IContact, IProperty } from './ContactInterface';


export class AgileCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgileCRM',
        name: 'agileCrm',
        icon: 'file:agilecrm.png',
		group: ['transform'],
		version: 1,
		description: 'Consume AgileCRM API',
		defaults: {
			name: 'AgileCRM',
			color: '#772244',
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
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Contact',
                        value: 'contact'
                    }
                ],
				default: 'contact',
				description: 'Resource to consume.',
			},
			// CONTACT
			...contactOperations,
			...contactFields,
		],

	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			if(resource === 'contact'){

				if(operation === 'get'){
					const contactId = this.getNodeParameter('contactId', i) as string;

					const endpoint = `api/contacts/${contactId}`;
					responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
		
				}

				if(operation === 'getAll'){
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					
					if (returnAll) {
						const endpoint = `api/contacts`;
						responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						const endpoint = `api/contacts?page_size=${limit}`;
						responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
					}
				}
				
				if(operation === 'create'){
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: IContact = {};

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '' ) {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}

					} else {

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.starValue) {
							body.star_value = additionalFields.starValue as string;
						}
						if (additionalFields.leadScore) {
							body.lead_score = additionalFields.leadScore as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}
						if (additionalFields.properties) {
							body.properties = (additionalFields.properties as IDataObject).property as IDataObject[];
						}
					}
					const endpoint = 'api/contacts';
					console.log(body);
					responseData = await agileCrmApiRequest.call(this, 'POST', endpoint, body);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			}
				
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
	
}
