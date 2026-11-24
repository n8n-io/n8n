import {
	GLOBAL_AGENT_ROLE,
	type OperationContext,
	ServiceAccountRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import {
	type ServiceAccountOwnerRemoval,
	type SystemDeletionActor,
	UserService,
} from '@/services/user.service';

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
	 *
	 * `owner` removes what acts as the account, such as an agent, in the same
	 * deletion. See {@link ServiceAccountOwnerRemoval}. It also runs when no
	 * service account has this id.
	 *
	 * Returns `false` when no service account has this id.
	 */
	async remove(
		serviceAccountId: string,
		actor: User | SystemDeletionActor,
		transferId: string | undefined,
		ctx: OperationContext,
		owner: ServiceAccountOwnerRemoval,
	): Promise<boolean> {
		const serviceAccount = await this.serviceAccountRepository.findById(serviceAccountId);
		if (!serviceAccount) {
			await owner.cleanUp();
			await owner.deleteInTransaction(ctx);
			return false;
		}

		await this.userService.deleteServiceAccount(actor, serviceAccountId, transferId, ctx, owner);
		return true;
	}
}
