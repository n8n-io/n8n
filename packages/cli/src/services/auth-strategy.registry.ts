import { Service } from '@n8n/di';
import type { Request } from 'express';

import type { AuthResult, AuthStrategy } from './auth-strategy.types';

/**
 * Ordered registry of AuthStrategy implementations for the public API.
 * Strategies are tried in registration order; the first non-null result wins.
 * If all strategies return null the request is treated as unauthenticated.
 *
 * Register a strategy (e.g. from a module init):
 *   Container.get(AuthStrategyRegistry).register(myStrategy);
 *
 * Evaluate strategies (e.g. from auth middleware):
 *   const result = await registry.authenticate(req);
 *   if (!result) return false; // unauthenticated
 */
@Service()
export class AuthStrategyRegistry {
	private readonly strategies: AuthStrategy[] = [];

	register(strategy: AuthStrategy): void {
		this.strategies.push(strategy);
	}

	async authenticate(req: Request): Promise<AuthResult | null> {
		for (const strategy of this.strategies) {
			const result = await strategy.authenticate(req);
			if (result !== null) {
				return result;
			}
		}
		return null;
	}
}
