import * as Db from '@/Db';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { In } from 'typeorm';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default ldap state';

	async run(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { AuthIdentity, AuthProviderSyncHistory, Settings, User } = Db.collections;
		const ldapIdentities = await AuthIdentity.find({
			where: { providerType: 'ldap' },
			select: ['userId'],
		});
		await AuthProviderSyncHistory.delete({ providerType: 'ldap' });
		await AuthIdentity.delete({ providerType: 'ldap' });
		await User.delete({ id: In(ldapIdentities.map((i) => i.userId)) });
		await Settings.delete({ key: LDAP_FEATURE_NAME });
		await Settings.insert({
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
