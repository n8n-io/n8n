import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPlusEnrollmentModal from '@/components/CommunityPlusEnrollmentModal.vue';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';
import { useUsageStore } from '@/stores/usage.store';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUsersStore } from '@/stores/users.store';

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
			};
		},
	};
});

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(CommunityPlusEnrollmentModal, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

describe('CommunityPlusEnrollmentModal', () => {
	const buttonLabel = 'Send me a free license key';

	beforeEach(() => {
		createTestingPinia();
	});

	it('should not throw error opened only with the name', () => {
		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		};

		expect(() => renderComponent({ props })).not.toThrow();
	});

	it('should test enrolling', async () => {
		const closeCallbackSpy = vi.fn();
		const usageStore = mockedStore(useUsageStore);
		const toast = useToast();

		usageStore.registerCommunityEdition.mockResolvedValue({
			title: 'Title',
			text: 'Text',
		});

		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback: closeCallbackSpy,
			},
		};

		const { getByRole } = renderComponent({ props });
		const emailInput = getByRole('textbox');
		expect(emailInput).toBeVisible();

		await userEvent.type(emailInput, 'not-an-email');
		expect(emailInput).toHaveValue('not-an-email');
		expect(getByRole('button', { name: buttonLabel })).toBeDisabled();

		await userEvent.clear(emailInput);
		await userEvent.type(emailInput, 'test@ema.il');
		expect(emailInput).toHaveValue('test@ema.il');
		expect(getByRole('button', { name: buttonLabel })).toBeEnabled();

		await userEvent.click(getByRole('button', { name: buttonLabel }));
		expect(usageStore.registerCommunityEdition).toHaveBeenCalledWith('test@ema.il');
		expect(toast.showMessage).toHaveBeenCalledWith({
			title: 'Title',
			message: 'Text',
			type: 'success',
			duration: 0,
		});
		expect(closeCallbackSpy).toHaveBeenCalled();
	});

	it('should test enrolling error', async () => {
		const closeCallbackSpy = vi.fn();
		const usageStore = mockedStore(useUsageStore);
		const toast = useToast();

		usageStore.registerCommunityEdition.mockRejectedValue(
			new Error('Failed to register community edition'),
		);

		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback: closeCallbackSpy,
			},
		};

		const { getByRole } = renderComponent({ props });
		const emailInput = getByRole('textbox');
		expect(emailInput).toBeVisible();

		await userEvent.type(emailInput, 'test@ema.il');
		expect(emailInput).toHaveValue('test@ema.il');
		expect(getByRole('button', { name: buttonLabel })).toBeEnabled();

		await userEvent.click(getByRole('button', { name: buttonLabel }));
		expect(usageStore.registerCommunityEdition).toHaveBeenCalledWith('test@ema.il');
		expect(toast.showError).toHaveBeenCalledWith(
			new Error('Failed to register community edition'),
			'License request failed',
		);
		expect(closeCallbackSpy).not.toHaveBeenCalled();
	});

	it('should track skipping', async () => {
		const closeCallbackSpy = vi.fn();
		const telemetry = useTelemetry();

		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback: closeCallbackSpy,
			},
		};

		const { getByRole } = renderComponent({ props });
		const skipButton = getByRole('button', { name: 'Skip' });
		expect(skipButton).toBeVisible();

		await userEvent.click(skipButton);
		expect(telemetry.track).toHaveBeenCalledWith('User skipped community plus');
	});

	it('should use user email if possible', async () => {
		const closeCallbackSpy = vi.fn();
		const usersStore = mockedStore(useUsersStore);

		usersStore.currentUser = {
			id: '1',
			email: 'test@n8n.io',
			isDefaultUser: false,
			isPending: false,
			mfaEnabled: false,
			isPendingUser: false,
		};

		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback: closeCallbackSpy,
			},
		};

		const { getByRole } = renderComponent({ props });
		const emailInput = getByRole('textbox');
		expect(emailInput).toHaveValue('test@n8n.io');
	});

	it('should not throw error if no close callback provided', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error');
		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		};

		const { getByRole } = renderComponent({ props });
		const skipButton = getByRole('button', { name: 'Skip' });
		expect(skipButton).toBeVisible();

		await userEvent.click(skipButton);
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('should prevent multiple submissions', async () => {
		const closeCallbackSpy = vi.fn();
		const usageStore = mockedStore(useUsageStore);

		usageStore.registerCommunityEdition.mockImplementation(
			async () =>
				await new Promise((resolve) =>
					setTimeout(() => resolve({ title: 'Title', text: 'Text' }), 100),
				),
		);

		const props = {
			modalName: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: {
				closeCallback: closeCallbackSpy,
			},
		};

		const { getByRole } = renderComponent({ props });
		const emailInput = getByRole('textbox');
		expect(emailInput).toBeVisible();

		await userEvent.type(emailInput, 'test@ema.il');
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('{Enter}');

		expect(getByRole('button', { name: buttonLabel })).toBeDisabled();
		expect(usageStore.registerCommunityEdition).toHaveBeenCalledWith('test@ema.il');
		expect(usageStore.registerCommunityEdition).toHaveBeenCalledTimes(1);
	});
});
