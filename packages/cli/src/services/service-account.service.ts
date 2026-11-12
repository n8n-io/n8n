import {
	GLOBAL_AGENT_ROLE,
	type OperationContext,
	ServiceAccountRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

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
	 * Removes the account through the same path as a person, so every module
	 * cleanup runs for it too. `actor` is the person who caused the removal, for
	 * the audit event. With `transferId`, the work of the personal project moves
	 * to that project. Without it, the work is deleted with the account.
	 * Does nothing when no service account has this id.
	 */
	async remove(serviceAccountId: string, actor: User, transferId?: string) {
		const serviceAccount = await this.serviceAccountRepository.findById(serviceAccountId);
		if (!serviceAccount) return;

		await this.userService.deleteUser(actor, serviceAccountId, transferId);
	}
}
