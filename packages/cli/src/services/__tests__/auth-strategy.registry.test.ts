import type { AuthenticatedRequest, TokenGrant, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { AuthStrategyRegistry } from '../auth-strategy.registry';
import type { AuthStrategy } from '../auth-strategy.types';

const makeGrant = (id: string): TokenGrant => ({
	subject: { ...mock<User>(), id },
	scopes: [],
});

describe('AuthStrategyRegistry', () => {
	let registry: AuthStrategyRegistry;

	beforeEach(() => {
		registry = new AuthStrategyRegistry();
	});

	describe('authenticate', () => {
		it('returns false when no strategies are registered', async () => {
			expect(await registry.authenticate(mock<AuthenticatedRequest>())).toBe(false);
		});

		it('returns false when all strategies abstain', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(null);
			strategy2.authenticate.mockResolvedValue(null);

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(mock<AuthenticatedRequest>())).toBe(false);
		});

		it('returns true when the first strategy succeeds', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(true);

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(mock<AuthenticatedRequest>())).toBe(true);
		});

		it('evaluates strategies in registration order', async () => {
			const order: number[] = [];
			const strategy1: AuthStrategy = {
				authenticate: jest.fn().mockImplementation(async () => {
					order.push(1);
					return null;
				}),
				buildTokenGrant: jest.fn().mockResolvedValue(null),
			};
			const strategy2: AuthStrategy = {
				authenticate: jest.fn().mockImplementation(async () => {
					order.push(2);
					return null;
				}),
				buildTokenGrant: jest.fn().mockResolvedValue(null),
			};

			registry.register(strategy1);
			registry.register(strategy2);

			await registry.authenticate(mock<AuthenticatedRequest>());

			expect(order).toEqual([1, 2]);
		});

		it('passes control to the next strategy when the current one abstains', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(null);
			strategy2.authenticate.mockResolvedValue(true);

			registry.register(strategy1);
			registry.register(strategy2);

			const req = mock<AuthenticatedRequest>();

			expect(await registry.authenticate(req)).toBe(true);
			expect(strategy1.authenticate).toHaveBeenCalledWith(req);
			expect(strategy2.authenticate).toHaveBeenCalledWith(req);
		});

		it('stops the chain immediately when a strategy returns false', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(false);

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(mock<AuthenticatedRequest>())).toBe(false);
			expect(strategy2.authenticate).not.toHaveBeenCalled();
		});

		it('stops the chain after abstain then false, without calling further strategies', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			const strategy3 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(null);
			strategy2.authenticate.mockResolvedValue(false);

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(mock<AuthenticatedRequest>())).toBe(false);
			expect(strategy3.authenticate).not.toHaveBeenCalled();
		});

		it('does not call subsequent strategies after success', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(true);

			registry.register(strategy1);
			registry.register(strategy2);

			await registry.authenticate(mock<AuthenticatedRequest>());

			expect(strategy2.authenticate).not.toHaveBeenCalled();
		});

		it('passes the request object unchanged to each strategy', async () => {
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue(null);
			registry.register(strategy);

			const req = mock<AuthenticatedRequest>();
			await registry.authenticate(req);

			expect(strategy.authenticate).toHaveBeenCalledWith(req);
		});

		it('allows the same strategy instance to be registered multiple times', async () => {
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue(true);

			registry.register(strategy);
			registry.register(strategy);

			await registry.authenticate(mock<AuthenticatedRequest>());

			// First registration succeeded — short-circuited
			expect(strategy.authenticate).toHaveBeenCalledTimes(1);
		});
	});

	describe('buildContextFromToken', () => {
		it('returns the grant from the first matching strategy and skips subsequent strategies', async () => {
			const grant = makeGrant('user-1');
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			const strategy3 = mock<AuthStrategy>();
			strategy1.buildTokenGrant.mockResolvedValue(null); // abstain
			strategy2.buildTokenGrant.mockResolvedValue(grant); // match
			// strategy3 must not be invoked

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(
				await registry.buildContextFromToken('the-token', { audience: 'mcp-server-api' }),
			).toBe(grant);

			expect(strategy1.buildTokenGrant).toHaveBeenCalledWith('the-token', {
				audience: 'mcp-server-api',
			});
			expect(strategy3.buildTokenGrant).not.toHaveBeenCalled();
		});

		it('returns null when all strategies abstain or when a strategy returns false (fail-fast)', async () => {
			const emptyRegistry = new AuthStrategyRegistry();
			expect(await emptyRegistry.buildContextFromToken('token')).toBeNull();

			const abstain = mock<AuthStrategy>();
			abstain.buildTokenGrant.mockResolvedValue(null);
			registry.register(abstain);
			expect(await registry.buildContextFromToken('token')).toBeNull();

			const unreached = mock<AuthStrategy>();
			const failing = mock<AuthStrategy>();
			failing.buildTokenGrant.mockResolvedValue(false);
			const failRegistry = new AuthStrategyRegistry();
			failRegistry.register(failing);
			failRegistry.register(unreached);
			expect(await failRegistry.buildContextFromToken('token')).toBeNull();
			expect(unreached.buildTokenGrant).not.toHaveBeenCalled();
		});
	});
});
