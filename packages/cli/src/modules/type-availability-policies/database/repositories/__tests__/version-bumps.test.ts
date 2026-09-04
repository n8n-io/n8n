import type { OperationContext, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import type { PolicyRule } from '../../../policy-rule.types';
import { TypeAvailabilityPolicyScope } from '../../entities/type-availability-policy-scope.entity';
import { TypeAvailabilityPolicy } from '../../entities/type-availability-policy.entity';
import { TypeAvailabilityPolicyScopeRepository } from '../type-availability-policy-scope.repository';
import { TypeAvailabilityPolicyRepository } from '../type-availability-policy.repository';

/**
 * `version` is the cache-invalidation signal, so a bump must never be computed from a row
 * read earlier in the transaction: two overlapping edits would both write `read version + 1`
 * and one bump would vanish, leaving a stale cache behind.
 *
 * These assert the mechanism rather than the race, because the race is not reproducible in
 * this suite — Postgres runs at pool size 1 and SQLite serialises writers, so two "concurrent"
 * repository calls run one after the other and both implementations look identical. Asserting
 * the delegation is what actually fails if someone reverts to `entity.version += 1`.
 */
describe('policy version bumps are delegated to the database', () => {
	const RULE: PolicyRule = {
		id: 'r1',
		action: 'deny',
		selector: { kind: 'name', value: 'n8n-nodes-base.slack' },
	};

	const ROOT: OperationContext = {};

	describe('TypeAvailabilityPolicyRepository.updateRules', () => {
		const entityManager = mockEntityManager(TypeAvailabilityPolicy);
		const transactionRunner = mock<TransactionRunner>();
		const repository = new TypeAvailabilityPolicyRepository(
			entityManager.connection,
			transactionRunner,
		);

		beforeEach(() => {
			vi.clearAllMocks();
			transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ROOT));
		});

		it('increments in SQL instead of saving a version computed here', async () => {
			const stored = Object.assign(new TypeAvailabilityPolicy(), {
				id: 'p1',
				kind: 'node-types',
				rules: [],
				version: 1,
				updatedBy: 'user-1',
			});
			// The "before" read takes a (Postgres-only) pessimistic write lock, so it goes
			// through `findOne` rather than `findOneBy` — see `updateRules`.
			entityManager.findOne.mockResolvedValue(stored);
			entityManager.findOneBy.mockResolvedValue(stored);

			await repository.updateRules('p1', [RULE], 'user-2', ROOT);

			expect(entityManager.update).toHaveBeenCalledWith(
				TypeAvailabilityPolicy,
				{ id: 'p1' },
				{ rules: [RULE], updatedBy: 'user-2' },
			);
			expect(entityManager.increment).toHaveBeenCalledWith(
				TypeAvailabilityPolicy,
				{ id: 'p1' },
				'version',
				1,
			);
			expect(entityManager.save).not.toHaveBeenCalled();
		});

		it('writes nothing at all when the rules are unchanged', async () => {
			const stored = Object.assign(new TypeAvailabilityPolicy(), {
				id: 'p1',
				kind: 'node-types',
				rules: [RULE],
				version: 1,
				updatedBy: 'user-1',
			});
			entityManager.findOne.mockResolvedValue(stored);

			await repository.updateRules('p1', [RULE], 'user-2', ROOT);

			expect(entityManager.update).not.toHaveBeenCalled();
			expect(entityManager.increment).not.toHaveBeenCalled();
		});
	});

	describe('TypeAvailabilityPolicyScopeRepository.updateDefaultAction', () => {
		const entityManager = mockEntityManager(TypeAvailabilityPolicyScope);
		const transactionRunner = mock<TransactionRunner>();
		const repository = new TypeAvailabilityPolicyScopeRepository(
			entityManager.connection,
			transactionRunner,
		);

		beforeEach(() => {
			vi.clearAllMocks();
			transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ROOT));
		});

		it('increments in SQL instead of saving a version computed here', async () => {
			const stored = Object.assign(new TypeAvailabilityPolicyScope(), {
				id: 's1',
				kind: 'node-types',
				projectId: null,
				defaultAction: 'allow',
				version: 1,
				updatedBy: 'user-1',
			});
			entityManager.findOneBy.mockResolvedValue(stored);

			await repository.updateDefaultAction('s1', 'deny', 'user-2', ROOT);

			expect(entityManager.update).toHaveBeenCalledWith(
				TypeAvailabilityPolicyScope,
				{ id: 's1' },
				{ defaultAction: 'deny', updatedBy: 'user-2' },
			);
			expect(entityManager.increment).toHaveBeenCalledWith(
				TypeAvailabilityPolicyScope,
				{ id: 's1' },
				'version',
				1,
			);
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});
});
