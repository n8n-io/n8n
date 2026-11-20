import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { GymAdmin } from '../gym-admin';
import type { McpCaller } from '../mcp-upstream';
import { OnceByKey } from '../once-by-key';
import {
	dropUnprovenIds,
	fillPointers,
	idsInArgs,
	knownText,
	missingIds,
	provenIds,
	removeUnprovenLiterals,
} from '../plan-template';
import { linearLookups, withIssueDescriptions, withUserEmails } from '../linear-lookups';
import { notionLookups } from '../notion-lookups';
import {
	PlanHydrator,
	nestDottedKeys,
	parsePlan,
	type PlanHydratorDeps,
	type PlanLlm,
} from '../plan-hydrator';

const text = (t: string): CallToolResult => ({ content: [{ type: 'text', text: t }] });
const ID = 'a1a1a1a1-1209-4209-9209-120912091209';

describe('fillPointers', () => {
	const ctx = {
		result: {
			id: 'TRUST-1209',
			description: 'long text',
			team: { id: 't1' },
			labels: [{ name: 'Bug' }],
		},
		reads: [{ states: [{ name: 'Todo' }] }],
	};

	it('replaces a string that is only a pointer, with any value', () => {
		expect(
			fillPointers(
				{
					a: '$result.description',
					b: '$result.team',
					c: '$result.labels[0].name',
					d: '$reads[0].states[0].name',
				},
				ctx,
			),
		).toEqual({ a: 'long text', b: { id: 't1' }, c: 'Bug', d: 'Todo' });
	});

	it('keeps text that only contains a pointer, and drops a pointer that names nothing', () => {
		expect(
			fillPointers({ a: 'see $result.id', b: '$result.nope', c: ['$reads[3].x', 'ok'] }, ctx),
		).toEqual({
			a: 'see $result.id',
			c: ['ok'],
		});
	});
});

describe('ids of a call', () => {
	it('finds UUIDs, ids in urls and issue keys, and ignores dashes and case', () => {
		const ids = idsInArgs({
			id: 'TRUST-1209',
			page: 'https://notion.so/x-3FA5B6E0C94F8117B536D57495F7890F?pvs=4',
		});
		expect(ids).toEqual(['trust1209', '3fa5b6e0c94f8117b536d57495f7890f']);
		expect(missingIds(ids, 'issue TRUST-1209 at 3fa5b6e0-c94f-8117-b536-d57495f7890f')).toEqual([]);
		expect(missingIds(ids, 'issue TRUST-1209')).toEqual(['3fa5b6e0c94f8117b536d57495f7890f']);
	});
});

describe('parsePlan', () => {
	it('reads JSON out of fences and surrounding text', () => {
		const plan = parsePlan(
			'Here:\n```json\n{"reads":[{"tool":"x","args":{"a":1}}],"overlay":{"k":1}}\n```',
		);
		expect(plan).toEqual({ reads: [{ tool: 'x', args: { a: 1 } }], overlay: { k: 1 }, events: [] });
	});

	it('rejects an answer with no JSON', () => {
		expect(() => parsePlan('no idea')).toThrow('no JSON');
	});
});

describe('OnceByKey', () => {
	it('shares a running job, remembers a good one and forgets a failed one', async () => {
		const once = new OnceByKey();
		let runs = 0;
		const slow = async () => {
			runs++;
			await new Promise((r) => setTimeout(r, 5));
			return true;
		};
		await Promise.all([once.run('k', slow), once.run('k', slow)]);
		await once.run('k', slow);
		expect(runs).toBe(1);
		let failures = 0;
		const fails = async () => {
			failures++;
			return false;
		};
		await once.run('f', fails);
		await once.run('f', fails);
		expect(failures).toBe(2);
	});
});

