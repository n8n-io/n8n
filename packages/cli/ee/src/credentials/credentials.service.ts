import { FindOneOptions } from 'typeorm';

import { Db } from '../../../src';
import { CredentialsService } from '../../../src/credentials/credentials.service';
import { SharedCredentials } from '../../../src/databases/entities/SharedCredentials';

export class EECreditentialsService extends CredentialsService {
	async getSharedCredentials(
		userId: string,
		credentialId: number | string,
		relations?: string[],
	): Promise<SharedCredentials | undefined> {
		console.log('ENTERPRISE SERVICE');

		const options: FindOneOptions = {
			where: {
				user: { id: userId },
				credentials: { id: credentialId },
			},
		};

		if (relations) {
			options.relations = relations;
		}

		return Db.collections.SharedCredentials.findOne(options);
	}
}
