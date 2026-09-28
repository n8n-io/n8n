import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';

import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { mockedStore } from '@/__tests__/utils';
import { OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import {
	OPEN_IN_ASSISTANT_CALLOUT_KEY,
	OPEN_IN_ASSISTANT_OPT_OUT_KEY,
	useOpenWorkflowInAssistantStore,
} from './openWorkflowInAssistant.store';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const instanceAiAvailable = ref(true);
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => instanceAiAvailable,
}));

vi.mock('@n8n/rest-api-client/api/users', () => ({
	updateCurrentUserSettings: vi.fn().mockResolvedValue({}),
}));

describe('openWorkflowInAssistant.store', () => {
	let posthogStore: ReturnType<typeof mockedStore<typeof usePostHog>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let instanceAiStore: ReturnType<typeof mockedStore<typeof useInstanceAiStore>>;

	const setVariant = (value: string | undefined) => {
		posthogStore.getVariant.mockReturnValue(value);
		posthogStore.isVariantEnabled.mockReturnValue(
			value === OPEN_WORKFLOW_IN_ASSISTANT_EXPERIMENT.variant,
		);
	};

	/** One mock now serves both callout keys — dismiss only the ones named. */
	const dismissCallouts = (...keys: string[]) => {
		usersStore.isCalloutDismissed.mockImplementation((key: string) => keys.includes(key));
	};

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		posthogStore = mockedStore(usePostHog);
		usersStore = mockedStore(useUsersStore);
		uiStore = mockedStore(useUIStore);
		instanceAiStore = mockedStore(useInstanceAiStore);
		instanceAiAvailable.value = true;
		usersStore.currentUser = { id: 'u1', settings: {} } as never;
		dismissCallouts();
	});

	it('resolves to the assistant for treatment users who have not opted out', () => {
		setVariant('variant');
		const store = useOpenWorkflowInAssistantStore();
		expect(store.resolvedDefaultEditor).toBe('assistant');
		expect(store.opensInAssistant).toBe(true);
		expect(store.showsOptedOutCardButton).toBe(false);
	});

	it('lets an explicit manual preference win over the treatment variant', () => {
		setVariant('variant');
		dismissCallouts(OPEN_IN_ASSISTANT_OPT_OUT_KEY);
		const store = useOpenWorkflowInAssistantStore();
		expect(store.resolvedDefaultEditor).toBe('manual');
		expect(store.opensInAssistant).toBe(false);
		expect(store.showsOptedOutCardButton).toBe(true);
	});

	it('fails closed to control when the flag is unset', () => {
		setVariant(undefined);
		const store = useOpenWorkflowInAssistantStore();
		expect(store.opensInAssistant).toBe(false);
		expect(store.showsOptedOutCardButton).toBe(false);
	});

	it('does nothing when the assistant is unavailable', () => {
		setVariant('variant');
		instanceAiAvailable.value = false;
		const store = useOpenWorkflowInAssistantStore();
		expect(store.opensInAssistant).toBe(false);
		expect(store.showsOptedOutCardButton).toBe(false);
	});

	describe('saveDefaultEditor', () => {
		it('writes the opt-out callout alongside the existing ones and tracks the change', async () => {
			setVariant('variant');
			usersStore.currentUser = {
				id: 'u1',
				settings: { dismissedCallouts: { 'other-callout': true } },
			} as never;
			const store = useOpenWorkflowInAssistantStore();

			await store.saveDefaultEditor('manual');

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: {
					'other-callout': true,
					[OPEN_IN_ASSISTANT_OPT_OUT_KEY]: true,
				},
			});
			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.DEFAULT_EDITOR_PREFERENCE_CHANGED,
				expect.objectContaining({ value: 'manual', variant: 'variant' }),
			);
		});

		// Fresh users have settings: null — opting back in must still send the flag.
		it('clears the opt-out callout when switching back to the assistant', async () => {
			setVariant('variant');
			usersStore.currentUser = { id: 'u1', settings: null } as never;
			const store = useOpenWorkflowInAssistantStore();

			await store.saveDefaultEditor('assistant');

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: { [OPEN_IN_ASSISTANT_OPT_OUT_KEY]: false },
			});
		});
	});

	describe('handleRedirectLanding', () => {
		it('collapses the sidebar and arms the notification for an auto-launched thread', () => {
			setVariant('variant');
			instanceAiStore.getThreadMetadata.mockReturnValue({
				source: 'workflow_list_auto',
				sourceContext: { workflowId: 'wf1' },
			} as never);
			const store = useOpenWorkflowInAssistantStore();

			store.handleRedirectLanding('thread-1');

			expect(uiStore.sidebarMenuCollapsed).toBe(true);
			expect(store.isNotificationVisibleFor('thread-1')).toBe(true);
			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_SHOWN,
				expect.objectContaining({ workflow_id: 'wf1', variant: 'variant' }),
			);
		});

		it('ignores threads launched from the deliberate card button', () => {
			setVariant('variant');
			instanceAiStore.getThreadMetadata.mockReturnValue({
				source: 'workflow_list_button',
			} as never);
			const store = useOpenWorkflowInAssistantStore();

			store.handleRedirectLanding('thread-1');

			expect(store.isNotificationVisibleFor('thread-1')).toBe(false);
		});

		it('hides the notification and tracks the action on close', () => {
			setVariant('variant');
			instanceAiStore.getThreadMetadata.mockReturnValue({
				source: 'workflow_list_auto',
			} as never);
			const store = useOpenWorkflowInAssistantStore();
			store.handleRedirectLanding('thread-1');

			store.closeNotification('got_it');

			expect(store.isNotificationVisibleFor('thread-1')).toBe(false);
			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_ACTION,
				expect.objectContaining({ method: 'got_it', variant: 'variant' }),
			);
		});

		it('syncs never-show-again into local state even when user settings are null', async () => {
			setVariant('variant');
			usersStore.currentUser = {
				id: 'u1',
				settings: null,
			} as unknown as typeof usersStore.currentUser;
			vi.mocked(updateCurrentUserSettings).mockResolvedValue({
				dismissedCallouts: { [OPEN_IN_ASSISTANT_CALLOUT_KEY]: true },
			} as never);
			const store = useOpenWorkflowInAssistantStore();

			await store.neverShowAgain();

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(expect.anything(), {
				dismissedCallouts: { [OPEN_IN_ASSISTANT_CALLOUT_KEY]: true },
			});
			expect(
				usersStore.currentUser?.settings?.dismissedCallouts?.[OPEN_IN_ASSISTANT_CALLOUT_KEY],
			).toBe(true);
			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.OPEN_BY_DEFAULT_NOTIFICATION_ACTION,
				expect.objectContaining({ method: 'never_show_again', variant: 'variant' }),
			);
		});

		it('collapses the sidebar but keeps the notification hidden after never-show-again', () => {
			setVariant('variant');
			dismissCallouts(OPEN_IN_ASSISTANT_CALLOUT_KEY);
			instanceAiStore.getThreadMetadata.mockReturnValue({
				source: 'workflow_list_auto',
			} as never);
			const store = useOpenWorkflowInAssistantStore();

			store.handleRedirectLanding('thread-1');

			expect(uiStore.sidebarMenuCollapsed).toBe(true);
			expect(store.isNotificationVisibleFor('thread-1')).toBe(false);
		});
	});
});
