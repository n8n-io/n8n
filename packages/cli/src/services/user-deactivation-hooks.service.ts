import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

type DeactivationHook = (userId: string, ctx: OperationContext) => Promise<void>;

@Service()
export class UserDeactivationHooks {
	private readonly hooks = new Map<string, DeactivationHook>();

	register(name: string, hook: DeactivationHook): void {
		this.hooks.set(name, hook);
	}

	async run(userId: string, ctx: OperationContext): Promise<void> {
		// Await cleanup so a failure rolls back the deactivation transaction.
		for (const hook of this.hooks.values()) {
			await hook(userId, ctx);
		}
	}
}
