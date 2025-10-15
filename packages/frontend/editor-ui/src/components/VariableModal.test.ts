import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import VariableModal from './VariableModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { VARIABLE_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/stores/ui.store';
import useEnvironmentsStore from '@/features/environments.ee/environments.store';
import type { EnvironmentVariable } from '@/features/environments.ee/environments.types';
import { useProjectsStore } from '@/features/projects/projects.store';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
	useRoute: () => ({
		params: {},
		query: {},
	}),
	RouterLink: vi.fn(),
}));

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const mockVariables: EnvironmentVariable[] = [
	{
		id: '1',
		key: 'EXISTING_GLOBAL_VAR',
		value: 'global value',
	},
	{
		id: '2',
		key: 'EXISTING_PROJECT_VAR',
		value: 'project value',
		project: {
			id: 'project-1',
			name: 'Project 1',
		},
	},
];

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[VARIABLE_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [VARIABLE_MODAL_KEY],
	},
	[STORES.PROJECTS]: {
		currentProjectId: null,
		availableProjects: [
			{
				id: 'project-1',
				name: 'Test Project',
				type: 'team',
			},
			{
				id: 'project-2',
				name: 'Personal Project',
				type: 'personal',
			},
		],
	},
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(VariableModal);
let pinia: ReturnType<typeof createTestingPinia>;
let environmentsStore: MockedStore<typeof useEnvironmentsStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let uiStore: MockedStore<typeof useUIStore>;

