import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { PROJECT_ROOT } from 'n8n-workflow';
import type { ChangeLocationSearchResult } from '@/features/core/folders/folders.types';
import AgentFolderDialog from '../components/AgentFolderDialog.vue';

const api = vi.hoisted(() => ({
	createFolder: vi.fn(),
	deleteFolder: vi.fn(),
	getFolderContent: vi.fn(),
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
vi.mock('../composables/useAgentProjectBreadcrumb', async () => {
	const { ref } = await import('vue');

	return {
		useAgentProjectBreadcrumb: () => ({
			projectName: ref('Customer operations'),
			projectIcon: ref({ type: 'icon', value: 'layers' }),
		}),
	};
});
vi.mock('@/features/collaboration/projects/components/ProjectIcon.vue', () => ({
	default: { props: ['icon'], template: '<span>{{ icon.value }}</span>' },
}));
vi.mock('@/features/core/folders/components/MoveToFolderDropdown.vue', () => ({
	default: {
		name: 'MoveToFolderDropdown',
		props: {
			selectedLocation: null,
			selectedProjectId: null,
			currentProjectId: null,
			currentFolderId: null,
			parentFolderId: null,
			resourceType: null,
			teleported: null,
			autofocus: Boolean,
		},
		emits: ['location:selected', 'load:error'],
		template: '<div />',
	},
}));
vi.mock('@n8n/design-system', () => ({
	N8nInput: {
		props: ['modelValue', 'disabled'],
		inheritAttrs: false,
		emits: ['update:modelValue'],
		template:
			'<div><slot name="prefix" /><input v-bind="$attrs" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
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
	default: {
		props: ['title', 'size'],
		template: '<div><h1>{{ title }}</h1><slot /><slot name="footerActions" /></div>',
	},
}));

const destination: ChangeLocationSearchResult = {
	id: 'target',
	name: 'Triage',
	path: ['Support', 'Triage'],
	resource: 'folder',
	createdAt: '',
	updatedAt: '',
	workflowCount: 0,
	subFolderCount: 0,
};

function render(action: NonNullable<InstanceType<typeof AgentFolderDialog>['$props']['action']>) {
	return mount(AgentFolderDialog, { props: { projectId: 'project', action } });
}

beforeEach(() => {
	vi.resetAllMocks();
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
		expect(wrapper.text()).toContain('Use a valid folder name');
	});

	it('shows the Agent name and fixed project, and uses the workflow picker to move to root', async () => {
		const wrapper = render({
			mode: 'moveAgent',
			id: 'agent',
			name: 'Weekly insights',
			parentFolderId: 'one',
		});
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });
		const save = wrapper.get('[data-testid="agent-folder-save"]');

		expect(wrapper.get('h1').text()).toBe('Move Agent Weekly insights');
		expect(wrapper.get('[data-testid="agent-move-project"]').element).toHaveValue(
			'Customer operations',
		);
		expect(wrapper.get('[data-testid="agent-move-project"]').element).toBeDisabled();
		expect(picker.props()).toMatchObject({
			selectedProjectId: 'project',
			currentProjectId: 'project',
			parentFolderId: 'one',
			resourceType: 'agent',
			teleported: false,
			autofocus: true,
		});
		expect(save.text()).toBe('Move Agent');
		expect(save.attributes('disabled')).toBeDefined();

		picker.vm.$emit('location:selected', { ...destination, id: 'project', resource: 'project' });
		await flushPromises();
		await save.trigger('click');
		await flushPromises();

		expect(api.moveAgent).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'project', 'agent', null);
	});

	it('names a folder move and excludes the source subtree in the shared picker', async () => {
		const wrapper = render({
			mode: 'moveFolder',
			id: 'source',
			name: 'Research',
			parentFolderId: 'parent',
		});
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });

		expect(wrapper.get('h1').text()).toBe('Move folder Research');
		expect(picker.props()).toMatchObject({
			currentFolderId: 'source',
			parentFolderId: 'parent',
			resourceType: 'agent',
			selectedProjectId: 'project',
		});
		expect(wrapper.get('[data-testid="agent-folder-save"]').text()).toBe('Move folder');

		picker.vm.$emit('location:selected', destination);
		await flushPromises();
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.moveFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'source',
			'target',
		);
	});

	it('blocks a move and reports a folder-picker failure', async () => {
		const wrapper = render({ mode: 'moveAgent', id: 'agent', name: 'Support' });
		const failure = new Error('Could not load folders');
		wrapper.findComponent({ name: 'MoveToFolderDropdown' }).vm.$emit('load:error', failure);
		await flushPromises();
		await wrapper.get('form').trigger('submit');

		expect(api.moveAgent).not.toHaveBeenCalled();
		expect(api.showError).toHaveBeenCalledWith(failure, expect.any(String));
		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();
	});

	it('relocates contents to root by default and excludes the deleted subtree', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder' });
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });

		expect(picker.props()).toMatchObject({
			currentFolderId: 'folder',
			resourceType: 'agent',
			selectedProjectId: 'project',
			teleported: false,
		});
		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();

		picker.vm.$emit('location:selected', { ...destination, id: 'project', resource: 'project' });
		await flushPromises();
		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.deleteFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'folder',
			PROJECT_ROOT,
		);
	});

	it('allows relocation to the parent folder through the shared picker', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder', parentFolderId: 'parent' });
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });

		expect(picker.props('parentFolderId')).toBeUndefined();

		picker.vm.$emit('location:selected', { ...destination, id: 'parent' });
		await flushPromises();
		await wrapper.get('form').trigger('submit');
		await flushPromises();

		expect(api.deleteFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'folder',
			'parent',
		);
	});

	it('blocks relocation after a folder-picker failure', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder' });
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });
		picker.vm.$emit('location:selected', destination);
		await flushPromises();
		picker.vm.$emit('load:error', new Error('Could not load folders'));
		await flushPromises();
		await wrapper.get('form').trigger('submit');

		expect(api.deleteFolder).not.toHaveBeenCalled();
		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();
	});

	it('offers archival when the user cannot relocate contents', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder', canRelocate: false });
		await flushPromises();

		expect(wrapper.text()).toContain('It archives 3 Agents and moves them to the project root.');
		expect(wrapper.text()).toContain('You can unarchive them later.');
		expect(wrapper.text()).not.toContain('permanently');
		expect(wrapper.get('[data-testid="agent-folder-save"]').text()).toBe('Delete folder');
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

	it('lets the user choose archival after a folder-picker failure', async () => {
		api.getFolderContent.mockResolvedValue({ totalAgents: 1 });
		const wrapper = render({ mode: 'delete', id: 'folder' });
		await flushPromises();
		wrapper
			.findComponent({ name: 'MoveToFolderDropdown' })
			.vm.$emit('load:error', new Error('Could not load folders'));
		await wrapper.get('[data-testid="agent-folder-removal"]').setValue('archive');

		expect(wrapper.text()).toContain('It archives 1 Agent and moves it to the project root.');
		expect(wrapper.text()).toContain('You can unarchive it later.');
		expect(wrapper.find('[data-testid="agent-folder-target"]').exists()).toBe(false);

		await wrapper.get('[data-testid="agent-folder-save"]').trigger('click');
		await flushPromises();

		expect(api.deleteFolder).toHaveBeenCalledWith(
			{ baseUrl: '/rest' },
			'project',
			'folder',
			undefined,
		);
		expect(api.invalidate).toHaveBeenCalledWith('project');
	});

	it('hides archival when the user can only relocate contents', async () => {
		const wrapper = render({ mode: 'delete', id: 'folder', canDelete: false });
		await flushPromises();

		expect(wrapper.find('option[value="archive"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-folder-target"]').exists()).toBe(true);
	});

	it('blocks deletion until counts load and after a read failure', async () => {
		let rejectRead: (error: Error) => void = () => {};
		api.getFolderContent.mockReturnValue(
			new Promise((_resolve, reject) => {
				rejectRead = reject;
			}),
		);
		const wrapper = render({ mode: 'delete', id: 'folder' });
		await flushPromises();
		const picker = wrapper.findComponent({ name: 'MoveToFolderDropdown' });
		picker.vm.$emit('location:selected', destination);
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();

		rejectRead(new Error('Could not read folder contents'));
		await flushPromises();
		picker.vm.$emit('location:selected', destination);
		await flushPromises();
		await wrapper.get('form').trigger('submit');

		expect(api.deleteFolder).not.toHaveBeenCalled();
		expect(api.showError).toHaveBeenCalled();
		expect(wrapper.get('[data-testid="agent-folder-save"]').attributes('disabled')).toBeDefined();
	});
});
