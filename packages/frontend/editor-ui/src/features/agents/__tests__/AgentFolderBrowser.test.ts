import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { PROJECT_ROOT } from 'n8n-workflow';
import AgentFolderBrowser from '../components/AgentFolderBrowser.vue';
import { PROJECT_AGENTS } from '../constants';

const mocks = vi.hoisted(() => ({
	getProjectFolders: vi.fn(),
	getFolderPath: vi.fn(),
	moveFolder: vi.fn(),
	moveAgent: vi.fn(),
	push: vi.fn(),
	fetchFavorites: vi.fn(),
}));

vi.mock('@/features/core/folders/folders.api', () => mocks);
vi.mock('../composables/useAgentApi', () => ({ moveAgent: mocks.moveAgent }));
vi.mock('../composables/useProjectAgentsList', () => ({
	invalidateProjectAgentsListCache: vi.fn(),
}));
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canUpdate: ref(true), canDelete: ref(true) }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));
vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		currentUser: {
			globalScopes: ['folder:list', 'folder:create', 'folder:update', 'folder:delete'],
		},
	}),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ myProjects: [] }),
}));
vi.mock('@/app/stores/favorites.store', () => ({
	useFavoritesStore: () => ({ isFavorite: () => false, fetchFavorites: mocks.fetchFavorites }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: mocks.push }),
	useRoute: () => ({ query: {} }),
}));
vi.mock('../components/AgentFolderDialog.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@n8n/design-system', () => ({
	N8nBreadcrumbs: {
		props: ['items'],
		emits: ['item-selected'],
		template:
			'<nav><button v-for="item in items" :key="item.id" :data-resourceid="item.id" @click="$emit(\'item-selected\', item)">{{ item.label }}</button></nav>',
	},
	N8nCard: {
		template: '<div><slot name="header"/><slot/><slot name="footer"/><slot name="append"/></div>',
	},
	N8nButton: { template: '<button><slot/></button>' },
	N8nText: { template: '<span><slot/></span>' },
	N8nTimeAgo: { props: ['date'], template: '<time :datetime="date">{{ date }}</time>' },
	N8nIcon: { template: '<i />' },
	N8nActionToggle: { template: '<button data-testid="folder-actions">Actions</button>' },
	N8nPagination: {
		props: ['page'],
		emits: ['update:page'],
		template:
			'<button data-testid="next-folders" @click="$emit(\'update:page\', page + 1)">Next</button>',
	},
}));

const folderDates = {
	createdAt: '2026-01-01T10:00:00.000Z',
	updatedAt: '2026-01-02T11:00:00.000Z',
};

beforeEach(() => {
	vi.resetAllMocks();
	mocks.getProjectFolders.mockResolvedValue({
		data: [
			{
				id: 'child',
				...folderDates,
				name: 'Triage',
				path: ['Support', 'Triage'],
				agentCount: 2,
				subFolderCount: 0,
			},
		],
		count: 1,
	});
	mocks.getFolderPath.mockResolvedValue([{ id: 'parent', name: 'Support', children: [] }]);
});

function render() {
	return mount(AgentFolderBrowser, {
		props: { projectId: 'project', folderId: 'parent', search: '', sortBy: 'name:asc' },
	});
}

describe('AgentFolderBrowser', () => {
	it('keeps keyboard actions on the folder menu from opening the folder', async () => {
		const wrapper = render();
		await flushPromises();
		await wrapper.get('[data-testid="folder-actions"]').trigger('keydown', { key: 'Enter' });

		expect(mocks.push).not.toHaveBeenCalled();
	});

	it('opens a nested folder in the Agent tree', async () => {
		const wrapper = render();
		await flushPromises();
		await wrapper.get('[data-testid="agent-folder-card"]').trigger('click');

		expect(mocks.push).toHaveBeenCalledWith({
			name: PROJECT_AGENTS,
			params: { projectId: 'project' },
			query: { folderId: 'child' },
		});
		expect(wrapper.text()).toContain('2 Agents');
	});

	it.each([
		{ agentCount: 0, subFolderCount: 0, agents: null, folders: null },
		{ agentCount: 0, subFolderCount: 1, agents: null, folders: '1 Folder' },
		{ agentCount: 1, subFolderCount: 0, agents: '1 Agent', folders: null },
		{ agentCount: 2, subFolderCount: 3, agents: '2 Agents', folders: '3 Folders' },
	])(
		'shows direct contents like workflow folders: $agentCount Agents and $subFolderCount folders',
		async ({ agentCount, subFolderCount, agents, folders }) => {
			mocks.getProjectFolders.mockResolvedValue({
				data: [
					{
						id: 'sales',
						name: 'Sales',
						path: ['Sales'],
						agentCount,
						subFolderCount,
						...folderDates,
					},
				],
				count: 1,
			});
			const wrapper = render();
			await flushPromises();
			const agentCounter = wrapper.find('[data-test-id="agent-folder-resource-count"]');
			const folderCounter = wrapper.find('[data-test-id="agent-folder-folder-count"]');

			expect(agentCounter.exists()).toBe(agents !== null);
			expect(folderCounter.exists()).toBe(folders !== null);
			expect(wrapper.get('[data-test-id="agent-folder-last-updated"]').text()).toBe(
				`Last updated ${folderDates.updatedAt}`,
			);
			expect(wrapper.get('[data-test-id="agent-folder-created"]').text()).toBe(
				`Created ${folderDates.createdAt}`,
			);

			if (agents !== null) {
				expect(agentCounter.text()).toBe(agents);
			}

			if (folders !== null) {
				expect(folderCounter.text()).toBe(folders);
			}
		},
	);

	it('requests both dates and shows the workflow subtitle order', async () => {
		const wrapper = render();
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[4]).toEqual(
			expect.arrayContaining(['createdAt', 'updatedAt']),
		);
		expect(
			wrapper
				.get('[data-test-id="agent-folder-subtitle"]')
				.findAll('[data-test-id]')
				.map((field) => field.text()),
		).toEqual([
			'2 Agents',
			`Last updated ${folderDates.updatedAt}`,
			`Created ${folderDates.createdAt}`,
		]);
		expect(
			wrapper.get('[data-test-id="agent-folder-last-updated"] time').attributes('datetime'),
		).toBe(folderDates.updatedAt);
		expect(wrapper.get('[data-test-id="agent-folder-created"] time').attributes('datetime')).toBe(
			folderDates.createdAt,
		);
	});

	it('moves a dragged Agent to root through the native breadcrumb drop', async () => {
		const wrapper = render();
		await flushPromises();
		wrapper.vm.startAgentDrag('agent');
		await wrapper.get(`[data-resourceid="${PROJECT_ROOT}"]`).trigger('drop');
		await flushPromises();

		expect(mocks.moveAgent).toHaveBeenCalledOnce();
		expect(mocks.moveAgent).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'project', 'agent', null);
		expect(mocks.fetchFavorites).toHaveBeenCalledWith(true);
		expect(wrapper.emitted('changed')).toHaveLength(1);
	});

	it('keeps Agent folder pagination and search in the current subtree', async () => {
		mocks.getProjectFolders.mockResolvedValue({ data: [], count: 21 });
		const wrapper = render();
		await flushPromises();
		await wrapper.get('[data-testid="next-folders"]').trigger('click');
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toMatchObject({
			resourceType: 'agent',
			skip: 20,
			take: 20,
		});

		await wrapper.setProps({ search: 'Triage' });
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toMatchObject({ skip: 0 });
		expect(mocks.getProjectFolders.mock.lastCall?.[3]).toEqual({
			name: 'Triage',
			parentFolderId: 'parent',
		});
	});
});
