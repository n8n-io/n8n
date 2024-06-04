import { Credentials } from 'n8n-core';
import type {
	DisplayCondition,
	IDataObject,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import * as Db from '@/Db';
import type { ICredentialsDb } from '@/Interfaces';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { ExternalHooks } from '@/ExternalHooks';
import type { IDependency, IJsonSchema } from '../../../types';
import type { CredentialRequest } from '@/requests';
import { Container } from 'typedi';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { InternalHooks } from '@/InternalHooks';

export async function getCredentials(credentialId: string): Promise<ICredentialsDb | null> {
	return await Container.get(CredentialsRepository).findOneBy({ id: credentialId });
}

export async function getSharedCredentials(
	userId: string,
	credentialId: string,
): Promise<SharedCredentials | null> {
	return await Container.get(SharedCredentialsRepository).findOne({
		where: {
			project: { projectRelations: { userId } },
			credentialsId: credentialId,
		},
		relations: ['credentials'],
	});
}

export async function createCredential(
	properties: CredentialRequest.CredentialProperties,
): Promise<CredentialsEntity> {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, properties);

	return newCredential;
}

export async function saveCredential(
	credential: CredentialsEntity,
	user: User,
	encryptedData: ICredentialsDb,
): Promise<CredentialsEntity> {
	await Container.get(ExternalHooks).run('credentials.create', [encryptedData]);
	void Container.get(InternalHooks).onUserCreatedCredentials({
		user,
		credential_name: credential.name,
		credential_type: credential.type,
		credential_id: credential.id,
		public_api: true,
	});

	return await Db.transaction(async (transactionManager) => {
		const savedCredential = await transactionManager.save<CredentialsEntity>(credential);

		savedCredential.data = credential.data;

		const newSharedCredential = new SharedCredentials();

		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			user.id,
			transactionManager,
		);

		Object.assign(newSharedCredential, {
			role: 'credential:owner',
			credentials: savedCredential,
			projectId: personalProject.id,
		});

		await transactionManager.save<SharedCredentials>(newSharedCredential);

		return savedCredential;
	});
}

export async function removeCredential(
	user: User,
	credentials: CredentialsEntity,
): Promise<ICredentialsDb> {
	await Container.get(ExternalHooks).run('credentials.delete', [credentials.id]);
	void Container.get(InternalHooks).onUserDeletedCredentials({
		user,
		credential_name: credentials.name,
		credential_type: credentials.type,
		credential_id: credentials.id,
	});
	return await Container.get(CredentialsRepository).remove(credentials);
}

export async function encryptCredential(credential: CredentialsEntity): Promise<ICredentialsDb> {
	// Encrypt the data
	const coreCredential = new Credentials({ id: null, name: credential.name }, credential.type);

	// @ts-ignore
	coreCredential.setData(credential.data);

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
		const { data, shared, ...rest } = credential;
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
	// eslint-disable-next-line complexity
	properties.forEach((property) => {
		if (property.required) {
			requiredFields.push(property.name);
		}
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
			let dependantValue: DisplayCondition | string | number | boolean = '';

			if (displayOptionsValues && Array.isArray(displayOptionsValues) && displayOptionsValues[0]) {
				dependantValue = displayOptionsValues[0];
			}

			if (propertyRequiredDependencies[dependantName] === undefined) {
				propertyRequiredDependencies[dependantName] = {};
			}

			if (!resolveProperties.includes(dependantName)) {
				let conditionalValue;
				if (typeof dependantValue === 'object' && dependantValue._cnd) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const [key, targetValue] = Object.entries(dependantValue._cnd)[0];

					if (key === 'eq') {
						conditionalValue = {
							const: [targetValue],
						};
					} else if (key === 'not') {
						conditionalValue = {
							not: {
								const: [targetValue],
							},
						};
					} else if (key === 'gt') {
						conditionalValue = {
							type: 'number',
							exclusiveMinimum: [targetValue],
						};
					} else if (key === 'gte') {
						conditionalValue = {
							type: 'number',
							minimum: [targetValue],
						};
					} else if (key === 'lt') {
						conditionalValue = {
							type: 'number',
							exclusiveMaximum: [targetValue],
						};
					} else if (key === 'lte') {
						conditionalValue = {
							type: 'number',
							maximum: [targetValue],
						};
					} else if (key === 'startsWith') {
						conditionalValue = {
							type: 'string',
							pattern: `^${targetValue}`,
						};
					} else if (key === 'endsWith') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}$`,
						};
					} else if (key === 'includes') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}`,
						};
					} else if (key === 'regex') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}`,
						};
					} else {
						conditionalValue = {
							enum: [dependantValue],
						};
					}
				} else {
					conditionalValue = {
						enum: [dependantValue],
					};
				}
				propertyRequiredDependencies[dependantName] = {
					if: {
						properties: {
							[dependantName]: conditionalValue,
						},
					},
					then: {
						allOf: [],
					},
					else: {
						allOf: [],
					},
				};
			}

			propertyRequiredDependencies[dependantName].then?.allOf.push({ required: [property.name] });
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
