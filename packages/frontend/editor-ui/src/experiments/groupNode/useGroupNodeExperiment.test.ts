import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GROUP_NODE_EXPERIMENT } from '@/app/constants/experiments';

const isFeatureEnabled = vi.fn();
const settings = { isGroupNodeFeatureEnabled: false };

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settings,
}));

const { useGroupNodeExperiment } = await import('./useGroupNodeExperiment');

describe('useGroupNodeExperiment', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		settings.isGroupNodeFeatureEnabled = false;
		vi.clearAllMocks();
	});

	it('is off when the instance allows it but the user is not in the rollout', () => {
		settings.isGroupNodeFeatureEnabled = true;
		isFeatureEnabled.mockReturnValue(false);

		expect(useGroupNodeExperiment().isFeatureEnabled.value).toBe(false);
	});

	it('is off when the user is in the rollout but the instance turned it off', () => {
		// The instance guard must win, so a self-hosted instance keeps the old path.
		settings.isGroupNodeFeatureEnabled = false;
		isFeatureEnabled.mockReturnValue(true);

		expect(useGroupNodeExperiment().isFeatureEnabled.value).toBe(false);
	});

	it('is on only when both gates are on', () => {
		settings.isGroupNodeFeatureEnabled = true;
		isFeatureEnabled.mockReturnValue(true);

		expect(useGroupNodeExperiment().isFeatureEnabled.value).toBe(true);
		expect(isFeatureEnabled).toHaveBeenCalledWith(GROUP_NODE_EXPERIMENT.name);
	});

	it('reads the rollout flag by its registered name', () => {
		expect(GROUP_NODE_EXPERIMENT.name).toBe('109_group_node');
	});
});
