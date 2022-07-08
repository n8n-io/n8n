/* eslint-disable import/no-cycle */
import { Db } from '..';
import { CredentialsService as BaseCredentialsService } from './credentials.service';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { RoleService } from '../role/role.service';

export class CredentialsService extends BaseCredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
		const sharedCredentials = await this.getSharedCredentials(user.id, credentialId, [
			'credentials',
		]);

		return sharedCredentials
			? { ownsCredential: true, credential: sharedCredentials.credentials }
			: { ownsCredential: false };
	}

	static async share(credentials: CredentialsEntity, sharee: User): Promise<SharedCredentials> {
		const role = await RoleService.get({ scope: 'credential', name: 'editor' });

		const newSharedCredential = new SharedCredentials();
		Object.assign(newSharedCredential, {
			credentials,
			user: sharee,
			role,
		});

		return Db.collections.SharedCredentials.save(newSharedCredential);
	}

	static async unshare(credentialsId: string, shareeId: string): Promise<void> {
		return Db.collections.SharedCredentials.delete({
			credentials: { id: credentialsId },
			user: { id: shareeId },
		});
	}
}

export const EE = {
	CredentialsService,
};
