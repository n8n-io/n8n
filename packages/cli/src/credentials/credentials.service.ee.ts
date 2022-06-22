/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable import/no-cycle */
import { FindOneOptions } from 'typeorm';

import { Db } from '..';
import { CredentialsService } from './credentials.service';
import { SharedCredentials } from '../databases/entities/SharedCredentials';

export class EECredentialsService extends CredentialsService {
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
