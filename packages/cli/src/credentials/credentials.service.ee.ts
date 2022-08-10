/* eslint-disable import/no-cycle */
import { Db } from '..';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { User } from '../databases/entities/User';
import { CredentialsService } from './credentials.service';
import { RoleService } from '../role/role.service';

export class EECredentialsService extends CredentialsService {
	static async isOwned(
		user: User,
		credentialId: string,
	): Promise<{ ownsCredential: boolean; credential?: CredentialsEntity }> {
		const sharings = await this.getSharings(user, credentialId, ['credentials'], {
			allowGlobalOwner: false,
		});

		if (sharings.length > 0) {
			const [firstSharing] = sharings;
			const { credentials: credential } = firstSharing;

			return { ownsCredential: true, credential };
		}

		return { ownsCredential: false };
	}

	static async share(credential: CredentialsEntity, sharee: User): Promise<SharedCredentials> {
		const role = await RoleService.get({ scope: 'credential', name: 'editor' });

		return Db.collections.SharedCredentials.save({
			credentials: credential,
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
