import * as Db from '@/Db';
import { LDAP_FEATURE_NAME, SignInType } from '@/Ldap/constants';
import { BaseCommand } from '../BaseCommand';

export class Reset extends BaseCommand {
	static description = '\nResets the database to the default ldap state';

	async run(): Promise<void> {
		await Db.collections.User.delete({ signInType: SignInType.LDAP });

		await Db.collections.LdapSyncHistory.delete({});

		await Db.collections.FeatureConfig.delete({ name: LDAP_FEATURE_NAME });

		this.logger.info('Successfully reset the database to default ldap state.');
	}

	async catch(error: Error): Promise<void> {
		this.logger.error('Error resetting database. See log messages for details.');
		this.logger.error(error.message);
		this.exit(1);
	}
}
