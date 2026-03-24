import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
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

const renderComponent = createComponentRenderer(InstanceAiCredentialSetup);

function makeCredentialRequests(count: number): InstanceAiCredentialRequest[] {
	return Array.from({ length: count }, (_, i) => ({
		credentialType: `type${i + 1}`,
		reason: `Reason for type ${i + 1}`,
		existingCredentials: [],
	}));
}

describe('InstanceAiCredentialSetup', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();

		const credentialsStore = useCredentialsStore();
		vi.spyOn(credentialsStore, 'fetchAllCredentials').mockResolvedValue([]);
		vi.spyOn(credentialsStore, 'fetchCredentialTypes').mockResolvedValue(undefined);
	});

	describe('wizard navigation', () => {
		it('shows one credential type per step', () => {
			const requests = makeCredentialRequests(3);
			const { getByText, queryByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Step counter shows "1 of 3"
			expect(getByText('1 of 3')).toBeTruthy();
			// First credential type's reason is shown
			expect(getByText('Reason for type 1')).toBeTruthy();
			// Second credential type's reason is not shown
			expect(queryByText('Reason for type 2')).toBeNull();
		});

		it('navigates between steps', async () => {
			const requests = makeCredentialRequests(3);
			const { getByText, getByLabelText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Go to next step
			await userEvent.click(getByLabelText('Next step'));
			expect(getByText('2 of 3')).toBeTruthy();
			expect(getByText('Reason for type 2')).toBeTruthy();

			// Go back
			await userEvent.click(getByLabelText('Previous step'));
			expect(getByText('1 of 3')).toBeTruthy();
			expect(getByText('Reason for type 1')).toBeTruthy();
		});

		it('hides navigation arrows for single credential', () => {
			const requests = makeCredentialRequests(1);
			const { queryByLabelText, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByText('1 of 1')).toBeTruthy();
			expect(queryByLabelText('Previous step')).toBeNull();
			expect(queryByLabelText('Next step')).toBeNull();
		});
	});

	describe('card chrome', () => {
		it('renders card with credential icon in header', () => {
			const requests = makeCredentialRequests(1);
			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByTestId('instance-ai-credential-card')).toBeTruthy();
			expect(getByTestId('credential-icon')).toBeTruthy();
		});

		it('shows step completion check in header when credential selected', async () => {
			const requests = makeCredentialRequests(1);
			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByTestId('credential-picker'));
			expect(getByTestId('instance-ai-credential-step-check')).toBeTruthy();
		});

		it('applies completed style to card when all credentials selected', async () => {
			const requests = makeCredentialRequests(1);
			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByTestId('credential-picker'));
			const card = getByTestId('instance-ai-credential-card');
			expect(card.className).toContain('completed');
		});
	});

	describe('credential selection', () => {
		it('auto-advances to next step when credential is selected', async () => {
			const requests = makeCredentialRequests(2);
			const { getByTestId, getByText, getByLabelText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByText('1 of 2')).toBeTruthy();

			// Click the credential picker to select a credential for step 1
			await userEvent.click(getByTestId('credential-picker'));

			// Auto-advance should move to step 2
			expect(getByText('2 of 2')).toBeTruthy();

			// Navigate back to verify step 1 has the check
			await userEvent.click(getByLabelText('Previous step'));
			expect(getByTestId('instance-ai-credential-step-check')).toBeTruthy();
		});

		it('disables continue button when not all credentials are selected', () => {
			const requests = makeCredentialRequests(2);
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
			const requests = makeCredentialRequests(1);
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(store, 'resolveConfirmation');

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// Select credential
			await userEvent.click(getByTestId('credential-picker'));

			// Click continue
			await userEvent.click(getByTestId('instance-ai-credential-continue-button'));

			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', true, undefined, { type1: 'cred-123' });
		});

		it('calls confirmAction with false on defer', async () => {
			const requests = makeCredentialRequests(1);
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(store, 'resolveConfirmation');

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
			expect(confirmSpy).toHaveBeenCalledWith('req-1', false);
		});

		it('shows submitted success state after continue', async () => {
			const requests = makeCredentialRequests(1);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			await userEvent.click(getByTestId('credential-picker'));
			await userEvent.click(getByTestId('instance-ai-credential-continue-button'));

			expect(getByText('instanceAi.credential.allSelected')).toBeTruthy();
		});

		it('shows deferred state after skip', async () => {
			const requests = makeCredentialRequests(1);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

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
			const requests = makeCredentialRequests(1);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
					credentialFlow: { stage: 'finalize' as const },
				},
			});

			await userEvent.click(getByTestId('credential-picker'));
			await userEvent.click(getByTestId('instance-ai-credential-continue-button'));

			expect(getByText('instanceAi.credential.finalize.applied')).toBeTruthy();
		});
	});
});
