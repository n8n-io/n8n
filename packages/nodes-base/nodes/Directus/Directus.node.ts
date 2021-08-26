
import {
	BINARY_ENCODING,
	IExecuteFunctions
} from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
	LoggerProxy as Logger,
} from 'n8n-workflow';

import {
	directusApiRequest,
	directusApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import { OptionsWithUri } from 'request';

import {
	activityOperations,
	activityFields,
} from './Descriptions/ActivityDescription';

import {
	assetsOperations,
	assetsFields,
} from './Descriptions/AssetsDescription';

import {
	authOperations,
	authFields,
} from './Descriptions/AuthDescription';

import {
	collectionsOperations,
	collectionsFields,
} from './Descriptions/CollectionsDescription';

import {
	extensionsOperations,
	extensionsFields,
} from './Descriptions/ExtensionsDescription';

import {
	fieldsOperations,
	fieldsFields,
} from './Descriptions/FieldsDescription';

import {
	filesOperations,
	filesFields,
} from './Descriptions/FilesDescription';

import {
	foldersOperations,
	foldersFields,
} from './Descriptions/FoldersDescription';

import {
	itemsOperations,
	itemsFields,
} from './Descriptions/ItemsDescription';

import {
	permissionsOperations,
	permissionsFields,
} from './Descriptions/PermissionsDescription';

import {
	presetsOperations,
	presetsFields,
} from './Descriptions/PresetsDescription';

import {
	relationsOperations,
	relationsFields,
} from './Descriptions/RelationsDescription';

import {
	revisionsOperations,
	revisionsFields,
} from './Descriptions/RevisionsDescription';

import {
	rolesOperations,
	rolesFields,
} from './Descriptions/RolesDescription';

import {
	serverOperations,
	serverFields,
} from './Descriptions/ServerDescription';

import {
	settingsOperations,
	settingsFields,
} from './Descriptions/SettingsDescription';

import {
	usersOperations,
	usersFields,
} from './Descriptions/UsersDescription';

import {
	utilsOperations,
	utilsFields,
} from './Descriptions/UtilsDescription';

import {
	webhooksOperations,
	webhooksFields,
} from './Descriptions/WebhooksDescription';

export class Directus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Directus',
		name: 'directus',
		icon: 'file:directus.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Directus API',
 	    subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		defaults: {
			name: 'Directus',
			color: '#2ECFA8'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{
			name: 'directusApi',
			required: true,
		}],
		properties: [
 	    {
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
		{
				name: 'Activity',
				value: 'activity'
		},
		{
				name: 'Assets',
				value: 'assets'
		},
		{
				name: 'Authentication',
				value: 'auth'
		},
		{
				name: 'Collections',
				value: 'collections'
		},
		{
				name: 'Extensions',
				value: 'extensions'
		},
		{
				name: 'Fields',
				value: 'fields'
		},
		{
				name: 'Files',
				value: 'files'
		},
		{
				name: 'Folders',
				value: 'folders'
		},
		{
				name: 'Items',
				value: 'items'
		},
		{
				name: 'Permissions',
				value: 'permissions'
		},
		{
				name: 'Presets',
				value: 'presets'
		},
		{
				name: 'Relations',
				value: 'relations'
		},
		{
				name: 'Revisions',
				value: 'revisions'
		},
		{
				name: 'Roles',
				value: 'roles'
		},
		{
				name: 'Server',
				value: 'server'
		},
		{
				name: 'Settings',
				value: 'settings'
		},
		{
				name: 'Users',
				value: 'users'
		},
		{
				name: 'Utilities',
				value: 'utils'
		},
		{
				name: 'Webhooks',
				value: 'webhooks'
		}
],
			default: 'items',
			required: true,
			description: 'Resource to consume',
},


			// ACTIVITY
			...activityOperations,
			...activityFields,

			// ASSETS
			...assetsOperations,
			...assetsFields,

			// AUTH
			...authOperations,
			...authFields,

			// COLLECTIONS
			...collectionsOperations,
			...collectionsFields,

			// EXTENSIONS
			...extensionsOperations,
			...extensionsFields,

			// FIELDS
			...fieldsOperations,
			...fieldsFields,

			// FILES
			...filesOperations,
			...filesFields,

			// FOLDERS
			...foldersOperations,
			...foldersFields,

			// ITEMS
			...itemsOperations,
			...itemsFields,

			// PERMISSIONS
			...permissionsOperations,
			...permissionsFields,

			// PRESETS
			...presetsOperations,
			...presetsFields,

			// RELATIONS
			...relationsOperations,
			...relationsFields,

			// REVISIONS
			...revisionsOperations,
			...revisionsFields,

			// ROLES
			...rolesOperations,
			...rolesFields,

			// SERVER
			...serverOperations,
			...serverFields,

			// SETTINGS
			...settingsOperations,
			...settingsFields,

			// USERS
			...usersOperations,
			...usersFields,

			// UTILS
			...utilsOperations,
			...utilsFields,

			// WEBHOOKS
			...webhooksOperations,
			...webhooksFields,
 	    ],
 	};

    methods = {
		loadOptions: {
			// Get all Collections
			async getCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const returnData: INodePropertyOptions[] = [];
					const collections = await directusApiRequest.call(
						this,
						'GET',
						'collections'
					);
					console.log('1. collections :');
					console.log(collections);
					for (const collection of collections.data) {
						const name = collection.collection;
						const nameInCapital = name.charAt(0).toUpperCase() + name.slice(1);
						returnData.push({
							name: nameInCapital,
							value: name,
							description: nameInCapital,
						});
					}
					return returnData;
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}
	};

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		//return [[]];

		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('directusApi') as unknown as IDataObject;
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		console.log('resource : ', resource);
		console.log('operation : ', operation);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'fields') {
					if (operation === 'list') {
						const collection = this.getNodeParameter('collection', i) as string;
						let response = await directusApiRequest.call(
							this,
							'GET',
							`fields/${collection}`
						);
						responseData = response.data;
						console.log('responseData : ');
						console.log(responseData);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
};
