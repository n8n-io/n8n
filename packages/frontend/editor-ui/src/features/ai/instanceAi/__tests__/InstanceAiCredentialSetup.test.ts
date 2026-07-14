import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { computed, defineComponent, h, nextTick } from 'vue';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useUIStore } from '@/app/stores/ui.store';
import { INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY } from '@/app/constants/modals';

// Toggleable state for the 094 experiment and easy-setup detection.
const experiment = vi.hoisted(() => ({ enabled: false }));
const easySetup = vi.hoisted(() => ({ available: false }));
const mockTelemetryTrack = vi.hoisted(() => vi.fn());

vi.mock('@/experiments/instanceAiBrowserCredentialSetup', () => ({
	useInstanceAiBrowserCredentialSetupExperiment: () => ({
		isFeatureEnabled: computed(() => experiment.enabled),
	}),
}));

vi.mock('@/features/credentials/quickConnect/composables/useQuickConnect', () => ({
	useQuickConnect: () => ({
		getQuickConnectOptionByCredentialTypes: () =>
			easySetup.available ? { packageName: 'x' } : undefined,
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		canOAuthCredentialQuickConnect: () => false,
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTelemetryTrack }),
}));

// Lightweight N8nActionDropdown: renders the activator slot plus one button per
// item so tests can select a choice without the real dropdown's teleport.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nActionDropdown: defineComponent({
			name: 'N8nActionDropdown',
			props: { items: { type: Array, default: () => [] } },
			emits: ['select'],
			setup(props, { emit, slots }) {
				return () =>
					h('div', { 'data-test-id': 'setup-choice-dropdown' }, [
						slots.activator?.(),
						...(props.items as Array<{ id: string; label: string }>).map((item) =>
							h(
								'button',
								{
									'data-test-id': `setup-choice-${item.id}`,
									onClick: () => emit('select', item.id),
								},
								item.label,
							),
						),
					]);
			},
		}),
	};
});

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(str, [k, v]) => str.replace(`{${k}}`, v),
					key,
				);
			}
			return key;
		},
	}),
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		template: '<span data-test-id="credential-icon" />',
		props: ['credentialTypeName', 'size'],
	},
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node', 'overrideCredType', 'projectId', 'standalone', 'hideIssues'],
		emits: ['credentialSelected'],
		setup(props: { overrideCredType: string }, { emit }: { emit: Function }) {
			const onClick = () => {
				emit('credentialSelected', {
					properties: {
						credentials: { [props.overrideCredType]: { id: 'cred-123', name: 'Test Cred' } },
					},
				});
			};
			return { onClick };
		},
		template: '<div data-test-id="credential-picker" @click="onClick" />',
	},
}));

