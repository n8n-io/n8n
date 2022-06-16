/* eslint-disable import/no-cycle */
import { Credentials } from 'n8n-core';
import { FindOneOptions } from 'typeorm';

import { Db } from '..';
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';

export class CredentialsService {
	async getSharedCredentials(
		userId: string,
		credentialId: number | string,
		relations?: string[],
	): Promise<SharedCredentials | undefined> {
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

	createCredentiasFromCredentialsEntity(
		credential: CredentialsEntity,
		encrypt = false,
	): Credentials {
		const { id, name, type, nodesAccess, data } = credential;
		if (encrypt) {
			return new Credentials({ id: null, name }, type, nodesAccess);
		}
		return new Credentials({ id: id.toString(), name }, type, nodesAccess, data);
	}
}
