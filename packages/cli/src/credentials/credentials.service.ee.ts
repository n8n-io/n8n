/* eslint-disable import/no-cycle */
import { Db } from '..';
import { CredentialsService } from './credentials.service';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { RoleService } from '../role/role.service';

export class EECredentialsService extends CredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
		const sharing = await this.getShared(user, credentialId, ['credentials'], {
			allowGlobalOwner: false,
		});

		return sharing
			? { ownsCredential: true, credential: sharing.credentials }
			: { ownsCredential: false };
	}

	static async share(credentials: CredentialsEntity, sharee: User): Promise<SharedCredentials> {
		const role = await RoleService.get({ scope: 'credential', name: 'editor' });

		return Db.collections.SharedCredentials.save({
			credentials,
			user: sharee,
			role,
		});
	}

	static async unshare(credentialId: string, shareeId: string): Promise<void> {
		return Db.collections.SharedCredentials.delete({
			credentials: { id: credentialId },
			user: { id: shareeId },
		});
	}
}
