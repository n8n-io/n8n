import type { User, ICredentialsDb } from '@n8n/db';
import {
	CredentialsEntity,
	SharedCredentials,
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { Credentials } from 'n8n-core';
import type {
	DisplayCondition,
	IDataObject,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import type { CredentialRequest } from '@/requests';

import type { IDependency, IJsonSchema } from '../../../types';

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
	const projectRepository = Container.get(ProjectRepository);
	const { manager: dbManager } = projectRepository;
	const result = await dbManager.transaction(async (transactionManager) => {
		const savedCredential = await transactionManager.save<CredentialsEntity>(credential);

		savedCredential.data = credential.data;

		const newSharedCredential = new SharedCredentials();

		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
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

	await Container.get(ExternalHooks).run('credentials.create', [encryptedData]);

	const project = await Container.get(SharedCredentialsRepository).findCredentialOwningProject(
		credential.id,
	);

	Container.get(EventService).emit('credentials-created', {
		user,
		credentialType: credential.type,
		credentialId: credential.id,
		projectId: project?.id,
		projectType: project?.type,
		publicApi: true,
	});

	return result;
}

export async function removeCredential(
	user: User,
	credentials: CredentialsEntity,
): Promise<ICredentialsDb> {
	await Container.get(ExternalHooks).run('credentials.delete', [credentials.id]);
	Container.get(EventService).emit('credentials-deleted', {
		user,
		credentialType: credentials.type,
		credentialId: credentials.id,
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

	// Track properties with display conditions
	const conditionalProperties: { [key: string]: INodeProperties[] } = {};
	const unconditionalProperties: INodeProperties[] = [];
	let requiredFields: string[] = [];

	// Separate conditional and unconditional properties
	properties.forEach((property) => {
		if (property.displayOptions?.show) {
			const dependantName = Object.keys(property.displayOptions.show)[0];
			if (!conditionalProperties[dependantName]) {
				conditionalProperties[dependantName] = [];
			}
			conditionalProperties[dependantName].push(property);
		} else {
			unconditionalProperties.push(property);
			if (property.required) {
				requiredFields.push(property.name);
			}
		}
	});

	// Add unconditional properties to schema
	unconditionalProperties.forEach((property) => {
		if (property.type === 'options') {
			jsonSchema.properties[property.name] = {
				type: 'string',
				enum: property.options?.map((option: INodePropertyOptions) => option.value),
			};
		} else {
			jsonSchema.properties[property.name] = {
				type: property.type,
			};
		}
	});

	// Handle conditional properties
	const allOfConditions: any[] = [];

	Object.entries(conditionalProperties).forEach(([dependantName, dependentProps]) => {
		// Group properties by their condition values
		const conditionGroups: { [key: string]: INodeProperties[] } = {};

		dependentProps.forEach((prop) => {
			const displayOptionsValues = prop.displayOptions?.show?.[dependantName];
			if (displayOptionsValues && Array.isArray(displayOptionsValues)) {
				const conditionValue = displayOptionsValues[0];
				const key = String(conditionValue);
				if (!conditionGroups[key]) {
					conditionGroups[key] = [];
				}
				conditionGroups[key].push(prop);
			}
		});

		// Create conditional schemas for each condition value
		Object.entries(conditionGroups).forEach(([conditionValue, props]) => {
			const conditionSchema: any = {
				if: {
					properties: {
						[dependantName]: { const: conditionValue },
					},
				},
				then: {
					properties: {},
					additionalProperties: false,
				},
			};

			// Add properties that should be available for this condition
			props.forEach((prop) => {
				if (prop.type === 'options') {
					conditionSchema.then.properties[prop.name] = {
						type: 'string',
						enum: prop.options?.map((option: INodePropertyOptions) => option.value),
					};
				} else {
					conditionSchema.then.properties[prop.name] = {
						type: prop.type,
					};
				}
			});

			allOfConditions.push(conditionSchema);
		});
	});

	// Set required fields and allOf conditions
	jsonSchema.required = requiredFields;
	if (allOfConditions.length > 0) {
		jsonSchema.allOf = allOfConditions;
	} else {
		delete jsonSchema.allOf;
	}

	return jsonSchema as unknown as IDataObject;
}
