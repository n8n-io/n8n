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
		['a project with a name of only zero-width spaces', { ...ops, name: '\u200b\u200b' }],
		['a project with a name of only bidi controls', { ...ops, name: '\u202e \u2066' }],
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

	it.each([
		['a line separator', 0x2028],
		['a paragraph separator', 0x2029],
		['a next-line control', 0x85],
	])('puts a name with %s on one line', (_, codePoint) => {
		const project = { ...ops, name: `Ops${String.fromCodePoint(codePoint)}Second line` };

		expect(parseRemoteProjects(toolOutput([project])).projects[0].name).toBe('Ops Second line');
	});

	it.each([
		['a right-to-left override', 0x202e],
		['a left-to-right isolate', 0x2066],
		['a zero-width space', 0x200b],
		['a byte order mark', 0xfeff],
	])('removes %s, which has no width, from a name', (_, codePoint) => {
		const project = { ...ops, name: `Ops${String.fromCodePoint(codePoint)}team` };

		expect(parseRemoteProjects(toolOutput([project])).projects[0].name).toBe('Opsteam');
	});

	it('keeps letters, emoji and inner spaces of any script', () => {
		const name = 'Équipe 運用 🚀\u00a0Ops';

		expect(parseRemoteProjects(toolOutput([{ ...ops, name }])).projects[0].name).toBe(name);
	});

	it('removes half of a surrogate pair from a name', () => {
		const project = { ...ops, name: 'Ops\ud83d team\udc00' };

		expect(parseRemoteProjects(toolOutput([project])).projects[0].name).toBe('Ops team');
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

	it('counts the length after it cleans the name', () => {
		const name = `${'n'.repeat(255)}\u200b\u202e`;

		expect(parseRemoteProjects(toolOutput([{ ...ops, name }])).projects[0].name).toBe(
			'n'.repeat(255),
		);
	});

	it('does not cut an emoji in two when it cuts a long name', () => {
		const name = `${'m'.repeat(251)}🚀${'m'.repeat(10)}`;

		const [project] = parseRemoteProjects(toolOutput([{ ...ops, name }])).projects;

		expect(project.name).toBe(`${'m'.repeat(251)}...`);
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

	it('reads the list when the total is not a number', () => {
		expect(parseRemoteProjects({ data: [ops], count: 'many' }).projects).toEqual([ops]);
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

	describe('when team projects fill the list', () => {
		const team = (index: number) => ({ id: `team${index}`, name: `Team ${index}`, type: 'team' });
		const fullPage = (teamProjectsEnabled = false) =>
			toolOutput(
				Array.from({ length: 100 }, (_, index) => team(index)),
				{
					count: 150,
					teamProjectsEnabled,
				},
			);

		it('asks for the personal project and adds it after the team projects', async () => {
			const client = mock<RemoteInstanceClient>();
			client.callTool
				.mockResolvedValueOnce(fullPage())
				.mockResolvedValueOnce(toolOutput([personal], { count: 1 }));

			const result = await listRemoteProjects(client);

			expect(client.callTool).toHaveBeenNthCalledWith(
				2,
				'search_projects',
				{ type: 'personal', limit: 1 },
				{ timeoutMs: 10_000 },
			);
			expect(result.teamProjectsEnabled).toBe(false);
			expect(result.projects).toHaveLength(101);
			expect(result.projects.at(-1)).toEqual(personal);
		});

		it('adds only a personal project from the second answer', async () => {
			const client = mock<RemoteInstanceClient>();
			client.callTool.mockResolvedValueOnce(fullPage()).mockResolvedValueOnce(toolOutput([ops]));

			const result = await listRemoteProjects(client);

			expect(result.projects).toHaveLength(100);
		});

		it.each([
			['the list is complete', toolOutput([ops], { count: 1 })],
			['the instance does not send the total', { data: [ops] }],
			['the list holds the personal project', toolOutput([ops, personal], { count: 150 })],
		])('makes one call when %s', async (_, output) => {
			const client = mock<RemoteInstanceClient>();
			client.callTool.mockResolvedValue(output);

			await listRemoteProjects(client);

			expect(client.callTool).toHaveBeenCalledTimes(1);
		});

		it('passes on a failed second call', async () => {
			const client = mock<RemoteInstanceClient>();
			const failure = new RemoteInstanceError('tool-error');
			client.callTool.mockResolvedValueOnce(fullPage(true)).mockRejectedValueOnce(failure);

			await expect(listRemoteProjects(client)).rejects.toBe(failure);
		});
	});

	describe('time limit', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const neverAnswers = async () => await new Promise<never>(() => {});

		const answersAfter = (ms: number, output: unknown) => async () =>
			await new Promise((resolve) => setTimeout(() => resolve(output), ms));

		it('throws a timeout error when the instance does not answer in 10 seconds', async () => {
			const client = mock<RemoteInstanceClient>();
			client.callTool.mockImplementation(neverAnswers);

			const listing = listRemoteProjects(client).catch((error: unknown) => error);
			await vi.advanceTimersByTimeAsync(10_000);

			const error = await listing;
			expect(error).toBeInstanceOf(RemoteInstanceError);
			expect(error).toHaveProperty('reason', 'timeout');
		});

		it('counts both calls against the same 10 seconds', async () => {
			const client = mock<RemoteInstanceClient>();
			client.callTool
				.mockImplementationOnce(answersAfter(6_000, toolOutput([ops], { count: 150 })))
				.mockImplementationOnce(answersAfter(6_000, toolOutput([personal])));

			const listing = listRemoteProjects(client).catch((error: unknown) => error);
			await vi.advanceTimersByTimeAsync(10_000);

			expect(client.callTool).toHaveBeenCalledTimes(2);
			await expect(listing).resolves.toHaveProperty('reason', 'timeout');
		});

		it('returns the projects when the instance answers in time', async () => {
			const client = mock<RemoteInstanceClient>();
			client.callTool.mockImplementation(answersAfter(9_999, toolOutput([ops])));

			const listing = listRemoteProjects(client);
			await vi.advanceTimersByTimeAsync(9_999);

			await expect(listing).resolves.toEqual({ projects: [ops], teamProjectsEnabled: true });
		});
	});
});
