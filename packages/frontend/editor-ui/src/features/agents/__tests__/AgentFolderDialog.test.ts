import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { PROJECT_ROOT } from 'n8n-workflow';
import AgentFolderDialog from '../components/AgentFolderDialog.vue';

const api = vi.hoisted(() => ({
	createFolder: vi.fn(),
	deleteFolder: vi.fn(),
	getFolderContent: vi.fn(),
	getProjectFolders: vi.fn(),
	moveFolder: vi.fn(),
	renameFolder: vi.fn(),
	moveAgent: vi.fn(),
	invalidate: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@/features/core/folders/folders.api', () => api);
vi.mock('../composables/useAgentApi', () => ({ moveAgent: api.moveAgent }));
vi.mock('../composables/useProjectAgentsList', () => ({
	invalidateProjectAgentsListCache: api.invalidate,
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: api.showError }) }));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@n8n/design-system', () => ({
	N8nInput: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	N8nSelect: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
	},
	N8nOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
	N8nText: { template: '<span><slot /></span>' },
	N8nButton: {
		props: ['disabled', 'loading', 'variant'],
		template: '<button :disabled="disabled || loading"><slot /></button>',
	},
}));
vi.mock('../components/modals/AgentModal.vue', () => ({
	default: { template: '<div><slot /><slot name="footerActions" /></div>' },
}));

function render(action: NonNullable<InstanceType<typeof AgentFolderDialog>['$props']['action']>) {
	return mount(AgentFolderDialog, { props: { projectId: 'project', action } });
}

beforeEach(() => {
	vi.resetAllMocks();
	api.getProjectFolders.mockResolvedValue({ data: [], count: 0 });
	api.getFolderContent.mockResolvedValue({ totalAgents: 3 });
});

describe('AgentFolderDialog', () => {
	it('creates a nested Agent folder and refreshes the project list', async () => {
		const wrapper = render({ mode: 'create', parentFolderId: 'parent' });
		await wrapper.get('[data-testid="agent-folder-name"]').setValue('Support');
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.createFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'Support',
			'parent',
			'agent',
		);
		expect(api.invalidate).toHaveBeenCalledWith('project');
		expect(wrapper.emitted('saved')).toHaveLength(1);
	});

	it('keeps an invalid name out of the API', async () => {
		const wrapper = render({ mode: 'rename', id: 'folder' });
		await wrapper.get('[data-testid="agent-folder-name"]').setValue('bad/name');
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');

		expect(api.renameFolder).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain('agents.folders.invalidName');
	});

	it('offers all Agent destinations and moves an Agent to root', async () => {
		api.getProjectFolders
			.mockResolvedValueOnce({ data: [{ id: 'one', path: ['One'] }], count: 2 })
			.mockResolvedValueOnce({ data: [{ id: 'two', path: ['One', 'Two'] }], count: 2 });
		const wrapper = render({ mode: 'moveAgent', id: 'agent', parentFolderId: 'one' });
		await flushPromises();

		expect(api.getProjectFolders).toHaveBeenLastCalledWith(
			{ baseUrl: '/rest' },
			'project',
			{ resourceType: 'agent', skip: 1, take: 100, sortBy: 'name:asc' },
			{},
			['id', 'name', 'path', 'updatedAt'],
		);
		expect(wrapper.text()).toContain('One / Two');

		await wrapper.get('[data-testid="agent-folder-target"]').setValue(PROJECT_ROOT);
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.moveAgent).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'project', 'agent', null);
	});

	it('relocates contents to root by default and excludes the deleted subtree', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder' });
		await flushPromises();
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.getProjectFolders.mock.calls[0]?.[3]).toEqual({
			excludeFolderIdAndDescendants: 'folder',
		});
		expect(api.deleteFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'folder',
			PROJECT_ROOT,
		);
	});

	it('uses permanent deletion when the user cannot relocate contents', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder', canRelocate: false });
		await flushPromises();

		expect(wrapper.text()).toContain('agents.folders.deleteDescription');
		expect(wrapper.find('[data-testid="agent-folder-target"]').exists()).toBe(false);

		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.deleteFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'folder',
			undefined,
		);
	});

	it('blocks deletion until counts load and after a read failure', async () => {
		let rejectRead: (error: Error) => void = () => {};
		api.getFolderContent.mockReturnValue(
			new Promise((_resolve, reject) => {
				rejectRead = reject;
			}),
		);
		const wrapper = render({ mode: 'delete', id: 'folder', canRelocate: false });
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();

		rejectRead(new Error('Could not read folder contents'));
		await flushPromises();
		await wrapper.get('form').trigger('submit');

		expect(api.deleteFolder).not.toHaveBeenCalled();
		expect(api.showError).toHaveBeenCalled();
		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();
	});
});
