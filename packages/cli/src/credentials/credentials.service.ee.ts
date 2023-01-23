/* eslint-disable no-param-reassign */
import { DeleteResult, EntityManager, FindOptionsWhere, In, Not } from 'typeorm';
import * as Db from '@/Db';
import { RoleService } from '@/role/role.service';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { User } from '@db/entities/User';
import { UserService } from '@/user/user.service';
import { CredentialsService } from './credentials.service';
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
			where.userId = user.id;
		}

		return Db.collections.SharedCredentials.findOne({
			where,
			relations,
		});
	}

	static async getSharings(
		transaction: EntityManager,
		credentialId: string,
	): Promise<SharedCredentials[]> {
		const credential = await transaction.findOne(CredentialsEntity, {
			where: { id: credentialId },
			relations: ['shared'],
		});
		return credential?.shared ?? [];
	}

	static async pruneSharings(
		transaction: EntityManager,
		credentialId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		const conditions: FindOptionsWhere<SharedCredentials> = {
			credentialsId: credentialId,
			userId: Not(In(userIds)),
		};
		return transaction.delete(SharedCredentials, conditions);
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
					credentialsId: credential.id,
					userId: user.id,
					roleId: role?.id,
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
