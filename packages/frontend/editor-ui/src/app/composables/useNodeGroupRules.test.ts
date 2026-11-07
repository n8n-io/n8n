import { GROUPS_WITH_MANY_BOUNDARIES_FLAG, GROUPS_WITH_TRIGGERS_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNodeGroupRules } from './useNodeGroupRules';

const settingsState = { triggers: false, boundaries: false };
const posthogState = { enabledFlags: new Set<string>() };

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: {
			workflowsGroupsWithTriggersEnabled: settingsState.triggers,
			workflowsGroupsWithManyBoundariesEnabled: settingsState.boundaries,
		},
	}),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isFeatureEnabled: (flag: string) => posthogState.enabledFlags.has(flag),
	}),
}));

describe('useNodeGroupRules', () => {
	beforeEach(() => {
		settingsState.triggers = false;
		settingsState.boundaries = false;
		posthogState.enabledFlags = new Set();
	});

	it('enables the trigger rule via its operator override alone', () => {
		// The user payload drops the flags when PostHog answers too slowly at
		// login, so the settings override must still turn the rule on.
		settingsState.triggers = true;

		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(true);
		expect(allowMultipleBoundaryNodes.value).toBe(false);
	});

	it('enables the trigger rule via its PostHog flag alone', () => {
		posthogState.enabledFlags = new Set([GROUPS_WITH_TRIGGERS_FLAG]);

		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(true);
		expect(allowMultipleBoundaryNodes.value).toBe(false);
	});

	it('enables the boundary rule via its operator override alone', () => {
		settingsState.boundaries = true;

		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(false);
		expect(allowMultipleBoundaryNodes.value).toBe(true);
	});

	it('enables the boundary rule via its PostHog flag alone', () => {
		posthogState.enabledFlags = new Set([GROUPS_WITH_MANY_BOUNDARIES_FLAG]);

		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(false);
		expect(allowMultipleBoundaryNodes.value).toBe(true);
	});

	it('enables both rules when both flags are on', () => {
		posthogState.enabledFlags = new Set([
			GROUPS_WITH_TRIGGERS_FLAG,
			GROUPS_WITH_MANY_BOUNDARIES_FLAG,
		]);

		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(true);
		expect(allowMultipleBoundaryNodes.value).toBe(true);
	});

	it('disables both rules when no signal is set', () => {
		const { allowTriggerInGroup, allowMultipleBoundaryNodes } = useNodeGroupRules();

		expect(allowTriggerInGroup.value).toBe(false);
		expect(allowMultipleBoundaryNodes.value).toBe(false);
	});
});
