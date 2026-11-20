import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { FORCE_FIRST_WORKFLOW_EXPERIMENT } from '@/app/constants/experiments';

import { FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT } from '../constants';

const { track, getVariant, updateCurrentUserSettings } = vi.hoisted(() => ({
	track: vi.fn(),
	getVariant: vi.fn(),
	updateCurrentUserSettings: vi.fn(),
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const usersStore = reactive({
	currentUser: {
		createdAt: daysAgo(1),
		settings: { userActivated: false, dismissedCallouts: {} as Record<string, boolean> },
	} as { createdAt?: string; settings?: Record<string, unknown> } | null,
	isInstanceOwner: true,
	isCalloutDismissed: (callout: string) =>
		usersStore.currentUser?.settings?.dismissedCallouts?.[callout] === true,
	setCalloutDismissed: vi.fn((callout: string) => {
		const settings = usersStore.currentUser?.settings;
		if (settings) settings.dismissedCallouts = { ...settings.dismissedCallouts, [callout]: true };
	}),
});
const settingsStore = reactive({ isCloudDeployment: true });

vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@/app/stores/posthog.store', () => ({ usePostHog: () => ({ getVariant }) }));
vi.mock('@n8n/stores/users.store', () => ({ useUsersStore: () => usersStore }));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => settingsStore }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@n8n/rest-api-client/api/users', () => ({ updateCurrentUserSettings }));

import { useForceFirstWorkflowStore } from './forceFirstWorkflow.store';

const featureFlagProperty = `$feature/${FORCE_FIRST_WORKFLOW_EXPERIMENT.name}`;

describe('forceFirstWorkflow store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		track.mockClear();
		getVariant.mockReset();
		updateCurrentUserSettings.mockReset();
		usersStore.setCalloutDismissed.mockClear();
		usersStore.currentUser = {
			createdAt: daysAgo(1),
			settings: { userActivated: false, dismissedCallouts: {} },
		};
		usersStore.isInstanceOwner = true;
		settingsStore.isCloudDeployment = true;
	});

	describe('enrollment and eligibility', () => {
		it('forces the flow for an eligible treatment user', () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);

			const store = useForceFirstWorkflowStore();

			expect(store.isVariantEnabled).toBe(true);
			expect(store.isEligible).toBe(true);
			expect(store.shouldForceFlow).toBe(true);
		});

		it.each([
			{ variant: FORCE_FIRST_WORKFLOW_EXPERIMENT.control, name: 'control' },
			{ variant: undefined, name: 'a user outside the experiment' },
		])('does not force the flow for $name', ({ variant }) => {
			getVariant.mockReturnValue(variant);

			expect(useForceFirstWorkflowStore().shouldForceFlow).toBe(false);
		});

		it.each([
			{
				name: 'self-hosted',
				setup: () => (settingsStore.isCloudDeployment = false),
			},
			{ name: 'not an owner', setup: () => (usersStore.isInstanceOwner = false) },
			{
				name: 'an old account',
				setup: () => {
					usersStore.currentUser = { createdAt: daysAgo(30), settings: {} };
				},
			},
			{
				name: 'an activated user',
				setup: () => {
					usersStore.currentUser = {
						createdAt: daysAgo(1),
						settings: { userActivated: true, dismissedCallouts: {} },
					};
				},
			},
			{
				name: 'a user who already finished',
				setup: () => {
					usersStore.currentUser = {
						createdAt: daysAgo(1),
						settings: { dismissedCallouts: { [FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT]: true } },
					};
				},
			},
			{ name: 'no signed-in user', setup: () => (usersStore.currentUser = null) },
		])('is not eligible for $name, even in the treatment', ({ setup }) => {
			setup();
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);

			const store = useForceFirstWorkflowStore();

			expect(store.isEligible).toBe(false);
			expect(store.shouldForceFlow).toBe(false);
		});
	});

	describe('exposure', () => {
		it.each([FORCE_FIRST_WORKFLOW_EXPERIMENT.control, FORCE_FIRST_WORKFLOW_EXPERIMENT.variant])(
			'tracks exposure once for an eligible %s user',
			(variant) => {
				getVariant.mockReturnValue(variant);
				const store = useForceFirstWorkflowStore();

				store.trackExposure();
				store.trackExposure();

				expect(track).toHaveBeenCalledTimes(1);
				expect(track).toHaveBeenCalledWith(
					TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_EXPOSED,
					{ variant, [featureFlagProperty]: variant },
				);
			},
		);

		it('does not track exposure for an ineligible user or outside the experiment', () => {
			getVariant.mockReturnValue(undefined);
			useForceFirstWorkflowStore().trackExposure();

			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);
			usersStore.isInstanceOwner = false;
			useForceFirstWorkflowStore().trackExposure();

			expect(track).not.toHaveBeenCalled();
		});
	});

	describe('step tracking', () => {
		it('adds the step and the test result to the payload', () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);

			useForceFirstWorkflowStore().trackStepCompleted('test', false);

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_STEP_COMPLETED,
				{
					variant: 'variant',
					[featureFlagProperty]: 'variant',
					step: 'test',
					succeeded: false,
				},
			);
		});

		it('omits the test result for other steps', () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);

			useForceFirstWorkflowStore().trackStepCompleted('email');

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_STEP_COMPLETED,
				{ variant: 'variant', [featureFlagProperty]: 'variant', step: 'email' },
			);
		});
	});

	describe('finishing', () => {
		it('tracks the step and never prompts again after a skip', async () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);
			const store = useForceFirstWorkflowStore();

			await store.skip('schedule');

			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_SKIPPED, {
				variant: 'variant',
				[featureFlagProperty]: 'variant',
				step: 'schedule',
			});
			expect(usersStore.setCalloutDismissed).toHaveBeenCalledWith(
				FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT,
			);
			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: { [FORCE_FIRST_WORKFLOW_FINISHED_CALLOUT]: true },
			});
			expect(store.isFinished).toBe(true);
			expect(store.shouldForceFlow).toBe(false);
		});

		it('tracks the workflow and never prompts again after publishing', async () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);
			const store = useForceFirstWorkflowStore();

			await store.complete('wf-1');

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.FORCE_FIRST_WORKFLOW_PUBLISHED,
				{ variant: 'variant', [featureFlagProperty]: 'variant', workflow_id: 'wf-1' },
			);
			expect(store.isFinished).toBe(true);
		});

		it('keeps the local state when saving the settings fails', async () => {
			getVariant.mockReturnValue(FORCE_FIRST_WORKFLOW_EXPERIMENT.variant);
			updateCurrentUserSettings.mockRejectedValue(new Error('offline'));
			const store = useForceFirstWorkflowStore();

			await expect(store.skip('email')).resolves.toBeUndefined();

			expect(store.isFinished).toBe(true);
		});
	});
});
