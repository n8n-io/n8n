import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';

const experimentState = vi.hoisted(() => ({
	isFeatureEnabled: { __v_isRef: true, value: false },
}));

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

vi.mock('@/experiments/instanceAiSetupList', () => ({
	useInstanceAiSetupListExperiment: () => ({
		isFeatureEnabled: experimentState.isFeatureEnabled,
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
		props: [
			'node',
			'overrideCredType',
			'projectId',
			'standalone',
			'hideIssues',
			'hideAskAssistant',
			'hideCredentialServiceNameInLabel',
			'hideEmptyCredentialSelect',
			'suggestedCredentialName',
		],
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
		template:
			'<div data-test-id="credential-picker" :data-hide-credential-service-name-in-label="hideCredentialServiceNameInLabel ? \'true\' : \'false\'" :data-hide-empty-credential-select="hideEmptyCredentialSelect ? \'true\' : \'false\'" @click="onClick" />',
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
		experimentState.isFeatureEnabled.value = false;
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
			expect(openNewCredSpy).toHaveBeenCalledWith('type1', false, false, undefined, undefined);
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

	describe('setup list experiment', () => {
		it('renders credential requests as a setup list without wizard controls', () => {
			experimentState.isFeatureEnabled.value = true;
			const requests = [
				...makeCredentialRequestsWithExisting(2),
				{
					credentialType: 'type2',
					reason: 'Duplicate type',
					existingCredentials: [{ id: 'existing-duplicate', name: 'Duplicate Cred' }],
				},
			];

			const { getAllByTestId, getByTestId, queryByText, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-setup-list')).toBeInTheDocument();
			expect(getAllByTestId('instance-ai-credential-setup-list-item')).toHaveLength(2);
			expect(queryByText('1 of 3')).not.toBeInTheDocument();
			expect(queryByText('instanceAi.credential.deny')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-credential-continue-button')).not.toBeInTheDocument();
		});

		it('lets users independently expand and collapse credential setup cards', async () => {
			experimentState.isFeatureEnabled.value = true;
			const requests = makeCredentialRequestsWithExisting(2);
			const { getAllByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(
				getAllByTestId('instance-ai-credential-setup-list-item').map((item) =>
					item.getAttribute('data-state'),
				),
			).toEqual(['open', 'closed']);

			await userEvent.click(getAllByTestId('instance-ai-credential-setup-list-header')[1]);

			await waitFor(() => {
				expect(
					getAllByTestId('instance-ai-credential-setup-list-item').map((item) =>
						item.getAttribute('data-state'),
					),
				).toEqual(['open', 'open']);
			});

			await userEvent.click(getAllByTestId('instance-ai-credential-setup-list-header')[0]);

			await waitFor(() => {
				expect(
					getAllByTestId('instance-ai-credential-setup-list-item').map((item) =>
						item.getAttribute('data-state'),
					),
				).toEqual(['closed', 'open']);
			});

			await userEvent.click(getAllByTestId('instance-ai-credential-setup-list-header')[1]);

			await waitFor(() => {
				expect(
					getAllByTestId('instance-ai-credential-setup-list-item').map((item) =>
						item.getAttribute('data-state'),
					),
				).toEqual(['closed', 'closed']);
			});
		});

		it('applies selected credentials only from the final apply action', async () => {
			experimentState.isFeatureEnabled.value = true;
			const requests = makeCredentialRequestsWithExisting(2);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getAllByTestId, queryAllByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(queryAllByTestId('instance-ai-credential-setup-apply')).toHaveLength(0);

			await userEvent.click(getAllByTestId('credential-picker')[0]);
			expect(confirmSpy).not.toHaveBeenCalled();
			expect(queryAllByTestId('instance-ai-credential-setup-apply')).toHaveLength(0);

			await userEvent.click(getAllByTestId('instance-ai-credential-setup-list-header')[1]);
			await userEvent.click(getAllByTestId('credential-picker')[1]);

			const applyButton = getAllByTestId('instance-ai-credential-setup-apply')[1];
			expect(applyButton).not.toBeDisabled();
			expect(confirmSpy).not.toHaveBeenCalled();

			await userEvent.click(applyButton);

			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', {
				kind: 'credentialSelection',
				credentials: {
					type1: 'cred-123',
					type2: 'cred-123',
				},
			});
		});

		it('uses compact credential labels and hides empty credential selects in the setup list', () => {
			experimentState.isFeatureEnabled.value = true;
			const requests = makeCredentialRequestsWithExisting(1);

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('credential-picker')).toHaveAttribute(
				'data-hide-credential-service-name-in-label',
				'true',
			);
			expect(getByTestId('credential-picker')).toHaveAttribute(
				'data-hide-empty-credential-select',
				'true',
			);
		});
	});
});
