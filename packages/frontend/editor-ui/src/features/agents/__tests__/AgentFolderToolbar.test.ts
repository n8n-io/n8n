import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { PROJECT_ROOT } from 'n8n-workflow';
import AgentFolderToolbar from '../components/AgentFolderToolbar.vue';

vi.mock('@/features/core/folders/components/ProjectBreadcrumb.vue', () => ({
	default: { template: '<a data-test-id="home-project" />' },
}));
vi.mock('@n8n/design-system', () => ({
	N8nBreadcrumbs: {
		props: ['items'],
		emits: ['item-selected'],
		template:
			'<nav><slot name="prepend" /><button v-for="item in items" :key="item.id" :data-resourceid="item.id" @click="$emit(\'item-selected\', item)">{{ item.label }}</button></nav>',
	},
	N8nDropdownMenu: {
		emits: ['select'],
		template: '<button data-test-id="actions" @click="$emit(\'select\', \'create\')" />',
	},
	N8nIconButton: { template: '<button />' },
}));

function render(props: { folderId?: string | null; canCreate?: boolean } = {}) {
	const folderId = props.folderId ?? null;

	return mount(AgentFolderToolbar, {
		props: {
			items: folderId ? [{ id: folderId, label: 'Support' }] : [],
			folderId,
			canCreate: props.canCreate ?? true,
			dragActive: false,
		},
	});
}

describe('AgentFolderToolbar', () => {
	it('shows the project and no folder creation button at the project root', () => {
		const wrapper = render();

		expect(wrapper.find('[data-test-id="home-project"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-folder-create"]').exists()).toBe(false);
	});

	it('creates a folder from the breadcrumb actions', async () => {
		const wrapper = render();
		await wrapper.get('[data-test-id="actions"]').trigger('click');

		expect(wrapper.emitted('create')).toHaveLength(1);
	});

	it('hides the breadcrumb actions without the permission to create folders', () => {
		const wrapper = render({ canCreate: false });

		expect(wrapper.find('[data-test-id="actions"]').exists()).toBe(false);
	});

	it('drops on the project to move an item to the project root', async () => {
		const wrapper = render({ folderId: 'parent' });
		await wrapper.get('[data-test-id="home-project"]').trigger('drop');

		expect(wrapper.emitted('drop')).toEqual([[PROJECT_ROOT]]);
	});

	it('drops on a folder breadcrumb to move an item to that folder', async () => {
		const wrapper = render({ folderId: 'parent' });
		await wrapper.get('[data-resourceid="parent"]').trigger('drop');

		expect(wrapper.emitted('drop')).toEqual([['parent']]);
	});

	it('drops on the toolbar to move an item to the open folder', async () => {
		const wrapper = render({ folderId: 'parent' });
		await wrapper.trigger('drop');

		expect(wrapper.emitted('drop')).toEqual([['parent']]);
	});
});