function setup(
	answers: string[],
	gymAnswer: (n: number) => CallToolResult = () => text(`issue TRUST-1209 ${ID}`),
	lookups?: PlanHydratorDeps['lookups'],
	seedReport?: (n: number) => unknown,
	gymFirst?: ReadonlySet<string>,
) {
	const prompts: string[] = [];
	const seeds: unknown[] = [];
	const events: unknown[] = [];
	const seedErrors: Error[] = [];
	const upstreamCalls: Array<[string, unknown]> = [];
	let gymCalls = 0;
	const llm: PlanLlm = async ({ prompt }) => {
		prompts.push(prompt);
		const next = answers.shift();
		if (next === undefined) throw new Error('no more answers');
		return next;
	};
	const admin = {
		seed: async (_t: string, overlay: unknown) => {
			const err = seedErrors.shift();
			if (err) throw err;
			seeds.push(overlay);
			return seedReport?.(seeds.length);
		},
		event: async (_t: string, e: unknown) => {
			events.push(e);
		},
	} as unknown as GymAdmin;
	const upstream = {
		callTool: async (name: string, args: unknown) => {
			upstreamCalls.push([name, args]);
			return text(JSON.stringify({ states: [{ name: 'Todo' }] }));
		},
	} as unknown as McpCaller;
	const gym = {
		callTool: async () => gymAnswer(++gymCalls),
	} as unknown as McpCaller;
	const hydrator = new PlanHydrator({
		admin,
		tenant: 't1',
		upstream,
		gym,
		readTools: new Set(['get_issue', 'get_team', 'get_project']),
		instructions: 'rules',
		llm,
		lookups,
		gymFirst,
	});
	return { hydrator, prompts, seeds, events, seedErrors, upstreamCalls, gymCalls: () => gymCalls };
}

