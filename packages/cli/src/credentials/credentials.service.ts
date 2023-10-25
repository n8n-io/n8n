import { Credentials } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	INodeCredentialTestResult,
	INodeProperties,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, deepCopy, LoggerProxy, NodeHelpers } from 'n8n-workflow';
import { Container } from 'typedi';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { In, Like } from 'typeorm';

import * as Db from '@/Db';
import type { ICredentialsDb } from '@/Interfaces';
import { CredentialsHelper, createCredentialsFromCredentialsEntity } from '@/CredentialsHelper';
import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { validateEntity } from '@/GenericHelpers';
import { ExternalHooks } from '@/ExternalHooks';
import type { User } from '@db/entities/User';
import type { CredentialRequest, ListQuery } from '@/requests';
import { CredentialTypes } from '@/CredentialTypes';
import { RoleService } from '@/services/role.service';
import { OwnershipService } from '@/services/ownership.service';

export class CredentialsService {
	static async get(
		where: FindOptionsWhere<ICredentialsDb>,
		options?: { relations: string[] },
	): Promise<ICredentialsDb | null> {
		return Db.collections.Credentials.findOne({
			relations: options?.relations,
			where,
		});
	}

	private static toFindManyOptions(listQueryOptions?: ListQuery.Options) {
		const findManyOptions: FindManyOptions<CredentialsEntity> = {};

		type Select = Array<keyof CredentialsEntity>;

		const defaultRelations = ['shared', 'shared.role', 'shared.user'];
		const defaultSelect: Select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];

		if (!listQueryOptions) return { select: defaultSelect, relations: defaultRelations };

		const { filter, select, take, skip } = listQueryOptions;

		if (typeof filter?.name === 'string' && filter?.name !== '') {
			filter.name = Like(`%${filter.name}%`);
		}

		if (typeof filter?.type === 'string' && filter?.type !== '') {
			filter.type = Like(`%${filter.type}%`);
		}

		if (filter) findManyOptions.where = filter;
		if (select) findManyOptions.select = select;
		if (take) findManyOptions.take = take;
		if (skip) findManyOptions.skip = skip;

		if (take && select && !select?.id) {
			findManyOptions.select = { ...findManyOptions.select, id: true }; // pagination requires id
		}

		if (!findManyOptions.select) {
			findManyOptions.select = defaultSelect;
			findManyOptions.relations = defaultRelations;
		}

