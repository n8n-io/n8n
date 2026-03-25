import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore } from '../instanceAi.store';

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

vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		template:
			'<div data-test-id="credential-picker" @click="$emit(\'credentialSelected\', \'cred-123\')" />',
		props: ['appName', 'credentialType', 'selectedCredentialId', 'projectId'],
		emits: ['credentialSelected', 'credentialDeselected'],
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
	});

	describe('credential list', () => {
		it('shows all credential types at once', () => {
			const requests = makeCredentialRequests(3);
			const { getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getByText('Reason for type 1')).toBeTruthy();
			expect(getByText('Reason for type 2')).toBeTruthy();
			expect(getByText('Reason for type 3')).toBeTruthy();
		});

		it('renders a credential picker for each credential type', () => {
			const requests = makeCredentialRequests(3);
			const { getAllByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			expect(getAllByTestId('credential-picker')).toHaveLength(3);
		});

		it('renders a single credential without extra pickers', () => {
			const requests = makeCredentialRequests(1);
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
			const requests = makeCredentialRequests(1);
			const { getByTestId, container } = renderComponent({
				props: {
					requestId: 'req-1',
					credentialRequests: requests,
					message: 'Set up credentials',
				},
			});

			// No check icon before selection
			expect(container.querySelector('[data-icon="check"]')).toBeNull();

			await userEvent.click(getByTestId('credential-picker'));

			// Check icon appears after selection
			expect(container.querySelector('[data-icon="check"]')).toBeTruthy();
		});

		it('enables continue button when all credentials are selected', async () => {
			const requests = makeCredentialRequests(1);
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
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue();
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
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue();
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
			vi.spyOn(store, 'confirmAction').mockResolvedValue();

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
			vi.spyOn(store, 'confirmAction').mockResolvedValue();

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
			vi.spyOn(store, 'confirmAction').mockResolvedValue();

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
