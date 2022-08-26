/* eslint-disable import/no-cycle */
import { DeleteResult, EntityManager, In, Not } from 'typeorm';
import { Db } from '..';
import { RoleService } from '../role/role.service';
import { CredentialsService } from './credentials.service';

import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { UserService } from '../user/user.service';

export class EECredentialsService extends CredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
		const sharing = await this.getSharing(user, credentialId, ['credentials'], {
			allowGlobalOwner: false,
		});

		if (!sharing) return { ownsCredential: false };

		const { credentials: credential } = sharing;

		return { ownsCredential: true, credential };
	}

	static async trxGetSharings(
		trx: EntityManager,
		credentialId: string,
	): Promise<SharedCredentials[]> {
		const credential = await trx.findOne(CredentialsEntity, credentialId, {
			relations: ['shared'],
		});
		return credential?.shared ?? [];
	}

	static async trxPruneSharings(
		trx: EntityManager,
		credentialId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		return trx.delete(SharedCredentials, {
			credentials: { id: credentialId },
			user: { id: Not(In(userIds)) },
		});
	}

	static async trxShare(
		trx: EntityManager,
		credential: CredentialsEntity,
		shareWith: string[],
	): Promise<SharedCredentials[]> {
		const role = await RoleService.trxGet(trx, { scope: 'credential', name: 'user' });
		const users = await UserService.trxGetByIds(trx, shareWith);

		const newSharedCredentials = users
			.filter((user) => !user.isPending)
			.map((user) =>
				Db.collections.SharedCredentials.create({
					credentials: credential,
					user,
					role,
				}),
			);

		return trx.save(newSharedCredentials);
	}
}
