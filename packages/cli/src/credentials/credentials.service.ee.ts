/* eslint-disable import/no-cycle */
/* eslint-disable no-param-reassign */
import { DeleteResult, EntityManager, FindManyOptions, In, Not } from 'typeorm';
import { Db, ICredentialsDb } from '..';
import { RoleService } from '../role/role.service';
import { CredentialsService } from './credentials.service';

import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { UserService } from '../user/user.service';
import type { CredentialWithSharings } from './credentials.types';

export class EECredentialsService extends CredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
		const sharing = await this.getSharing(user, credentialId, ['credentials', 'role'], {
			allowGlobalOwner: false,
		});

		if (!sharing || sharing.role.name !== 'owner') return { ownsCredential: false };

		const { credentials: credential } = sharing;

		return { ownsCredential: true, credential };
	}

	static async getSharings(
		transaction: EntityManager,
		credentialId: string,
	): Promise<SharedCredentials[]> {
		const credential = await transaction.findOne(CredentialsEntity, credentialId, {
			relations: ['shared'],
		});
		return credential?.shared ?? [];
	}

	static async pruneSharings(
		transaction: EntityManager,
		credentialId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		return transaction.delete(SharedCredentials, {
			credentials: { id: credentialId },
			user: { id: Not(In(userIds)) },
		});
	}

	static async share(
		transaction: EntityManager,
		credential: CredentialsEntity,
		shareWithIds: string[],
	): Promise<SharedCredentials[]> {
		const [users, role] = await Promise.all([
			UserService.getByIds(transaction, shareWithIds),
			RoleService.trxGet(transaction, { scope: 'credential', name: 'user' }),
		]);

		const newSharedCredentials = users
			.filter((user) => !user.isPending)
			.map((user) =>
				Db.collections.SharedCredentials.create({
					credentials: credential,
					user,
					role,
				}),
			);

		return transaction.save(newSharedCredentials);
	}

	static addOwnerAndSharings(
		credential: CredentialsEntity & CredentialWithSharings,
	): CredentialsEntity & CredentialWithSharings {
		credential.ownedBy = null;
		credential.sharedWith = [];

		credential.shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
				credential.ownedBy = { id, email, firstName, lastName };
				return;
			}

			credential.sharedWith?.push({ id, email, firstName, lastName });
		});

		// @ts-ignore
		delete credential.shared;

		return credential;
	}
}
