import type { FrontendModuleSettings, FrontendSettings } from '@n8n/api-types';
import { ROLE } from '@n8n/api-types';
import type { Cloud } from '@n8n/rest-api-client/api/cloudPlans';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';
import {
	ASSISTANT_TOP_UP_GA_DATE,
	useAssistantTopUpEligibility,
} from './useAssistantTopUpEligibility';

let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

/**
 * Build a `FrontendSettings` mock with the pieces this composable reads —
 * deployment type and the `aiAssistant.cloudUbbEnabled` flag.
 */
const settingsFor = ({
	deploymentType = 'cloud',
	cloudUbbEnabled = false,
}: { deploymentType?: string; cloudUbbEnabled?: boolean } = {}) =>
	mock<FrontendSettings>({
		deployment: { type: deploymentType },
		aiAssistant: { enabled: true, setup: true, cloudUbbEnabled },
	});

/** Load `instance-ai` module settings, honouring only the activation-capped bit. */
const moduleSettingsFor = ({ activationCapped = false }: { activationCapped?: boolean } = {}) =>
	({
		'instance-ai': {
			enabled: true,
			mcpConnectionsAvailable: false,
			localGatewayDisabled: false,
			browserUseEnabled: false,
			proxyEnabled: false,
			cloudManaged: false,
			sandboxEnabled: false,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
			activationCapped,
		},
	}) as FrontendModuleSettings;

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
		vi.useFakeTimers();
		// Freeze time before the GA date so the entitlement flag is the only lever
		// unless a test explicitly steps past GA.
		vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('is false on non-cloud deployments regardless of everything else', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ deploymentType: 'default', cloudUbbEnabled: true }));
		settingsStore.moduleSettings = moduleSettingsFor();

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is false for non-owners on cloud', () => {
		setMember();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: true }));
		settingsStore.moduleSettings = moduleSettingsFor();

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is false for trialing owners even when the entitlement is on', () => {
		setOwner();
		setTrialing(true);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: true }));
		settingsStore.moduleSettings = moduleSettingsFor();

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is false for activation-capped instances even when the entitlement is on', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: true }));
		settingsStore.moduleSettings = moduleSettingsFor({ activationCapped: true });

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is true for a paid cloud owner when the entitlement is on, before GA', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: true }));
		settingsStore.moduleSettings = moduleSettingsFor();

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(true);
	});

	test('is false for a paid cloud owner without the entitlement before GA', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: false }));
		settingsStore.moduleSettings = moduleSettingsFor();

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(false);
	});

	test('is true for a paid cloud owner without the entitlement at or past GA', () => {
		setOwner();
		setTrialing(false);
		settingsStore.setSettings(settingsFor({ cloudUbbEnabled: false }));
		settingsStore.moduleSettings = moduleSettingsFor();
		vi.setSystemTime(ASSISTANT_TOP_UP_GA_DATE);

		const { isEligible } = useAssistantTopUpEligibility();

		expect(isEligible.value).toBe(true);
	});
});
