import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';

import type {
	N8nClient,
	PromotionInstanceApplyPreview,
	PromotionMissingDependency,
	PromotionPreview,
} from '../client';
import PromotionEnvironmentListApplyChanges from '../commands/promotion-environment/list-apply-changes';
import PromotionEnvironmentListChanges from '../commands/promotion-environment/list-changes';

interface ListChangesFlags {
	format?: string;
	json?: boolean;
	jq?: string;
	quiet?: boolean;
	noHeader?: boolean;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ListChangesInternals {
	parse: () => Promise<{
		args: { projectId: string; direction: string };
		flags: ListChangesFlags;
	}>;
	getClient: () => N8nClient;
	output: (data: unknown, flags: unknown, options?: unknown) => void;
	log: (message: string) => void;
	logToStderr: (message: string) => void;
}

type Resource = PromotionPreview['resources'][number];

const resource = (overrides: Partial<Resource> & Pick<Resource, 'key' | 'type'>): Resource => ({
	id: overrides.key.slice(overrides.key.indexOf(':') + 1),
	name: overrides.key,
	parentKey: 'project:proj-1',
	change: 'unchanged',
	selectable: false,
	revision: { before: 'a', after: 'a' },
	...overrides,
});

const PREVIEW: PromotionPreview = {
	commitSha: 'abc123',
	source: { environmentId: 'env-1', branchName: 'main' },
	environment: { name: 'Production', providerType: 'git' },
	revision: 'e'.repeat(64),
	resources: [
		resource({ key: 'project:proj-1', type: 'project', parentKey: null }),
		resource({ key: 'folder:folder-1', type: 'folder', name: 'Reports' }),
		resource({
			key: 'workflow:wf-1',
			type: 'workflow',
			name: 'Weekly report',
			parentKey: 'folder:folder-1',
			change: 'modified',
			selectable: true,
		}),
		// Unchanged, but listed because it carries the changed credential.
		resource({ key: 'workflow:wf-2', type: 'workflow', selectable: true }),
		resource({
			key: 'credential:cred-1',
			type: 'credential',
			name: 'Billing API',
			parentKey: null,
			change: 'modified',
		}),
	],
	dependencies: [
		{ workflowKey: 'workflow:wf-2', resourceKey: 'credential:cred-1', included: true },
		{ workflowKey: 'workflow:wf-1', resourceKey: 'workflow:wf-2', included: false },
	],
};

const COLUMNS = ['type', 'id', 'name', 'change', 'folder', 'usedBy', 'selectable'];

const ROWS = [
	{
		type: 'workflow',
		id: 'wf-1',
		name: 'Weekly report',
		project: 'project:proj-1',
		change: 'modified',
		folder: 'Reports',
		usedBy: undefined,
		selectable: true,
	},
	{
		type: 'credential',
		id: 'cred-1',
		name: 'Billing API',
		project: undefined,
		change: 'modified',
		folder: undefined,
		usedBy: 'wf-2',
		selectable: false,
	},
];

/** What the table of `PREVIEW` printed before the command listed missing dependencies. */
const TABLE = [
	'TYPE        ID      NAME           CHANGE    FOLDER   USEDBY  SELECTABLE',
	'----------  ------  -------------  --------  -------  ------  ----------',
	'workflow    wf-1    Weekly report  modified  Reports  -       true      ',
	'credential  cred-1  Billing API    modified  -        wf-2    false     ',
].join('\n');

const consumers = [
	{
		project: { id: 'proj-finance', name: 'Finance' },
		workflows: [{ id: 'wf-1', name: 'Weekly report' }],
	},
];

const OTHER_PROJECT: PromotionMissingDependency = {
	kind: 'credential',
	id: 'cred-9',
	name: 'CRM',
	credentialType: 'hubspotApi',
	group: 'other-project',
	reason: 'not-on-branch',
	accessible: true,
	blocking: false,
	consumers,
};

const NEEDS_ACTION: PromotionMissingDependency = {
	...OTHER_PROJECT,
	group: 'needs-action',
	reason: 'not-on-instance',
	blocking: true,
};

const PROMOTE_LISTS = [
	'',
	'In another project (1)',
	'These dependencies are in other projects that you can access. This Promote does not include them.',
	'  Credential "CRM" (hubspotApi): used by Weekly report',
	'',
	'Warnings (1)',
	'These references point to something that does not exist on the source instance.',
	'  Variable "API_URL": used by Weekly report',
].join('\n');

const APPLY_LISTS = [
	'',
	'Needs your action (1)',
	'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
	'  Credential "CRM" (hubspotApi): not on this instance; stops the Apply; used by Weekly report',
].join('\n');

const PROMOTE_PREVIEW_WITH_LISTS: PromotionPreview = {
	...PREVIEW,
	missingDependencies: [OTHER_PROJECT],
	warnings: [
		{ kind: 'variable', code: 'missing-on-source', name: 'API_URL', blocking: false, consumers },
	],
};

const applyPreview = (missingDependencies: PromotionMissingDependency[]) =>
	({ ...PREVIEW, check: { missingDependencies } }) as unknown as PromotionPreview;

/** Runs the command with the real rendering, and catches what goes to stdout and to stderr. */
async function runListChanges(
	flags: ListChangesFlags,
	preview: PromotionPreview,
	direction: 'promote' | 'apply' = 'promote',
) {
	const command = new PromotionEnvironmentListChanges([], {} as Config);
	const internals = command as unknown as ListChangesInternals;

	vi.spyOn(internals, 'parse').mockResolvedValue({
		args: { projectId: 'proj-1', direction },
		flags,
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listProjectPromotionChanges: vi.fn().mockResolvedValue(preview),
	} as unknown as N8nClient);
	const log = vi.spyOn(internals, 'log').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});

	await command.run();

	return {
		stdout: log.mock.calls.map(([line]) => line),
		stderr: logToStderr.mock.calls,
		order: callOrder(log, logToStderr),
	};
}

