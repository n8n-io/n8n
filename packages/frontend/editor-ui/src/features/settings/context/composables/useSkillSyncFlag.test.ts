import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillSyncEnabled, useSkillSyncFlag } from './useSkillSyncFlag';

const posthogState = { value: undefined as boolean | string | undefined };
const isFeatureEnabled = vi.fn(() => posthogState.value === true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

const moduleSettings: { skills?: { skillSyncEnabled: boolean; skillSyncManagedByEnv: boolean } } =
	{};

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ moduleSettings }),
}));

describe('useSkillSyncFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		posthogState.value = undefined;
	});

	it.each([
		{ flag: true, enabled: true },
		{ flag: false, enabled: false },
		{ flag: undefined, enabled: false },
		{ flag: 'variant', enabled: false },
	])('is $enabled when the flag is $flag', ({ flag, enabled }) => {
		posthogState.value = flag;

		expect(useSkillSyncFlag().value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(SKILL_SYNC_FLAG);
	});

	it.each([
		{ flag: true, switchOn: true, enabled: true },
		{ flag: true, switchOn: false, enabled: false },
		{ flag: false, switchOn: true, enabled: false },
		{ flag: true, switchOn: undefined, enabled: false },
	])(
		'enables Skill Sync only with the flag and the switch on (flag: $flag, switch: $switchOn)',
		({ flag, switchOn, enabled }) => {
			posthogState.value = flag;
			moduleSettings.skills =
				switchOn === undefined
					? undefined
					: { skillSyncEnabled: switchOn, skillSyncManagedByEnv: false };

			expect(useSkillSyncEnabled().value).toBe(enabled);
		},
	);
});
