import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import { PROJECT_ROOT } from 'n8n-workflow';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';
import AgentFolderBrowser from '../components/AgentFolderBrowser.vue';
import { PROJECT_AGENTS } from '../constants';

const mocks = vi.hoisted(() => ({
	getFolderPath: vi.fn(),
	moveFolder: vi.fn(),
	moveAgent: vi.fn(),
	push: vi.fn(),
	fetchFavorites: vi.fn(),
	toggleFavorite: vi.fn(),
	createAgent: vi.fn(),
	isFavorite: false,
	canCreate: true,
	canUpdate: true,
	canDelete: true,
}));

vi.mock('@/features/core/folders/folders.api', () => mocks);
vi.mock('../composables/useAgentApi', () => ({ moveAgent: mocks.moveAgent }));
vi.mock('../composables/useProjectAgentsList', () => ({
	invalidateProjectAgentsListCache: vi.fn(),
}));
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({
		canCreate: ref(mocks.canCreate),
		canUpdate: ref(mocks.canUpdate),
		canDelete: ref(mocks.canDelete),
	}),
}));
vi.mock('../composables/useCreateAgent', () => ({
	useCreateAgent: () => ({ createAgent: mocks.createAgent }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isFoldersFeatureEnabled: true }),
}));
vi.mock('@/app/stores/favorites.store', () => ({
	useFavoritesStore: () => ({
		isFavorite: () => mocks.isFavorite,
		fetchFavorites: mocks.fetchFavorites,
		toggleFavorite: mocks.toggleFavorite,
	}),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: mocks.push,
		resolve: () => ({ href: '/projects/project/agents?folderId=parent' }),
	}),
	useRoute: () => ({ query: {} }),
}));
vi.mock('../components/AgentFolderDialog.vue', () => ({
	default: { name: 'AgentFolderDialog', props: ['action', 'projectId'], template: '<div />' },
}));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/design-system')>()),
	N8nCard: {
		template: '<div><slot name="header"/><slot/><slot name="footer"/><slot name="append"/></div>',
	},
	N8nText: { template: '<span><slot/></span>' },
	N8nTimeAgo: { props: ['date'], template: '<time :datetime="date">{{ date }}</time>' },
	N8nIcon: { template: '<i />' },
}));

const folderDates = {
	createdAt: '2026-01-01T10:00:00.000Z',
	updatedAt: '2026-01-02T11:00:00.000Z',
};
const folder: ChangeLocationSearchResponseItem = {
	id: 'child',
	...folderDates,
	name: 'Triage',
	path: ['Support', 'Triage'],
	agentCount: 2,
	workflowCount: 0,
	subFolderCount: 0,
};

beforeEach(() => {
	vi.resetAllMocks();
	mocks.isFavorite = false;
	mocks.canCreate = true;
	mocks.canUpdate = true;
	mocks.canDelete = true;
	mocks.getFolderPath.mockResolvedValue([{ id: 'parent', name: 'Support', children: [] }]);
});

let currentWrapper: { unmount: () => void } | undefined;

afterEach(() => {
	currentWrapper?.unmount();
});

function render(folders = [folder]) {
	const wrapper = mount(AgentFolderBrowser, {
		attachTo: document.body,
		props: {
			projectId: 'project',
			folderId: 'parent',
			search: '',
			folders,
			folderPermissions: { create: true, update: true, delete: true },
		},
	});
	currentWrapper = wrapper;

	return wrapper;
}

async function openMenu(wrapper: ReturnType<typeof render>) {
	await flushPromises();
	await userEvent.click(wrapper.get('[data-test-id="folder-card-actions"] button').element);

	return await screen.findByRole('menu');
}