/** When each stream got its first line, in the order of all mock calls. */
function callOrder(log: Mock, logToStderr: Mock) {
	return {
		stdout: log.mock.invocationCallOrder[0],
		stderr: logToStderr.mock.invocationCallOrder[0],
	};
}

function stubCommand(flags: ListChangesFlags, preview: PromotionPreview = PREVIEW) {
	const command = new PromotionEnvironmentListChanges([], {} as Config);
	const internals = command as unknown as ListChangesInternals;
	const listProjectPromotionChanges = vi.fn().mockResolvedValue(preview);

	// Bypass oclif arg parsing, connection setup, and rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({
		args: { projectId: 'proj-1', direction: 'promote' },
		flags,
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({
		listProjectPromotionChanges,
	} as unknown as N8nClient);
	const output = vi.spyOn(internals, 'output').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});

	return { command, output, logToStderr, listProjectPromotionChanges };
}

describe('promotion-environment list-changes command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('lists the changed resources with their folder and the workflows that carry them', async () => {
		const { command, output, listProjectPromotionChanges } = stubCommand({ format: 'table' });

		await command.run();

		expect(listProjectPromotionChanges).toHaveBeenCalledWith('proj-1', 'promote');
		expect(output).toHaveBeenCalledWith(ROWS, expect.anything(), { columns: COLUMNS });
	});

	it('keeps the whole preview for JSON output', async () => {
		const { command, output } = stubCommand({ json: true });

		await command.run();

		// JSON consumers need the commit, the dependencies and the Apply revision too.
		expect(output).toHaveBeenCalledWith(PREVIEW, expect.anything());
	});

	it('names the open review that holds the changes', async () => {
		const { command, logToStderr } = stubCommand(
			{ format: 'table' },
			{
				...PREVIEW,
				resources: [],
				dependencies: [],
				blocker: { code: 'reviewOpen', reviewId: 'review-1' },
			},
		);

		await command.run();

		expect(logToStderr).toHaveBeenCalledWith(expect.stringContaining('review-1'));
	});

	it.each([
		{ title: 'the preview has no lists', preview: PREVIEW },
		{
			title: 'the lists are empty',
			preview: { ...PREVIEW, missingDependencies: [], warnings: [] },
		},
	])('prints only the table of a Promote when $title', async ({ preview }) => {
		const { stdout, stderr } = await runListChanges({ format: 'table' }, preview);

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([]);
	});

	it('prints the groups and the warnings of a Promote on stderr, after the same table', async () => {
		const { stdout, stderr, order } = await runListChanges(
			{ format: 'table' },
			PROMOTE_PREVIEW_WITH_LISTS,
		);

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([[PROMOTE_LISTS]]);
		expect(order.stdout).toBeLessThan(order.stderr);
	});

	it('prints only the table of an Apply when its check lists nothing', async () => {
		const { stdout, stderr } = await runListChanges({ format: 'table' }, applyPreview([]), 'apply');

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([]);
	});

	it.each([
		{ title: 'the preview has no check', preview: PREVIEW },
		{
			title: 'the check has no list',
			preview: { ...PREVIEW, check: {} } as unknown as PromotionPreview,
		},
	])('prints only the table of an Apply from an older server when $title', async ({ preview }) => {
		const { stdout, stderr } = await runListChanges({ format: 'table' }, preview, 'apply');

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([]);
	});

	it('prints the groups of an Apply from its check on stderr, after the same table', async () => {
		const { stdout, stderr, order } = await runListChanges(
			{ format: 'table' },
			applyPreview([NEEDS_ACTION]),
			'apply',
		);

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([[APPLY_LISTS]]);
		expect(order.stdout).toBeLessThan(order.stderr);
	});

	it('names the workflow and the condition of an Apply entry that depends on the selection', async () => {
		const { stdout, stderr } = await runListChanges(
			{ format: 'table' },
			applyPreview([
				{
					kind: 'workflow',
					id: 'wf-9',
					name: 'Send alert',
					group: 'needs-action',
					reason: 'not-on-instance',
					accessible: true,
					blocking: false,
					condition: 'target-not-selected',
					consumers,
				},
			]),
			'apply',
		);

		expect(stdout).toEqual([TABLE]);
		expect(stderr).toEqual([
			[
				[
					'',
					'Needs your action (1)',
					'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
					'  Workflow "Send alert" (id wf-9): not on this instance; used by Weekly report; only when the Apply does not include wf-9',
				].join('\n'),
			],
		]);
	});

	it('does not name the project of a consumer', async () => {
		const { stderr } = await runListChanges({ format: 'table' }, PROMOTE_PREVIEW_WITH_LISTS);

		expect(stderr.join('\n')).not.toContain('Finance');
		expect(stderr.join('\n')).not.toContain('proj-finance');
	});

	it('keeps the lists out of the IDs and out of a table without header', async () => {
		const ids = await runListChanges({ format: 'id-only' }, PROMOTE_PREVIEW_WITH_LISTS);
		const rows = await runListChanges(
			{ format: 'table', noHeader: true },
			PROMOTE_PREVIEW_WITH_LISTS,
		);

		expect(ids.stdout).toEqual(['wf-1\ncred-1']);
		expect(ids.stderr).toEqual([[PROMOTE_LISTS]]);
		expect(rows.stdout).toEqual([TABLE.split('\n').slice(2).join('\n')]);
		expect(rows.stderr).toEqual([[PROMOTE_LISTS]]);
	});

	it.each([{ json: true }, { jq: '.revision' }])(
		'prints only the API response with %o',
		async (flags) => {
			const { stdout, stderr } = await runListChanges(flags, PROMOTE_PREVIEW_WITH_LISTS);

			expect(stdout).toEqual([
				JSON.stringify(flags.jq ? PREVIEW.revision : PROMOTE_PREVIEW_WITH_LISTS, null, 2),
			]);
			expect(stderr).toEqual([]);
		},
	);

	it('prints nothing when quiet', async () => {
		const { stdout, stderr } = await runListChanges(
			{ format: 'table', quiet: true },
			PROMOTE_PREVIEW_WITH_LISTS,
		);

		expect(stdout).toEqual([]);
		expect(stderr).toEqual([]);
	});
});

