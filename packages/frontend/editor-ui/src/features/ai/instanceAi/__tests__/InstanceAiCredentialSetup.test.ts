import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_SENTINEL } from '../constants';

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

const nodeCredentialsMock = vi.hoisted(() => ({
	getNodeProp: () => null as unknown,
	emitGatewayCredential: null as ((credType: string) => void) | null,
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node', 'overrideCredType', 'projectId', 'standalone', 'hideIssues'],
		emits: ['credentialSelected'],
		setup(props: { overrideCredType: string; node: unknown }, { emit }: { emit: Function }) {
			// Store getter so tests can read the reactive node prop after re-renders
			nodeCredentialsMock.getNodeProp = () => props.node;
			nodeCredentialsMock.emitGatewayCredential = (credType: string) => {
				emit('credentialSelected', {
					properties: {
						credentials: { [credType]: { id: null, name: '', __aiGatewayManaged: true } },
					},
				});
			};
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

const renderComponent = createThreadComponentRenderer(InstanceAiCredentialSetup);

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

		it('renders a setup button when no existing credentials', () => {
			const requests = makeCredentialRequests(1);
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-setup-button')).toBeTruthy();
			expect(queryByTestId('credential-picker')).toBeNull();
		});

		it('opens credential modal when setup button is clicked', async () => {
			const requests = makeCredentialRequests(1);
			const uiStore = useUIStore();
			const openNewCredSpy = vi.spyOn(uiStore, 'openNewCredential');

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByTestId('instance-ai-credential-setup-button'));
			expect(openNewCredSpy).toHaveBeenCalledWith(
				'type1',
				false,
				false,
				undefined,
				undefined,
				undefined,
				undefined,
				{ closeOnSave: true },
			);
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

	describe('n8n Connect (AI Gateway sentinel)', () => {
		// Two existing credentials so initSelections doesn't auto-select (auto-select only fires for length === 1)
		function makeGatewayRequests(): InstanceAiCredentialRequest[] {
			return [
				{
					credentialType: 'openAiApi',
					reason: 'Need OpenAI',
					existingCredentials: [
						{ id: 'existing-1', name: 'My OpenAI' },
						{ id: 'existing-2', name: 'My OpenAI 2' },
					],
				},
			];
		}

		it('stores sentinel and enables Continue when n8n Connect credential is selected', async () => {
			const requests = makeGatewayRequests();
			const { getByTestId } = renderComponent({
				props: { requestId: 'req-1', credentialRequests: requests, message: 'Set up' },
			});

			expect(getByTestId('instance-ai-credential-continue-button')).toBeDisabled();

			nodeCredentialsMock.emitGatewayCredential?.('openAiApi');
			await nextTick();

			expect(getByTestId('instance-ai-credential-continue-button')).not.toBeDisabled();
		});

		it('passes sentinel to confirmAction on continue', async () => {
			// Two requests, each with 2 existing credentials — prevents initSelections auto-select
			const requests: InstanceAiCredentialRequest[] = [
				{
					credentialType: 'openAiApi',
					reason: 'Need OpenAI',
					existingCredentials: [
						{ id: 'existing-1a', name: 'My OpenAI 1' },
						{ id: 'existing-1b', name: 'My OpenAI 2' },
					],
				},
				{
					credentialType: 'googlePalmApi',
					reason: 'Need Google',
					existingCredentials: [
						{ id: 'existing-2a', name: 'My Google 1' },
						{ id: 'existing-2b', name: 'My Google 2' },
					],
				},
			];
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({
				props: { requestId: 'req-1', credentialRequests: requests, message: 'Set up' },
			});

			nodeCredentialsMock.emitGatewayCredential?.('openAiApi');
			await nextTick();
			await userEvent.click(getByTestId('instance-ai-credential-next'));
			await userEvent.click(getByTestId('credential-picker'));

			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: {
					openAiApi: AI_GATEWAY_SENTINEL,
					googlePalmApi: 'cred-123',
				},
			});
		});

		it('passes gateway credential object to NodeCredentials node prop after sentinel is stored', async () => {
			const requests = makeGatewayRequests();
			renderComponent({
				props: { requestId: 'req-1', credentialRequests: requests, message: 'Set up' },
			});

			nodeCredentialsMock.emitGatewayCredential?.('openAiApi');
			await nextTick();

			const nodeProp = nodeCredentialsMock.getNodeProp() as { credentials?: unknown };
			expect(nodeProp?.credentials).toEqual({
				openAiApi: { id: null, name: '', __aiGatewayManaged: true },
			});
		});
	});

	describe('gateway auto-select (initSelections)', () => {
		function makeGatewayOnlyRequest(): InstanceAiCredentialRequest[] {
			return [{ credentialType: 'openAiApi', reason: 'Need OpenAI', existingCredentials: [] }];
		}

		function enableGateway(credType: string) {
			const settingsStore = useSettingsStore();
			const aiGatewayStore = useAiGatewayStore();
			vi.spyOn(settingsStore, 'isAiGatewayEnabled', 'get').mockReturnValue(true);
			vi.spyOn(aiGatewayStore, 'isCredentialTypeSupported').mockImplementation(
				(type) => type === credType,
			);
		}

		it('auto-selects sentinel when gateway is enabled and supports the credential type', async () => {
			enableGateway('openAiApi');
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: makeGatewayOnlyRequest(),
					message: 'Set up',
				},
			});

			// Auto-continue fires from onMounted after allSelected starts true
			await flushPromises();

			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: { openAiApi: AI_GATEWAY_SENTINEL },
			});
		});

		it('shows NodeCredentials picker (not setup button) when gateway supports the type', () => {
			enableGateway('openAiApi');
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: makeGatewayOnlyRequest(),
					message: 'Set up',
				},
			});

			// Check synchronously — onMounted hasn't fired yet, so the card is still visible
			expect(getByTestId('credential-picker')).toBeTruthy();
			expect(queryByTestId('instance-ai-credential-setup-button')).toBeNull();
		});

		it('falls through to single-credential auto-select when gateway is disabled', async () => {
			const requests: InstanceAiCredentialRequest[] = [
				{
					credentialType: 'openAiApi',
					reason: 'Need OpenAI',
					existingCredentials: [{ id: 'cred-1', name: 'My Key' }],
				},
			];
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({
				props: { requestId: 'req-1', credentialRequests: requests, message: 'Set up' },
			});

			// Auto-continue fires from onMounted after single-cred auto-select
			await flushPromises();

			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: { openAiApi: 'cred-1' },
			});
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
