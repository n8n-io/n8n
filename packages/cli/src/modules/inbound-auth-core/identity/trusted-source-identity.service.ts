import { Logger } from '@n8n/backend-common';
import { TransactionRunner, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { IdentityService, type Result, type Verified } from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

import { TrustedSourceIdentityRepository } from '../database/repositories/trusted-source-identity.repository';

/** Resolves the verified caller to an n8n user through the trusted-source binding table. */
@Service()
export class TrustedSourceIdentityService extends IdentityService {
	constructor(
		private readonly logger: Logger,
		private readonly identities: TrustedSourceIdentityRepository,
		private readonly users: UserRepository,
		private readonly txRunner: TransactionRunner,
	) {
		super();
	}

	async identify(verified: Verified): Promise<Result<SecurityContext>> {
		throw new Error('not implemented');
	}
}
