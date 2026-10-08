import { testDb } from '@n8n/backend-test-utils';
import { TransactionRunner, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { IUserSettings } from 'n8n-workflow';

import { createUser } from '../shared/db/users';

import { UserService } from '@/services/user.service';

// Enough rounds to make a lost update show up with the pooled SQLite reads (DB_SQLITE_POOL_SIZE=4).
const ROUNDS = 20;

let userService: UserService;
let userRepository: UserRepository;

const storedSettings = async (userId: string) =>
	(await userRepository.findOneByOrFail({ id: userId })).settings;

/** Waits for `update` and records its label, so the test knows which update finished last. */
const tracked = async (finished: string[], label: string, update: Promise<void>) => {
	await update;
	finished.push(label);
};

beforeAll(async () => {
	await testDb.init();

	userService = Container.get(UserService);
	userRepository = Container.get(UserRepository);
});

afterEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('UserService.updateSettings', () => {
	it('keeps both changes when two overlapping updates change different keys', async () => {
		for (let round = 0; round < ROUNDS; round++) {
			const user = await createUser({ settings: { isOnboarded: true } });

			await Promise.all([
				userService.updateSettings(user.id, { experienceMode: 'power' }),
				userService.updateSettings(user.id, { mcpJsonNudge: { impressions: round } }),
			]);

			expect(await storedSettings(user.id)).toEqual({
				isOnboarded: true,
				experienceMode: 'power',
				mcpJsonNudge: { impressions: round },
			});
		}
	});

	it('keeps the value of the update that finishes last when two updates change the same key', async () => {
		for (let round = 0; round < ROUNDS; round++) {
			const user = await createUser({ settings: { isOnboarded: true } });
			const finished: string[] = [];

			await Promise.all([
				tracked(
					finished,
					'simple',
					userService.updateSettings(user.id, { experienceMode: 'simple' }),
				),
				tracked(
					finished,
					'power',
					userService.updateSettings(user.id, { experienceMode: 'power' }),
				),
			]);

			const settings = await storedSettings(user.id);
			expect(['simple', 'power']).toContain(settings?.experienceMode);
			expect(settings).toEqual({ isOnboarded: true, experienceMode: finished.at(-1) });
		}
	});

	it('keeps every change when one update per key overlaps with all the others', async () => {
		const user = await createUser({ settings: null });
		const changes: Array<Partial<IUserSettings>> = [
			{ isOnboarded: true },
			{ firstSuccessfulWorkflowId: 'workflow-1' },
			{ userActivated: true },
			{ userActivatedAt: 1_700_000_000_000 },
			{ easyAIWorkflowOnboarded: true },
			{ userClaimedAiCredits: true },
			{ dismissedCallouts: { 'test-callout': true } },
			{ npsSurvey: { lastShownAt: 1, responded: true } },
			{ experienceMode: 'power' },
			{ mcpJsonNudge: { impressions: 2 } },
			{ instanceAi: { credentialId: null, modelName: 'model-1' } },
		];

		await Promise.all(
			changes.map(async (change) => await userService.updateSettings(user.id, change)),
		);

		expect(await storedSettings(user.id)).toEqual(Object.assign({}, ...changes));
	});

	it('does not change the settings of another user', async () => {
		const user = await createUser({ settings: { isOnboarded: true } });
		const other = await createUser({ settings: { isOnboarded: false } });

		await userService.updateSettings(user.id, { experienceMode: 'power' });

		expect(await storedSettings(other.id)).toEqual({ isOnboarded: false });
	});

	it('throws a not-found error and creates no user when the id is unknown', async () => {
		const missingId = '00000000-0000-4000-8000-000000000000';

		await expect(
			userService.updateSettings(missingId, { experienceMode: 'power' }),
		).rejects.toThrow(NotFoundError);

		expect(await userRepository.findOneBy({ id: missingId })).toBeNull();
	});

	it('rolls the change back with the transaction that the caller already has', async () => {
		const user = await createUser({ settings: { isOnboarded: true } });

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await userRepository.updateSettingsLocked(user.id, { experienceMode: 'power' }, ctx);
				throw new Error('a later step failed');
			}),
		).rejects.toThrow('a later step failed');

		expect(await storedSettings(user.id)).toEqual({ isOnboarded: true });
	});
});
