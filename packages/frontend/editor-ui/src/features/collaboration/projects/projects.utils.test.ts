import { createPinia, setActivePinia } from 'pinia';
import {
	isOwnedByPersonalProject,
	splitName,
	useRemoteProjectSearch,
	DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
} from './projects.utils';
import { useProjectsStore } from './projects.store';
import type { Project, ProjectSharingData } from './projects.types';

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

describe('isOwnedByPersonalProject', () => {
	const personalProject = { id: 'p1' } as Project;

	it("is true when the home project is the viewer's own personal project", () => {
		const homeProject = { id: 'p1', type: 'personal' } as ProjectSharingData;
		expect(isOwnedByPersonalProject(homeProject, personalProject)).toBe(true);
	});

	it("is false when the home project belongs to someone else's personal project", () => {
		const homeProject = { id: 'p2', type: 'personal' } as ProjectSharingData;
		expect(isOwnedByPersonalProject(homeProject, personalProject)).toBe(false);
	});

	it('is false for a team project even if the id happens to match', () => {
		const homeProject = { id: 'p1', type: 'team' } as ProjectSharingData;
		expect(isOwnedByPersonalProject(homeProject, personalProject)).toBe(false);
	});

	it('is false when either project is missing', () => {
		expect(isOwnedByPersonalProject(undefined, personalProject)).toBe(false);
		expect(
			isOwnedByPersonalProject({ id: 'p1', type: 'personal' } as ProjectSharingData, undefined),
		).toBe(false);
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

	it('scopes the page to a project type when the caller asks for one', async () => {
		const store = useProjectsStore();
		const spy = vi
			.spyOn(store, 'searchShareableProjects')
			.mockResolvedValue({ count: 0, data: [] });

		const search = useRemoteProjectSearch({ type: 'personal' });
		await search('alice');

		expect(spy).toHaveBeenCalledWith({
			search: 'alice',
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
			type: 'personal',
		});
	});
});
