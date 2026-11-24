import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { AI_PREFERENCE_MAX_PER_SCOPE, type AiPreferenceTarget } from '@n8n/api-types';
import { AiPreferenceService } from '@n8n/backend-services';
import type { AiPreference, Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { v4 as uuid } from 'uuid';

import { createMember, createOwner } from '../../shared/db/users';

describe('AiPreferenceRepository', () => {
	let repository: AiPreferenceRepository;
	let owner: User;
	let member: User;
	let marketing: Project;
	let sales: Project;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(AiPreferenceRepository);
		owner = await createOwner();
		member = await createMember();
		marketing = await createTeamProject('Marketing');
		sales = await createTeamProject('Sales');
	});

	afterEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertPreference(overrides: Partial<AiPreference> & { content: string }) {
		const id = overrides.id ?? uuid();
		await repository.insert({
			id,
			userId: null,
			projectId: null,
			// NOT NULL with no default: every write names the surface it came from.
			source: 'ui',
			createdById: owner.id,
			...overrides,
		});
		return id;
	}

	describe('countForTarget', () => {
		it('counts one scope at a time, so a cap applies per scope', async () => {
			await insertPreference({ content: 'Instance A' });
			await insertPreference({ content: 'Instance B' });
			await insertPreference({ content: 'Mine', userId: member.id });
			await insertPreference({ content: 'Marketing', projectId: marketing.id });

			expect(await repository.countForTarget({ scope: 'instance' })).toBe(2);
			expect(await repository.countForTarget({ scope: 'user', userId: member.id })).toBe(1);
			expect(await repository.countForTarget({ scope: 'user', userId: owner.id })).toBe(0);
			expect(await repository.countForTarget({ scope: 'project', projectId: marketing.id })).toBe(
				1,
			);
			expect(await repository.countForTarget({ scope: 'project', projectId: sales.id })).toBe(0);
		});
	});

	describe('findApplicable', () => {
		it('returns the oldest 50 rows of each scope while keeping excess rows in storage', async () => {
			const targets = [
				{},
				{ userId: member.id },
				{ projectId: marketing.id },
				{ projectId: sales.id },
			];
			const expected: string[] = [];
			for (const target of targets) {
				for (let index = 0; index < AI_PREFERENCE_MAX_PER_SCOPE + 3; index++) {
					const id = await insertPreference({
						...target,
						content: `Rule ${index}`,
						createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
					});
					if (index < AI_PREFERENCE_MAX_PER_SCOPE) expected.push(id);
				}
			}

			const rows = await repository.findApplicable({
				userId: member.id,
				projectIds: [marketing.id, sales.id],
			});

			expect(rows.map(({ id }) => id).sort()).toEqual(expected.sort());
			expect(await repository.count()).toBe(targets.length * (AI_PREFERENCE_MAX_PER_SCOPE + 3));
		});

		it('returns the instance rows, the rows of the user, and the rows of the listed projects', async () => {
			const instanceId = await insertPreference({ content: 'Instance' });
			const ownId = await insertPreference({ content: 'Own', userId: member.id });
			const marketingId = await insertPreference({ content: 'Marketing', projectId: marketing.id });
			await insertPreference({ content: 'Someone else', userId: owner.id });
			await insertPreference({ content: 'Unlisted project', projectId: sales.id });

			const rows = await repository.findApplicable({
				userId: member.id,
				projectIds: [marketing.id],
			});

			expect(rows.map((row) => row.id).sort()).toEqual([instanceId, ownId, marketingId].sort());
		});

		it('returns the rows oldest first, then by id', async () => {
			const older = new Date('2026-01-01T00:00:00.000Z');
			const newer = new Date('2026-01-02T00:00:00.000Z');
			const [tieA, tieB] = [uuid(), uuid()].sort();
			const newestId = await insertPreference({ content: 'Newest', createdAt: newer });
			await insertPreference({ id: tieB, content: 'Tie B', createdAt: older });
			await insertPreference({ id: tieA, content: 'Tie A', createdAt: older });

			const rows = await repository.findApplicable({ userId: member.id, projectIds: [] });

			expect(rows.map((row) => row.id)).toEqual([tieA, tieB, newestId]);
		});

		it('returns only the instance rows and the rows of the user when there are no projects', async () => {
			const instanceId = await insertPreference({ content: 'Instance' });
			const ownId = await insertPreference({ content: 'Own', userId: member.id });
			await insertPreference({ content: 'Project', projectId: marketing.id });

			const rows = await repository.findApplicable({ userId: member.id, projectIds: [] });

			expect(rows.map((row) => row.id).sort()).toEqual([instanceId, ownId].sort());
		});
	});

	describe('concurrent writes', () => {
		const service = () => Container.get(AiPreferenceService);
		const columns = (target: AiPreferenceTarget) => ({
			userId: target.scope === 'user' ? target.userId : null,
			projectId: target.scope === 'project' ? target.projectId : null,
		});

		async function fillToLastSlot(target: AiPreferenceTarget) {
			for (let index = 0; index < AI_PREFERENCE_MAX_PER_SCOPE - 1; index++) {
				await insertPreference({ ...columns(target), content: `Existing ${index}` });
			}
		}

		it.each(['instance', 'user', 'project'] as const)(
			'accepts only the remaining slot during concurrent %s creates',
			async (scope) => {
				const target: AiPreferenceTarget =
					scope === 'project'
						? { scope, projectId: marketing.id }
						: scope === 'user'
							? { scope, userId: owner.id }
							: { scope };
				await fillToLastSlot(target);

				const results = await Promise.allSettled(
					Array.from(
						{ length: 20 },
						async (_, index) =>
							await service().create(owner, { ...target, content: `New ${index}` }, 'api'),
					),
				);

				expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
				for (const result of results) {
					if (result.status === 'rejected') {
						expect(result.reason).toMatchObject({
							name: 'AiPreferenceScopeFullError',
							meta: { limit: 50, actual: 50 },
						});
					}
				}
				expect(await repository.countForTarget(target)).toBe(AI_PREFERENCE_MAX_PER_SCOPE);
			},
		);

		it('shares the remaining slot between creates and moves', async () => {
			const target = { scope: 'project', projectId: marketing.id } as const;
			await fillToLastSlot(target);
			const movingIds: string[] = [];
			for (let index = 0; index < 10; index++) {
				movingIds.push(await insertPreference({ userId: owner.id, content: `Moved ${index}` }));
			}

			const results = await Promise.allSettled([
				...movingIds.map(
					async (id, index) =>
						await service().update(owner, id, { ...target, content: `Moved ${index}` }),
				),
				...movingIds.map(
					async (_, index) =>
						await service().create(owner, { ...target, content: `Created ${index}` }, 'api'),
				),
			]);

			expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
			expect(await repository.countForTarget(target)).toBe(AI_PREFERENCE_MAX_PER_SCOPE);
			for (const result of results) {
				if (result.status === 'rejected') {
					expect(result.reason).toMatchObject({ name: 'AiPreferenceScopeFullError' });
				}
			}
		});

		it('accepts only one concurrent create with the same content', async () => {
			const results = await Promise.allSettled(
				Array.from(
					{ length: 10 },
					async () =>
						await service().create(owner, { scope: 'instance', content: 'One rule.' }, 'api'),
				),
			);

			expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
			expect(await repository.countForTarget({ scope: 'instance' })).toBe(1);
			for (const result of results) {
				if (result.status === 'rejected') {
					expect(result.reason).toMatchObject({ httpStatusCode: 409 });
				}
			}
		});

		it.each(['update', 'updateContent'] as const)(
			'refuses %s when a move commits after its permission check',
			async (method) => {
				const id = await insertPreference({ content: 'Original', userId: owner.id });
				const reachedLock = createDeferredPromise<undefined>();
				const continueEdit = createDeferredPromise<undefined>();
				const withWriteLock = repository.withWriteLock.bind(repository);
				const lock = vi
					.spyOn(repository, 'withWriteLock')
					.mockImplementationOnce(async (targets, ctx, write) => {
						reachedLock.resolve(undefined);
						await continueEdit.promise;
						return await withWriteLock(targets, ctx, write);
					});

				const edit =
					method === 'update'
						? service().update(owner, id, { content: 'Stale edit' })
						: service().updateContent(owner, id, 'Stale edit');
				const outcome = edit.catch((error: unknown) => error);
				try {
					await reachedLock.promise;
					await service().update(owner, id, {
						scope: 'project',
						projectId: marketing.id,
						content: 'Moved',
					});
					continueEdit.resolve(undefined);

					expect(await outcome).toMatchObject({
						httpStatusCode: 409,
						message: 'The Preference changed. Reload it and try again.',
					});
					expect(await repository.findOneByOrFail({ id })).toMatchObject({
						userId: null,
						projectId: marketing.id,
						content: 'Moved',
					});
				} finally {
					continueEdit.resolve(undefined);
					await outcome;
					lock.mockRestore();
				}
			},
		);
	});

	describe('existsForTargetWithContent', () => {
		it('is true for an exact match in the scope and false otherwise', async () => {
			await insertPreference({ content: 'Keep replies short.', userId: member.id });

			const target = { scope: 'user' as const, userId: member.id };
			expect(await repository.existsForTargetWithContent(target, 'Keep replies short.')).toBe(true);
			expect(await repository.existsForTargetWithContent(target, 'Keep replies long.')).toBe(false);
			expect(
				await repository.existsForTargetWithContent({ scope: 'instance' }, 'Keep replies short.'),
			).toBe(false);
		});

		it('ignores the excluded row', async () => {
			const id = await insertPreference({ content: 'Keep replies short.', userId: member.id });

			expect(
				await repository.existsForTargetWithContent(
					{ scope: 'user', userId: member.id },
					'Keep replies short.',
					id,
				),
			).toBe(false);
		});
	});
});
