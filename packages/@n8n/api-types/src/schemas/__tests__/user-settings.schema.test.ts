import type { ExperienceMode } from '../experience-mode.schema';
import { userDetailSchema, usersListSchema } from '../user.schema';
import { userSettingsSchema, type UserSettings } from '../user-settings.schema';

const user = (id: string, settings: Record<string, unknown> | null) => ({
	id,
	email: `${id}@example.com`,
	role: 'global:member',
	settings,
});

describe('userSettingsSchema', () => {
	describe('npsSurvey', () => {
		it.each([
			['a responded state', { lastShownAt: 1, responded: true }],
			['a waiting state', { lastShownAt: 1, waitingForResponse: true, ignoredCount: 2 }],
		])('keeps %s', (_label, npsSurvey) => {
			expect(userSettingsSchema.parse({ npsSurvey })).toEqual({ npsSurvey });
		});

		it.each([
			['responded set to false', { lastShownAt: 1, responded: false }],
			[
				'waitingForResponse set to false',
				{ lastShownAt: 1, waitingForResponse: false, ignoredCount: 0 },
			],
			['no state flag', { lastShownAt: 1 }],
		])('rejects a state with %s', (_label, npsSurvey) => {
			expect(userSettingsSchema.safeParse({ npsSurvey }).success).toBe(false);
		});
	});

	describe('experienceMode', () => {
		it.each(['simple', 'power'] as const)('keeps a saved %s mode', (experienceMode) => {
			expect(userSettingsSchema.parse({ experienceMode })).toEqual({ experienceMode });
		});

		it('does not add the key when no mode is saved', () => {
			const settings = userSettingsSchema.parse({ isOnboarded: true });

			expect(settings).toEqual({ isOnboarded: true });
			expect(settings).not.toHaveProperty('experienceMode');
		});

		// Rows written by an older version or edited by hand must still load.
		it.each([
			['an unknown mode', 'builder'],
			['a capitalised mode', 'Power'],
			['an empty string', ''],
			['null', null],
			['a number', 1],
			['an object', { mode: 'power' }],
		])('drops %s and keeps the other settings', (_label, experienceMode) => {
			const result = userSettingsSchema.safeParse({
				experienceMode,
				isOnboarded: true,
				dismissedCallouts: { 'test-callout': true },
			});

			expect(result.success).toBe(true);
			expect(result.data?.experienceMode).toBeUndefined();
			expect(result.data).toMatchObject({
				isOnboarded: true,
				dismissedCallouts: { 'test-callout': true },
			});
		});

		// Type-level pin. The `typecheck` step catches a failure, not the test run.
		it('exposes the shared mode type', () => {
			expectTypeOf<UserSettings['experienceMode']>().toEqualTypeOf<ExperienceMode | undefined>();
		});
	});
});

// GET /rest/users sends every item through these schemas. The editor merges the
// items into the current user, so a key that the schema strips is lost there too.
describe('users list response', () => {
	it('keeps the saved mode in the settings of a user detail', () => {
		const parsed = userDetailSchema.parse(
			user('u1', { experienceMode: 'power', isOnboarded: true }),
		);

		expect(parsed.settings).toEqual({ experienceMode: 'power', isOnboarded: true });
	});

	it('keeps each user mode and drops only the invalid one', () => {
		const result = usersListSchema.safeParse({
			count: 3,
			items: [
				user('u1', { experienceMode: 'power' }),
				user('u2', { experienceMode: 'builder', isOnboarded: true }),
				user('u3', null),
			],
		});

		expect(result.success).toBe(true);
		expect(result.data?.items.map((item) => item.settings)).toEqual([
			{ experienceMode: 'power' },
			{ isOnboarded: true },
			null,
		]);
	});
});
