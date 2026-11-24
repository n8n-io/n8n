import { flushPromises, mount } from '@vue/test-utils';
import type { ChangeLocationSearchResult } from '../folders.types';
import MoveToFolderDropdown from './MoveToFolderDropdown.vue';

const { fetchFolders } = vi.hoisted(() => ({ fetchFolders: vi.fn() }));

vi.mock('../folders.store', () => ({
	useFoldersStore: () => ({ fetchFoldersAvailableForMove: fetchFolders }),
}));
vi.mock('@n8n/design-system', async () => {
	const { defineComponent, ref } = await import('vue');

	return {
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: ['modelValue', 'filterable', 'remote', 'remoteMethod', 'teleported', 'popperOptions'],
			emits: ['update:modelValue'],
			setup(_, { expose }) {
				const input = ref<HTMLInputElement>();
				expose({ focus: () => input.value?.focus() });

				return { input };
			},
			template:
				'<div><input ref="input" data-testid="folder-input" /><slot name="prefix" /><slot /></div>',
		}),
		N8nOption: { props: ['label', 'value'], template: '<div><slot /></div>' },
		N8nLoading: { template: '<div data-testid="loading" />' },
		N8nText: { template: '<span><slot /></span>' },
		N8nIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
	};
});

const folder = (id: string, name = id): ChangeLocationSearchResult => ({
	id,
	name,
	path: ['Support', name],
	resource: 'folder',
	createdAt: '',
	updatedAt: '',
	workflowCount: 0,
	subFolderCount: 0,
});

beforeEach(() => {
	vi.resetAllMocks();
	fetchFolders.mockImplementation(() => Promise.resolve([]));
});

describe('MoveToFolderDropdown', () => {
	it.each([false, true])('applies autofocus %s after the folders load', async (autofocus) => {
		let finishLoading!: (folders: ChangeLocationSearchResult[]) => void;
		fetchFolders.mockReturnValueOnce(
			new Promise((resolve) => {
				finishLoading = resolve;
			}),
		);
		const wrapper = mount(MoveToFolderDropdown, {
			attachTo: document.body,
			props: { selectedProjectId: 'project', selectedLocation: null, autofocus },
		});

		expect(wrapper.find('[data-testid="folder-input"]').exists()).toBe(false);

		finishLoading([folder('target')]);
		await flushPromises();
		const input = wrapper.get('[data-testid="folder-input"]').element;

		expect(document.activeElement === input).toBe(autofocus);
		wrapper.unmount();
	});

	it('keeps workflow defaults and offers project root', async () => {
		const wrapper = mount(MoveToFolderDropdown, {
			props: { selectedProjectId: 'project', selectedLocation: null },
		});
		await flushPromises();

		expect(fetchFolders).toHaveBeenCalledWith(
			'project',
			undefined,
			{ name: undefined },
			'workflow',
		);
		expect(wrapper.text()).toContain('No folder (project root)');
		expect(wrapper.emitted('location:selected')?.[0]).toEqual([
			expect.objectContaining({ id: 'project', resource: 'project' }),
		]);
		expect(wrapper.findComponent({ name: 'N8nSelect' }).props()).toMatchObject({
			filterable: true,
			remote: true,
			teleported: true,
		});
	});

	it('uses the Agent tree, excludes the parent, and shows nested destination paths', async () => {
		fetchFolders.mockResolvedValue([folder('parent', 'Existing'), folder('target', 'Triage')]);
		const wrapper = mount(MoveToFolderDropdown, {
			props: {
				selectedProjectId: 'project',
				selectedLocation: null,
				currentFolderId: 'source',
				parentFolderId: 'parent',
				resourceType: 'agent',
				teleported: false,
			},
		});
		await flushPromises();
		const select = wrapper.findComponent({ name: 'N8nSelect' });

		expect(fetchFolders).toHaveBeenCalledWith('project', 'source', { name: undefined }, 'agent');
		expect(wrapper.text()).not.toContain('Existing');
		expect(wrapper.text()).toContain('Support');
		expect(wrapper.text()).toContain('Triage');
		expect(select.props()).toMatchObject({
			teleported: false,
			popperOptions: { strategy: 'fixed' },
		});

		select.vm.$emit('update:modelValue', 'target');

		expect(wrapper.emitted('location:selected')?.at(-1)).toEqual([folder('target', 'Triage')]);
	});

	it('searches the same Agent tree and filters the root choice by its workflow label', async () => {
		const wrapper = mount(MoveToFolderDropdown, {
			props: { selectedProjectId: 'project', selectedLocation: null, resourceType: 'agent' },
		});
		await flushPromises();
		const select = wrapper.findComponent({ name: 'N8nSelect' });

		await select.props('remoteMethod')('Triage');
		await flushPromises();

		expect(fetchFolders).toHaveBeenLastCalledWith(
			'project',
			undefined,
			{ name: 'Triage' },
			'agent',
		);
		expect(wrapper.text()).not.toContain('No folder (project root)');

		await select.props('remoteMethod')('project root');
		await flushPromises();

		expect(wrapper.text()).toContain('No folder (project root)');
	});

	it('discards responses from a previous project', async () => {
		let finishPrevious!: (folders: ChangeLocationSearchResult[]) => void;
		fetchFolders.mockReturnValueOnce(
			new Promise((resolve) => {
				finishPrevious = resolve;
			}),
		);
		const wrapper = mount(MoveToFolderDropdown, {
			props: { selectedProjectId: 'previous', selectedLocation: null, resourceType: 'agent' },
		});

		await wrapper.setProps({ selectedProjectId: 'current' });
		await flushPromises();
		finishPrevious([folder('old', 'Old destination')]);
		await flushPromises();

		expect(wrapper.text()).not.toContain('Old destination');
		expect(wrapper.emitted('location:selected')).toEqual([
			[expect.objectContaining({ id: 'current', resource: 'project' })],
		]);
	});

	it('reports a load failure without selecting a destination', async () => {
		const failure = new Error('Could not load folders');
		fetchFolders.mockRejectedValue(failure);
		const wrapper = mount(MoveToFolderDropdown, {
			props: { selectedProjectId: 'project', selectedLocation: null, resourceType: 'agent' },
		});
		await flushPromises();

		expect(wrapper.emitted('load:error')).toEqual([[failure]]);
		expect(wrapper.emitted('location:selected')).toBeUndefined();
		expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false);
	});
});
