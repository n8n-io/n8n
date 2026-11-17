import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import RoleContactAdminModal from './RoleContactAdminModal.vue';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
	};
});

const renderComponent = createComponentRenderer(RoleContactAdminModal, {
	props: {
		modelValue: true,
	},
});

describe('RoleContactAdminModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('Main View', () => {
		it('should render the main view when visible', async () => {
			const { findByText } = renderComponent();

			expect(await findByText("Custom roles aren't set up yet")).toBeInTheDocument();
		});

		it('should show documentation link', async () => {
			const { findByText } = renderComponent();

			expect(await findByText('Documentation')).toBeInTheDocument();
		});
	});

	describe('When custom roles exist', () => {
		it('should show different title when customRolesExist is true', async () => {
			const { findByText, queryByText } = renderComponent({
				props: { modelValue: true, customRolesExist: true },
			});

			expect(await findByText('Only instance admins can add custom roles')).toBeInTheDocument();
			expect(queryByText("Custom roles aren't set up yet")).not.toBeInTheDocument();
		});

		it('should show different body text when customRolesExist is true', async () => {
			const { findByText } = renderComponent({
				props: { modelValue: true, customRolesExist: true },
			});

			expect(await findByText(/You can assign existing custom roles/)).toBeInTheDocument();
		});
	});
});
