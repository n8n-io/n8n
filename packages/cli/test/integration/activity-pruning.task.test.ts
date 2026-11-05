import { createTeamProject, mockLogger, testDb } from '@n8n/backend-test-utils';
import type { ActivityLogConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { Project } from '@n8n/db';
import { ActivityEventRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';

const OVERLAPPING_RUNS = 4;
const RETENTION_DAYS = 14;
const MAX_ENTRIES = 100;
/** More than one 500-row batch, so every sweep loops and the loops interleave. */
const AGED_ROWS = 1_201;
const RECENT_ROWS = 150;
const WRITES_DURING_SWEEP = 50;
/** SQLite rejects one multi-row insert much larger than this. */
const SEED_CHUNK = 500;

describe('ActivityPruningTask', () => {
	const signal = new AbortController().signal;
	let repository: ActivityEventRepository;
	let project: Project;
	let task: ActivityPruningTask;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(ActivityEventRepository);
		project = await createTeamProject();
		task = new ActivityPruningTask(
			mockLogger(),
			repository,
			mock<ActivityLogConfig>({ retentionDays: RETENTION_DAYS, maxEntries: MAX_ENTRIES }),
		);
	});

	afterEach(async () => await testDb.truncate(['ActivityEvent']));

	afterAll(async () => await testDb.terminate());

	async function seed(count: number, createdAt: Date): Promise<number[]> {
		const ids: number[] = [];
		for (let start = 0; start < count; start += SEED_CHUNK) {
			const rows = Array.from({ length: Math.min(SEED_CHUNK, count - start) }, (_, i) => ({
				category: 'workflow' as const,
				action: `saved-${start + i}`,
				projectId: project.id,
				typeVersion: 1,
				createdAt,
			}));
			const { identifiers } = await repository.insert(rows);
			ids.push(...identifiers.map(({ id }) => id as number));
		}
		return ids;
	}

	async function seedBacklog(): Promise<number[]> {
		const agedAt = new Date(Date.now() - (RETENTION_DAYS + 1) * Time.days.toMilliseconds);
		await seed(AGED_ROWS, agedAt);
		return await seed(RECENT_ROWS, new Date());
	}

	async function remainingIds(): Promise<number[]> {
		const rows = await repository.find({ select: { id: true }, order: { id: 'ASC' } });
		return rows.map(({ id }) => id);
	}

	async function runOverlapping(): Promise<void> {
		await Promise.all(Array.from({ length: OVERLAPPING_RUNS }, async () => await task.run(signal)));
	}

	/** One row per round trip, so the writes spread across the sweeps' own round trips. */
	async function writeOneByOne(count: number): Promise<number[]> {
		const ids: number[] = [];
		for (let i = 0; i < count; i++) {
			ids.push(...(await seed(1, new Date())));
		}
		return ids;
	}

	it('leaves the newest entries under the cap when sweeps overlap', async () => {
		const recent = await seedBacklog();

		await runOverlapping();

		expect(await remainingIds()).toEqual(recent.slice(-MAX_ENTRIES));
	});

	it('keeps every entry written while sweeps are in flight', async () => {
		await seedBacklog();

		const [written] = await Promise.all([writeOneByOne(WRITES_DURING_SWEEP), runOverlapping()]);

		// A row written after a sweep read its bound is out of that sweep's reach, so the table may
		// end above the cap by at most the rows written.
		const remaining = await remainingIds();
		expect(remaining.slice(-WRITES_DURING_SWEEP)).toEqual(written);
		expect(remaining.length).toBeGreaterThanOrEqual(MAX_ENTRIES);
		expect(remaining.length).toBeLessThanOrEqual(MAX_ENTRIES + WRITES_DURING_SWEEP);
	});
});