describe('VariableModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		environmentsStore = mockedStore(useEnvironmentsStore);
		projectsStore = mockedStore(useProjectsStore);
		uiStore = mockedStore(useUIStore);

		environmentsStore.variables = mockVariables;
		environmentsStore.createVariable = vi.fn().mockResolvedValue({
			id: '3',
			key: 'NEW_VAR',
			value: 'new value',
		});
		environmentsStore.updateVariable = vi.fn().mockResolvedValue({
			id: '1',
			key: 'UPDATED_VAR',
			value: 'updated value',
		});
	});

	describe('mode: new', () => {
		it('should render modal with elements', () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			expect(getByTestId('variable-modal-key-input')).toBeInTheDocument();
			expect(getByTestId('variable-modal-value-input')).toBeInTheDocument();
			expect(getByTestId('variable-modal-save-button')).toBeInTheDocument();
			expect(getByTestId('variable-modal-cancel-button')).toBeInTheDocument();
		});

		it('should create a new global variable', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const valueInputContainer = getByTestId('variable-modal-value-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			const valueInput = valueInputContainer.querySelector('textarea');

			if (!keyInput || !valueInput) {
				throw new Error('Input elements not found');
			}

			await userEvent.type(keyInput, 'NEW_VAR');
			await userEvent.type(valueInput, 'new value');

			expect(saveButton).toBeEnabled();

			await userEvent.click(saveButton);

			expect(environmentsStore.createVariable).toHaveBeenCalledWith({
				key: 'NEW_VAR',
				value: 'new value',
			});
			expect(uiStore.closeModal).toHaveBeenCalledWith(VARIABLE_MODAL_KEY);
		});

		it('should disable save button when key is invalid', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Try invalid characters (spaces, special chars)
			await userEvent.type(keyInput, 'INVALID KEY!');

			// Trigger validation by attempting to save
			await userEvent.click(saveButton);

			expect(saveButton).toBeDisabled();
		});

		it('should show error when global variable exists globally', async () => {
			const { getByTestId, queryByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Use an existing global variable key
			await userEvent.type(keyInput, 'EXISTING_GLOBAL_VAR');

			expect(queryByTestId('variable-modal-key-exists-error')).toBeInTheDocument();
			expect(saveButton).toBeDisabled();
		});

		it('should show error when key exists in same project', async () => {
			projectsStore.currentProjectId = 'project-1';
			const { getByTestId, queryByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Use an existing key
			await userEvent.type(keyInput, 'EXISTING_PROJECT_VAR');

			expect(queryByTestId('variable-modal-key-exists-error')).toBeInTheDocument();
			expect(saveButton).toBeDisabled();
		});

		it('should show warning overriding global variable in project context', async () => {
			projectsStore.currentProjectId = 'project-1';
			const { getByTestId, queryByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Use an existing global variable key
			await userEvent.type(keyInput, 'EXISTING_GLOBAL_VAR');

			expect(queryByTestId('variable-modal-key-exists-error')).not.toBeInTheDocument();
			expect(queryByTestId('variable-modal-global-exists-warning')).toBeInTheDocument();
			expect(saveButton).toBeEnabled();
		});

		it('should close modal on cancel', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const cancelButton = getByTestId('variable-modal-cancel-button');
			await userEvent.click(cancelButton);

			expect(uiStore.closeModal).toHaveBeenCalledWith(VARIABLE_MODAL_KEY);
		});

		it('should not show scope field when in project context', () => {
			projectsStore.currentProjectId = 'project-1';

			const { queryByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			expect(queryByTestId('variable-modal-scope-select')).not.toBeInTheDocument();
		});

		it('should show scope field when not in project context', () => {
			projectsStore.currentProjectId = undefined;

			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			expect(getByTestId('variable-modal-scope-select')).toBeInTheDocument();
		});
	});

	describe('mode: edit', () => {
		const existingVariable: EnvironmentVariable = {
			id: '1',
			key: 'EXISTING_VAR',
			value: 'existing value',
		};

		it('should pre-fill form with existing variable data', () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: existingVariable,
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const valueInputContainer = getByTestId('variable-modal-value-input');

			const keyInput = keyInputContainer.querySelector('input') as HTMLInputElement;
			const valueInput = valueInputContainer.querySelector('textarea') as HTMLTextAreaElement;

			expect(keyInput.value).toBe('EXISTING_VAR');
			expect(valueInput.value).toBe('existing value');
		});

		it('should update an existing variable', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: existingVariable,
				},
				global,
				pinia,
			});

			const valueInputContainer = getByTestId('variable-modal-value-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const valueInput = valueInputContainer.querySelector('textarea');
			if (!valueInput) throw new Error('Input not found');

			// Clear and update the value
			await userEvent.clear(valueInput);
			await userEvent.type(valueInput, 'updated value');

			await userEvent.click(saveButton);

			expect(environmentsStore.updateVariable).toHaveBeenCalledWith({
				id: '1',
				key: 'EXISTING_VAR',
				value: 'updated value',
			});
			expect(uiStore.closeModal).toHaveBeenCalledWith(VARIABLE_MODAL_KEY);
		});

		it('should allow keeping the same key when editing', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: existingVariable,
				},
				global,
				pinia,
			});

			const saveButton = getByTestId('variable-modal-save-button');
			const valueInputContainer = getByTestId('variable-modal-value-input');

			const valueInput = valueInputContainer.querySelector('textarea');
			if (!valueInput) throw new Error('Input not found');

			// Just change the value, not the key
			await userEvent.clear(valueInput);
			await userEvent.type(valueInput, 'new value');

			// Should not show duplicate error for own key
			expect(saveButton).toBeEnabled();
		});

		it('should show an error when changing key to one that exists in same project', async () => {
			projectsStore.currentProjectId = 'project-1';
			const { getByTestId, queryByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: { ...existingVariable, project: { id: 'project-1', name: 'Project 1' } },
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Change to an existing key
			await userEvent.clear(keyInput);
			await userEvent.type(keyInput, 'EXISTING_PROJECT_VAR');

			expect(queryByTestId('variable-modal-key-exists-error')).toBeInTheDocument();
			expect(saveButton).toBeDisabled();
		});

		it('should show a warning when changing key to one that exists globally in project context', async () => {
			projectsStore.currentProjectId = 'project-1';
			const { getByTestId, queryByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: { ...existingVariable, project: { id: 'project-1', name: 'Project 1' } },
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			if (!keyInput) throw new Error('Input not found');

			// Change to an existing global variable key
			await userEvent.clear(keyInput);
			await userEvent.type(keyInput, 'EXISTING_GLOBAL_VAR');

			expect(queryByTestId('variable-modal-key-exists-error')).not.toBeInTheDocument();
			expect(queryByTestId('variable-modal-global-exists-warning')).toBeInTheDocument();
			expect(saveButton).toBeEnabled();
		});

		it('should hide scope field when editing', () => {
			const { queryByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: existingVariable,
				},
				global,
				pinia,
			});

			expect(queryByTestId('variable-modal-scope-select')).not.toBeInTheDocument();
		});
	});

	describe('validation', () => {
		it('should allow valid alphanumeric keys with underscores', async () => {
			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const valueInputContainer = getByTestId('variable-modal-value-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			const valueInput = valueInputContainer.querySelector('textarea');

			if (!keyInput || !valueInput) throw new Error('Inputs not found');

			await userEvent.type(keyInput, 'Valid_Key_123');
			await userEvent.type(valueInput, 'some value');

			expect(saveButton).toBeEnabled();
		});
	});

	describe('error handling', () => {
		it('should not close modal when create fails', async () => {
			environmentsStore.createVariable = vi.fn().mockRejectedValue(new Error('Network error'));

			const { getByTestId } = renderModal({
				props: {
					mode: 'new',
				},
				global,
				pinia,
			});

			const keyInputContainer = getByTestId('variable-modal-key-input');
			const valueInputContainer = getByTestId('variable-modal-value-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const keyInput = keyInputContainer.querySelector('input');
			const valueInput = valueInputContainer.querySelector('textarea');

			if (!keyInput || !valueInput) throw new Error('Inputs not found');

			await userEvent.type(keyInput, 'NEW_VAR');
			await userEvent.type(valueInput, 'value');
			await userEvent.click(saveButton);

			// Give time for the async operation to complete
			await vi.waitFor(() => {
				expect(environmentsStore.createVariable).toHaveBeenCalled();
			});

			// Modal should still be open
			expect(uiStore.closeModal).not.toHaveBeenCalled();
		});

		it('should not close modal when update fails', async () => {
			environmentsStore.updateVariable = vi.fn().mockRejectedValue(new Error('Network error'));

			const existingVariable: EnvironmentVariable = {
				id: '1',
				key: 'EXISTING_VAR',
				value: 'existing value',
			};

			const { getByTestId } = renderModal({
				props: {
					mode: 'edit',
					variable: existingVariable,
				},
				global,
				pinia,
			});

			const valueInputContainer = getByTestId('variable-modal-value-input');
			const saveButton = getByTestId('variable-modal-save-button');

			const valueInput = valueInputContainer.querySelector('textarea');
			if (!valueInput) throw new Error('Input not found');

			await userEvent.clear(valueInput);
			await userEvent.type(valueInput, 'new value');
			await userEvent.click(saveButton);

			// Give time for the async operation to complete
			await vi.waitFor(() => {
				expect(environmentsStore.updateVariable).toHaveBeenCalled();
			});

			// Modal should still be open
			expect(uiStore.closeModal).not.toHaveBeenCalled();
		});
	});
});