describe('PlanHydrator', () => {
	const real = text(JSON.stringify({ id: 'TRUST-1209', uuid: ID, description: 'long text' }));

	it('seeds a plan in one model turn and fills its pointers from the real result', async () => {
		const plan = JSON.stringify({
			overlay: {
				native: {
					linear: { issues: [{ id: '$result.uuid', description: '$result.description' }] },
				},
			},
		});
		const { hydrator, seeds, prompts } = setup([plan]);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(1);
		expect(seeds).toEqual([
			{ world_version: 1, native: { linear: { issues: [{ id: ID, description: 'long text' }] } } },
		]);
	});

	it('runs the reads of the plan in code, refuses a non-read tool, then asks once more', async () => {
		const first = JSON.stringify({
			reads: [
				{ tool: 'get_team', args: { query: 'T' } },
				{ tool: 'save_issue', args: {} },
			],
		});
		const second = JSON.stringify({ overlay: { teams: ['$reads[0].states[0].name'] } });
		const { hydrator, seeds, prompts, upstreamCalls } = setup([first, second]);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(upstreamCalls).toEqual([['get_team', { query: 'T' }]]);
		expect(prompts[1]).toContain('error: save_issue is not a read tool');
		expect(seeds).toEqual([{ world_version: 1, teams: ['Todo'] }]);
	});

	it('leaves out an entity that an earlier call seeded and keeps its ref in the letter case that was stored', async () => {
		const first = JSON.stringify({
			overlay: { native: { linear: { teams: [{ ref: 'team:LHO', id: 'team-1' }] } } },
		});
		const second = JSON.stringify({
			overlay: {
				native: {
					linear: {
						teams: [{ ref: 'team:lho', id: 'team-1' }],
						projects: [{ ref: 'project:p', team: 'team:lho' }],
					},
				},
			},
		});
		const { hydrator, seeds } = setup([first, second]);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1210' }, real);
		expect(seeds[1]).toEqual({
			world_version: 1,
			native: {
				linear: { teams: [], projects: [{ ref: 'project:p', team: 'team:LHO' }] },
			},
		});
	});

	it('does not read an object from the real service when the gym holds it', async () => {
		const lookups = () => [{ tool: 'get_issue', args: { id: 'TRUST-1' } }];
		const plan = JSON.stringify({ overlay: {} });
		const gymHas = setup(
			[plan],
			() => text(`TRUST-1 ${ID}`),
			lookups,
			undefined,
			new Set(['get_issue']),
		);
		await gymHas.hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(gymHas.upstreamCalls).toEqual([]);
		expect(gymHas.prompts[0]).toContain('The gym holds these objects already');

		const gymLacks = setup(
			[plan],
			() => ({ isError: true, content: [{ type: 'text', text: 'not found' }] }),
			lookups,
			undefined,
			new Set(['get_issue']),
		);
		await gymLacks.hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(gymLacks.upstreamCalls).toEqual([['get_issue', { id: 'TRUST-1' }]]);
	});

	it('tells the model which objects the gym holds when other lookups remain', async () => {
		const lookups = () => [
			{ tool: 'get_issue', args: { id: 'TRUST-1' } },
			{ tool: 'get_team', args: { query: 'LHO' } },
		];
		const { hydrator, prompts } = setup(
			[JSON.stringify({ overlay: {} })],
			() => text(`TRUST-1 ${ID}`),
			lookups,
			undefined,
			new Set(['get_issue']),
		);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts[0]).toContain('The gym holds these objects already');
		expect(prompts[0]).toContain('get_issue {"id":"TRUST-1"}');
		expect(prompts[0]).toContain('The call names objects in its args');
	});

	it('leaves out an entity under the id of an object that a write made in the gym', async () => {
		const plan = JSON.stringify({
			overlay: {
				native: { linear: { projects: [{ ref: 'project:P-TRUST-1', name: 'P-TRUST-1' }] } },
			},
		});
		const { hydrator, seeds } = setup([plan]);
		hydrator.noteWrite('save_project', text(JSON.stringify({ id: 'P-TRUST-1', uuid: ID })));
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(seeds).toEqual([]);
	});

	it('does not hydrate a write on an object that a write made in the gym', async () => {
		const { hydrator, prompts } = setup([]);
		hydrator.noteWrite('save_comment', text(JSON.stringify({ id: ID })));
		await hydrator.hydrateWrite('delete_comment', { id: ID });
		expect(prompts).toEqual([]);
	});

	it('holds the ids that a write result lists, also nested', async () => {
		const { hydrator, prompts } = setup([]);
		hydrator.noteWrite('notion-create-pages', text(JSON.stringify({ pages: [{ id: ID }] })));
		await hydrator.hydrateWrite('notion-update-page', { page_id: ID });
		expect(prompts).toEqual([]);
	});

	it('does not ask the model again when the gym build lacks a feature', async () => {
		const plan = JSON.stringify({ overlay: { a: 1 } });
		const { hydrator, prompts } = setup([plan, plan], () => ({
			isError: true,
			content: [{ type: 'text', text: 'SQL mode is not available in the gym build of Notion' }],
		}));
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(1);
	});

	it('goes back to the model with the gym error, and stops after two repairs', async () => {
		const bad = JSON.stringify({ overlay: { a: 1 } });
		const { hydrator, seedErrors, prompts } = setup([bad, bad, bad, bad]);
		seedErrors.push(new Error('$.a: bad'), new Error('$.a: bad'), new Error('$.a: bad'));
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(3);
		expect(prompts[1]).toContain('the gym refused it: $.a: bad');
	});

	it('repairs when the gym answer lacks an id of the call', async () => {
		const plan = JSON.stringify({ overlay: { a: 1 } });
		const { hydrator, prompts, gymCalls } = setup([plan, plan], (n) =>
			text(n === 1 ? 'empty' : 'TRUST-1209'),
		);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(2);
		expect(prompts[1]).toContain('does not show these ids from the call: trust1209');
		expect(gymCalls()).toBe(2);
	});

	it('does not throw when the model fails, and tries again on the next identical call', async () => {
		const { hydrator, prompts } = setup([]);
		await expect(
			hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real),
		).resolves.toBeUndefined();
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(2);
	});

	it('hydrates a write without a gym replay', async () => {
		const { hydrator, seeds, gymCalls } = setup([
			JSON.stringify({ overlay: { pages: [{ id: ID }] } }),
		]);
		await hydrator.hydrateWrite('notion-create-pages', { parent: { page_id: ID } });
		expect(seeds).toHaveLength(1);
		expect(gymCalls()).toBe(0);
	});
});

