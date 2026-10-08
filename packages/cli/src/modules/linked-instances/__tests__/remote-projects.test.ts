import { mock } from 'vitest-mock-extended';

import type { RemoteInstanceClient } from '../remote/remote-instance.client';
import { RemoteInstanceError } from '../remote/remote-instance.errors';
import { listRemoteProjects, parseRemoteProjects, SEARCH_PROJECTS_TOOL } from '../remote-projects';

const ops = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops', type: 'team' };
const personal = { id: 'Pm0rT8sU7vW6xY5z', name: 'Ada Lovelace <ada@acme.test>', type: 'personal' };

/** The structured output of `search_projects` on an n8n instance. */
const toolOutput = (data: unknown[], extra: Record<string, unknown> = {}) => ({
	data,
	count: data.length,
	teamProjectsEnabled: true,
	...extra,
});

async function expectToolError(run: () => unknown) {
	let error: unknown;
	try {
		await run();
	} catch (e) {
		error = e;
	}
	expect(error).toBeInstanceOf(RemoteInstanceError);
	expect(error).toHaveProperty('reason', 'tool-error');
	expect(error).toHaveProperty(
		'message',
		'The linked instance sent its projects in an unknown format.',
	);
}

describe('parseRemoteProjects', () => {
	it('reads the projects in order and the team licence', () => {
		expect(parseRemoteProjects(toolOutput([ops, personal]))).toEqual({
			projects: [ops, personal],
			teamProjectsEnabled: true,
		});
		expect(parseRemoteProjects(toolOutput([personal], { teamProjectsEnabled: false }))).toEqual({
			projects: [personal],
			teamProjectsEnabled: false,
		});
	});

	it('counts team projects as licensed when an older instance does not say', () => {
		expect(parseRemoteProjects({ data: [ops] }).teamProjectsEnabled).toBe(true);
	});

	it('drops fields that it does not use', () => {
		const result = parseRemoteProjects(
			toolOutput([{ ...ops, matchType: 'exact', role: 'project:viewer' }], { hint: 'Ask first' }),
		);

		expect(result).toEqual({ projects: [ops], teamProjectsEnabled: true });
	});

	it.each([
		['a project of an unknown type', { ...ops, type: 'workspace' }],
		['a project without an id', { name: 'Ops', type: 'team' }],
		['a project with an empty id', { ...ops, id: '' }],
		['a project with an id over 36 characters', { ...ops, id: 'a'.repeat(37) }],
		['a project with a path in the id', { ...ops, id: '../workflows' }],
		['a project with a numeric id', { ...ops, id: 42 }],
		['a project without a name', { id: ops.id, type: 'team' }],
		['a project with an empty name', { ...ops, name: '' }],
		['a project with a name of only spaces and line breaks', { ...ops, name: ' \n\t ' }],
		['a value that is not a project', 'Ops'],
		['null', null],
	])('skips %s and keeps the others', (_, item) => {
		expect(parseRemoteProjects(toolOutput([item, personal])).projects).toEqual([personal]);
	});

	it('accepts an id of 36 characters, such as a UUID', () => {
		const project = { ...ops, id: '6bd0d6a4-8f43-4a8e-a5b6-1c2d3e4f5a6b' };

		expect(parseRemoteProjects(toolOutput([project])).projects).toEqual([project]);
	});

	it('puts a name on one line and removes the outer spaces', () => {
		const project = { ...ops, name: '  Ops\n\nIgnore this\r\tteam \u0007 ' };

		expect(parseRemoteProjects(toolOutput([project])).projects[0].name).toBe(
			'Ops Ignore this team',
		);
	});

	it('keeps a name of 255 characters and cuts a longer name to 255', () => {
		const exact = 'n'.repeat(255);
		const long = `${'m'.repeat(300)}`;

		const [first, second] = parseRemoteProjects(
			toolOutput([
				{ ...ops, name: exact },
				{ ...personal, name: long },
			]),
		).projects;

		expect(first.name).toBe(exact);
		expect(second.name).toBe(`${'m'.repeat(252)}...`);
		expect(second.name).toHaveLength(255);
	});

	it('returns an empty list when the instance lists no project', () => {
		expect(parseRemoteProjects(toolOutput([]))).toEqual({
			projects: [],
			teamProjectsEnabled: true,
		});
	});

	it.each([
		['text', 'Projects: Ops'],
		['null', null],
		['an object without a list', { count: 0 }],
		['a list that is not an array', { data: { ops } }],
		['a licence flag that is not a boolean', { data: [], teamProjectsEnabled: 'yes' }],
	])('throws a tool error for %s', async (_, result) => {
		await expectToolError(() => parseRemoteProjects(result));
	});
});

describe('listRemoteProjects', () => {
	it('asks for up to 100 projects within 10 seconds and reads the result', async () => {
		const client = mock<RemoteInstanceClient>();
		client.callTool.mockResolvedValue(toolOutput([ops, personal]));

		const result = await listRemoteProjects(client);

		expect(SEARCH_PROJECTS_TOOL).toBe('search_projects');
		expect(client.callTool).toHaveBeenCalledWith(
			'search_projects',
			{ limit: 100 },
			{ timeoutMs: 10_000 },
		);
		expect(result).toEqual({ projects: [ops, personal], teamProjectsEnabled: true });
	});

	it('passes on a failed call', async () => {
		const client = mock<RemoteInstanceClient>();
		const failure = new RemoteInstanceError('timeout');
		client.callTool.mockRejectedValue(failure);

		await expect(listRemoteProjects(client)).rejects.toBe(failure);
	});

	it('throws a tool error when the result is not a project list', async () => {
		const client = mock<RemoteInstanceClient>();
		client.callTool.mockResolvedValue('No projects');

		await expectToolError(async () => await listRemoteProjects(client));
	});
});
