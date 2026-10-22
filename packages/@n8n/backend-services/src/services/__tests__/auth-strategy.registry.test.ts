import type { Logger } from '@n8n/backend-common';
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
	const logger = mock<Logger>();

	beforeEach(() => {
		vi.clearAllMocks();
		registry = new AuthStrategyRegistry(logger);
	});

	describe('authenticate', () => {
		const req = mock<AuthenticatedRequest>();

		/** A strategy without a `challenge` method, which the registry must tolerate. */
		const bare = (outcome: 'authenticated' | 'rejected' | 'abstained'): AuthStrategy => ({
			authenticate: vi.fn().mockResolvedValue({ outcome }),
			buildTokenGrant: vi.fn().mockResolvedValue(null),
		});

		it('answers unauthenticated with no challenges when no strategies are registered', async () => {
			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
		});

		it('answers unauthenticated with no challenges when every strategy abstains and none has a challenge', async () => {
			registry.register(bare('abstained'));
			registry.register(bare('abstained'));

			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
		});

		// `Required`: `challenge` is optional on the contract, the mock needs it as a function.
		it('answers authenticated when the first strategy succeeds, without calling the next', async () => {
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
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
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'authenticated' });

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: true });
			expect(strategy1.authenticate).toHaveBeenCalledWith(req);
			expect(strategy2.authenticate).toHaveBeenCalledWith(req);
		});

		it('stops authenticating when a strategy rejects, before and after an abstain', async () => {
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
			const strategy3 = mock<Required<AuthStrategy>>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'rejected' });

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({ authenticated: false, challenges: [] });
			expect(strategy3.authenticate).not.toHaveBeenCalled();
		});

		it('asks every strategy for its challenge on the request when all abstain, in registration order', async () => {
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
			const strategy3 = mock<Required<AuthStrategy>>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy3.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy1.challenge.mockResolvedValue('Basic');
			strategy2.challenge.mockResolvedValue(undefined);
			strategy3.challenge.mockResolvedValue('Bearer');

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Basic', 'Bearer'],
			});
			expect(strategy1.challenge).toHaveBeenCalledWith(req);
			expect(strategy3.challenge).toHaveBeenCalledWith(req);
		});

		it("uses the rejecting strategy's own challenge and asks the others, even those it did not authenticate with", async () => {
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
			const strategy3 = mock<Required<AuthStrategy>>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({
				outcome: 'rejected',
				challenge: 'Bearer, error="invalid_token"',
			});
			strategy1.challenge.mockResolvedValue('Basic');
			strategy2.challenge.mockResolvedValue('Bearer');
			strategy3.challenge.mockResolvedValue('Digest');

			registry.register(strategy1);
			registry.register(strategy2);
			registry.register(strategy3);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Basic', 'Bearer, error="invalid_token"', 'Digest'],
			});
			expect(strategy2.challenge).not.toHaveBeenCalled();
			expect(strategy3.authenticate).not.toHaveBeenCalled();
			expect(strategy3.challenge).toHaveBeenCalledWith(req);
		});

		it("falls back to the rejecting strategy's challenge(req) when its outcome offered none", async () => {
			const rejecting = mock<Required<AuthStrategy>>();
			const other = mock<Required<AuthStrategy>>();
			rejecting.authenticate.mockResolvedValue({ outcome: 'rejected' });
			rejecting.challenge.mockResolvedValue('Bearer');
			other.challenge.mockResolvedValue('Basic');

			registry.register(rejecting);
			registry.register(other);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Bearer', 'Basic'],
			});
			expect(rejecting.challenge).toHaveBeenCalledWith(req);
		});

		it('drops the challenge of a strategy whose challenge(req) throws, keeps the others and logs it', async () => {
			const failing = mock<Required<AuthStrategy>>();
			const other = mock<Required<AuthStrategy>>();
			failing.authenticate.mockResolvedValue({ outcome: 'abstained' });
			other.authenticate.mockResolvedValue({ outcome: 'abstained' });
			failing.challenge.mockRejectedValue(new Error('store unavailable'));
			other.challenge.mockResolvedValue('Bearer');

			registry.register(failing);
			registry.register(other);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Bearer'],
			});
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('skips a strategy without a challenge method', async () => {
			const withChallenge = mock<Required<AuthStrategy>>();
			withChallenge.authenticate.mockResolvedValue({ outcome: 'abstained' });
			withChallenge.challenge.mockResolvedValue('Bearer');

			registry.register(bare('abstained'));
			registry.register(withChallenge);

			expect(await registry.authenticate(req)).toEqual({
				authenticated: false,
				challenges: ['Bearer'],
			});
		});

		it('asks no strategy for a challenge when one authenticates', async () => {
			const strategy1 = mock<Required<AuthStrategy>>();
			const strategy2 = mock<Required<AuthStrategy>>();
			strategy1.authenticate.mockResolvedValue({ outcome: 'abstained' });
			strategy2.authenticate.mockResolvedValue({ outcome: 'authenticated' });
			strategy1.challenge.mockResolvedValue('Bearer');

			registry.register(strategy1);
			registry.register(strategy2);

			expect(await registry.authenticate(req)).toEqual({ authenticated: true });
			expect(strategy1.challenge).not.toHaveBeenCalled();
		});

		it('allows the same strategy instance to be registered multiple times', async () => {
			const strategy = mock<Required<AuthStrategy>>();
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
			const emptyRegistry = new AuthStrategyRegistry(logger);
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
			const failRegistry = new AuthStrategyRegistry(logger);
			failRegistry.register(failing);
			failRegistry.register(unreached);
			expect(await failRegistry.buildContextFromToken('token')).toBe(false);
			expect(unreached.buildTokenGrant).not.toHaveBeenCalled();
		});
	});
});