describe('dropUnprovenIds', () => {
	const real = 'a1a1a1a1-1209-4209-9209-120912091209';
	const proven = provenIds({ uuid: real }, [], { id: 'TRUST-1209' });

	it('keeps UUIDs of the real data and drops the ids a model made up', () => {
		expect(
			dropUnprovenIds(
				{
					teams: [
						{
							id: 'TRUST',
							key: 'TRUST',
							states: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Todo' }],
						},
					],
					issues: [
						{ id: real.toUpperCase(), number: 1209 },
						{ id: 'TRUST-1209', number: 5 },
					],
				},
				proven,
			),
		).toEqual({
			teams: [{ key: 'TRUST', states: [{ name: 'Todo' }] }],
			issues: [{ id: real.toUpperCase(), number: 1209 }, { number: 5 }],
		});
	});

	it('does not touch an id that is not a string', () => {
		expect(dropUnprovenIds({ id: 5, items: [{ id: null }] }, proven)).toEqual({
			id: 5,
			items: [{ id: null }],
		});
	});
});

describe('dropUnprovenIds with opaque ids', () => {
	const real = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
	const source = JSON.stringify([
		{ spreadsheetId: real },
		[],
		{ path: `/v4/spreadsheets/${real}` },
	]);

	it('keeps an id that the real data shows word for word', () => {
		expect(
			dropUnprovenIds({ spreadsheets: [{ id: real, title: 'x' }] }, new Set(), source),
		).toEqual({ spreadsheets: [{ id: real, title: 'x' }] });
	});

	it('drops an id that the real data does not show, also in another case', () => {
		const out = dropUnprovenIds(
			{ items: [{ id: real.toLowerCase() }, { id: 'madeUpId12345' }, { id: 'abc' }] },
			new Set(),
			source,
		);

		expect(out).toEqual({ items: [{}, {}, {}] });
	});

	it('still checks the id of a data source as a UUID', () => {
		expect(dropUnprovenIds({ data_source_id: real }, new Set(), source)).toEqual({});
	});
});

describe('PlanHydrator with invented ids', () => {
	it('seeds without the ids that are not in the real data', async () => {
		const plan = JSON.stringify({
			overlay: {
				native: {
					linear: { issues: [{ id: 'TRUST-1209', number: 1209, title: '$result.title' }] },
				},
			},
		});
		const { hydrator, seeds } = setup([plan]);
		await hydrator.hydrate(
			'get_issue',
			{ id: 'TRUST-1209' },
			text(JSON.stringify({ id: 'TRUST-1209', title: 'T' })),
		);
		expect(seeds).toEqual([
			{ world_version: 1, native: { linear: { issues: [{ number: 1209, title: 'T' }] } } },
		]);
	});
});

describe('removeUnprovenLiterals', () => {
	const known = knownText({ title: 'Fix the login bug', team: 'AI Trust', status: 'Backlog' }, [], {
		id: 'TRUST-1209',
	});

	it('keeps text of the real data, structure and refs, and removes the rest', () => {
		const { cleaned, flagged } = removeUnprovenLiterals(
			{
				teams: [
					{
						ref: 'team:eng',
						key: 'TRUST',
						name: 'AI  Trust',
						states: [{ name: 'Backlog', type: 'backlog', color: '#bec2c8' }],
					},
				],
				issues: [
					{
						ref: 'issue:TRUST-1209',
						title: 'fix the login bug',
						state: 'Backlog',
						description: 'Made up text',
						parent: 'issue:other',
						labels: ['label:bug'],
						priority: 2,
					},
				],
				properties: { Name: 'title', Notes: 'rich_text' },
			},
			known,
		);
		expect(flagged).toEqual([{ path: 'issues[0].description', value: 'Made up text' }]);
		expect(JSON.stringify(cleaned)).not.toContain('Made up text');
		expect(JSON.stringify(cleaned)).toContain('label:bug');
	});

	it('does not take a url as a ref', () => {
		const { flagged } = removeUnprovenLiterals({ url: 'https://evil.example/x' }, known);
		expect(flagged).toHaveLength(1);
	});
});

