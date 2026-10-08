import type { IUserSettings } from 'n8n-workflow';

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

	describe('mcpJsonNudge', () => {
		it.each([0, 3])('keeps a saved count of %i impressions', (impressions) => {
			expect(userSettingsSchema.parse({ mcpJsonNudge: { impressions } })).toEqual({
				mcpJsonNudge: { impressions },
			});
		});

		it('does not add the key when no count is saved', () => {
			expect(userSettingsSchema.parse({ isOnboarded: true })).not.toHaveProperty('mcpJsonNudge');
		});

		it.each([
			['a negative count', { impressions: -1 }],
			['a fractional count', { impressions: 1.5 }],
			['a text count', { impressions: '2' }],
			['an object without a count', {}],
			['null', null],
			['a number', 2],
		])('drops %s and keeps the other settings', (_label, mcpJsonNudge) => {
			const result = userSettingsSchema.safeParse({
				mcpJsonNudge,
				experienceMode: 'power',
				isOnboarded: true,
			});

			expect(result.success).toBe(true);
			expect(result.data).toEqual({ experienceMode: 'power', isOnboarded: true });
		});

		it('exposes the stored settings type', () => {
			expectTypeOf<UserSettings['mcpJsonNudge']>().toEqualTypeOf<IUserSettings['mcpJsonNudge']>();
		});
	});

	describe('instanceAi', () => {
		it.each([
			[
				'every preference',
				{ credentialId: 'cred-1', modelName: 'claude-sonnet-4-5', localGatewayDisabled: true },
			],
			['a cleared credential', { credentialId: null }],
			['an empty preferences object', {}],
		])('keeps %s', (_label, instanceAi) => {
			expect(userSettingsSchema.parse({ instanceAi })).toEqual({ instanceAi });
		});

		it('does not add the key when no preferences are saved', () => {
			expect(userSettingsSchema.parse({ isOnboarded: true })).not.toHaveProperty('instanceAi');
		});

		it.each([
			[
				'a numeric model name',
				{ credentialId: 'cred-1', modelName: 42, localGatewayDisabled: false },
				{ credentialId: 'cred-1', localGatewayDisabled: false },
			],
			['a numeric credential', { credentialId: 7, modelName: 'm-1' }, { modelName: 'm-1' }],
			[
				'a text gateway flag',
				{ credentialId: null, localGatewayDisabled: 'yes' },
				{ credentialId: null },
			],
		])('drops only %s and keeps the other preferences', (_label, instanceAi, expected) => {
			const settings = userSettingsSchema.parse({ instanceAi });

			expect(settings).toEqual({ instanceAi: expected });
		});

		it.each([
			['a string', 'cred-1'],
			['null', null],
			['an array', ['cred-1']],
			['a number', 1],
		])(
			'drops %s saved in place of the preferences and keeps the other settings',
			(_label, instanceAi) => {
				const result = userSettingsSchema.safeParse({
					instanceAi,
					mcpJsonNudge: { impressions: 1 },
				});

				expect(result.success).toBe(true);
				expect(result.data).toEqual({ mcpJsonNudge: { impressions: 1 } });
			},
		);

		it('exposes the stored settings type', () => {
			expectTypeOf<UserSettings['instanceAi']>().toEqualTypeOf<IUserSettings['instanceAi']>();
		});
	});

	it('keeps every valid setting when the others in the same row are invalid', () => {
		const result = userSettingsSchema.safeParse({
			experienceMode: 'builder',
			mcpJsonNudge: { impressions: 2 },
			instanceAi: 'cred-1',
			dismissedCallouts: { 'test-callout': true },
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			mcpJsonNudge: { impressions: 2 },
			dismissedCallouts: { 'test-callout': true },
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

	it('keeps the nudge count and the Assistant preferences in the settings of a user detail', () => {
		const settings = {
			experienceMode: 'simple',
			mcpJsonNudge: { impressions: 2 },
			instanceAi: {
				credentialId: null,
				modelName: 'claude-sonnet-4-5',
				localGatewayDisabled: true,
			},
		};

		expect(userDetailSchema.parse(user('u1', settings)).settings).toEqual(settings);
	});

	it('keeps the nudge count and the Assistant preferences of each user in the list', () => {
		const result = usersListSchema.safeParse({
			count: 2,
			items: [
				user('u1', { mcpJsonNudge: { impressions: 1 }, instanceAi: { modelName: 'm-1' } }),
				user('u2', { mcpJsonNudge: { impressions: -1 }, instanceAi: { credentialId: 'cred-2' } }),
			],
		});

		expect(result.success).toBe(true);
		expect(result.data?.items.map((item) => item.settings)).toEqual([
			{ mcpJsonNudge: { impressions: 1 }, instanceAi: { modelName: 'm-1' } },
			{ instanceAi: { credentialId: 'cred-2' } },
		]);
	});
});
