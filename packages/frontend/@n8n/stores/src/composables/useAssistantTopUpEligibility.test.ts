import type { FrontendSettings } from '@n8n/api-types';
import { ROLE } from '@n8n/api-types';
import type { Cloud } from '@n8n/rest-api-client/api/cloudPlans';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';
import { useAssistantTopUpEligibility } from './useAssistantTopUpEligibility';

let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

const settingsFor = (deploymentType = 'cloud') =>
	mock<FrontendSettings>({ deployment: { type: deploymentType } });

const setOwner = () => {
	usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Owner }]);
	usersStore.currentUserId = '1';
};

const setMember = () => {
	usersStore.addUsers([{ id: '1', isPending: false, role: ROLE.Member }]);
	usersStore.currentUserId = '1';
};

const setTrialing = (isTrialing: boolean) => {
	cloudPlanStore.state.data = mock<Cloud.PlanData>({ userIsTrialing: isTrialing });
};

describe('useAssistantTopUpEligibility', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		cloudPlanStore = useCloudPlanStore();
	});

	test('is false on non-cloud deployments', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor('default'));

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is false for non-owners on cloud', () => {
		setMember();
		setTrialing(false);
		settingsStore.setSettings(settingsFor());

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is false for trialing owners', () => {
		setOwner();
		setTrialing(true);
		settingsStore.setSettings(settingsFor());

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is true for a paid cloud owner', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor());

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(true);
	});
});