describe('PlanHydrator with text that is not in the real data', () => {
	const real = text(JSON.stringify({ id: 'TRUST-1209', title: 'Real title' }));

	it('sends it back once, then seeds the plan without it', async () => {
		const bad = JSON.stringify({
			overlay: { issues: [{ title: '$result.title', description: 'Invented' }] },
		});
		const fixed = JSON.stringify({ overlay: { issues: [{ title: '$result.title' }] } });
		const { hydrator, seeds, prompts } = setup([bad, fixed]);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts[1]).toContain(
			'these values are not in the real data: issues[0].description = "Invented"',
		);
		expect(seeds).toEqual([{ world_version: 1, issues: [{ title: 'Real title' }] }]);
	});

	it('removes it and seeds the rest when the model repeats it', async () => {
		const bad = JSON.stringify({
			overlay: { issues: [{ title: '$result.title', description: 'Invented' }] },
		});
		const { hydrator, seeds, prompts } = setup([bad, bad, bad]);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, real);
		expect(prompts).toHaveLength(3);
		expect(seeds).toEqual([{ world_version: 1, issues: [{ title: 'Real title' }] }]);
	});
});

describe('PlanHydrator with lookups of the call args', () => {
	it('reads the named objects before the first turn, so an empty result still seeds them', async () => {
		const plan = JSON.stringify({
			overlay: { native: { linear: { projects: [{ ref: 'project:p', id: '$reads[0].uuid' }] } } },
		});
		const { hydrator, prompts, seeds, upstreamCalls } = setup(
			[plan],
			() => text('ok'),
			(tool) =>
				tool === 'list_issues' ? [{ tool: 'get_project', args: { query: 'Lighthouse' } }] : [],
		);
		// The project lookup is the only upstream read. Its answer is the shared stub.
		await hydrator.hydrate('list_issues', { project: 'Lighthouse' }, text('{"issues":[]}'));
		expect(upstreamCalls).toEqual([['get_project', { query: 'Lighthouse' }]]);
		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toContain('[0] ');
		expect(seeds).toHaveLength(1);
	});

	it('numbers the reads of the plan after the lookups', async () => {
		const first = JSON.stringify({ reads: [{ tool: 'get_team', args: { query: 'TRUST' } }] });
		const second = JSON.stringify({ overlay: {} });
		const { hydrator, prompts } = setup(
			[first, second],
			() => text('ok'),
			() => [{ tool: 'get_project', args: { query: 'P' } }],
		);
		await hydrator.hydrate('list_issues', { project: 'P' }, text('{"issues":[]}'));
		expect(prompts[1]).toContain('from $reads[1]');
		expect(prompts[1]).toContain('[1] ');
	});
});

describe('withIssueDescriptions', () => {
	const real = { issues: [{ id: 'TRUST-1209', description: 'whole text' }] };
	const overlay = (issue: Record<string, unknown>) => ({
		native: { linear: { issues: [issue] } },
	});

	it('fills the description that the plan left out, for the issue with the same number', () => {
		expect(withIssueDescriptions(overlay({ number: 1209, title: 'T' }), real)).toEqual(
			overlay({ number: 1209, title: 'T', description: 'whole text' }),
		);
	});

	it('keeps a description that the plan has, and leaves other issues alone', () => {
		const kept = overlay({ number: 1209, description: 'plan text' });
		expect(withIssueDescriptions(kept, real)).toEqual(kept);
		const other = overlay({ number: 5 });
		expect(withIssueDescriptions(other, real)).toEqual(other);
	});
});

