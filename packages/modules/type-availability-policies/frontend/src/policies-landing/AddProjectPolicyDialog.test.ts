import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddProjectPolicyDialog from './AddProjectPolicyDialog.vue';
import { mockProjectPolicy } from '../__tests__/mocks';
import { PROJECT_POLICY_VIEW } from '../type-availability-policies.constants';

const { push, showMessage, createProjectPolicy } = vi.hoisted(() => ({
	push: vi.fn(),
	showMessage: vi.fn(),
	createProjectPolicy: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));
vi.mock('../type-availability-policies.api', () => ({ createProjectPolicy }));

// Element Plus selects do not open in jsdom, so a native select stands in for it.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<object>()),
	N8nSelect: {
		name: 'N8nSelect',
		inheritAttrs: false,
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><slot /></select>',
	},
	N8nOption: {
		name: 'N8nOption',
		props: ['value', 'label'],
		template: '<option :value="value">{{ label }}</option>',
	},
}));

const PROJECTS = [
	mockProjectPolicy({ projectId: 'people-ops', name: 'People Ops' }),
	mockProjectPolicy({ projectId: 'security', name: 'Security Engineering' }),
];

const renderDialog = createComponentRenderer(AddProjectPolicyDialog);

function render() {
	return renderDialog({
		pinia: createTestingPinia(),
		props: { open: true, projects: PROJECTS },
	});
}

async function pick(getByTestId: (id: string) => HTMLElement, projectId: string) {
	await fireEvent.update(getByTestId('add-project-policy-select'), projectId);
}

describe('AddProjectPolicyDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the given team projects and says why personal projects are missing', async () => {
		const { findByTestId, getAllByRole } = render();

		const dialog = await findByTestId('add-project-policy-dialog');
		expect(
			getAllByRole('option')
				.map((option) => option.textContent?.trim())
				.filter(Boolean),
		).toEqual(['People Ops', 'Security Engineering']);
		expect(dialog).toHaveTextContent(
			'Only team projects can have a policy. Personal projects always follow the instance policy.',
		);
	});

	it('enables Add policy only after a project is picked', async () => {
		const { findByTestId, getByTestId } = render();

		expect(await findByTestId('add-project-policy-submit')).toBeDisabled();
		await pick(getByTestId, 'security');
		expect(getByTestId('add-project-policy-submit')).toBeEnabled();
	});

	it('adds the policy, confirms it and opens the project policy page', async () => {
		createProjectPolicy.mockResolvedValue(PROJECTS[1]);
		const { findByTestId, getByTestId, emitted } = render();

		await findByTestId('add-project-policy-dialog');
		await pick(getByTestId, 'security');
		await fireEvent.click(getByTestId('add-project-policy-submit'));

		await waitFor(() =>
			expect(push).toHaveBeenCalledWith({
				name: PROJECT_POLICY_VIEW,
				params: { teamProjectId: 'security' },
			}),
		);
		expect(createProjectPolicy).toHaveBeenCalledWith(expect.anything(), 'security');
		expect(showMessage).toHaveBeenCalledWith({
			type: 'success',
			title: 'Security Engineering policy added',
			message: 'It follows the instance policy until you change something for this project.',
		});
		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted('listChanged')).toHaveLength(1);
	});

	it('adds the policy but stays on the page when the dialog closed during the add', async () => {
		let resolveAdd: (value: unknown) => void = () => {};
		createProjectPolicy.mockReturnValue(
			new Promise((resolve) => {
				resolveAdd = resolve;
			}),
		);
		const { findByTestId, getByTestId, rerender, emitted } = render();

		await findByTestId('add-project-policy-dialog');
		await pick(getByTestId, 'security');
		await fireEvent.click(getByTestId('add-project-policy-submit'));
		await rerender({ open: false, projects: PROJECTS });
		resolveAdd(PROJECTS[1]);

		await waitFor(() => expect(showMessage).toHaveBeenCalled());
		expect(push).not.toHaveBeenCalled();
		expect(emitted('listChanged')).toHaveLength(1);
	});

	it('stays open with the error when the add fails', async () => {
		createProjectPolicy.mockRejectedValue(new Error('Could not add the policy'));
		const { findByTestId, getByTestId, getAllByRole, emitted } = render();

		await findByTestId('add-project-policy-dialog');
		await pick(getByTestId, 'security');
		await fireEvent.click(getByTestId('add-project-policy-submit'));

		expect(await findByTestId('add-project-policy-error')).toHaveTextContent(
			'Could not add the policy',
		);
		expect(emitted('update:open')).toBeUndefined();
		expect(emitted('listChanged')).toBeUndefined();
		expect(push).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(getAllByRole('option').map((option) => option.textContent?.trim())).toContain(
			'Security Engineering',
		);
	});

	it('asks for a fresh list when another admin added the policy first', async () => {
		createProjectPolicy.mockRejectedValue(
			new ResponseError('The project already has a policy', { httpStatusCode: 409 }),
		);
		const { findByTestId, getByTestId, emitted } = render();

		await findByTestId('add-project-policy-dialog');
		await pick(getByTestId, 'security');
		await fireEvent.click(getByTestId('add-project-policy-submit'));

		await findByTestId('add-project-policy-error');
		expect(emitted('listChanged')).toHaveLength(1);
		expect(getByTestId('add-project-policy-select')).toHaveValue('');
		expect(getByTestId('add-project-policy-submit')).toBeDisabled();
	});

	it('starts with no pick and no error when it opens again', async () => {
		createProjectPolicy.mockRejectedValue(new Error('Could not add the policy'));
		const { findByTestId, getByTestId, queryByTestId, rerender } = render();

		await findByTestId('add-project-policy-dialog');
		await pick(getByTestId, 'security');
		await fireEvent.click(getByTestId('add-project-policy-submit'));
		await findByTestId('add-project-policy-error');

		await rerender({ open: false, projects: PROJECTS });
		await rerender({ open: true, projects: PROJECTS });

		expect(await findByTestId('add-project-policy-submit')).toBeDisabled();
		expect(queryByTestId('add-project-policy-error')).not.toBeInTheDocument();
	});
});