describe('promotion-environment list-apply-changes command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('lists a deleted project with everything in it, and names the project of each row', async () => {
		const preview = {
			commitSha: 'abc123',
			source: { environmentId: 'env-1', branchName: 'main' },
			resources: [
				resource({
					key: 'project:proj-2',
					type: 'project',
					name: 'Marketing',
					parentKey: null,
					change: 'deleted',
				}),
				resource({
					key: 'folder:folder-2',
					type: 'folder',
					name: 'Campaigns',
					parentKey: 'project:proj-2',
					change: 'deleted',
				}),
				resource({
					key: 'workflow:wf-3',
					type: 'workflow',
					name: 'Newsletter',
					parentKey: 'project:proj-2',
					change: 'deleted',
				}),
				resource({
					key: 'workflow:wf-4',
					type: 'workflow',
					name: 'Launch',
					parentKey: 'folder:folder-2',
					change: 'deleted',
				}),
			],
			dependencies: [],
			check: {},
			revision: 'b'.repeat(64),
		} as unknown as PromotionInstanceApplyPreview;
		const command = new PromotionEnvironmentListApplyChanges([], {} as Config);
		const internals = command as unknown as ListChangesInternals;
		const listInstanceApplyChanges = vi.fn().mockResolvedValue(preview);
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { id: 'env-1' },
			flags: { format: 'table' },
		} as unknown as Awaited<ReturnType<ListChangesInternals['parse']>>);
		vi.spyOn(internals, 'getClient').mockReturnValue({
			listInstanceApplyChanges,
		} as unknown as N8nClient);
		const output = vi.spyOn(internals, 'output').mockImplementation(() => {});

		await command.run();

		const row = (type: string, id: string, name: string, project?: string, folder?: string) => ({
			type,
			id,
			name,
			project,
			change: 'deleted',
			folder,
			usedBy: undefined,
			selectable: false,
		});
		expect(listInstanceApplyChanges).toHaveBeenCalledWith('env-1');
		expect(output).toHaveBeenCalledWith(
			[
				row('project', 'proj-2', 'Marketing'),
				row('folder', 'folder-2', 'Campaigns', 'Marketing'),
				row('workflow', 'wf-3', 'Newsletter', 'Marketing'),
				row('workflow', 'wf-4', 'Launch', 'Marketing', 'Campaigns'),
			],
			expect.anything(),
			{ columns: ['type', 'id', 'name', 'project', 'change', 'folder', 'usedBy'] },
		);
	});

	async function runListApplyChanges(
		check: { missingDependencies?: PromotionMissingDependency[] },
		flags: ListChangesFlags = { format: 'table' },
	) {
		const command = new PromotionEnvironmentListApplyChanges([], {} as Config);
		const internals = command as unknown as ListChangesInternals;
		const preview = { ...PREVIEW, check };
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { id: 'env-1' },
			flags,
		} as unknown as Awaited<ReturnType<ListChangesInternals['parse']>>);
		vi.spyOn(internals, 'getClient').mockReturnValue({
			listInstanceApplyChanges: vi.fn().mockResolvedValue(preview),
		} as unknown as N8nClient);
		const log = vi.spyOn(internals, 'log').mockImplementation(() => {});
		const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});

		await command.run();

		return {
			preview,
			stdout: log.mock.calls.map(([line]) => line),
			stderr: logToStderr.mock.calls,
			order: callOrder(log, logToStderr),
		};
	}

	/** What the table of `PREVIEW` printed before the command listed missing dependencies. */
	const INSTANCE_TABLE = [
		'TYPE        ID      NAME           PROJECT         CHANGE    FOLDER   USEDBY',
		'----------  ------  -------------  --------------  --------  -------  ------',
		'workflow    wf-1    Weekly report  project:proj-1  modified  Reports  -     ',
		'credential  cred-1  Billing API    -               modified  -        wf-2  ',
	].join('\n');

	it.each([
		{ title: 'the check lists nothing', check: { missingDependencies: [] } },
		// A server that does not know the list.
		{ title: 'the check has no list', check: {} },
	])('prints only the table when $title', async ({ check }) => {
		const { stdout, stderr } = await runListApplyChanges(check);

		expect(stdout).toEqual([INSTANCE_TABLE]);
		expect(stderr).toEqual([]);
	});

	it('prints the groups of the check on stderr, after the same table', async () => {
		const { stdout, stderr, order } = await runListApplyChanges({
			missingDependencies: [
				NEEDS_ACTION,
				{ ...NEEDS_ACTION, name: 'Shared CRM', group: 'outside-access', accessible: false },
			],
		});

		expect(order.stdout).toBeLessThan(order.stderr);
		expect(stdout).toEqual([INSTANCE_TABLE]);
		expect(stderr).toEqual([
			[
				[
					APPLY_LISTS,
					'',
					'Outside your access (1)',
					'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
					'  Credential "Shared CRM" (hubspotApi): not on this instance; stops the Apply; used by Weekly report',
				].join('\n'),
			],
		]);
	});

	it('keeps the lists out of the IDs', async () => {
		const { stdout, stderr } = await runListApplyChanges(
			{ missingDependencies: [NEEDS_ACTION] },
			{ format: 'id-only' },
		);

		expect(stdout).toEqual(['wf-1\ncred-1']);
		expect(stderr).toEqual([[APPLY_LISTS]]);
	});

	it('prints only the API response as JSON', async () => {
		const { preview, stdout, stderr } = await runListApplyChanges(
			{ missingDependencies: [NEEDS_ACTION] },
			{ json: true },
		);

		expect(stdout).toEqual([JSON.stringify(preview, null, 2)]);
		expect(stderr).toEqual([]);
	});

	it('prints nothing when quiet', async () => {
		const { stdout, stderr } = await runListApplyChanges(
			{ missingDependencies: [NEEDS_ACTION] },
			{ format: 'table', quiet: true },
		);

		expect(stdout).toEqual([]);
		expect(stderr).toEqual([]);
	});
});
