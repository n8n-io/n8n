import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';

import type { AuthStrategy } from './auth-strategy.types';

/**
 * Ordered registry of AuthStrategy implementations for the public API.
 *
 * Each strategy returns:
 *   null  — abstain (try next strategy)
 *   false — fail fast (stop chain, request is unauthenticated)
 *   true  — success (stop chain, request is authenticated)
 *
 * If all strategies abstain the request is treated as unauthenticated.
 *
 * Register a strategy (e.g. from a module init):
 *   Container.get(AuthStrategyRegistry).register(myStrategy);
 *
 * Evaluate strategies (e.g. from auth middleware):
 *   const authenticated = await registry.authenticate(req);
 *   if (!authenticated) return false;
 */
@Service()
export class AuthStrategyRegistry {
	private readonly strategies: AuthStrategy[] = [];

	register(strategy: AuthStrategy): void {
		this.strategies.push(strategy);
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean> {
		for (const strategy of this.strategies) {
			const result = await strategy.authenticate(req);
			if (result !== null) {
				return result; // true = success, false = fail fast
			}
			// null = this strategy abstained, continue to next
		}
		return false; // all strategies abstained = unauthenticated
	}
}
