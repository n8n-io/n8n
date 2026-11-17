import type { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { PendingAuthorizationCleanupTask } from '@/credentials/pending-authorization-cleanup.task';

const OVERLAPPING_RUNS = 4;
const EXPIRED_ROWS = 3_000;
const PENDING_ROWS = 200;
const REGULAR_ROWS = 100;
/** SQLite rejects one multi-row insert much larger than this. */
const SEED_CHUNK = 500;

describe('PendingAuthorizationCleanupTask', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	let repository: CredentialsRepository;
	let task: PendingAuthorizationCleanupTask;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(CredentialsRepository);
		task = new PendingAuthorizationCleanupTask(logger, repository);
	});

	beforeEach(() => logger.debug.mockClear());

	afterEach(async () => await testDb.truncate(['CredentialsEntity']));

	afterAll(async () => await testDb.terminate());

	async function seed(prefix: string, count: number, expiresAt: Date | null): Promise<string[]> {
		const ids = Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
		for (let start = 0; start < count; start += SEED_CHUNK) {
			await repository.insert(
				ids.slice(start, start + SEED_CHUNK).map((id) => ({
					id,
					name: id,
					type: 'oAuth2Api',
					data: '',
					pendingAuthorizationExpiresAt: expiresAt,
				})),
			);
		}
		return ids;
	}

	/** Returns the ids that a sweep must keep. */
	async function seedAll(): Promise<string[]> {
		await seed('expired', EXPIRED_ROWS, new Date(Date.now() - Time.hours.toMilliseconds));
		const pending = await seed(
			'pending',
			PENDING_ROWS,
			new Date(Date.now() + Time.hours.toMilliseconds),
		);
		const regular = await seed('regular', REGULAR_ROWS, null);
		return [...pending, ...regular].sort();
	}

	async function remainingIds(): Promise<string[]> {
		const rows = await repository.find({ select: { id: true } });
		return rows.map(({ id }) => id).sort();
	}

	function deletedTotal(): number {
		return logger.debug.mock.calls
			.map(([message]) => /^Deleted (\d+) credentials/.exec(message))
			.reduce((sum, match) => sum + (match ? Number(match[1]) : 0), 0);
	}

	it('deletes only the rows past their deadline', async () => {
		const kept = await seedAll();

		await task.run();

		expect(await remainingIds()).toEqual(kept);
	});

	it('deletes each expired row once when runs overlap', async () => {
		const kept = await seedAll();

		await Promise.all(Array.from({ length: OVERLAPPING_RUNS }, async () => await task.run()));

		expect(await remainingIds()).toEqual(kept);
		expect(deletedTotal()).toBe(EXPIRED_ROWS);
	});
});
