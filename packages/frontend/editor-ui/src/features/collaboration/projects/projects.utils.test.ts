import { createPinia, setActivePinia } from 'pinia';
import {
	splitName,
	useRemoteProjectSearch,
	DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
} from './projects.utils';
import { useProjectsStore } from './projects.store';

describe('splitName', () => {
	test.each([
		[
			'First Last <email@domain.com>',
			{
				name: 'First Last',
				email: 'email@domain.com',
			},
		],
		[
			'First Last Third <email@domain.com>',
			{
				name: 'First Last Third',
				email: 'email@domain.com',
			},
		],
		[
			'First Last Third Fourth <email@domain.com>',
			{
				name: 'First Last Third Fourth',
				email: 'email@domain.com',
			},
		],
		[
			' First Last Third Fourth <email@domain.com>',
			{
				name: 'First Last Third Fourth',
				email: 'email@domain.com',
			},
		],
		[
			'<email@domain.com>',
			{
				name: undefined,
				email: 'email@domain.com',
			},
		],
		[
			' <email@domain.com>',
			{
				name: undefined,
				email: 'email@domain.com',
			},
		],
		[
			'My project',
			{
				name: 'My project',
				email: undefined,
			},
		],
		[
			' My project ',
			{
				name: 'My project',
				email: undefined,
			},
		],
		[
			'MyProject',
			{
				name: 'MyProject',
				email: undefined,
			},
		],
		[
			undefined,
			{
				name: undefined,
				email: undefined,
			},
		],
	])('should split a name in the format "First Last <email@domain.com>"', (input, result) => {
		expect(splitName(input)).toEqual(result);
	});
});

describe('useRemoteProjectSearch', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('routes to the sharing-candidates endpoint via store.searchShareableProjects', async () => {
		const store = useProjectsStore();
		const spy = vi
			.spyOn(store, 'searchShareableProjects')
			.mockResolvedValue({ count: 0, data: [] });

		const search = useRemoteProjectSearch();
		await search('alice');

		expect(spy).toHaveBeenCalledWith({
			search: 'alice',
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
		});
	});
});
