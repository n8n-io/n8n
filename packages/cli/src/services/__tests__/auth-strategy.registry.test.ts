import { mock } from 'jest-mock-extended';
import type { Request } from 'express';

import { AuthStrategyRegistry } from '../auth-strategy.registry';
import type { AuthStrategy, AuthResult } from '../auth-strategy.types';

describe('AuthStrategyRegistry', () => {
	let registry: AuthStrategyRegistry;

	beforeEach(() => {
		registry = new AuthStrategyRegistry();
	});

	describe('authenticate', () => {
		it('returns null when no strategies are registered', async () => {
			expect(await registry.authenticate(mock<Request>())).toBeNull();
		});

		it('returns null when all strategies return null', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(null);
			strategy2.authenticate.mockResolvedValue(null);

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(mock<Request>())).toBeNull();
		});

		it('returns the first non-null result', async () => {
			const firstResult: AuthResult = { userId: 'user-1', scopes: ['workflow:read'] };
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(firstResult);
			strategy2.authenticate.mockResolvedValue({ userId: 'user-2', scopes: [] });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(mock<Request>())).toBe(firstResult);
		});

		it('evaluates strategies in registration order', async () => {
			const order: number[] = [];
			const strategy1: AuthStrategy = {
				authenticate: jest.fn().mockImplementation(async () => {
					order.push(1);
					return null;
				}),
			};
			const strategy2: AuthStrategy = {
				authenticate: jest.fn().mockImplementation(async () => {
					order.push(2);
					return null;
				}),
			};

			registry.register(strategy1);
			registry.register(strategy2);

			await registry.authenticate(mock<Request>());

			expect(order).toEqual([1, 2]);
		});

		it('passes control to the next strategy when the current one returns null', async () => {
			const secondResult: AuthResult = { userId: 'user-2', scopes: ['workflow:read'] };
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue(null);
			strategy2.authenticate.mockResolvedValue(secondResult);

			registry.register(strategy1);
			registry.register(strategy2);

			const req = mock<Request>();
			const result = await registry.authenticate(req);

			expect(result).toBe(secondResult);
			expect(strategy1.authenticate).toHaveBeenCalledWith(req);
			expect(strategy2.authenticate).toHaveBeenCalledWith(req);
		});

		it('does not call subsequent strategies after a match', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ userId: 'user-1', scopes: [] });

			registry.register(strategy1);
			registry.register(strategy2);

			await registry.authenticate(mock<Request>());

			expect(strategy2.authenticate).not.toHaveBeenCalled();
		});

		it('passes the request object unchanged to each strategy', async () => {
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue(null);
			registry.register(strategy);

			const req = mock<Request>();
			await registry.authenticate(req);

			expect(strategy.authenticate).toHaveBeenCalledWith(req);
		});

		it('returns an AuthResult with a resource when the strategy includes one', async () => {
			const result: AuthResult = {
				userId: 'user-1',
				scopes: ['workflow:read'],
				resource: 'urn:n8n:project:abc123',
			};
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue(result);
			registry.register(strategy);

			expect(await registry.authenticate(mock<Request>())).toEqual(result);
		});

		it('allows the same strategy instance to be registered multiple times', async () => {
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue({ userId: 'user-1', scopes: [] });

			registry.register(strategy);
			registry.register(strategy);

			await registry.authenticate(mock<Request>());

			// First registration matched — called exactly once, short-circuited
			expect(strategy.authenticate).toHaveBeenCalledTimes(1);
		});
	});
});
