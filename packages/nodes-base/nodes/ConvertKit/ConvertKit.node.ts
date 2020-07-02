import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
} from 'n8n-workflow';

import {
	convertKitApiRequest,
} from './GenericFunctions';

import {
	fieldOperations,
	fieldFields,
} from './FieldDescription';

import {
	formOperations,
	formFields,
} from './FormDescription';

import {
	sequenceOperations,
	sequenceFields,
} from './SequenceDescription';

import {
	tagOperations,
	tagFields,
} from './TagDescription';

export class ConvertKit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConvertKit',
		name: 'convertKit',
		icon: 'file:convertKit.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ConvertKit API.',
		defaults: {
			name: 'ConvertKit',
			color: '#fb6970',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'convertKitApi',
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
						name: 'Field',
						value: 'field',
					},
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
				],
				default: 'field',
				description: 'The resource to operate on.'
			},
			//--------------------
			// Field Description
			//--------------------
			...fieldOperations,
			...fieldFields,
			//--------------------
			// FormDescription
			//--------------------
			...formOperations,
			...formFields,
			//--------------------
			// Sequence Description
			//--------------------
			...sequenceOperations,
			...sequenceFields,
			//--------------------
			// Tag Description
			//--------------------
			...tagOperations,
			...tagFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let method = '';
		let endpoint = '';
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const fullOperation = `${resource}/${operation}`;

		for (let i = 0; i < items.length; i++) {
			//--------------------
			// Field Operations
			//--------------------
			if(resource === 'field') {
				//---------
				// Update
				//---------
				if(operation === 'update') {
					qs.label = this.getNodeParameter('label', i) as string;

					const id = this.getNodeParameter('id', i) as string;

					method = 'PUT';
					endpoint = `/custom_fields/${id}`;
				//---------
				// Get All
				//---------
				} else if(operation === 'getAll') {
					method = 'GET';
					endpoint = '/custom_fields';
				//---------
				// Create
				//---------
				} else if(operation === 'create') {
					qs.label = this.getNodeParameter('label', i) as string;

					method = 'POST';
					endpoint = '/custom_fields';
				//---------
				// Delete
				//---------
				} else if(operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;

					method = 'DELETE';
					endpoint = `/custom_fields/${id}`;
				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			//--------------------------------------------
			// Form, Sequence, and Tag Operations
			//--------------------------------------------
			} else if(['form', 'sequence', 'tag'].includes(resource)) {
				//-----------------
				// Add Subscriber
				//-----------------
				if(operation === 'addSubscriber') {
					qs.email= this.getNodeParameter('email', i) as string;
					const id = this.getNodeParameter('id', i);

					const additionalParams = this.getNodeParameter('additionalFields', 0) as IDataObject;

					if(additionalParams.firstName) {
						qs.first_name = additionalParams.firstName;
					}

					if(additionalParams.fields !== undefined) {
						const fields = {} as IDataObject;
						const fieldsParams = additionalParams.fields as IDataObject;
						const field = fieldsParams?.field as IDataObject[];

						for(let j = 0; j < field.length; j++) {
							const key = field[j].key as string;
							const value = field[j].value as string;

							fields[key] = value;
						}

						qs.fields = fields;
					}

					if(resource === 'form') {
						method = 'POST';
						endpoint = `/forms/${id}/subscribe`;
					} else if(resource === 'sequence') {
						method = 'POST';
						endpoint = `/sequences/${id}/subscribe`;
					} else if(resource === 'tag') {
						method = 'POST';
						endpoint = `/tags/${id}/subscribe`;
					}
				//-----------------
				// Get All
				//-----------------
				} else if(operation === 'getAll') {
					method = 'GET';
					if(resource === 'form') {
						endpoint = '/forms';
					} else if(resource === 'tag') {
						endpoint = '/tags';
					} else if(resource === 'sequence') {
						endpoint = '/sequences';
					}
				//--------------------
				// Get Subscriptions
				//--------------------
				} else if(operation === 'getSubscriptions') {
					const id = this.getNodeParameter('id', i);
					const additionalParams = this.getNodeParameter('additionalFields', 0) as IDataObject;
					if(additionalParams.subscriberState) {
						qs.subscriber_state = additionalParams.subscriberState;
					}

					method = 'GET';
					if(resource === 'form') {
						endpoint = `/forms/${id}/subscriptions`;
					} else if(resource === 'tag') {
						endpoint = `/tags/${id}/subscriptions`;
					} else if(resource === 'sequence') {
						endpoint = `/sequences/${id}/subscriptions`;
					}
				//------------
				// Create Tag
				//------------
				} else if(operation === 'create') {
					const name = this.getNodeParameter('name', i);
					qs.tag = { name, };

					method = 'POST';
					endpoint = '/tags';
				//------------
				// Remove Tag
				//------------
				} else if(operation === 'removeSubscriber') {
					const id = this.getNodeParameter('id', i);

					qs.email = this.getNodeParameter('email', i);

					method = 'POST';
					endpoint = `/tags/${id}/unsubscribe`;
				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			responseData = await convertKitApiRequest.call(this, method, endpoint, {}, qs);

			if(fullOperation === 'field/getAll') {
				responseData = responseData.custom_fields;
			} else if(['form/addSubscriber', 'tag/addSubscriber', 'sequence/addSubscriber'].includes(fullOperation)) {
				responseData = responseData.subscription;
			} else if(fullOperation === 'form/getAll') {
				responseData = responseData.forms;
			} else if(['form/getSubscriptions', 'tag/getSubscriptions'].includes(fullOperation)) {
				responseData = responseData.subscriptions;
			} else if(fullOperation === 'tag/getAll') {
				responseData = responseData.tags;
			} else if(fullOperation === 'sequence/getAll') {
				responseData = responseData.courses;
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			} else {
				if(method === 'GET') {
					returnData.push( { } );
				} else {
					returnData.push( { success: true } );
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
