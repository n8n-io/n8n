import type { PageListItem } from '@n8n/api-types';
import { PAGE_SHORT_LINK_VIEW, PROJECT_PAGES_VIEW, usePageStore } from '@n8n/frontend-module-page';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { usePageNavigationCommands } from './usePageNavigationCommands';

const mocks = vi.hoisted(() => ({
	push: vi.fn(),
	route: { params: {} as Record<string, string> },
	canCreate: true,
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: mocks.push,
		resolve: ({ params }: { params: { pageId: string } }) => ({ href: `/page/${params.pageId}` }),
	}),
	useRoute: () => mocks.route,
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/frontend-module-page', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
	getPagePermissions: () => ({ canCreate: mocks.canCreate }),
}));

const toListItem = (id: string, overrides: Partial<PageListItem> = {}): PageListItem => ({
	id,
	title: `Title of ${id}`,
	projectId: 'team',
	projectName: 'Team Project',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-02T00:00:00.000Z',
	...overrides,
});

describe('usePageNavigationCommands', () => {
	let pageStore: MockedStore<typeof usePageStore>;
	let projectsStore: MockedStore<typeof useProjectsStore>;

	const setup = () => usePageNavigationCommands({ currentProjectName: ref('Team Project') });

	function setModuleActive(isActive: boolean) {
		mockedStore(useSettingsStore).isModuleActive.mockReturnValue(isActive);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		pageStore = mockedStore(usePageStore);
		pageStore.listAll.mockResolvedValue([]);
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = createTestProject({ id: 'personal', type: 'personal' });
		projectsStore.currentProjectId = undefined;
		mocks.route.params = {};
		mocks.canCreate = true;
		setModuleActive(true);
	});

	it('should be unavailable and empty when the page module is off', () => {
		setModuleActive(false);

		const group = setup();

		expect(group.source?.isAvailable()).toBe(false);
		expect(group.commands.value).toEqual([]);
	});

	it('should search the pages by the trimmed title', async () => {
		pageStore.listAll.mockResolvedValue([toListItem('a')]);
		const { source } = setup();

		const result = await source?.search({ query: ' run ', offset: 0, limit: 20 });

		expect(pageStore.listAll).toHaveBeenCalledWith('run');
		expect(result).toEqual({
			hasMore: false,
			items: [
				expect.objectContaining({
					id: 'a',
					title: 'Title of a',
					description: 'Team Project',
					href: '/page/a',
				}),
			],
		});
	});

	it('should list every page for an empty query', async () => {
		const { source } = setup();

		await source?.search({ query: '  ', offset: 0, limit: 20 });

		expect(pageStore.listAll).toHaveBeenCalledWith(undefined);
	});

	it('should cut the window that the command bar asks for', async () => {
		pageStore.listAll.mockResolvedValue(['a', 'b', 'c'].map((id) => toListItem(id)));
		const { source } = setup();

		const first = await source?.search({ query: '', offset: 0, limit: 2 });
		const second = await source?.search({ query: '', offset: 2, limit: 2 });

		expect(first?.items.map(({ id }) => id)).toEqual(['a', 'b']);
		expect(first?.hasMore).toBe(true);
		expect(second?.items.map(({ id }) => id)).toEqual(['c']);
		expect(second?.hasMore).toBe(false);
	});

	it('should name the personal project of the user', async () => {
		pageStore.listAll.mockResolvedValue([
			toListItem('a', { projectId: 'personal', projectName: 'Jane Doe <jane@example.com>' }),
		]);
		const { source } = setup();

		const result = await source?.search({ query: '', offset: 0, limit: 20 });

		expect(result?.items[0].description).toBe('Personal');
	});

	it('should open the selected page', async () => {
		pageStore.listAll.mockResolvedValue([toListItem('a')]);
		const { source } = setup();
		const result = await source?.search({ query: '', offset: 0, limit: 20 });

		await result?.items[0].handler?.();

		expect(mocks.push).toHaveBeenCalledWith({
			name: PAGE_SHORT_LINK_VIEW,
			params: { pageId: 'a' },
		});
	});

	it.each([
		['the project of the route', { projectId: 'team' }, 'team'],
		['the personal project outside a project', {}, 'personal'],
	])('should create a page in %s', async (_, params, projectId) => {
		mocks.route.params = params;
		pageStore.createPage.mockResolvedValue({ ...toListItem('new'), content: '' });
		const { commands } = setup();

		expect(commands.value).toHaveLength(1);
		expect(commands.value[0].title).toBe('Create page in Team Project');
		await commands.value[0].handler?.();

		await vi.waitFor(() =>
			expect(pageStore.createPage).toHaveBeenCalledWith(projectId, { title: 'Untitled' }),
		);
		await vi.waitFor(() =>
			expect(mocks.push).toHaveBeenCalledWith({
				name: PROJECT_PAGES_VIEW,
				params: { projectId, pageId: 'new' },
			}),
		);
	});

	it('should offer no creation without the permission', () => {
		mocks.canCreate = false;

		expect(setup().commands.value).toEqual([]);
	});
});
