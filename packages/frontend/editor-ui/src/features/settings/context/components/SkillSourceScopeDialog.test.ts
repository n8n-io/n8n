import type { SkillSourceListItem } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SkillSourceScopeDialog from './SkillSourceScopeDialog.vue';
import { useSkillsStore } from '../skills.store';

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system')),
	N8nDialog: {
		props: ['open', 'header'],
		template: '<div role="dialog"><h2>{{ header }}</h2><slot /></div>',
	},
	N8nSelect2: {
		props: ['modelValue', 'items', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""/><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
	},
}));

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills',
	projectId: 'old',
	projectName: 'Old project',
	projectType: 'team',
	projectIcon: null,
	skillCount: 2,
	updatesAvailable: 0,
	updatesBlocked: 0,
	health: 'connected',
	lastCheckedAt: null,
	canReview: true,
	canDelete: true,
	requiresCredential: false,
};
const renderDialog = createComponentRenderer(SkillSourceScopeDialog, {
	props: {
		source,
		scopeOptions: [
			{ value: 'project:old', label: 'Old project' },
			{ value: 'instance', label: 'Global' },
			{ value: 'project:new', label: 'New project' },
		],
	},
});

describe('SkillSourceScopeDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it('moves all skills only after a new scope is selected and confirmed', async () => {
		const { getByRole, getByTestId, queryByRole, emitted } = renderDialog();
		expect(queryByRole('option', { name: 'Old project' })).toBeNull();
		expect(getByRole('button', { name: 'Change scope' })).toBeDisabled();
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'instance');
		expect(mockedStore(useSkillsStore).changeSourceScope).not.toHaveBeenCalled();
		await userEvent.click(getByRole('button', { name: 'Change scope' }));
		await waitFor(() => expect(emitted('moved')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).changeSourceScope).toHaveBeenCalledWith('source-1', {
			scope: 'instance',
		});
	});

	it('requires a credential from the new scope and clears it on a scope change', async () => {
		const store = mockedStore(useSkillsStore);
		store.fetchSourceCredentials.mockResolvedValue([
			{ id: 'cred', name: 'GitHub', type: 'githubApi' },
		]);
		const { getByRole, getByTestId, emitted } = renderDialog({
			props: { source: { ...source, requiresCredential: true } },
		});
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'instance');
		await waitFor(() =>
			expect(store.fetchSourceCredentials).toHaveBeenCalledWith({ scope: 'instance' }),
		);
		expect(getByRole('button', { name: 'Change scope' })).toBeDisabled();
		await userEvent.selectOptions(getByTestId('skill-source-new-credential'), 'cred');
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'project:new');
		await waitFor(() =>
			expect(store.fetchSourceCredentials).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'new',
			}),
		);
		expect(getByRole('button', { name: 'Change scope' })).toBeDisabled();
		await userEvent.selectOptions(getByTestId('skill-source-new-credential'), 'cred');
		await userEvent.click(getByRole('button', { name: 'Change scope' }));
		await waitFor(() => expect(emitted('moved')).toBeDefined());
		expect(store.changeSourceScope).toHaveBeenCalledWith('source-1', {
			scope: 'project',
			projectId: 'new',
			credentialId: 'cred',
		});
	});

	it('lists blocking agents and lets the user choose Global instead', async () => {
		mockedStore(useSkillsStore).changeSourceScope.mockRejectedValueOnce(
			new ResponseError('Blocked', {
				httpStatusCode: 409,
				meta: {
					reason: 'agents_out_of_scope',
					agents: [
						{ agentId: 'a1', agentName: 'Research', projectId: 'p1', projectName: 'Marketing' },
					],
					hiddenAgents: 1,
				},
			}),
		);
		const { getByRole, getByTestId } = renderDialog();
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'project:new');
		await userEvent.click(getByRole('button', { name: 'Change scope' }));
		await waitFor(() => expect(getByRole('dialog')).toHaveTextContent('Research · Marketing'));
		expect(getByRole('dialog')).toHaveTextContent('1 agent in other projects');
		expect(getByRole('button', { name: 'Change scope' })).toBeDisabled();
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'instance');
		expect(getByRole('button', { name: 'Change scope' })).toBeEnabled();
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('keeps the dialog open for a name clash', async () => {
		const error = new ResponseError('Name taken', { httpStatusCode: 409 });
		mockedStore(useSkillsStore).changeSourceScope.mockRejectedValueOnce(error);
		const { getByRole, getByTestId, emitted } = renderDialog();
		await userEvent.selectOptions(getByTestId('skill-source-new-scope'), 'instance');
		await userEvent.click(getByRole('button', { name: 'Change scope' }));
		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(error, 'Could not change the source scope'),
		);
		expect(emitted('moved')).toBeUndefined();
	});
});