describe('notionLookups', () => {
	it('fetches the data sources that a query names', () => {
		expect(
			notionLookups('notion-query-data-sources', {
				data: { mode: 'rows', data_source_url: 'collection://a' },
			}),
		).toEqual([{ tool: 'notion-fetch', args: { id: 'collection://a' } }]);
		expect(
			notionLookups('notion-query-data-sources', {
				data: {
					mode: 'sql',
					data_source_urls: ['collection://a', 'collection://b', 'collection://c'],
				},
			}),
		).toHaveLength(2);
	});

	it('looks up nothing for another tool', () => {
		expect(notionLookups('notion-fetch', { id: 'x' })).toEqual([]);
	});
});

describe('linearLookups of the teams in a result', () => {
	it('reads the team and the states of each team that an issue names', () => {
		const result = { issues: [{ team: 'AI Trust' }, { team: 'AI Trust' }, { team: 'Ops' }] };
		const found = linearLookups('list_issues', { project: 'P' }, result);
		expect(found).toContainEqual({ tool: 'list_issue_statuses', args: { team: 'AI Trust' } });
		expect(found).toContainEqual({ tool: 'get_team', args: { query: 'Ops' } });
		expect(found.filter((l) => l.tool === 'list_issue_statuses')).toHaveLength(2);
	});
});

describe('linearLookups', () => {
	it('names a read for each object of the args, and the user of the connection', () => {
		expect(
			linearLookups('list_issues', {
				team: 'LHO',
				project: 'Lighthouse',
				assignee: 'me',
				labels: ['Bug', 'Ops', 'Third'],
			}),
		).toEqual([
			{ tool: 'get_team', args: { query: 'LHO' } },
			{ tool: 'list_issue_statuses', args: { team: 'LHO' } },
			{ tool: 'get_project', args: { query: 'Lighthouse' } },
			{ tool: 'whoami', args: {} },
			{ tool: 'list_issue_labels', args: { name: 'Bug', team: 'LHO' } },
			{ tool: 'list_issue_labels', args: { name: 'Ops', team: 'LHO' } },
		]);
	});

	it('adds the assignee and parent issue, and skips the call itself', () => {
		expect(linearLookups('save_issue', { assignee: 'Ana', parentId: 'TRUST-5' })).toEqual([
			{ tool: 'whoami', args: {} },
			{ tool: 'get_user', args: { query: 'Ana' } },
			{ tool: 'get_issue', args: { id: 'TRUST-5' } },
		]);
		expect(linearLookups('get_project', { project: 'P' })).toEqual([{ tool: 'whoami', args: {} }]);
		expect(linearLookups('whoami', { team: '  ' })).toEqual([]);
	});

	it('reads the people that the real result names, once each', () => {
		const result = {
			issues: [
				{ assignee: { id: 'u1', name: 'Ana' }, creator: 'Ben' },
				{ assignee: { id: 'u1', name: 'Ana' }, comments: [{ user: { name: 'Cy' } }] },
			],
		};
		expect(linearLookups('list_issues', {}, result)).toEqual([
			{ tool: 'whoami', args: {} },
			{ tool: 'get_user', args: { query: 'u1' } },
			{ tool: 'get_user', args: { query: 'Ben' } },
			{ tool: 'get_user', args: { query: 'Cy' } },
		]);
	});
});

describe('withUserEmails', () => {
	it('gives a user without an email a stable one, and keeps a real one', () => {
		const overlay = {
			world_version: 1,
			native: {
				linear: {
					users: [
						{ ref: 'user:a', id: 'u-1234-abcd', name: 'Ana' },
						{ ref: 'user:b', id: 'u2', name: 'Ben', email: 'ben@example.com' },
					],
				},
			},
		};
		const out = withUserEmails(overlay) as typeof overlay;
		expect(out.native.linear.users[0]).toMatchObject({
			email: 'user-u1234abcd@unknown.invalid',
		});
		expect(out.native.linear.users[1]).toMatchObject({ email: 'ben@example.com' });
		expect(withUserEmails(overlay)).toEqual(out);
	});

	it('leaves an overlay without users as it is', () => {
		const overlay = { world_version: 1, native: { linear: { teams: [] } } };
		expect(withUserEmails(overlay)).toBe(overlay);
	});
});

