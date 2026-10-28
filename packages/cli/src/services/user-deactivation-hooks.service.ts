import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';

type DeactivationHook = (userId: string, manager: EntityManager) => Promise<void>;

@Service()
export class UserDeactivationHooks {
	private readonly hooks = new Map<string, DeactivationHook>();

	register(name: string, hook: DeactivationHook): void {
		this.hooks.set(name, hook);
	}

	async run(userId: string, manager: EntityManager): Promise<void> {
		// Await cleanup so a failure rolls back the deactivation transaction.
		for (const hook of this.hooks.values()) {
			await hook(userId, manager);
		}
	}
}
