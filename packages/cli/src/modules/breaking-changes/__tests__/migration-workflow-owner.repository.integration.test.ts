import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, UserRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember } from '../../../../test/integration/shared/db/users';
import { MigrationWorkflowOwnerRepository } from '../database/repositories/migration-workflow-owner.repository';

// Runs against the real database: the primary key, the insert-or-ignore and the
// foreign keys live in the schema, so a mocked manager would not exercise them.

const ctx = {};

let repository: MigrationWorkflowOwnerRepository;
let alice: User;
let bob: User;

beforeAll(async () => {
	await testModules.loadModules(['breaking-changes']);
	await testDb.init();
	repository = Container.get(MigrationWorkflowOwnerRepository);
});

beforeEach(async () => {
	await repository.delete({});
	await testDb.truncate(['WorkflowEntity', 'User']);
	[alice, bob] = await Promise.all([createMember(), createMember()]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('MigrationWorkflowOwnerRepository', () => {
	describe('replaceSuggestions', () => {
		test('inserts one suggested row per suggestion, for the batch only', async () => {
			const [first, second, other] = await Promise.all([
				createWorkflow(),
				createWorkflow(),
				createWorkflow(),
			]);

			await repository.replaceSuggestions(
				[first.id, second.id],
				[
					{ workflowId: first.id, userId: alice.id },
					{ workflowId: other.id, userId: bob.id },
				],
				ctx,
			);

			const rows = await repository.findByWorkflowIds([first.id, second.id, other.id], ctx);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				workflowId: first.id,
				userId: alice.id,
				source: 'suggested',
				assignedById: null,
				assignedAt: null,
			});
		});

		test('replaces an earlier suggestion and drops one that has no candidate any more', async () => {
			const [first, second] = await Promise.all([createWorkflow(), createWorkflow()]);
			await repository.replaceSuggestions(
				[first.id, second.id],
				[
					{ workflowId: first.id, userId: alice.id },
					{ workflowId: second.id, userId: alice.id },
				],
				ctx,
			);

			await repository.replaceSuggestions(
				[first.id, second.id],
				[{ workflowId: first.id, userId: bob.id }],
				ctx,
			);

			const rows = await repository.findByWorkflowIds([first.id, second.id], ctx);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ workflowId: first.id, userId: bob.id, source: 'suggested' });
		});

		test('leaves an assigned owner as it is', async () => {
			const workflow = await createWorkflow();
			const assignedAt = new Date('2026-03-01T12:00:00.000Z');
			await repository.insert({
				workflowId: workflow.id,
				userId: alice.id,
				source: 'assigned',
				assignedById: bob.id,
				assignedAt,
			});

			await repository.replaceSuggestions(
				[workflow.id],
				[{ workflowId: workflow.id, userId: bob.id }],
				ctx,
			);

			const [row] = await repository.findByWorkflowIds([workflow.id], ctx);
			expect(row).toMatchObject({ userId: alice.id, source: 'assigned', assignedById: bob.id });
			expect(row.assignedAt?.getTime()).toBe(assignedAt.getTime());
		});

		test('rolls back the delete when the insert fails, so earlier suggestions survive', async () => {
			const workflow = await createWorkflow();
			await repository.replaceSuggestions(
				[workflow.id],
				[{ workflowId: workflow.id, userId: alice.id }],
				ctx,
			);

			await expect(
				repository.replaceSuggestions(
					[workflow.id],
					[{ workflowId: workflow.id, userId: 'not-a-user' }],
					ctx,
				),
			).rejects.toThrow();

			const [row] = await repository.findByWorkflowIds([workflow.id], ctx);
			expect(row).toMatchObject({ userId: alice.id, source: 'suggested' });
		});

		test('does nothing for an empty batch', async () => {
			await repository.replaceSuggestions([], [], ctx);

			expect(await repository.count()).toBe(0);
		});

		test('rolls back with the surrounding transaction', async () => {
			const workflow = await createWorkflow();
			const txRunner = Container.get(TransactionRunner);

			await expect(
				txRunner.run({}, async (txCtx) => {
					await repository.replaceSuggestions(
						[workflow.id],
						[{ workflowId: workflow.id, userId: alice.id }],
						txCtx,
					);
					throw new Error('abort');
				}),
			).rejects.toThrow('abort');

			expect(await repository.count()).toBe(0);
		});

		test('rejects a source outside the enum', async () => {
			const workflow = await createWorkflow();

			await expect(
				repository.insert({
					workflowId: workflow.id,
					userId: alice.id,
					source: 'guessed' as never,
					assignedById: null,
				}),
			).rejects.toThrow();
		});
	});

	describe('assign', () => {
		test('replaces a suggestion with the chosen owner and records who assigned it', async () => {
			const workflow = await createWorkflow();
			await repository.replaceSuggestions(
				[workflow.id],
				[{ workflowId: workflow.id, userId: alice.id }],
				ctx,
			);

			await repository.assign(workflow.id, bob.id, alice.id, ctx);

			const rows = await repository.findByWorkflowIds([workflow.id], ctx);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ userId: bob.id, source: 'assigned', assignedById: alice.id });
			expect(rows[0].assignedAt).toBeInstanceOf(Date);
		});

		test('replaces an earlier assignment', async () => {
			const workflow = await createWorkflow();
			await repository.assign(workflow.id, alice.id, alice.id, ctx);

			await repository.assign(workflow.id, bob.id, alice.id, ctx);

			const rows = await repository.findByWorkflowIds([workflow.id], ctx);
			expect(rows.map((row) => row.userId)).toEqual([bob.id]);
		});
	});

	describe('removeOwner', () => {
		test('deletes the row of that workflow only, assigned or suggested', async () => {
			const [first, second] = await Promise.all([createWorkflow(), createWorkflow()]);
			await repository.assign(first.id, alice.id, alice.id, ctx);
			await repository.replaceSuggestions(
				[second.id],
				[{ workflowId: second.id, userId: bob.id }],
				ctx,
			);

			await repository.removeOwner(first.id, ctx);

			const rows = await repository.findByWorkflowIds([first.id, second.id], ctx);
			expect(rows.map((row) => row.workflowId)).toEqual([second.id]);
		});
	});

	describe('findByWorkflowIds', () => {
		test('returns an empty list for an empty id array', async () => {
			expect(await repository.findByWorkflowIds([], ctx)).toEqual([]);
		});
	});

	describe('foreign keys', () => {
		test('deletes the row with its workflow', async () => {
			const workflow = await createWorkflow();
			await repository.replaceSuggestions(
				[workflow.id],
				[{ workflowId: workflow.id, userId: alice.id }],
				ctx,
			);

			await testDb.truncate(['WorkflowEntity']);

			expect(await repository.count()).toBe(0);
		});

		test('keeps the row without a user when the user is deleted', async () => {
			const workflow = await createWorkflow();
			await repository.replaceSuggestions(
				[workflow.id],
				[{ workflowId: workflow.id, userId: alice.id }],
				ctx,
			);

			await Container.get(UserRepository).delete({ id: alice.id });

			const [row] = await repository.findByWorkflowIds([workflow.id], ctx);
			expect(row).toMatchObject({ workflowId: workflow.id, userId: null, source: 'suggested' });
		});
	});
});