describe('nestDottedKeys', () => {
	it('makes a dotted top-level key two levels, and keeps other keys', () => {
		expect(
			nestDottedKeys({ world_version: 1, 'native.linear': { teams: [] }, native: { notion: {} } }),
		).toEqual({ world_version: 1, native: { notion: {}, linear: { teams: [] } } });
	});

	it('drops keys that are not data keys', () => {
		const overlay = JSON.parse(
			'{"__proto__.flag": 1, "native.constructor.prototype.flag": 1, "__proto__": {"flag": 1}, "native.linear": {"teams": []}}',
		) as Record<string, unknown>;
		expect(nestDottedKeys(overlay)).toEqual({ native: { linear: { teams: [] } } });
		expect(({} as Record<string, unknown>).flag).toBeUndefined();
		expect(Object.getPrototypeOf(nestDottedKeys(overlay))).toBe(Object.prototype);
	});
});

describe('PlanHydrator checks of the seed and the replay', () => {
	it('sends the model what the gym did not take, and what code sent after the pointers', async () => {
		const bad = JSON.stringify({
			overlay: { projects: [{ ref: 'project:p', name: '$result.nope' }] },
		});
		const good = JSON.stringify({ overlay: { projects: [{ ref: 'project:p', name: 'P' }] } });
		const { hydrator, prompts, seeds } = setup([bad, good], undefined, undefined, (n) =>
			n === 1
				? {
						report: {
							applied: ['$'],
							warnings: [{ path: '$.projects', message: 'unknown top-level field' }],
						},
					}
				: {},
		);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, text('{}'));
		expect(prompts).toHaveLength(2);
		expect(prompts[1]).toContain(
			'the gym ignored parts of it: $.projects: unknown top-level field',
		);
		expect(prompts[1]).toContain('What code sent to the gym after it filled the pointers');
		expect(prompts[1]).toContain('"ref":"project:p"');
		expect(prompts[1]).not.toContain('"name":"P"');
		expect(seeds).toHaveLength(2);
	});

	it('records what the gym took, so a repair does not seed it again', async () => {
		const plan = JSON.stringify({
			overlay: {
				native: { linear: { teams: [{ ref: 'team:t' }], extras: [{ ref: 'extra:x' }] } },
			},
		});
		const { hydrator, seeds } = setup([plan, plan], undefined, undefined, (n) =>
			n === 1
				? {
						report: {
							warnings: [{ path: '$.native.linear.extras', message: 'unknown top-level field' }],
						},
					}
				: {},
		);
		await hydrator.hydrate('get_issue', { id: 'TRUST-1209' }, text('{}'));
		expect(seeds).toHaveLength(2);
		const repaired = JSON.stringify(seeds[1]);
		expect(repaired).not.toContain('team:t');
		expect(repaired).toContain('extra:x');
	});

	it('does not ask for the id of a filter in an empty list', async () => {
		const gymAnswer = () => text('{"issues":[],"hasNextPage":false}');
		const { hydrator, prompts } = setup([JSON.stringify({ overlay: {} })], gymAnswer);
		await hydrator.hydrate(
			'list_issues',
			{ project: ID },
			text('{"issues":[],"hasNextPage":false}'),
		);
		expect(prompts).toHaveLength(1);
	});

	it('reads a lookup once for the whole chat', async () => {
		const { hydrator, upstreamCalls } = setup(
			[JSON.stringify({ overlay: {} }), JSON.stringify({ overlay: {} })],
			() => text('ok'),
			() => [{ tool: 'get_team', args: { query: 'LHO' } }],
		);
		await hydrator.hydrate('get_issue', { id: 'A-1' }, text('{}'));
		await hydrator.hydrate('get_issue', { id: 'A-2' }, text('{}'));
		expect(upstreamCalls).toEqual([['get_team', { query: 'LHO' }]]);
	});
});