describe('AgentFolderBrowser', () => {
	it('keeps keyboard actions on the folder menu from opening the folder', async () => {
		const wrapper = render();
		await flushPromises();
		await wrapper
			.get('[data-test-id="folder-card-actions"] button')
			.trigger('keydown', { key: 'Enter' });

		expect(mocks.push).not.toHaveBeenCalled();
	});

	it('matches the workflow folder menu order and labels', async () => {
		const wrapper = render();
		await openMenu(wrapper);

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
			'Open',
			'Create folder inside',
			'Create Agent inside',
			'Favorite',
			'Rename',
			'Move',
			'Delete',
		]);
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it('opens the selected folder from the menu in the Agent tree', async () => {
		const wrapper = render();
		await openMenu(wrapper);
		await userEvent.click(screen.getByRole('menuitem', { name: 'Open', exact: true }));

		expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
			name: PROJECT_AGENTS,
			params: { projectId: 'project' },
			query: { folderId: 'child' },
		});
	});

	it('creates an Agent inside the selected folder', async () => {
		const wrapper = render();
		await openMenu(wrapper);
		await userEvent.click(screen.getByRole('menuitem', { name: 'Create Agent inside' }));

		expect(mocks.createAgent).toHaveBeenCalledExactlyOnceWith(
			'dropdown',
			'project',
			undefined,
			'child',
		);
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it('creates a subfolder inside the selected folder', async () => {
		const wrapper = render();
		await openMenu(wrapper);
		await userEvent.click(screen.getByRole('menuitem', { name: 'Create folder inside' }));

		expect(wrapper.findComponent({ name: 'AgentFolderDialog' }).props('action')).toEqual({
			mode: 'create',
			parentFolderId: 'child',
		});
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it.each([
		{ label: 'Rename', mode: 'rename' },
		{ label: 'Move', mode: 'moveFolder' },
		{ label: 'Delete', mode: 'delete' },
	])('opens the $label action for the selected folder', async ({ label, mode }) => {
		const wrapper = render();
		await openMenu(wrapper);
		await userEvent.click(screen.getByRole('menuitem', { name: label, exact: true }));

		expect(wrapper.findComponent({ name: 'AgentFolderDialog' }).props('action')).toEqual(
			expect.objectContaining({ mode, id: 'child', name: 'Triage' }),
		);
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'uses shared folder favorites when already favorited is %s',
		async (isFavorite) => {
			mocks.isFavorite = isFavorite;
			const wrapper = render();
			await openMenu(wrapper);
			await userEvent.click(
				screen.getByRole('menuitem', { name: isFavorite ? 'Unfavorite' : 'Favorite' }),
			);

			expect(mocks.toggleFavorite).toHaveBeenCalledExactlyOnceWith('child', 'folder');
			expect(mocks.push).not.toHaveBeenCalled();
		},
	);

	it('keeps unavailable actions visible and disables writes in read-only mode', async () => {
		mocks.canCreate = false;
		mocks.canUpdate = false;
		mocks.canDelete = false;
		const wrapper = render();
		await wrapper.setProps({ folderPermissions: { create: false, update: false, delete: false } });
		await openMenu(wrapper);

		for (const name of [
			'Create folder inside',
			'Create Agent inside',
			'Rename',
			'Move',
			'Delete',
		]) {
			const item = screen.getByRole('menuitem', { name, exact: true });
			expect(item).toHaveAttribute('aria-disabled', 'true');
			await userEvent.click(item);
		}

		expect(screen.getByRole('menuitem', { name: 'Open', exact: true })).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(screen.getByRole('menuitem', { name: 'Favorite', exact: true })).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(mocks.createAgent).not.toHaveBeenCalled();
		expect(wrapper.findComponent({ name: 'AgentFolderDialog' }).props('action')).toBeNull();
	});

	it('keeps relocation available when the user can update Agents but cannot archive them', async () => {
		mocks.canDelete = false;
		const wrapper = render();
		await openMenu(wrapper);
		await userEvent.click(screen.getByRole('menuitem', { name: 'Delete', exact: true }));

		expect(wrapper.findComponent({ name: 'AgentFolderDialog' }).props('action')).toEqual(
			expect.objectContaining({ mode: 'delete', canRelocate: true, canDelete: false }),
		);
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
			const wrapper = render([{ ...folder, agentCount, subFolderCount }]);
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

	it('shows both dates in the workflow subtitle order', async () => {
		const wrapper = render();
		await flushPromises();

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

	it('moves a dragged Agent to the project root', async () => {
		const wrapper = render();
		await flushPromises();
		wrapper.vm.startAgentDrag('agent');
		await wrapper.vm.drop(PROJECT_ROOT);

		expect(mocks.moveAgent).toHaveBeenCalledOnce();
		expect(mocks.moveAgent).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'project', 'agent', null);
		expect(mocks.fetchFavorites).toHaveBeenCalledWith(true);
		expect(wrapper.emitted('changed')).toHaveLength(1);
	});

	it('displays the parent list page without retaining previous folder rows', async () => {
		const wrapper = render();
		await flushPromises();

		await wrapper.setProps({ folders: [{ ...folder, id: 'sales', name: 'Sales' }] });

		expect(wrapper.text()).toContain('Sales');
		expect(wrapper.text()).not.toContain('Triage');

		await wrapper.setProps({ folders: [] });

		expect(wrapper.find('[data-testid="agent-folder-card"]').exists()).toBe(false);
	});

	it('clears the previous folder breadcrumbs when navigating to root', async () => {
		const wrapper = render();
		await flushPromises();
		expect(wrapper.vm.breadcrumbs).toEqual([
			{
				id: 'parent',
				label: 'Support',
				href: '/projects/project/agents?folderId=parent',
			},
		]);

		await wrapper.setProps({ folderId: null, folders: [] });

		expect(wrapper.vm.breadcrumbs).toEqual([]);
	});
});
