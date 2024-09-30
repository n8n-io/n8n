import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CommunityPlusEnrollmentModal from '@/components/CommunityPlusEnrollmentModal.vue';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';
import { useUsageStore } from '@/stores/usage.store';
import { useToast } from '@/composables/useToast';

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

	it('should test enrolling', async () => {
		const closeCallbackSpy = vi.fn();
		const usageStore = useUsageStore();
		const registerCommunityEditionSpy = vi
			.spyOn(usageStore, 'registerCommunityEdition')
			.mockResolvedValue({
				title: 'Title',
				text: 'Text',
			});
		const toast = useToast();

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
		expect(registerCommunityEditionSpy).toHaveBeenCalledWith('test@ema.il');
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
		const usageStore = useUsageStore();
		const registerCommunityEditionSpy = vi
			.spyOn(usageStore, 'registerCommunityEdition')
			.mockRejectedValue(new Error('Failed to register community edition'));
		const toast = useToast();

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
		expect(registerCommunityEditionSpy).toHaveBeenCalledWith('test@ema.il');
		expect(toast.showError).toHaveBeenCalledWith(
			new Error('Failed to register community edition'),
			'License request failed',
		);
		expect(closeCallbackSpy).not.toHaveBeenCalled();
	});
});
