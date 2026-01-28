import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ProjectCustomRolesUpgradeModal from './ProjectCustomRolesUpgradeModal.vue';

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

const ElDialogStub = {
	template: `
		<div role="dialog">
			<slot />
			<slot name="footer" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(ProjectCustomRolesUpgradeModal, {
	props: {
		modelValue: true,
	},
	global: {
		stubs: {
			ElDialog: ElDialogStub,
		},
	},
});

describe('ProjectCustomRolesUpgradeModal', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render the modal content', () => {
			const { getByText } = renderComponent();

			expect(getByText('Documentation')).toBeInTheDocument();
		});

		it('should show Cancel and View plans buttons', () => {
			const { getByText } = renderComponent();

			expect(getByText('Cancel')).toBeInTheDocument();
			expect(getByText('View plans')).toBeInTheDocument();
		});
	});

	describe('User interactions', () => {
		it('should emit update:modelValue when Cancel is clicked', async () => {
			const user = userEvent.setup();
			const { getByText, emitted } = renderComponent();

			await user.click(getByText('Cancel'));

			expect(emitted()['update:modelValue']).toBeTruthy();
			expect(emitted()['update:modelValue'][0]).toEqual([false]);
		});

		it('should call goToUpgrade when View plans is clicked', async () => {
			const user = userEvent.setup();
			const { getByText } = renderComponent();

			await user.click(getByText('View plans'));

			expect(mockGoToUpgrade).toHaveBeenCalledWith('custom-roles', 'upgrade-custom-roles');
		});

		it('should close modal after View plans is clicked', async () => {
			const user = userEvent.setup();
			const { getByText, emitted } = renderComponent();

			await user.click(getByText('View plans'));

			expect(emitted()['update:modelValue']).toBeTruthy();
			expect(emitted()['update:modelValue'][0]).toEqual([false]);
		});
	});
});
