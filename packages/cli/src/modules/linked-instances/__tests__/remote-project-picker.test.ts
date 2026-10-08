import {
	pickDefaultRemoteProject,
	reconcileDefaultRemoteProject,
	type RemoteProject,
} from '../remote-project-picker';

const personal: RemoteProject = {
	id: 'p-me',
	name: 'Ada Lovelace <ada@acme.test>',
	type: 'personal',
};
const ops: RemoteProject = { id: 't-ops', name: 'Ops', type: 'team' };
const sales: RemoteProject = { id: 't-sales', name: 'Sales', type: 'team' };

const list = (projects: RemoteProject[], teamProjectsEnabled = true) => ({
	projects,
	teamProjectsEnabled,
});

describe('pickDefaultRemoteProject', () => {
	it('picks the first listed team project, so teammates see new automations', () => {
		expect(pickDefaultRemoteProject(list([ops, sales, personal]))).toBe(ops);
	});

	it('picks a team project also when the personal project comes first', () => {
		expect(pickDefaultRemoteProject(list([personal, sales, ops]))).toBe(sales);
	});

	it('picks the personal project when no team project is listed', () => {
		expect(pickDefaultRemoteProject(list([personal]))).toBe(personal);
	});

	it('picks the personal project when team projects are not licensed', () => {
		expect(pickDefaultRemoteProject(list([ops, sales, personal], false))).toBe(personal);
	});

	it('picks nothing when team projects are not licensed and no personal project is listed', () => {
		expect(pickDefaultRemoteProject(list([ops, sales], false))).toBeNull();
	});

	it('picks nothing from an empty list', () => {
		expect(pickDefaultRemoteProject(list([]))).toBeNull();
		expect(pickDefaultRemoteProject(list([], false))).toBeNull();
	});
});

describe('reconcileDefaultRemoteProject', () => {
	it('keeps the current project while it is listed, with the name that the instance gives now', () => {
		const renamed: RemoteProject = { ...sales, name: 'Sales EMEA' };

		const result = reconcileDefaultRemoteProject(
			{ id: sales.id, name: 'Sales' },
			list([ops, renamed, personal]),
		);

		expect(result).toBe(renamed);
	});

	it('keeps a listed team project that the user chose, also without a team licence', () => {
		expect(reconcileDefaultRemoteProject(sales, list([sales, personal], false))).toBe(sales);
	});

	it('keeps the current personal project instead of a team project', () => {
		expect(reconcileDefaultRemoteProject(personal, list([ops, personal]))).toBe(personal);
	});

	it('picks a new default when the instance no longer lists the current project', () => {
		const gone = { id: 't-gone', name: 'Archive' };

		expect(reconcileDefaultRemoteProject(gone, list([sales, personal]))).toBe(sales);
		expect(reconcileDefaultRemoteProject(gone, list([sales, personal], false))).toBe(personal);
		expect(reconcileDefaultRemoteProject(gone, list([]))).toBeNull();
	});

	it('picks a default when there is no current project', () => {
		expect(reconcileDefaultRemoteProject(null, list([personal, ops]))).toBe(ops);
		expect(reconcileDefaultRemoteProject(null, list([]))).toBeNull();
	});

	it('matches the current project by id, not by name', () => {
		const sameName: RemoteProject = { id: 't-other', name: 'Sales', type: 'team' };

		expect(reconcileDefaultRemoteProject(sales, list([sameName, personal]))).toBe(sameName);
		expect(reconcileDefaultRemoteProject(sales, list([personal, sameName], false))).toBe(personal);
	});
});