vi.mock('../components/InstanceAiCredentialForm.vue', () => ({
	default: {
		props: [
			'credentialType',
			'mode',
			'credentialId',
			'suggestedName',
			'projectId',
			'providerUrl',
			'showBack',
		],
		template: '<div data-test-id="instance-ai-credential-form" />',
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiCredentialSetup);

// getUsableCredentialByType is a computed returning a function — vi.spyOn's accessor
// overloads can't type a getter whose value is a function, so override it directly.
function stubUsableCredentials(
	store: ReturnType<typeof useCredentialsStore>,
	getCredentials: (type: string) => ICredentialsResponse[],
) {
	Object.defineProperty(store, 'getUsableCredentialByType', {
		configurable: true,
		get: () => getCredentials,
	});
}

/** Creates requests with no existing credentials (shows setup button) */
function makeCredentialRequests(count: number): InstanceAiCredentialRequest[] {
	return Array.from({ length: count }, (_, i) => ({
		credentialType: `type${i + 1}`,
		reason: `Reason for type ${i + 1}`,
		existingCredentials: [],
	}));
}

/** Creates requests with existing credentials (shows dropdown picker) */
function makeCredentialRequestsWithExisting(count: number): InstanceAiCredentialRequest[] {
	return Array.from({ length: count }, (_, i) => ({
		credentialType: `type${i + 1}`,
		reason: `Reason for type ${i + 1}`,
		existingCredentials: [
			{ id: `existing-${i + 1}`, name: `Existing Cred ${i + 1}` },
			{ id: `existing-${i + 1}-b`, name: `Existing Cred ${i + 1} B` },
		],
	}));
}

describe('InstanceAiCredentialSetup', () => {
	let store: ReturnType<typeof useInstanceAiStore>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();
		thread = store.getOrCreateRuntime('thread-1');

		const credentialsStore = useCredentialsStore();
		vi.spyOn(credentialsStore, 'fetchAllCredentials').mockResolvedValue([]);
		vi.spyOn(credentialsStore, 'fetchCredentialTypes').mockResolvedValue(undefined);
		// The card renders the NodeCredentials picker when the store has a usable
		// credential of the type; default to one so the picker-based tests render it.
		stubUsableCredentials(credentialsStore, () => [
			{ id: 'existing-1', name: 'Existing Cred' } as ICredentialsResponse,
		]);
	});

	describe('credential list', () => {
		it('shows all credential types via wizard navigation', async () => {
			const requests = makeCredentialRequests(3);
			const { getByText, getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByText('Reason for type 1')).toBeTruthy();
			expect(getByText('1 of 3')).toBeTruthy();

			await userEvent.click(getByTestId('instance-ai-credential-next'));
			expect(getByText('Reason for type 2')).toBeTruthy();
			expect(getByText('2 of 3')).toBeTruthy();

			await userEvent.click(getByTestId('instance-ai-credential-next'));
			expect(getByText('Reason for type 3')).toBeTruthy();
			expect(getByText('3 of 3')).toBeTruthy();
		});

		it('renders a credential picker when existing credentials exist', async () => {
			const requests = makeCredentialRequestsWithExisting(3);
			const { getAllByTestId, getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getAllByTestId('credential-picker')).toHaveLength(1);

			await userEvent.click(getByTestId('instance-ai-credential-next'));
			expect(getAllByTestId('credential-picker')).toHaveLength(1);

			await userEvent.click(getByTestId('instance-ai-credential-next'));
			expect(getAllByTestId('credential-picker')).toHaveLength(1);
		});

		it('renders the setup button (modal path) for a plain type with no usable credentials', () => {
			const credentialsStore = useCredentialsStore();
			stubUsableCredentials(credentialsStore, () => []);

			const requests = makeCredentialRequests(1);
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-setup-button')).toBeTruthy();
			expect(queryByTestId('instance-ai-credential-form')).toBeNull();
			expect(queryByTestId('credential-picker')).toBeNull();
		});

		it('renders the guided inline form for a Templated Custom Auth recipe', () => {
			const credentialsStore = useCredentialsStore();
			stubUsableCredentials(credentialsStore, () => []);

			const requests: InstanceAiCredentialRequest[] = [
				{
					credentialType: 'httpTemplatedCustomAuth',
					reason: 'For calling the fal.ai API',
					existingCredentials: [],
					setupHint: {
						template: { headers: { Authorization: 'Key {{api_key}}' } },
						placeholders: [{ name: 'api_key', title: 'fal.ai API key' }],
						suggestedName: 'fal.ai API Key',
					},
				},
			];
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-form')).toBeTruthy();
			expect(queryByTestId('instance-ai-credential-setup-button')).toBeNull();
			expect(queryByTestId('credential-picker')).toBeNull();
		});

		it('renders a single credential with picker when existing credentials', () => {
			const requests = makeCredentialRequestsWithExisting(1);
			const { getAllByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByText('Reason for type 1')).toBeTruthy();
			expect(getAllByTestId('credential-picker')).toHaveLength(1);
		});
	});

	describe('credential selection', () => {
		it('shows check icon when credential is selected', async () => {
			// Use multi-step to prevent auto-continue on first selection
			const requests = makeCredentialRequestsWithExisting(2);
			const { getByTestId, container } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// No check icon before selection
			expect(container.querySelector('[data-icon="check"]')).toBeNull();

			// Select on step 1 — auto-advance moves to step 2
			await userEvent.click(getByTestId('credential-picker'));

			// Navigate back to step 1 to verify check icon
			await userEvent.click(getByTestId('instance-ai-credential-prev'));
			expect(getByTestId('instance-ai-credential-step-check')).toBeTruthy();
		});

		it('enables continue button when at least one credential is selected', async () => {
			// Use multi-step to prevent auto-continue
			const requests = makeCredentialRequestsWithExisting(2);
			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-continue-button')).toBeDisabled();

			await userEvent.click(getByTestId('credential-picker'));

			expect(getByTestId('instance-ai-credential-continue-button')).not.toBeDisabled();
		});

		it('disables continue button when not all credentials are selected', () => {
			const requests = makeCredentialRequestsWithExisting(2);
			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			const continueBtn = getByTestId('instance-ai-credential-continue-button');
			expect(continueBtn).toBeDisabled();
		});
	});

	describe('submit actions', () => {
		it('calls confirmAction with credential map on continue', async () => {
			const requests = makeCredentialRequestsWithExisting(2);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Select first credential
			await userEvent.click(getByTestId('credential-picker'));

			// Navigate to second step and select
			await userEvent.click(getByTestId('instance-ai-credential-next'));
			await userEvent.click(getByTestId('credential-picker'));

			// Auto-continue fires since all are selected
			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: {
					type1: 'cred-123',
					type2: 'cred-123',
				},
			});
		});

		it('calls confirmAction with false on defer', async () => {
			const requests = makeCredentialRequests(1);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Click "Later"
			await userEvent.click(getByText('instanceAi.credential.deny'));

			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'deferred');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', { kind: 'approval', approved: false });
		});

		it('auto-continues when single credential is selected', async () => {
			const requests = makeCredentialRequestsWithExisting(1);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Select credential — auto-continue should fire
			await userEvent.click(getByTestId('credential-picker'));

			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: { type1: 'cred-123' },
			});
			expect(getByText('instanceAi.credential.allSelected')).toBeTruthy();
		});

		it('shows deferred state after skip', async () => {
			const requests = makeCredentialRequests(1);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByText('instanceAi.credential.deny'));

			expect(getByText('instanceAi.credential.finalize.deferred')).toBeTruthy();
		});

		it('rolls back UI state when defer API call fails', async () => {
			const requests = makeCredentialRequests(1);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByText('instanceAi.credential.deny'));

			// Should NOT resolve confirmation on failure
			expect(resolveSpy).not.toHaveBeenCalled();
			// Should show the form again (not deferred state)
			expect(getByText('instanceAi.credential.deny')).toBeTruthy();
		});
	});

	describe('browser-use setup choice (094 experiment)', () => {
		let settingsStore: ReturnType<typeof useInstanceAiSettingsStore>;

		beforeEach(() => {
			experiment.enabled = false;
			easySetup.available = false;
			mockTelemetryTrack.mockClear();

			settingsStore = useInstanceAiSettingsStore();
			vi.spyOn(settingsStore, 'fetchBrowserStatus').mockResolvedValue(undefined);
			settingsStore.browserConnected = false;

			// The choice only shows with no usable credentials in the store —
			// override the suite-level default of one.
			stubUsableCredentials(useCredentialsStore(), () => []);
		});

		function renderCard(requests: InstanceAiCredentialRequest[]) {
			return renderComponent({
				props: { requestId: 'req-1', credentialRequests: requests, message: 'Set up credentials' },
			});
		}

		it('shows the automatic/manual choice under the variant when no easier path exists', () => {
			experiment.enabled = true;
			const { getByTestId } = renderCard(makeCredentialRequests(1));

			expect(getByTestId('setup-choice-ai')).toBeTruthy();
			expect(getByTestId('setup-choice-manual')).toBeTruthy();
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'Instance AI Browser Use credential setup choice shown',
				expect.objectContaining({ credential_type: 'type1' }),
			);
		});

		it('does not show the choice when the experiment is off', () => {
			const { queryByTestId } = renderCard(makeCredentialRequests(1));

			expect(queryByTestId('setup-choice-ai')).toBeNull();
			expect(mockTelemetryTrack).not.toHaveBeenCalledWith(
				'Instance AI Browser Use credential setup choice shown',
				expect.anything(),
			);
		});

		it('does not show the choice when easy setup is available', () => {
			experiment.enabled = true;
			easySetup.available = true;
			const { queryByTestId } = renderCard(makeCredentialRequests(1));

			expect(queryByTestId('setup-choice-ai')).toBeNull();
		});

		it('does not show the choice when credentials already exist', () => {
			experiment.enabled = true;
			stubUsableCredentials(useCredentialsStore(), () => [
				{ id: 'existing-1', name: 'Existing Cred' } as ICredentialsResponse,
			]);
			const { queryByTestId } = renderCard(makeCredentialRequestsWithExisting(1));

			expect(queryByTestId('setup-choice-ai')).toBeNull();
		});

		it('tracks and opens the credential modal on manual choice', async () => {
			experiment.enabled = true;

			const { getByTestId, queryByTestId } = renderCard(makeCredentialRequests(1));
			expect(queryByTestId('instance-ai-credential-form')).toBeNull();

			await userEvent.click(getByTestId('setup-choice-manual'));

			expect(queryByTestId('instance-ai-credential-form')).toBeNull();
			expect(useUIStore().openNewCredential).toHaveBeenCalledWith(
				'type1',
				false,
				false,
				undefined,
				undefined,
				undefined,
				undefined,
				{ closeOnSave: true },
			);
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'Instance AI Browser Use User clicked credential setup option',
				expect.objectContaining({ credential_type: 'type1', choice: 'manual' }),
			);
		});

		it('submits auto setup immediately when the browser is connected', async () => {
			experiment.enabled = true;
			settingsStore.browserConnected = true;
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderCard(makeCredentialRequests(1));
			await userEvent.click(getByTestId('setup-choice-ai'));

			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialAutoSetup',
				credentialType: 'type1',
			});
			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved');
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'Instance AI Browser Use User clicked credential setup option',
				expect.objectContaining({ credential_type: 'type1', choice: 'ai' }),
			);
		});

		it('opens the connect modal and continues once the browser connects', async () => {
			experiment.enabled = true;
			settingsStore.browserConnected = false;
			const uiStore = useUIStore();
			const openModalSpy = vi.spyOn(uiStore, 'openModal').mockImplementation(() => {});
			const closeModalSpy = vi.spyOn(uiStore, 'closeModal').mockImplementation(() => {});
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderCard(makeCredentialRequests(1));
			await userEvent.click(getByTestId('setup-choice-ai'));

			expect(openModalSpy).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
			expect(confirmSpy).not.toHaveBeenCalled();

			// Simulate the browser connecting (push updates the store).
			settingsStore.browserConnected = true;

			await vi.waitFor(() => {
				expect(confirmSpy).toHaveBeenCalledWith('req-1', {
					kind: 'credentialAutoSetup',
					credentialType: 'type1',
				});
			});
			expect(closeModalSpy).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
		});

		it('does not submit auto setup once the connect modal is dismissed without connecting', async () => {
			experiment.enabled = true;
			settingsStore.browserConnected = false;
			const uiStore = useUIStore();
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderCard(makeCredentialRequests(1));
			await userEvent.click(getByTestId('setup-choice-ai'));

			uiStore.closeModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
			await nextTick();

			settingsStore.browserConnected = true;
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(confirmSpy).not.toHaveBeenCalled();
		});

		it('tracks skip when deferring while the choice is shown', async () => {
			experiment.enabled = true;
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByText } = renderCard(makeCredentialRequests(1));
			await userEvent.click(getByText('instanceAi.credential.deny'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'Instance AI Browser Use User clicked credential setup option',
				expect.objectContaining({ credential_type: 'type1', choice: 'skip' }),
			);
		});
	});

	describe('finalize mode', () => {
		it('shows finalize button labels', () => {
			const requests = makeCredentialRequests(1);
			const { getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
					credentialFlow: { stage: 'finalize' as const },
				},
			});

			expect(getByText('instanceAi.credential.finalize.later')).toBeTruthy();
		});

		it('shows finalize applied state after submit', async () => {
			const requests = makeCredentialRequestsWithExisting(1);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
					credentialFlow: { stage: 'finalize' as const },
				},
			});

			// Select credential — auto-continue fires
			await userEvent.click(getByTestId('credential-picker'));

			expect(getByText('instanceAi.credential.finalize.applied')).toBeTruthy();
		});
	});
});
