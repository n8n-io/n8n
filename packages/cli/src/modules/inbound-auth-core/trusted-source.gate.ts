import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TrustedSourceGate } from '@n8n/inbound-auth';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { TrustedSourceIdentityRepository } from './database/repositories/trusted-source-identity.repository';
import { authorizeAgainstGrant } from './grant-authorization';

/**
 * Re-checks a sealed identity on every credential resolve, without a token: the user must
 * still exist and be enabled, the binding it came through must still be active and point
 * at that user, and the user must still pass the sealed grant.
 */
@Service()
export class TrustedSourceDbGate extends TrustedSourceGate {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly identityRepository: TrustedSourceIdentityRepository,
	) {
		super();
	}

	async authorizeSealed({
		userId,
		grant,
		binding,
	}: Parameters<TrustedSourceGate['authorizeSealed']>[0]): Promise<boolean> {
		// Load the role too: a bare id lookup carries no scopes for the grant check.
		const user = await this.userRepository.findByIdWithRole(userId);
		if (!user || user.disabled) {
			this.logger.debug('Sealed identity denied: the user is missing or disabled', { userId });
			return false;
		}

		if (binding) {
			const row = await this.identityRepository.findBinding(binding.sourceId, binding.subject);
			if (row?.status !== 'active' || row.userId !== userId) {
				this.logger.debug('Sealed identity denied: the binding is not active for this user', {
					userId,
					sourceId: binding.sourceId,
					status: row?.status ?? 'missing',
				});
				return false;
			}
		}

		return await authorizeAgainstGrant(this.workflowFinderService, grant, user);
	}
}