		return findManyOptions;
	}

	private static addOwnedByAndSharedWith(credentials: CredentialsEntity[]) {
		return credentials.map((c) => Container.get(OwnershipService).addOwnedByAndSharedWith(c));
	}

	static async getMany(
		user: User,
		options: { listQueryOptions?: ListQuery.Options; onlyOwn?: boolean } = {},
	) {
		const findManyOptions = this.toFindManyOptions(options.listQueryOptions);

		const returnAll = user.globalRole.name === 'owner' && !options.onlyOwn;
		const isDefaultSelect = !options.listQueryOptions?.select;

		if (returnAll) {
			const credentials = await Db.collections.Credentials.find(findManyOptions);

			return isDefaultSelect ? this.addOwnedByAndSharedWith(credentials) : credentials;
		}

		const ids = await this.getAccessibleCredentials(user.id);

		const credentials = await Db.collections.Credentials.find({
			...findManyOptions,
			where: { ...findManyOptions.where, id: In(ids) }, // only accessible credentials
		});

		return isDefaultSelect ? this.addOwnedByAndSharedWith(credentials) : credentials;
	}

	/**
	 * Get the IDs of all credentials owned by or shared with a user.
	 */
	private static async getAccessibleCredentials(userId: string) {
		const sharings = await Db.collections.SharedCredentials.find({
			relations: ['role'],
			where: {
				userId,
				role: { name: In(['owner', 'user']), scope: 'credential' },
			},
		});

		return sharings.map((s) => s.credentialsId);
	}

	static async getManyByIds(ids: string[], { withSharings } = { withSharings: false }) {
		const options: FindManyOptions<CredentialsEntity> = { where: { id: In(ids) } };

		if (withSharings) {
			options.relations = ['shared', 'shared.user', 'shared.role'];
		}

		return Db.collections.Credentials.find(options);
	}

	/**
	 * Retrieve the sharing that matches a user and a credential.
	 */
	static async getSharing(
		user: User,
		credentialId: string,
		relations: string[] = ['credentials'],
		{ allowGlobalOwner } = { allowGlobalOwner: true },
	): Promise<SharedCredentials | null> {
		const where: FindOptionsWhere<SharedCredentials> = { credentialsId: credentialId };

		// Omit user from where if the requesting user is the global
		// owner. This allows the global owner to view and delete
		// credentials they don't own.
		if (!allowGlobalOwner || user.globalRole.name !== 'owner') {
			Object.assign(where, {
				userId: user.id,
				role: { name: 'owner' },
			});
			if (!relations.includes('role')) {
				relations.push('role');
			}
		}

		return Db.collections.SharedCredentials.findOne({ where, relations });
	}

	static async prepareCreateData(
		data: CredentialRequest.CredentialProperties,
	): Promise<CredentialsEntity> {
		const { id, ...rest } = data;

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const newCredentials = Db.collections.Credentials.create(rest as ICredentialsDb);

		await validateEntity(newCredentials);

		// Add the date for newly added node access permissions
		for (const nodeAccess of newCredentials.nodesAccess) {
			nodeAccess.date = new Date();
		}

		return newCredentials;
	}

	static async prepareUpdateData(
		data: CredentialRequest.CredentialProperties,
		decryptedData: ICredentialDataDecryptedObject,
	): Promise<CredentialsEntity> {
		const mergedData = deepCopy(data);
		if (mergedData.data) {
			mergedData.data = this.unredact(mergedData.data, decryptedData);
		}

		// This saves us a merge but requires some type casting. These
		// types are compatible for this case.
		const updateData = Db.collections.Credentials.create(mergedData as ICredentialsDb);

		await validateEntity(updateData);

		// Add the date for newly added node access permissions
		for (const nodeAccess of updateData.nodesAccess) {
			if (!nodeAccess.date) {
				nodeAccess.date = new Date();
			}
		}

		// Do not overwrite the oauth data else data like the access or refresh token would get lost
		// everytime anybody changes anything on the credentials even if it is just the name.
		if (decryptedData.oauthTokenData) {
			// @ts-ignore
			updateData.data.oauthTokenData = decryptedData.oauthTokenData;
		}
		return updateData;
	}

	static createEncryptedData(credentialId: string | null, data: CredentialsEntity): ICredentialsDb {
		const credentials = new Credentials(
			{ id: credentialId, name: data.name },
			data.type,
			data.nodesAccess,
		);

		credentials.setData(data.data as unknown as ICredentialDataDecryptedObject);

		const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

		// Add special database related data
		newCredentialData.updatedAt = new Date();

		return newCredentialData;
	}

	static decrypt(credential: CredentialsEntity): ICredentialDataDecryptedObject {
		const coreCredential = createCredentialsFromCredentialsEntity(credential);
		return coreCredential.getData();
	}

	static async update(
		credentialId: string,
		newCredentialData: ICredentialsDb,
	): Promise<ICredentialsDb | null> {
		await Container.get(ExternalHooks).run('credentials.update', [newCredentialData]);

		// Update the credentials in DB
		await Db.collections.Credentials.update(credentialId, newCredentialData);

		// We sadly get nothing back from "update". Neither if it updated a record
		// nor the new value. So query now the updated entry.
		return Db.collections.Credentials.findOneBy({ id: credentialId });
	}

	static async save(
		credential: CredentialsEntity,
		encryptedData: ICredentialsDb,
		user: User,
	): Promise<CredentialsEntity> {
		// To avoid side effects
		const newCredential = new CredentialsEntity();
		Object.assign(newCredential, credential, encryptedData);

		await Container.get(ExternalHooks).run('credentials.create', [encryptedData]);

		const role = await Container.get(RoleService).findCredentialOwnerRole();

		const result = await Db.transaction(async (transactionManager) => {
			const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

			savedCredential.data = newCredential.data;

			const newSharedCredential = new SharedCredentials();

			Object.assign(newSharedCredential, {
				role,
				user,
				credentials: savedCredential,
			});

			await transactionManager.save<SharedCredentials>(newSharedCredential);

			return savedCredential;
		});
		LoggerProxy.verbose('New credential created', {
			credentialId: newCredential.id,
			ownerId: user.id,
		});
		return result;
	}

	static async delete(credentials: CredentialsEntity): Promise<void> {
		await Container.get(ExternalHooks).run('credentials.delete', [credentials.id]);

		await Db.collections.Credentials.remove(credentials);
	}

	static async test(
		user: User,
		credentials: ICredentialsDecrypted,
	): Promise<INodeCredentialTestResult> {
		const helper = Container.get(CredentialsHelper);
		return helper.testCredentials(user, credentials.type, credentials);
	}

	// Take data and replace all sensitive values with a sentinel value.
	// This will replace password fields and oauth data.
	static redact(
		data: ICredentialDataDecryptedObject,
		credential: CredentialsEntity,
	): ICredentialDataDecryptedObject {
		const copiedData = deepCopy(data);

		const credTypes = Container.get(CredentialTypes);
		let credType: ICredentialType;
		try {
			credType = credTypes.getByName(credential.type);
		} catch {
			// This _should_ only happen when testing. If it does happen in
			// production it means it's either a mangled credential or a
			// credential for a removed community node. Either way, there's
			// no way to know what to redact.
			return data;
		}

		const getExtendedProps = (type: ICredentialType) => {
			const props: INodeProperties[] = [];
			for (const e of type.extends ?? []) {
				const extendsType = credTypes.getByName(e);
				const extendedProps = getExtendedProps(extendsType);
				NodeHelpers.mergeNodeProperties(props, extendedProps);
			}
			NodeHelpers.mergeNodeProperties(props, type.properties);
			return props;
		};
		const properties = getExtendedProps(credType);

		for (const dataKey of Object.keys(copiedData)) {
			// The frontend only cares that this value isn't falsy.
			if (dataKey === 'oauthTokenData') {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
				continue;
			}
			const prop = properties.find((v) => v.name === dataKey);
			if (!prop) {
				continue;
			}
			if (
				prop.typeOptions?.password &&
				(!(copiedData[dataKey] as string).startsWith('={{') || prop.noDataExpression)
			) {
				if (copiedData[dataKey].toString().length > 0) {
					copiedData[dataKey] = CREDENTIAL_BLANKING_VALUE;
				} else {
					copiedData[dataKey] = CREDENTIAL_EMPTY_VALUE;
				}
			}
		}

		return copiedData;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static unredactRestoreValues(unmerged: any, replacement: any) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		for (const [key, value] of Object.entries(unmerged)) {
			if (value === CREDENTIAL_BLANKING_VALUE || value === CREDENTIAL_EMPTY_VALUE) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				unmerged[key] = replacement[key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				key in replacement &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof replacement[key] === 'object' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				replacement[key] !== null
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this.unredactRestoreValues(value, replacement[key]);
			}
		}
	}

	// Take unredacted data (probably from the DB) and merge it with
	// redacted data to create an unredacted version.
	static unredact(
		redactedData: ICredentialDataDecryptedObject,
		savedData: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject {
		// Replace any blank sentinel values with their saved version
		const mergedData = deepCopy(redactedData);
		this.unredactRestoreValues(mergedData, savedData);
		return mergedData;
	}
}
