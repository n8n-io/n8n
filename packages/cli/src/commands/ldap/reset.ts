import Container from 'typedi';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { AuthIdentityRepository } from '@db/repositories/authIdentity.repository';
import { AuthProviderSyncHistoryRepository } from '@db/repositories/authProviderSyncHistory.repository';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default ldap state';

	async run(): Promise<void> {
		const ldapIdentities = await Container.get(AuthIdentityRepository).find({
			where: { providerType: 'ldap' },
			select: ['userId'],
		});
		await Container.get(AuthProviderSyncHistoryRepository).delete({ providerType: 'ldap' });
		await Container.get(AuthIdentityRepository).delete({ providerType: 'ldap' });
		await Container.get(UserRepository).deleteMany(ldapIdentities.map((i) => i.userId));
		await Container.get(SettingsRepository).delete({ key: LDAP_FEATURE_NAME });
		await Container.get(SettingsRepository).insert({
			key: LDAP_FEATURE_NAME,
			value: JSON.stringify(LDAP_DEFAULT_CONFIGURATION),
			loadOnStartup: true,
		});

		this.logger.info('Successfully reset the database to default ldap state.');
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
	}
}
