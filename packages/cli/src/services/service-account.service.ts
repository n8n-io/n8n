import {
	GLOBAL_AGENT_ROLE,
	type OperationContext,
	ServiceAccountRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { UserService } from '@/services/user.service';

/**
 * Creates and removes service accounts. A service account always has a
 * personal project, because users share resources with an account through it.
 * Internal only: no endpoint calls this yet.
 */
@Service()
export class ServiceAccountService {
	constructor(
		private readonly serviceAccountRepository: ServiceAccountRepository,
		private readonly userService: UserService,
	) {}

	/** Creates an agent service account with the `global:agent` role and its personal project. */
	async create(name: string, ctx: OperationContext = {}) {
		return await this.serviceAccountRepository.createWithPersonalProject(
			{ name, role: GLOBAL_AGENT_ROLE },
			ctx,
		);
	}

	/**
	 * Removes the account through the same path as any account deletion, so
	 * every module cleanup runs for it too. `actor` is the person who caused the
	 * removal, for the audit event. Refuses when the personal project owns a
	 * workflow or a credential. Does nothing when no service account has this id.
	 */
	async remove(serviceAccountId: string, actor: User) {
		const serviceAccount = await this.serviceAccountRepository.findById(serviceAccountId);
		if (!serviceAccount) return;

		if (await this.serviceAccountRepository.personalProjectOwnsResources(serviceAccountId)) {
			throw new UserError(
				'Move the workflows and credentials of this service account to another project before you remove it',
			);
		}

		await this.userService.deleteUser(actor, serviceAccountId);
	}
}
