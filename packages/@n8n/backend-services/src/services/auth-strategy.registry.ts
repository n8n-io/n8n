import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';
import { Service } from '@n8n/di';

import type { AuthStrategy, AuthStrategyOptions } from './auth-strategy.types';

export type AuthenticationOutcome =
	| { authenticated: true }
	| { authenticated: false; challenges: string[] };

/**
 * Ordered registry of AuthStrategy implementations for the public API.
 *
 * Each strategy answers with an outcome:
 *   abstained     — try the next strategy
 *   rejected      — stop the chain, the request is unauthenticated
 *   authenticated — stop the chain, the request is authenticated
 *
 * If all strategies abstain the request is treated as unauthenticated. The challenges of every
 * strategy asked travel with the unauthenticated outcome, so the caller can put them on the 401.
 *
 * Register a strategy (e.g. from a module init):
 *   Container.get(AuthStrategyRegistry).register(myStrategy);
 *
 * Evaluate strategies (e.g. from auth middleware):
 *   const result = await registry.authenticate(req);
 *   if (!result.authenticated) res.setHeader('WWW-Authenticate', result.challenges.join(', '));
 */
@Service()
export class AuthStrategyRegistry {
	private readonly strategies: AuthStrategy[] = [];

	register(strategy: AuthStrategy): void {
		this.strategies.push(strategy);
	}

	/**
	 * Asks each strategy in order. `false`: a strategy recognised the token and refused it.
	 * `null`: every strategy abstained, so no strategy here owns the token.
	 */
	async buildContextFromToken(
		token: string,
		options?: AuthStrategyOptions,
	): Promise<TokenGrant | false | null> {
		for (const strategy of this.strategies) {
			const result = await strategy.buildTokenGrant(token, options);
			if (result !== null) return result;
		}
		return null;
	}

	async authenticate(req: AuthenticatedRequest): Promise<AuthenticationOutcome> {
		const challenges: string[] = [];
		for (const strategy of this.strategies) {
			const result = await strategy.authenticate(req);
			if (result.outcome === 'authenticated') return { authenticated: true };
			if (result.challenge) challenges.push(result.challenge);
			if (result.outcome === 'rejected') break;
			// abstained: continue to the next strategy
		}
		return { authenticated: false, challenges };
	}
}
