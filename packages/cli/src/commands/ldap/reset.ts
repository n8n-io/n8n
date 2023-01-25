import * as Db from '@/Db';
import { LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { In } from 'typeorm';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default ldap state';

	async run(): Promise<void> {
		const ldapIdentities = await Db.collections.AuthIdentity.find({
			where: { providerType: 'ldap' },
			select: ['userId'],
		});
		await Db.collections.AuthProviderSyncHistory.delete({ providerType: 'ldap' });
		await Db.collections.AuthIdentity.delete({ providerType: 'ldap' });
		await Db.collections.User.delete({ id: In(ldapIdentities.map((i) => i.userId)) });
		await Db.collections.Settings.delete({ key: LDAP_FEATURE_NAME });

		this.logger.info('Successfully reset the database to default ldap state.');
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
