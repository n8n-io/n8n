import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomRolesUpgradeModal from './CustomRolesUpgradeModal.vue';

const mockGoToUpgrade = vi.fn();

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: mockGoToUpgrade,
	}),
}));

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const renderComponent = createComponentRenderer(CustomRolesUpgradeModal, {
	props: {
		modelValue: true,
	},
});

describe('CustomRolesUpgradeModal', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render the modal content', async () => {
			const { findByText } = renderComponent();

			expect(await findByText('Documentation')).toBeInTheDocument();
		});

		it('should show Cancel and View plans buttons', async () => {
			const { findByText } = renderComponent();

			expect(await findByText('Cancel')).toBeInTheDocument();
			expect(await findByText('View plans')).toBeInTheDocument();
		});
	});

	describe('User interactions', () => {
		it('should emit update:modelValue when Cancel is clicked', async () => {
			const user = userEvent.setup();
			const { findByText, emitted } = renderComponent();

			await user.click(await findByText('Cancel'));

			expect(emitted()['update:modelValue']).toBeTruthy();
			expect(emitted()['update:modelValue'][0]).toEqual([false]);
		});

		it('should call goToUpgrade when View plans is clicked', async () => {
			const user = userEvent.setup();
			const { findByText } = renderComponent();

			await user.click(await findByText('View plans'));

			expect(mockGoToUpgrade).toHaveBeenCalledWith('custom-roles-selector', 'upgrade-custom-roles');
		});

		it('should close modal after View plans is clicked', async () => {
			const user = userEvent.setup();
			const { findByText, emitted } = renderComponent();

			await user.click(await findByText('View plans'));

			expect(emitted()['update:modelValue']).toBeTruthy();
			expect(emitted()['update:modelValue'][0]).toEqual([false]);
		});
	});
});
