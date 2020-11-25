
import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { Options } from 'promise-ftp';
import {egoiApiRequest, egoiApiRequestAllItems } from './GenericFunctions';

interface ICreateMemberBody {
	base:{
		email?: string;
		first_name?: string;
		last_name?: string;
		cellphone?: string;
		birth_date?: string;
		subscription_status?: Options;
	};	
	extra : [];
}

export class Egoi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E-goi',
		name: 'egoi',
		icon: 'file:egoi.png',
		group: ['output'],
		version: 1,
		description: 'Consume Egoi Api',
		defaults: {
			name: 'Egoi',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'egoiApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiKey',
						],
					},
				},
			},],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
				description: 'Method of authentication.',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLists',
				},
				displayOptions: {
					show: {
						operation: [
							'getAll', 'create', 'delete', 'update', 'get',
						],
					},
				},
				default: '',
				options: [],
				description: 'List of lists',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new member on list',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a member on list',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all members on list',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a new member on list',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'create', 'update', 'get',
						],
					},
				},
				default: '',
				description: 'Email address for a subscriber.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'Name of a subscriber.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				description: 'Name of a subscriber.',
			},
			{
				displayName: 'Birth Date',
				name: 'birthdate',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'Birth date of a subscriber.',
			},
			{
				displayName: 'Cellphone',
				name: 'cellphone',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'Cellphone of a subscriber.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Unconfirmed',
						value: 'unconfirmed',
					},
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Inactive',
						value: 'inactive',
					},
					{
						name: 'Removed',
						value: 'removed',
					},
					{
						name: 'NewConfirmation',
						value: 'newConfirmation',
					},
					{
						name: 'Moved',
						value: 'moved',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				default: 'active',
				description: `Subscriber's current status.`,
			},
			//--------------------
			//----UPDATE MEMBER---
			//--------------------
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'Name of a subscriber.',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Name of a subscriber.',
					},
					{
						displayName: 'Birth Date',
						name: 'birthdate',
						type: 'dateTime',
						default: '',
						description: 'Birth date of a subscriber.',
					},
					{
						displayName: 'Cellphone',
						name: 'cellphone',
						type: 'string',
						default: '',
						description: 'Cellphone of a subscriber.',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Unconfirmed',
								value: 'unconfirmed',
							},
							{
								name: 'Active',
								value: 'active',
							},
							{
								name: 'Inactive',
								value: 'inactive',
							},
							{
								name: 'Removed',
								value: 'removed',
							},
							{
								name: 'NewConfirmation',
								value: 'newConfirmation',
							},
							{
								name: 'Moved',
								value: 'moved',
							},
						],
						default: 'active',
						description: `Subscriber's current status.`,
					},
				],
				},
				//------------------------
				//----ExtraFields e Tags---
				//-------------------------		
				{
					displayName: 'Extra Fields',
					name: 'extraFieldsUi',
					type: 'fixedCollection',
					placeholder: 'Add Field',
					default: {},
					typeOptions: {
						loadOptionsDependsOn: [
							'list',
						],
					multipleValues: true,
					},
					options: [
						{
							name: 'extraFields',
							displayName: 'Extra Fields',
							typeOptions: {
								multipleValueButtonText: 'Add Field',
							},
							values: [
								{
									displayName: 'Extra Field Name',
									name: 'extraFieldName',
									type: 'options',
									typeOptions: {
										loadOptionsMethod: 'getExtraFields',
										loadOptionsDependsOn: [
											'list',
										],
									},
									default: '',
								},
								{
									displayName: 'Extra Field Value',
									name: 'extraFieldValue',
									type: 'json',
									typeOptions: {
										loadOptionsDependsOn: [
											'extraFieldName',
										],
									},
									default: '',
								},
							],
						},
					],
					displayOptions: {
						show: {
							operation: [
								'create',
							],
						},
					},
				},
				
				{
					displayName: 'Add Tags',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					description: `Add Tag`,
					displayOptions: {
						show: {
							operation: [
								'create', 'update',
							],
						},
					},
					options: [
						{
							displayName: 'Tags',
							name: 'listTags',
							type: 'multiOptions',
							typeOptions: {
								loadOptionsMethod: 'getListTags',
							},
							default: '',
							options: [],
							description: 'List of lists',
						},
					],
				},


		],
	};

	methods = {
		loadOptions: {
			

			// Obter as listas de contactos existentes para mostrar num select box
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const lists = await egoiApiRequestAllItems.call(this, '/lists', 'GET', 'lists');
				for (const list of lists) {
					for(const items of list.items){
					const listName = items.internal_name;
					const listId = items.list_id;
					returnData.push({
						name: listName,
						value: listId,
					});
				}
				}
				return returnData;
			},

			//Obter extra fields disponiveis de uma lista
			async getExtraFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const listId = this.getCurrentNodeParameter('list');
				const extraFields= await egoiApiRequestAllItems.call(this, `/lists/${listId}/fields`, 'GET', 'fields');
				for (const field of extraFields[0]) {
					
					if(field.type === "extra" && field.format === "string"){
						const fieldName = field.name;
						const fieldId = field.field_id;
						const fieldType = field.type;
						returnData.push({
							name: fieldName,
							value: fieldId,
							description: fieldType,
						});
					}
				}

				return returnData;
			},

			// Obter as tags
			async getListTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const tagList = await egoiApiRequestAllItems.call(this, `/tags`, 'GET', 'tags');

				for (const tag of tagList[0].items) {
					const tagName = tag.name;
					const tagId = tag.tag_id;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}

				return returnData;
			},
		},
	};

	
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		let responseData;
		const items = this.getInputData();
		const length = items.length as unknown as number;
		const operation = this.getNodeParameter('operation', 0) as string;
		

		for(let i=0; i<length; i++){

			//OPERAÇÃO CRIAR CONTACTO
			if(operation === 'create'){
				
				//Obter os parametros
				let contactId = "";
				const listId = this.getNodeParameter('list', i) as string;
				const email = this.getNodeParameter('email', i) as string;
				const firstName = this.getNodeParameter('firstName', i) as string;
				const lastName = this.getNodeParameter('lastName', i) as string;
				const cellphone = this.getNodeParameter('cellphone', i) as string;
				const birthdate = this.getNodeParameter('birthdate', i) as string;
				const status = this.getNodeParameter('status', i) as Options;
				const tagsList = this.getNodeParameter('options', i) as IDataObject;

				//Construir o body do pedido à api
				const body: ICreateMemberBody = {
					base:{
						email,
						first_name: firstName,
						last_name: lastName,
						cellphone,
						birth_date: birthdate.substring(0,10),
						subscription_status: status,
					},
					extra: [],
				};
				
				//Tratar dos fields extra
				//Percorre todos os fields que foram adicionados
				const extraFieldsValues = (this.getNodeParameter('extraFieldsUi', i) as IDataObject).extraFields as IDataObject[];
					if (extraFieldsValues) {
						
						for (let i = 0; i < extraFieldsValues.length; i++) {

							// @ts-ignore
							body.extra[i] = {
								field_id: extraFieldsValues[i].extraFieldName as never,
								value: extraFieldsValues[i].extraFieldValue as never,
							};	

						}
					}

				
				try{
					//Fazer o pedido à api
					responseData = await egoiApiRequest.call(this, `/lists/${listId}/contacts`, 'POST', body);
				} catch (error) {
					if (error.respose && error.response.body && error.response.body.detail) {
						throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
					}
					throw error;
				}
				
				//Verifica se a lista de tags existe
				if(tagsList.listTags){
					//Obtem o id do contacto da resposta à adição na api
					contactId = responseData.contact_id;
					const array = tagsList.listTags as [number];

					for (let i = 0; i< array.length; i++){
						const bodyTag = {
							tag_id: array[i],
							contacts: [contactId],
									};
						responseData = bodyTag;
						
					try{
						responseData = await egoiApiRequest.call(this, `/lists/${listId}/contacts/actions/attach-tag`, 'POST', bodyTag);
					} catch (error) {
						if (error.respose && error.response.body && error.response.body.detail) {
							throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
						}
						throw error;
					}
					}
				}
					
			}
			//OPERAÇÃO PARA OBTER TODOS OS CONTACTOS
			if(operation==='getAll'){

				//variavel auxiliar para obter a lista de todos os contacto e ser percorrida
				let responseDataAux;
				//Array para adicionar todos os contactos
				const returnData = [];
				const listId = this.getNodeParameter('list', i) as string;

				try{
					//pedido à api
					responseDataAux = await egoiApiRequest.call(this, `/lists/${listId}/contacts`, 'GET', {});
				} catch (error) {
					if (error.respose && error.response.body && error.response.body.detail) {
						throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
					}
					throw error;
				}

				for(const items of responseDataAux.items){
					const data = items.base;
					returnData.push(data);
				}
				
				responseData = returnData;
			}
			//OPERAÇÃO PARA OBTER UM CONTACTO ESPECIFICO
			if(operation==='get'){

				const listId = this.getNodeParameter('list', i) as string;
				const email = this.getNodeParameter('email', i) as string;

				try{
					//pedido à api
					responseData = await egoiApiRequest.call(this, `/lists/${listId}/contacts?email=${email}`, 'GET', {});
				} catch (error) {
					if (error.respose && error.response.body && error.response.body.detail) {
						throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
					}
					throw error;
				}
					
				responseData = responseData.items;
			}
			
			//OPERAÇÃO PARA DAR UPDATE NUM CONTACTO ESPECIFICO
			if(operation==='update'){

			let contactId = "";
			let getId;
			//variavel para verificar se algum parametro base foi alterado
			let alterado = false;

			//Obter os parametros
			const listId = this.getNodeParameter('list', i) as string;
			const email = this.getNodeParameter('email', i) as string;
			const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
			const tagsList = this.getNodeParameter('options', i) as IDataObject;
			

				//Construir o body do pedido à api
				const body: ICreateMemberBody = {
					base:{
					},
					extra: [],
				};	

				if (updateFields.status) {
					alterado = true;
					body.base.subscription_status = updateFields.status as Options;
				}
				if (updateFields.firstName) {
					alterado = true;
					body.base.first_name = updateFields.firstName as string;
				}
				if (updateFields.lastName) {
					alterado = true;
					body.base.last_name = updateFields.lastName as string;
				}
				if (updateFields.cellphone) {
					alterado = true;
					body.base.cellphone = updateFields.cellphone as string;
				}
				if (updateFields.birthdate) {
					alterado = true;
					body.base.birth_date = updateFields.birthdate as string;
				}
				
				try{
					//pedido à api para obter o id do contacto
					getId = await egoiApiRequest.call(this, `/lists/${listId}/contacts?email=${email}`, 'GET', {});
				} catch (error) {
					if (error.respose && error.response.body && error.response.body.detail) {
						throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
					}
					throw error;
				}
				
				//verificar se existe esse contacto
				if(getId.total_items > 0){
					contactId = getId.items[0].base.contact_id;
					const array = tagsList.listTags as [number];

					//Percorrer a lista de tags para serem adicionadas ao contacto
					for (let i = 0; i< array.length; i++){
						const bodyTag = {
							tag_id: array[i],
							contacts: [contactId],
						};
						responseData = bodyTag;

						try{
							//pedido à api
							responseData = await egoiApiRequest.call(this, `/lists/${listId}/contacts/actions/attach-tag`, 'POST', bodyTag);
						} catch (error) {
							if (error.respose && error.response.body && error.response.body.detail) {
								throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
							}
							throw error;
						}
					}

					//Verificar se algum parametro base foi alterado
					if(alterado === true){
						try{
							//pedido à api
							responseData = await egoiApiRequest.call(this, `/lists/${listId}/contacts/${contactId}`, 'PATCH', body);
						} catch (error) {
							if (error.respose && error.response.body && error.response.body.detail) {
								throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
							}
						throw error;
					}
						responseData = responseData.items;
					}
				
				}
			}
		}
		
	return [this.helpers.returnJsonArray(responseData)];
	}
}