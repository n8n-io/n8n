import { Logger } from '@n8n/backend-common';
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
 * If all strategies abstain, or one rejects, the request is unauthenticated. The outcome then
 * carries one challenge per registered strategy, so the caller can put them on the 401: the
 * rejecting strategy's own, otherwise what its `challenge(req)` answers.
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

	constructor(private readonly logger: Logger) {}

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
		let rejectedBy: AuthStrategy | null = null;
		let specificChallenge: string | undefined;
		for (const strategy of this.strategies) {
			const result = await strategy.authenticate(req);
			if (result.outcome === 'authenticated') return { authenticated: true };
			if (result.outcome === 'rejected') {
				rejectedBy = strategy;
				specificChallenge = result.challenge;
				break;
			}
			// abstained: continue to the next strategy
		}

		const challenges: string[] = [];
		for (const strategy of this.strategies) {
			const challenge = await this.challengeOf(
				strategy,
				req,
				strategy === rejectedBy ? specificChallenge : undefined,
			);
			if (challenge) challenges.push(challenge);
		}
		return { authenticated: false, challenges };
	}

	private async challengeOf(
		strategy: AuthStrategy,
		req: AuthenticatedRequest,
		own?: string,
	): Promise<string | undefined> {
		if (own) return own;
		try {
			return await strategy.challenge?.(req);
		} catch (error) {
			this.logger.warn('Failed to get challenge from strategy', {
				strategy: strategy.constructor.name,
				error,
			});
			return undefined;
		}
	}
}
