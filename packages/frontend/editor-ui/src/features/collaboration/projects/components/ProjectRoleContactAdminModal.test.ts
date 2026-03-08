import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import ProjectRoleContactAdminModal from './ProjectRoleContactAdminModal.vue';

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
			<slot name="header" />
			<slot />
		</div>
	`,
};

const renderComponent = createComponentRenderer(ProjectRoleContactAdminModal, {
	props: {
		modelValue: true,
	},
	global: {
		stubs: {
			ElDialog: ElDialogStub,
		},
	},
});

describe('ProjectRoleContactAdminModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('Main View', () => {
		it('should render the main view when visible', () => {
			const { getByText } = renderComponent();

			expect(getByText("Custom roles aren't set up yet")).toBeInTheDocument();
		});

		it('should show documentation link', () => {
			const { getByText } = renderComponent();

			expect(getByText('Documentation')).toBeInTheDocument();
		});
	});

	describe('When custom roles exist', () => {
		it('should show different title when customRolesExist is true', () => {
			const { getByText, queryByText } = renderComponent({
				props: { modelValue: true, customRolesExist: true },
			});

			expect(getByText('Only instance admins can add custom roles')).toBeInTheDocument();
			expect(queryByText("Custom roles aren't set up yet")).not.toBeInTheDocument();
		});

		it('should show different body text when customRolesExist is true', () => {
			const { getByText } = renderComponent({
				props: { modelValue: true, customRolesExist: true },
			});

			expect(getByText(/You can assign existing custom roles/)).toBeInTheDocument();
		});
	});
});
