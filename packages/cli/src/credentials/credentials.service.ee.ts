import type { DeleteResult, EntityManager, FindOptionsWhere } from '@n8n/typeorm';
import { In, Not } from '@n8n/typeorm';
import * as Db from '@/Db';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import type { User } from '@db/entities/User';
import { UserService } from '@/services/user.service';
import { CredentialsService } from './credentials.service';
import { RoleService } from '@/services/role.service';
import Container from 'typedi';

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
		const users = await Container.get(UserService).getByIds(transaction, shareWithIds);
		const role = await Container.get(RoleService).findCredentialUserRole();

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
}
