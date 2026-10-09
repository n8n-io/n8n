import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'http://127.0.0.1:18090/contacts/v1';

const forOperation = (operation: string) => ({
	show: { resource: ['contact'], operation: [operation] },
});

const tagsOf = (value: unknown) =>
	String(value ?? '')
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => tag !== '');

const filled = (values: IDataObject) =>
	Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value != null));

export class Contacts implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contacts',
		name: 'contacts',
		icon: 'file:contacts.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, delete and search contacts',
		defaults: { name: 'Contacts' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'contactsApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Contact', value: 'contact' }],
				default: 'contact',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a contact',
						description: 'Create a contact',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a contact',
						description: 'Delete a contact',
					},
					{
						name: 'Search',
						value: 'search',
						action: 'Search contacts',
						description: 'Search contacts',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				required: true,
				displayOptions: forOperation('create'),
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: forOperation('create'),
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				displayOptions: forOperation('create'),
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				displayOptions: { show: { resource: ['contact'], operation: ['create', 'search'] } },
				default: '',
				description: 'Tag names, separated by commas',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: forOperation('create'),
				default: {},
				options: [
					{ displayName: 'Company', name: 'company', type: 'string', default: '' },
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				displayOptions: forOperation('delete'),
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0);
		const request = async (options: IHttpRequestOptions): Promise<unknown> =>
			await this.helpers.httpRequestWithAuthentication.call(this, 'contactsApi', {
				json: true,
				...options,
			});
		const run = async (itemIndex: number): Promise<IDataObject[]> => {
			const parameter = (name: string) => this.getNodeParameter(name, itemIndex, '');
			if (operation === 'delete') {
				await request({
					method: 'DELETE',
					url: `${BASE_URL}/contacts/${encodeURIComponent(String(parameter('contactId')))}`,
				});
				return [{ deleted: true }];
			}
			if (operation === 'search') {
				const found = await request({
					method: 'GET',
					url: `${BASE_URL}/contacts`,
					qs: { tags: tagsOf(parameter('tags')) },
					arrayFormat: 'repeat',
				});
				return Array.isArray(found) ? found : [];
			}
			const additionalFields = this.getNodeParameter(
				'additionalFields',
				itemIndex,
				{},
			) as IDataObject;
			const created = (await request({
				method: 'POST',
				url: `${BASE_URL}/contacts`,
				body: filled({
					email: parameter('email'),
					firstName: parameter('firstName'),
					lastName: parameter('lastName'),
					...additionalFields,
				}),
			})) as IDataObject;
			const tags = tagsOf(parameter('tags'));
			if (tags.length === 0) return [created];
			const tagged = (await request({
				method: 'POST',
				url: `${BASE_URL}/contacts/${String(created.idStr)}/tags`,
				body: { tags },
			})) as IDataObject;
			return [tagged];
		};
		const returnData: INodeExecutionData[] = [];
		for (const itemIndex of this.getInputData().keys()) {
			try {
				const results = await run(itemIndex);
				returnData.push(...results.map((json) => ({ json, pairedItem: { item: itemIndex } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [returnData];
	}
}
