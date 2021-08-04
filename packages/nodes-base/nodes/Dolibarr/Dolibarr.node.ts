import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';


import {
	thirdPartyFields,
	thirdPartyOperations,
} from './ThirdPartyDescription';

import {
	invoiceFields,
	invoiceOperations,
} from './InvoiceDescription';

import {
	proposalFields,
	proposalOperations,
} from './ProposalDescription';

import {
	productFields,
	productOperations,
} from './ProductDescription';



export class Dolibarr implements INodeType {
		description: INodeTypeDescription = {
		displayName: 'Dolibarr',
		name: 'Dolibarr',
		icon: 'file:dolibarr.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Dolibarr API',
		defaults: {
			name: 'Dolibarr',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
			name: 'DolibarrApi',
			required: true,
			},
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
				{
					name: 'Third Party',
					value: 'thirdParty',
				},
				{
					name: 'Invoice',
					value: 'invoice',
				},
				{
					name: 'Proposal',
					value: 'proposal',
				},
				{
					name: 'Product',
					value: 'product',
				},
			],
			default: 'contact',
			required: true,
			description: 'Select resource',
			},
			...contactOperations,
			...contactFields,
			...thirdPartyOperations,
			...thirdPartyFields,
			...invoiceOperations,
			...invoiceFields,
			...proposalOperations,
			...proposalFields,
			...productOperations,
			...productFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = this.getCredentials('DolibarrApi') as IDataObject;
		
		
		const items = this.getInputData();
		const returnData = [];
		for (let i = 0; i < items.length; i++) {
			try{
				let query = false;
				
				const testUri = `${credentials.url}`;
				const finUri: string = testUri.charAt(testUri.length - 1);
				const fin = '/' === finUri;
				
				let finalUri:string;
				if(fin === false){
					finalUri = `${credentials.url}/`;
				}
				else{
					finalUri = `${credentials.url}`;
				}
				
					
		/* -------------------------------------------------------------------------- */
		/*                                 contact		                              */
		/* -------------------------------------------------------------------------- */

				
				if (resource === 'contact') {
					
					///////////list/////////////
					if (operation === 'list') {
						finalUri = `${finalUri}contacts`;
						
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						
						if(additionalFields.limit){
							if (query === false){
								finalUri = `${finalUri}?limit=${additionalFields.limit}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&limit=${additionalFields.limit}`;
							}
						}
						
						if(additionalFields.page){
							if (query === false){
								finalUri = `${finalUri}?page=${additionalFields.page}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&page=${additionalFields.page}`;
							}
						}
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					///////////get/////////////
					else if (operation === 'get'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}contacts/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					///////////create/////////////
					else if (operation === 'create'){
						const createOperation = this.getNodeParameter('createOperation', i) as string;
						
						finalUri =`${finalUri}contacts`;
						
						if (createOperation === 'fields'){
							const firstName = this.getNodeParameter('firstName', i) as string;
							const lastName = this.getNodeParameter('lastName', i) as string;
							const email = this.getNodeParameter('email', i) as string;
							
							
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const data: IDataObject = {
								email,
								firstName,
								lastName,
							};
							
							if(additionalFields.poste){
								const poste = additionalFields.poste as string;
								Object.assign(data, { poste });
							}
							if(additionalFields.phoneNumber){
								const phonePro = additionalFields.phoneNumber as string;
								Object.assign(data, { phonePro });
							}
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'POST',
								
								body: data,
								
								uri: finalUri,
								json: true,
							};
							
							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
						
						else if (createOperation === 'jsonField'){
							const json = this.getNodeParameter('json', i) as string;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'POST',
								
								body: JSON.parse(json),
								
								uri: finalUri,
								json: true,
							};
							
							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
					}
					
					///////////update/////////////
					else if(operation === 'update'){	
						const updateOperation = this.getNodeParameter('updateOperation', i) as string;
					
						const id = this.getNodeParameter('id', i) as string;
						finalUri = `${finalUri}contacts/${id}`;
						
						if (updateOperation === 'fields'){
							const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
							const data: IDataObject = {};
							
							if(additionalFields.firstName){
								const firstName = additionalFields.firstName as string;
								Object.assign(data, { firstName });
							}
							
							if(additionalFields.lastName){
								const lastName = additionalFields.lastName as string;
								Object.assign(data, { lastName });
							}
							
							if(additionalFields.email){
								const email = additionalFields.email as string;
								Object.assign(data, { email });
							}
							
							if(additionalFields.poste){
								const poste = additionalFields.poste as string;
								Object.assign(data, { poste });
							}
							
							if(additionalFields.phoneNumber){
								const phonePro = additionalFields.phoneNumber as string;
								Object.assign(data, { phonePro });
							}
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'PUT',
								
								body: data,
								
								uri: finalUri,
								json: true,
							};
							
							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
						
						else if(updateOperation === 'jsonField'){
							
							const json = this.getNodeParameter('json', i) as string;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'PUT',
								
								body: JSON.parse(json),
								
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
					}
					
					///////////delete/////////////
					else if (operation === 'delete'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}contacts/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'DELETE',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push({ success: true });
					}
				}

		/* -------------------------------------------------------------------------- */
		/*                                 thirdParty		                              */
		/* -------------------------------------------------------------------------- */

				if (resource === 'thirdParty') {
					
					///////////list///////////////
					if (operation === 'list') {
						finalUri = `${finalUri}thirdparties`;
						
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						
						if(additionalFields.limit){
							if (query === false){
								finalUri = `${finalUri}?limit=${additionalFields.limit}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&limit=${additionalFields.limit}`;
							}
						}
						
						if(additionalFields.page){
							if (query === false){
								finalUri = `${finalUri}?page=${additionalFields.page}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&page=${additionalFields.page}`;
							}
						}

						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					///////////get///////////////
					else if (operation === 'get'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}thirdparties/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
						
					}
					
					///////////create/////////////
					else if (operation === 'create'){
						finalUri =`${finalUri}thirdparties`;
					
						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'POST',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};
						
						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}

					///////////update/////////////
					else if(operation === 'update'){	
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}thirdparties/${id}`;

						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'PUT',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}



					///////////delete/////////////
					else if (operation === 'delete'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}thirdparties/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'DELETE',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push({ success: true });
					}
					
					
				}
				
		/* -------------------------------------------------------------------------- */
		/*                                 invoice		                              */
		/* -------------------------------------------------------------------------- */

				if (resource === 'invoice') {
					
					///////////list///////////////
					if (operation === 'list') {
						finalUri = `${finalUri}invoices`;
						
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						
						if(additionalFields.limit){
							if (query === false){
								finalUri = `${finalUri}?limit=${additionalFields.limit}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&limit=${additionalFields.limit}`;
							}
						}
						
						if(additionalFields.page){
							if (query === false){
								finalUri = `${finalUri}?page=${additionalFields.page}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&page=${additionalFields.page}`;
							}
						}

						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					///////////get///////////////
					else if (operation === 'get'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}invoices/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					

					///////////create/////////////
					else if (operation === 'create'){
						finalUri =`${finalUri}invoices`;
					
						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'POST',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};
						
						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}


					///////////update/////////////
					else if(operation === 'update'){	
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}invoices/${id}`;

						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'PUT',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}


					///////////delete/////////////
					else if (operation === 'delete'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}invoices/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'DELETE',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push({ success: true });
					}
					
					
				}
				
		/* -------------------------------------------------------------------------- */
		/*                                 product		                              */
		/* -------------------------------------------------------------------------- */

				if (resource === 'product') {
					
					///////////list///////////////
					if (operation === 'list') {
						
						const listOperation = this.getNodeParameter('listOperation', i) as string;
						
						if(listOperation === 'properties'){
						
							finalUri = `${finalUri}products`;
							
							const additionalFields = this.getNodeParameter('additionalFieldsPro', i) as IDataObject;
							
							if(additionalFields.limit){
								if (query === false){
									finalUri = `${finalUri}?limit=${additionalFields.limit}`;
									query = true;
								}
								else{
									finalUri = `${finalUri}&limit=${additionalFields.limit}`;
								}
							}
							
							if(additionalFields.page){
								if (query === false){
									finalUri = `${finalUri}?page=${additionalFields.page}`;
									query = true;
								}
								else{
									finalUri = `${finalUri}&page=${additionalFields.page}`;
								}
							}
						
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'GET',
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
						else if (listOperation === 'purchasePrices'){
							
							finalUri = `${finalUri}products/purchase_prices`;
							
							const additionalFields = this.getNodeParameter('additionalFieldsPur', i) as IDataObject;
							
							if(additionalFields.limit){
								if (query === false){
									finalUri = `${finalUri}?limit=${additionalFields.limit}`;
									query = true;
								}
								else{
									finalUri = `${finalUri}&limit=${additionalFields.limit}`;
								}
							}
							
							if(additionalFields.page){
								if (query === false){
									finalUri = `${finalUri}?page=${additionalFields.page}`;
									query = true;
								}
								else{
									finalUri = `${finalUri}&page=${additionalFields.page}`;
								}
							}
							
							if(additionalFields.supplier){
								if (query === false){
									finalUri = `${finalUri}?supplier=${additionalFields.supplier}`;
									query = true;
								}
								else{
									finalUri = `${finalUri}&supplier=${additionalFields.supplier}`;
								}
							}
						
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'GET',
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
					}
					
					///////////get///////////////
					else if (operation === 'get'){
						const getOperation = this.getNodeParameter('getOperation', i) as string;
						
						if(getOperation === 'getId'){
							const idOperation = this.getNodeParameter('idOperation', i) as string;
							
							const id = this.getNodeParameter('id', i) as string;
							
							if(idOperation === 'properties'){
								finalUri = `${finalUri}products/${id}`;
								
								const options: OptionsWithUri = {
									headers: {
										'Accept': 'application/json',
										'DOLAPIKEY': `${credentials.value}`,
									},
									method: 'GET',
									uri: finalUri,
									json: true,
								};

								responseData = await this.helpers.request(options);
								returnData.push(responseData);
							}
							
							else if (idOperation === 'purchasePrices'){
								finalUri = `${finalUri}products/${id}/purchase_prices`;
								
								const options: OptionsWithUri = {
									headers: {
										'Accept': 'application/json',
										'DOLAPIKEY': `${credentials.value}`,
									},
									method: 'GET',
									uri: finalUri,
									json: true,
								};

								responseData = await this.helpers.request(options);
								returnData.push(responseData);
							}
						}
						
						else if (getOperation === 'getRef'){
							const ref = this.getNodeParameter('ref', i) as string;
							
							finalUri = `${finalUri}products/ref/${ref}`;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'GET',
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
						
					}


					///////////create/////////////
					else if (operation === 'create'){
						finalUri =`${finalUri}products`;
					
						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'POST',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};
						
						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					

					///////////update/////////////
					else if(operation === 'update'){	
					
						const updateOperation = this.getNodeParameter('updateOperation', i) as string;
						
						const id = this.getNodeParameter('id', i) as string;
						
						const json = this.getNodeParameter('json', i) as string;
						
						if (updateOperation === 'properties'){
							
							finalUri = `${finalUri}products/${id}`;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'PUT',
								
								body: JSON.parse(json),
								
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
						
						else if (updateOperation === 'purchasePrices'){
							finalUri = `${finalUri}products/${id}/purchase_prices`;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'POST',
								
								body: JSON.parse(json),
								
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push(responseData);
						}
					}

					
					///////////delete/////////////
					else if (operation === 'delete'){
						
						const deleteOperation = this.getNodeParameter('deleteOperation', i) as string;
						
						const id = this.getNodeParameter('id', i) as string;
						
						if(deleteOperation === 'properties'){
						
							finalUri = `${finalUri}products/${id}`;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'DELETE',
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push({ success: true });
						}
						
						else if (deleteOperation === 'purchasePrices'){
							const purchasePriceId = this.getNodeParameter('purchasePriceId', i) as string;
						
							finalUri = `${finalUri}products/${id}/purchase_prices/${purchasePriceId}`;
							
							const options: OptionsWithUri = {
								headers: {
									'Accept': 'application/json',
									'DOLAPIKEY': `${credentials.value}`,
								},
								method: 'DELETE',
								uri: finalUri,
								json: true,
							};

							responseData = await this.helpers.request(options);
							returnData.push({ success: true });
						}
					}
					
					
				}


		/* -------------------------------------------------------------------------- */
		/*                                 proposal		                              */
		/* -------------------------------------------------------------------------- */
				if (resource === 'proposal') {
					
					///////////list///////////////
					if (operation === 'list') {
						finalUri = `${finalUri}proposals`;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						
						if(additionalFields.limit){
							if (query === false){
								finalUri = `${finalUri}?limit=${additionalFields.limit}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&limit=${additionalFields.limit}`;
							}
						}
						
						if(additionalFields.page){
							if (query === false){
								finalUri = `${finalUri}?page=${additionalFields.page}`;
								query = true;
							}
							else{
								finalUri = `${finalUri}&page=${additionalFields.page}`;
							}
						}

						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					///////////get///////////////
					else if (operation === 'get'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri =`${finalUri}proposals/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'GET',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					
					

					///////////create/////////////
					else if (operation === 'create'){
						finalUri =`${finalUri}proposals`;
					
						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'POST',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};
						
						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}
					

					///////////update/////////////
					else if(operation === 'update'){	
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}proposals/${id}`;

						const json = this.getNodeParameter('json', i) as string;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'PUT',
							
							body: JSON.parse(json),
							
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push(responseData);
					}

					
					///////////delete/////////////
					else if (operation === 'delete'){
						const id = this.getNodeParameter('id', i) as string;
						
						finalUri = `${finalUri}proposals/${id}`;
						
						const options: OptionsWithUri = {
							headers: {
								'Accept': 'application/json',
								'DOLAPIKEY': `${credentials.value}`,
							},
							method: 'DELETE',
							uri: finalUri,
							json: true,
						};

						responseData = await this.helpers.request(options);
						returnData.push({ success: true });
					}
					
					
				}
			}
			catch(error){
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}

				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}