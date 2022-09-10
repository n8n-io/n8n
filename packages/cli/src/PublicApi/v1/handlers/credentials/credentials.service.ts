/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { FindOneOptions } from 'typeorm';
import { UserSettings, Credentials } from 'n8n-core';
import { IDataObject, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { Db, ICredentialsDb } from '../../../..';
import { CredentialsEntity } from '../../../../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../../../../databases/entities/SharedCredentials';
import { User } from '../../../../databases/entities/User';
import { externalHooks } from '../../../../Server';
import { IDependency, IJsonSchema } from '../../../types';
import { CredentialRequest } from '../../../../requests';

export async function getCredentials(
	credentialId: number | string,
): Promise<ICredentialsDb | undefined> {
	return Db.collections.Credentials.findOne(credentialId);
}

export async function getSharedCredentials(
	userId: string,
	credentialId: number | string,
	relations?: string[],
): Promise<SharedCredentials | undefined> {
	const options: FindOneOptions = {
		where: {
			user: { id: userId },
			credentials: { id: credentialId },
		},
	};

	if (relations) {
		options.relations = relations;
	}

	return Db.collections.SharedCredentials.findOne(options);
}

export async function createCredential(
	properties: CredentialRequest.CredentialProperties,
): Promise<CredentialsEntity> {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, properties);

	if (!newCredential.nodesAccess || newCredential.nodesAccess.length === 0) {
		newCredential.nodesAccess = [
			{
				nodeType: `n8n-nodes-base.${properties.type?.toLowerCase() ?? 'unknown'}`,
				date: new Date(),
			},
		];
	} else {
		// Add the added date for node access permissions
		newCredential.nodesAccess.forEach((nodeAccess) => {
			// eslint-disable-next-line no-param-reassign
			nodeAccess.date = new Date();
		});
	}

	return newCredential;
}

export async function saveCredential(
	credential: CredentialsEntity,
	user: User,
	encryptedData: ICredentialsDb,
): Promise<CredentialsEntity> {
	const role = await Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'credential',
	});

	await externalHooks.run('credentials.create', [encryptedData]);

	return Db.transaction(async (transactionManager) => {
		const savedCredential = await transactionManager.save<CredentialsEntity>(credential);

		savedCredential.data = credential.data;

		const newSharedCredential = new SharedCredentials();

		Object.assign(newSharedCredential, {
			role,
			user,
			credentials: savedCredential,
		});

		await transactionManager.save<SharedCredentials>(newSharedCredential);

		return savedCredential;
	});
}

export async function removeCredential(credentials: CredentialsEntity): Promise<ICredentialsDb> {
	await externalHooks.run('credentials.delete', [credentials.id]);
	return Db.collections.Credentials.remove(credentials);
}

export async function encryptCredential(credential: CredentialsEntity): Promise<ICredentialsDb> {
	const encryptionKey = await UserSettings.getEncryptionKey();

	// Encrypt the data
	const coreCredential = new Credentials(
		{ id: null, name: credential.name },
		credential.type,
		credential.nodesAccess,
	);

	// @ts-ignore
	coreCredential.setData(credential.data, encryptionKey);

	return coreCredential.getDataToSave() as ICredentialsDb;
}

export function sanitizeCredentials(credentials: CredentialsEntity): Partial<CredentialsEntity>;
export function sanitizeCredentials(
	credentials: CredentialsEntity[],
): Array<Partial<CredentialsEntity>>;

export function sanitizeCredentials(
	credentials: CredentialsEntity | CredentialsEntity[],
): Partial<CredentialsEntity> | Array<Partial<CredentialsEntity>> {
	const argIsArray = Array.isArray(credentials);
	const credentialsList = argIsArray ? credentials : [credentials];

	const sanitizedCredentials = credentialsList.map((credential) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { data, nodesAccess, shared, ...rest } = credential;
		return rest;
	});

	return argIsArray ? sanitizedCredentials : sanitizedCredentials[0];
}

/**
 * toJsonSchema
 * Take an array of credentials parameter and map it
 * to a JSON Schema (see https://json-schema.org/). With
 * the JSON Schema definition we can validate the credential's shape
 * @param properties - Credentials properties
 * @returns The credentials schema definition.
 */
export function toJsonSchema(properties: INodeProperties[]): IDataObject {
	const jsonSchema: IJsonSchema = {
		additionalProperties: false,
		type: 'object',
		properties: {},
		allOf: [],
		required: [],
	};

	const optionsValues: { [key: string]: string[] } = {};
	const resolveProperties: string[] = [];

	// get all possible values of properties type "options"
	// so we can later resolve the displayOptions dependencies
	properties
		.filter((property) => property.type === 'options')
		.forEach((property) => {
			Object.assign(optionsValues, {
				[property.name]: property.options?.map((option: INodePropertyOptions) => option.value),
			});
		});

	let requiredFields: string[] = [];

	const propertyRequiredDependencies: { [key: string]: IDependency } = {};

	// add all credential's properties to the properties
	// object in the JSON Schema definition. This allows us
	// to later validate that only this properties are set in
	// the credentials sent in the API call.
	properties.forEach((property) => {
		requiredFields.push(property.name);
		if (property.type === 'options') {
			// if the property is type options,
			// include all possible values in the enum property.
			Object.assign(jsonSchema.properties, {
				[property.name]: {
					type: 'string',
					enum: property.options?.map((data: INodePropertyOptions) => data.value),
				},
			});
		} else {
			Object.assign(jsonSchema.properties, {
				[property.name]: {
					type: property.type,
				},
			});
		}

		// if the credential property has a dependency
		// then add a JSON Schema condition that satisfy each property value
		// e.x: If A has value X then required B, else required C
		// see https://json-schema.org/understanding-json-schema/reference/conditionals.html#if-then-else
		if (property.displayOptions?.show) {
			const dependantName = Object.keys(property.displayOptions?.show)[0] || '';
			const displayOptionsValues = property.displayOptions.show[dependantName];
			let dependantValue: string | number | boolean = '';

			if (displayOptionsValues && Array.isArray(displayOptionsValues) && displayOptionsValues[0]) {
				// eslint-disable-next-line prefer-destructuring
				dependantValue = displayOptionsValues[0];
			}

			if (propertyRequiredDependencies[dependantName] === undefined) {
				propertyRequiredDependencies[dependantName] = {};
			}

			if (!resolveProperties.includes(dependantName)) {
				propertyRequiredDependencies[dependantName] = {
					if: {
						properties: {
							[dependantName]: {
								enum: [dependantValue],
							},
						},
					},
					then: {
						oneOf: [],
					},
					else: {
						allOf: [],
					},
				};
			}

			propertyRequiredDependencies[dependantName].then?.oneOf.push({ required: [property.name] });
			propertyRequiredDependencies[dependantName].else?.allOf.push({
				not: { required: [property.name] },
			});

			resolveProperties.push(dependantName);
			// remove global required
			requiredFields = requiredFields.filter((field) => field !== property.name);
		}
	});
	Object.assign(jsonSchema, { required: requiredFields });

	jsonSchema.allOf = Object.values(propertyRequiredDependencies);

	if (!jsonSchema.allOf.length) {
		delete jsonSchema.allOf;
	}

	return jsonSchema as unknown as IDataObject;
}
