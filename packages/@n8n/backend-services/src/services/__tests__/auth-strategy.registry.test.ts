import type { AuthenticatedRequest, TokenGrant, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

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
		const req = mock<AuthenticatedRequest>();

		it('answers unauthenticated with no challenges when no strategies are registered', async () => {
			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
		});

		it('answers unauthenticated with no challenges when all strategies abstain without one', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'abstained' });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
		});

		it('answers authenticated when the first strategy succeeds, without calling the next', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'authenticated' });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: true });
			expect(strategy2.authenticate).not.toHaveBeenCalled();
		});

		it('evaluates strategies in registration order', async () => {
			const order: number[] = [];
			const strategy1: AuthStrategy = {
				authenticate: vi.fn().mockImplementation(async () => {
					order.push(1);
					return { outcome: 'abstained' };
				}),
				buildTokenGrant: vi.fn().mockResolvedValue(null),
			};
			const strategy2: AuthStrategy = {
				authenticate: vi.fn().mockImplementation(async () => {
					order.push(2);
					return { outcome: 'abstained' };
				}),
				buildTokenGrant: vi.fn().mockResolvedValue(null),
			};

			registry.register(strategy1);
			registry.register(strategy2);

			await registry.authenticate(req);

			expect(order).toEqual([1, 2]);
		});

		it('passes the request to the next strategy when the current one abstains', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'authenticated' });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: true });
			expect(strategy1.authenticate).toHaveBeenCalledWith(req);
			expect(strategy2.authenticate).toHaveBeenCalledWith(req);
		});

		it('stops the chain when a strategy rejects, before and after an abstain', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			const strategy3 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'rejected' });

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
			expect(strategy3.authenticate).not.toHaveBeenCalled();
		});

		it('collects the challenge of every abstaining strategy, in registration order', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			const strategy3 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained', challenge: 'Basic' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy3.authenticate.mockResolvedValue({ outcome: 'abstained', challenge: 'Bearer' });

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Basic', 'Bearer'],
			});
		});

		it("keeps the challenges gathered before a reject and adds the reject's own", async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			const strategy3 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained', challenge: 'Basic' });
			strategy2.authenticate.mockResolvedValue({
				outcome: 'rejected',
				challenge: 'Bearer, error="invalid_token"',
			});
			strategy3.authenticate.mockResolvedValue({ outcome: 'abstained', challenge: 'Digest' });

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Basic', 'Bearer, error="invalid_token"'],
			});
		});

		it('drops the gathered challenges when a later strategy authenticates', async () => {
			const strategy1 = mock<AuthStrategy>();
			const strategy2 = mock<AuthStrategy>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained', challenge: 'Bearer' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'authenticated' });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: true });
		});

		it('allows the same strategy instance to be registered multiple times', async () => {
			const strategy = mock<AuthStrategy>();
			strategy.authenticate.mockResolvedValue({ outcome: 'authenticated' });

			registry.register(strategy);
			registry.register(strategy);

			await registry.authenticate(req);

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

		it('returns null when all strategies abstain', async () => {
			const emptyRegistry = new AuthStrategyRegistry();
			expect(await emptyRegistry.buildContextFromToken('token')).toBeNull();

			const abstain = mock<AuthStrategy>();
			abstain.buildTokenGrant.mockResolvedValue(null);
			registry.register(abstain);
			expect(await registry.buildContextFromToken('token')).toBeNull();
		});

		it('returns false and stops when a strategy refuses the token (fail-fast)', async () => {
			const unreached = mock<AuthStrategy>();
			const failing = mock<AuthStrategy>();
			failing.buildTokenGrant.mockResolvedValue(false);
			const failRegistry = new AuthStrategyRegistry();
			failRegistry.register(failing);
			failRegistry.register(unreached);
			expect(await failRegistry.buildContextFromToken('token')).toBe(false);
			expect(unreached.buildTokenGrant).not.toHaveBeenCalled();
		});
	});
});
