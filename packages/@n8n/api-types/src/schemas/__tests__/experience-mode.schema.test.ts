import type { IUserSettings } from 'n8n-workflow';

import type { FrontendModuleSettings } from '../../frontend-settings';
import { experienceModeSchema, type ExperienceMode } from '../experience-mode.schema';

type ModuleExperience = NonNullable<
	NonNullable<FrontendModuleSettings['instance-ai']>['experience']
>;

describe('experienceModeSchema', () => {
	it('offers exactly the Simple and Power modes', () => {
		expect(experienceModeSchema.options).toEqual(['simple', 'power']);
	});

	it.each(['simple', 'power'])('accepts %s', (mode) => {
		expect(experienceModeSchema.safeParse(mode)).toEqual({ success: true, data: mode });
	});

	// Values are compared exactly: the server does not fix the case or trim input.
	it.each([
		['an unknown mode', 'builder'],
		['an empty string', ''],
		['a capitalised mode', 'Power'],
		['an upper-case mode', 'SIMPLE'],
		['a mode with whitespace', ' power'],
		['null', null],
		['undefined', undefined],
		['a number', 1],
		['a boolean', true],
		['a list of modes', ['power']],
	])('rejects %s', (_label, value) => {
		expect(experienceModeSchema.safeParse(value).success).toBe(false);
	});

	// Type-level pins. The `typecheck` step catches a failure, not the test run.
	// n8n-workflow cannot import this schema, so it repeats the union.
	it('matches the mode type in the stored user settings', () => {
		expectTypeOf<NonNullable<IUserSettings['experienceMode']>>().toEqualTypeOf<ExperienceMode>();
	});

	it('matches the default mode type in the module settings', () => {
		expectTypeOf<ModuleExperience>().toEqualTypeOf<{
			enabled: boolean;
			defaultMode: ExperienceMode;
		}>();
	});
});
