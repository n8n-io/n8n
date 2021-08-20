import {
	Credentials,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	ICredentialsHelper,
	INode,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeData,
	INodeTypes,
	NodeHelpers,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ICredentialsDb,
} from './';


const mockNodeTypes: INodeTypes = {
	nodeTypes: {},
	init: async (nodeTypes?: INodeTypeData): Promise<void> => { },
	getAll: (): INodeType[] => {
		// Does not get used in Workflow so no need to return it
		return [];
	},
	getByName: (nodeType: string): INodeType | undefined => {
		return undefined;
	},
};


export class CredentialsHelper extends ICredentialsHelper {

	/**
	 * Returns the credentials instance
	 *
	 * @param {string} name Name of the credentials to return instance of
	 * @param {string} type Type of the credentials to return instance of
	 * @returns {Credentials}
	 * @memberof CredentialsHelper
	 */
	async getCredentials(name: string, type: string): Promise<Credentials> {

		const credentialsDb = await Db.collections.Credentials?.find({type});

		if (credentialsDb === undefined || credentialsDb.length === 0) {
			throw new Error(`No credentials of type "${type}" exist.`);
		}

		const credential = credentialsDb.find(credential => credential.name === name);

		if (credential === undefined) {
			throw new Error(`No credentials with name "${name}" exist for type "${type}".`);
		}
		
		return new Credentials(credential.name, credential.type, credential.nodesAccess, credential.data);
	}


	/**
	 * Returns all the properties of the credentials with the given name
	 *
	 * @param {string} type The name of the type to return credentials off
	 * @returns {INodeProperties[]}
	 * @memberof CredentialsHelper
	 */
	getCredentialsProperties(type: string): INodeProperties[] {
		const credentialTypes = CredentialTypes();
		const credentialTypeData = credentialTypes.getByName(type);

		if (credentialTypeData === undefined) {
			throw new Error(`The credentials of type "${type}" are not known.`);
		}

		if (credentialTypeData.extends === undefined) {
			return credentialTypeData.properties;
		}

		const combineProperties = [] as INodeProperties[];
		for (const credentialsTypeName of credentialTypeData.extends) {
			const mergeCredentialProperties = this.getCredentialsProperties(credentialsTypeName);
			NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
		}

		// The properties defined on the parent credentials take presidence
		NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);

		return combineProperties;
	}


	/**
	 * Returns the decrypted credential data with applied overwrites
	 *
	 * @param {string} name Name of the credentials to return data of
	 * @param {string} type Type of the credentials to return data of
	 * @param {boolean} [raw] Return the data as supplied without defaults or overwrites
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	async getDecrypted(name: string, type: string, mode: WorkflowExecuteMode, raw?: boolean, expressionResolveValues?: ICredentialsExpressionResolveValues): Promise<ICredentialDataDecryptedObject> {
		const credentials = await this.getCredentials(name, type);

		const decryptedDataOriginal = credentials.getData(this.encryptionKey);

		if (raw === true) {
			return decryptedDataOriginal;
		}

		return this.applyDefaultsAndOverwrites(decryptedDataOriginal, type, mode, expressionResolveValues);
	}


	/**
	 * Applies credential default data and overwrites
	 *
	 * @param {ICredentialDataDecryptedObject} decryptedDataOriginal The credential data to overwrite data on
	 * @param {string} type  Type of the credentials to overwrite data of
	 * @returns {ICredentialDataDecryptedObject}
	 * @memberof CredentialsHelper
	 */
	applyDefaultsAndOverwrites(decryptedDataOriginal: ICredentialDataDecryptedObject, type: string, mode: WorkflowExecuteMode, expressionResolveValues?: ICredentialsExpressionResolveValues): ICredentialDataDecryptedObject {
		const credentialsProperties = this.getCredentialsProperties(type);

		// Add the default credential values
		let decryptedData = NodeHelpers.getNodeParameters(credentialsProperties, decryptedDataOriginal as INodeParameters, true, false) as ICredentialDataDecryptedObject;

		if (decryptedDataOriginal.oauthTokenData !== undefined) {
			// The OAuth data gets removed as it is not defined specifically as a parameter
			// on the credentials so add it back in case it was set
			decryptedData.oauthTokenData = decryptedDataOriginal.oauthTokenData;
		}

		if (expressionResolveValues) {
			try {
				const workflow = new Workflow({ nodes: Object.values(expressionResolveValues.workflow.nodes), connections: expressionResolveValues.workflow.connectionsBySourceNode, active: false, nodeTypes: expressionResolveValues.workflow.nodeTypes });
				decryptedData = workflow.expression.getParameterValue(decryptedData as INodeParameters, expressionResolveValues.runExecutionData, expressionResolveValues.runIndex, expressionResolveValues.itemIndex, expressionResolveValues.node.name, expressionResolveValues.connectionInputData, mode, false, decryptedData) as ICredentialDataDecryptedObject;
			} catch (e) {
				e.message += ' [Error resolving credentials]';
				throw e;
			}
		} else {
			const node = {
				name: '',
				typeVersion: 1,
				type: 'mock',
				position: [0, 0],
				parameters: {} as INodeParameters,
			} as INode;

			const workflow = new Workflow({ nodes: [node!], connections: {}, active: false, nodeTypes: mockNodeTypes });

			// Resolve expressions if any are set
			decryptedData = workflow.expression.getComplexParameterValue(node!, decryptedData as INodeParameters, mode, undefined, decryptedData) as ICredentialDataDecryptedObject;
		}

		// Load and apply the credentials overwrites if any exist
		const credentialsOverwrites = CredentialsOverwrites();
		return credentialsOverwrites.applyOverwrite(type, decryptedData);
	}


	/**
	 * Updates credentials in the database
	 *
	 * @param {string} name Name of the credentials to set data of
	 * @param {string} type Type of the credentials to set data of
	 * @param {ICredentialDataDecryptedObject} data The data to set
	 * @returns {Promise<void>}
	 * @memberof CredentialsHelper
	 */
	async updateCredentials(name: string, type: string, data: ICredentialDataDecryptedObject): Promise<void> {
		const credentials = await this.getCredentials(name, type);

		if (Db.collections!.Credentials === null) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}

		credentials.setData(data, this.encryptionKey);
		const newCredentialsData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialsData.updatedAt = new Date();

		// TODO: also add user automatically depending on who is logged in, if anybody is logged in

		// Save the credentials in DB
		const findQuery = {
			name,
			type,
		};

		await Db.collections.Credentials!.update(findQuery, newCredentialsData);
	}

}
