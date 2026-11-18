import { useOverviewMode } from './useOverviewMode';

const route = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	query: {} as Record<string, string>,
}));
const isPageModuleActive = vi.hoisted(() => ({ value: true }));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => route,
}));
vi.mock('./useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => isPageModuleActive,
}));

describe('useOverviewMode', () => {
	beforeEach(() => {
		route.params = { projectId: 'p1' };
		route.query = {};
		isPageModuleActive.value = true;
	});

	it('should show the list when the address asks for no mode', () => {
		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should show the documentation when the address asks for it', () => {
		route.query = { view: 'docs' };

		expect(useOverviewMode().mode.value).toBe('docs');
	});

	it('should show the list for a value that is not a mode', () => {
		route.query = { view: 'grid' };

		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should show the list when the instance has no pages', () => {
		isPageModuleActive.value = false;
		route.query = { view: 'docs' };

		expect(useOverviewMode().mode.value).toBe('list');
	});

	it('should give the project of the route, and none on the overview of all projects', () => {
		expect(useOverviewMode().projectId.value).toBe('p1');

		route.params = {};

		expect(useOverviewMode().projectId.value).toBeUndefined();
	});
});
