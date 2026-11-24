import { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';

import { N8nClient } from '../client';
import PromotionEnvironmentApply from '../commands/promotion-environment/apply';
import PromotionEnvironmentApplyContinue from '../commands/promotion-environment/apply-continue';
import PromotionEnvironmentApplySelection from '../commands/promotion-environment/apply-selection';
import PromotionEnvironmentApplySelectionContinue from '../commands/promotion-environment/apply-selection-continue';
import PromotionEnvironmentPromote from '../commands/promotion-environment/promote';
import PromotionEnvironmentPromoteSelection from '../commands/promotion-environment/promote-selection';

type CommandClass = new (argv: string[], config: Config) => { run: () => Promise<void> };

/** An instance command takes the environment. A project command takes the project. */
type CommandArgs = { id?: string; projectId?: string };

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface Internals {
	parse: () => Promise<{ args: CommandArgs; flags: Record<string, unknown> }>;
	getClient: () => N8nClient;
	log: (message: string) => void;
	logToStderr: (message: string) => void;
	exit: (code: number) => never;
}

const SHA = 'd'.repeat(40);
const REVISION = 'e'.repeat(64);
const consumers = [
	{
		project: { id: 'proj-finance', name: 'Finance' },
		workflows: [{ id: 'wf-1', name: 'Weekly report' }],
	},
];

const OTHER_PROJECT = {
	kind: 'credential',
	id: 'cred-9',
	name: 'Billing API',
	credentialType: 'httpHeaderAuth',
	group: 'other-project',
	reason: 'not-on-branch',
	accessible: true,
	blocking: false,
	consumers,
};
const OUTSIDE_ACCESS_WORKFLOW = {
	kind: 'workflow',
	id: 'wf-9',
	name: 'Send alert',
	group: 'outside-access',
	reason: 'not-on-branch',
	accessible: false,
	blocking: false,
	consumers,
};
const MISSING_ON_SOURCE = {
	kind: 'variable',
	code: 'missing-on-source',
	name: 'API_URL',
	consumers,
};

const PROMOTE_LISTS = [
	'In another project (1)',
	'These dependencies are in other projects that you can access. This Promote does not include them.',
	'  Credential "Billing API" (httpHeaderAuth): used by Weekly report',
	'',
	'Outside your access (1)',
	'You do not have access to these dependencies.',
	'  Workflow "Send alert": used by Weekly report',
];
/** After the Promote, the list has no group description. */
const PROMOTED_LISTS = [
	'In another project (1)',
	'  Credential "Billing API" (httpHeaderAuth): used by Weekly report',
	'',
	'Outside your access (1)',
	'  Workflow "Send alert": used by Weekly report',
];
const WARNINGS = [
	'Warnings (1)',
	'These references point to something that does not exist on the source instance.',
	'  Variable "API_URL": used by Weekly report',
];

const PROMOTED = {
	status: 'promoted',
	environmentId: 'env-1',
	counts: { workflows: 3, folders: 1, credentials: 0, dataTables: 0, variables: 2, tags: 1 },
	git: { commitSha: 'abc1234', branchName: 'main' },
	missingDependencies: [],
};
const PROMOTED_WITHOUT_DEPENDENCIES = {
	...PROMOTED,
	missingDependencies: [OTHER_PROJECT, OUTSIDE_ACCESS_WORKFLOW],
};
const PROMOTE_PREVIEW_CHANGED = { status: 'preview-changed', environmentId: 'env-1' };
const PROMOTE_REFUSED = {
	status: 'missing-dependencies',
	environmentId: 'env-1',
	missingDependencies: [OTHER_PROJECT, OUTSIDE_ACCESS_WORKFLOW],
	warnings: [MISSING_ON_SOURCE],
};

const IDENTITY = { environmentId: 'env-1', git: { commitSha: SHA, branchName: 'release' } };
/** On Apply, the caller can resolve this entry, so it stops the Apply. */
const NEEDS_ACTION = {
	...OTHER_PROJECT,
	group: 'needs-action',
	reason: 'not-on-instance',
	blocking: true,
};
/** On Apply, the caller cannot resolve this entry, so it only needs a confirmation. */
const OUTSIDE_ACCESS = {
	...OTHER_PROJECT,
	id: 'c-9',
	name: 'Shared CRM',
	credentialType: 'hubspotApi',
	group: 'outside-access',
	reason: 'not-on-instance',
	accessible: false,
};
const OUTSIDE_ACCESS_ON_APPLY =
	'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.';
const APPLY_LISTS = [
	'Outside your access (1)',
	OUTSIDE_ACCESS_ON_APPLY,
	'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
];
/** After the Apply, the list has no group description. */
const APPLIED_LISTS = [
	'Outside your access (1)',
	'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
];
const APPLY_COUNTS = (conflicts: number) => [
	'  Missing projects:    0',
	'  Missing credentials: 0',
	'  Missing variables:   0',
	'  Access requirements: 0',
	`  Conflicts:           ${conflicts}`,
	'  Outside your access: 0',
];
const DATA_TABLE_CHANGE = { kind: 'data-table', code: 'destructive-change' };
const EMPTY_CHECK = {
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
};
const APPLIED = {
	...IDENTITY,
	status: 'applied',
	counts: {},
	warnings: [],
	missingDependencies: [],
};
const APPLIED_WITHOUT_DEPENDENCIES = { ...APPLIED, missingDependencies: [OUTSIDE_ACCESS] };
const NEEDS_CONFIRMATION = {
	...IDENTITY,
	status: 'blocked',
	check: { ...EMPTY_CHECK, missingDependencies: [OUTSIDE_ACCESS] },
};
const BLOCKED = {
	...IDENTITY,
	status: 'blocked',
	check: { ...EMPTY_CHECK, missingDependencies: [NEEDS_ACTION, OUTSIDE_ACCESS] },
};
const SOURCE_CHANGED = { ...IDENTITY, status: 'source-changed' };
const APPLY_PREVIEW_CHANGED = { ...IDENTITY, status: 'preview-changed' };

const EXPECTED_SOURCE_FLAGS = {
	expectedEnvironmentId: 'env-1',
	expectedBranch: 'release',
	expectedCommitSha: SHA,
};
const EXPECTED_SOURCE_ARGS = `--expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}`;

/** Runs the command with the real reporting, and catches the two streams and the exit code. */
async function report(
	commandClass: CommandClass,
	method: string,
	result: unknown,
	args: CommandArgs,
	flags: Record<string, unknown>,
) {
	const command = new commandClass([], {} as Config);
	const internals = command as unknown as Internals;
	const call = vi.fn().mockResolvedValue(result);

	// Bypass oclif arg parsing and connection setup. Keep the real reporting.
	vi.spyOn(internals, 'parse').mockResolvedValue({ args, flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({ [method]: call } as unknown as N8nClient);
	const log = vi.spyOn(internals, 'log').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
	const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

	await command.run();

	return {
		call,
		stdout: log.mock.calls.map(([line]) => line),
		stderr: logToStderr.mock.calls.map(([line]) => line),
		exit,
	};
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('--confirm-missing-dependencies', () => {
	let config: Config;

	beforeAll(async () => {
		config = await Config.load(process.cwd());
	});

	/** Parses real arguments and sends the request through the real client. Returns the request. */
	async function send(commandClass: CommandClass, argv: string[], result: unknown) {
		const command = new commandClass([...argv, '--format=table'], config);
		const internals = command as unknown as Internals;
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(result), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(internals, 'getClient').mockReturnValue(
			new N8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'test-key' }),
		);
		vi.spyOn(internals, 'log').mockImplementation(() => {});
		vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

		await command.run();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		return { url, body: JSON.parse(init.body as string) as Record<string, unknown> };
	}

	const expectedSourceArgv = EXPECTED_SOURCE_ARGS.split(' ');
	const COMMANDS = [
		{
			name: 'promote',
			commandClass: PromotionEnvironmentPromote,
			argv: ['env-1'],
			result: PROMOTED,
			route: 'environments/env-1/promote',
		},
		{
			name: 'promote-selection',
			commandClass: PromotionEnvironmentPromoteSelection,
			argv: ['proj-1', '-w', 'wf-1'],
			result: PROMOTED,
			route: 'projects/proj-1/promote',
		},
		{
			name: 'apply-continue',
			commandClass: PromotionEnvironmentApplyContinue,
			argv: ['env-1', ...expectedSourceArgv],
			result: APPLIED,
			route: 'environments/env-1/apply/continue',
		},
		{
			name: 'apply-selection-continue',
			commandClass: PromotionEnvironmentApplySelectionContinue,
			argv: ['proj-1', '-w', 'wf-1', ...expectedSourceArgv],
			result: APPLIED,
			route: 'projects/proj-1/apply/continue',
		},
	];

	it.each(COMMANDS)(
		'sends the confirmation of $name',
		async ({ commandClass, argv, result, route }) => {
			const { url, body } = await send(
				commandClass,
				[...argv, '--confirm-missing-dependencies'],
				result,
			);

			expect(url).toBe(`https://n8n.example.com/api/v1/promotions/${route}`);
			expect(body.confirmMissingDependencies).toBe(true);
		},
	);

	it.each(COMMANDS)(
		'leaves the confirmation out of the request of $name without the flag',
		async ({ commandClass, argv, result }) => {
			const { body } = await send(commandClass, argv, result);

			expect(body).not.toHaveProperty('confirmMissingDependencies');
		},
	);

	it('sends the reviewed revision of an instance Promote with the confirmation', async () => {
		const { body } = await send(
			PromotionEnvironmentPromote,
			['env-1', `--expected-preview-revision=${REVISION}`, '--confirm-missing-dependencies'],
			PROMOTED,
		);

		expect(body).toEqual({
			force: false,
			expectedPreviewRevision: REVISION,
			confirmMissingDependencies: true,
		});
	});
});

describe.each([
	{
		name: 'promote',
		commandClass: PromotionEnvironmentPromote,
		method: 'promotePackage',
		args: { id: 'env-1' },
		flags: { message: 'Promote team projects', force: true },
		promoted: 'Promoted to main as commit abc1234.',
		previewChanged: [
			'The Promote check changed since you reviewed it. Nothing was pushed.',
			'Run promote-check again. Review the lists. Then promote with the new revision.',
		],
		command: 'n8n-cli promotion-environment promote env-1',
		commandWithFlags:
			"n8n-cli promotion-environment promote env-1 --force -m 'Promote team projects'",
	},
	{
		name: 'promote-selection',
		commandClass: PromotionEnvironmentPromoteSelection,
		method: 'promoteProjectSelection',
		args: { projectId: 'proj-1' },
		flags: { workflow: ['wf-1', 'wf-2'], folder: ['f-1'], message: 'Promote checkout flow' },
		promoted: 'Promoted selection to main as commit abc1234.',
		previewChanged: [
			'The Promote preview changed since you reviewed it. Nothing was pushed.',
			'Run list-changes again. Review the changes. Then promote with the new revision.',
		],
		command: 'n8n-cli promotion-environment promote-selection proj-1',
		commandWithFlags:
			"n8n-cli promotion-environment promote-selection proj-1 -w wf-1 -w wf-2 --folder f-1 -m 'Promote checkout flow'",
	},
])(
	'promotion-environment $name result reporting',
	({ commandClass, method, args, flags, promoted, previewChanged, command, commandWithFlags }) => {
		const run = async (result: unknown, extraFlags: Record<string, unknown> = {}) =>
			await report(commandClass, method, result, args, {
				format: 'table',
				...flags,
				...extraFlags,
			});

		it('prints only the success line and exits 0 when nothing is missing', async () => {
			const { stdout, stderr, exit } = await run(PROMOTED);

			expect(stdout).toEqual([promoted]);
			expect(stderr).toEqual([]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('reports a result without a status and without a list as promoted', async () => {
			// A server that does not know the missing dependencies.
			const { status, missingDependencies, ...result } = PROMOTED;
			const { stdout, stderr, exit } = await run(result);

			expect(stdout).toEqual([promoted]);
			expect(stderr).toEqual([]);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('pushes nothing, lists the missing dependencies with the command that confirms them, and exits 4', async () => {
			const { stdout, stderr, exit } = await run(PROMOTE_REFUSED, {
				expectedPreviewRevision: REVISION,
			});

			expect(stdout).toEqual([]);
			expect(stderr).toEqual([
				[
					'Promote needs a confirmation. Nothing was pushed.',
					'',
					...PROMOTE_LISTS,
					'',
					...WARNINGS,
					'',
					'To promote without the missing dependencies, run:',
					`  ${commandWithFlags} --expected-preview-revision=${REVISION} --confirm-missing-dependencies`,
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('adds only the confirmation to a command that has no optional flag', async () => {
			const { stderr } = await report(commandClass, method, PROMOTE_REFUSED, args, {
				format: 'table',
			});

			expect(stderr[0].split('\n').at(-1)).toBe(`  ${command} --confirm-missing-dependencies`);
		});

		it('does not name the project of a consumer', async () => {
			const { stderr } = await run(PROMOTE_REFUSED);

			expect(stderr.join('\n')).not.toContain('Finance');
			expect(stderr.join('\n')).not.toContain('proj-finance');
		});

		it('lists on stderr the dependencies that a confirmed Promote left out, and exits 0', async () => {
			const { stdout, stderr, exit } = await run(PROMOTED_WITHOUT_DEPENDENCIES, {
				confirmMissingDependencies: true,
			});

			expect(stderr).toEqual([
				['The branch does not hold these dependencies:', '', ...PROMOTED_LISTS, ''].join('\n'),
			]);
			expect(stdout).toEqual([promoted]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('pushes nothing and exits 3 when the preview changed', async () => {
			const { stdout, stderr, exit } = await run(PROMOTE_PREVIEW_CHANGED, {
				expectedPreviewRevision: REVISION,
			});

			expect(stdout).toEqual([]);
			expect(stderr).toEqual([previewChanged.join('\n')]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(3);
		});

		it.each([
			{ result: PROMOTED, code: 0 },
			{ result: PROMOTED_WITHOUT_DEPENDENCIES, code: 0 },
			{ result: PROMOTE_PREVIEW_CHANGED, code: 3 },
			{ result: PROMOTE_REFUSED, code: 4 },
		])(
			'prints only the API response as JSON and exits $code for the status $result.status',
			async ({ result, code }) => {
				const { stdout, stderr, exit } = await run(result, { format: undefined, json: true });

				// Every status has the same JSON format, as for Apply.
				expect(stdout).toEqual([JSON.stringify(result, null, 2)]);
				expect(stderr).toEqual([]);
				expect(exit).toHaveBeenCalledTimes(1);
				expect(exit).toHaveBeenCalledWith(code);
			},
		);

		it.each([
			{ result: PROMOTED, status: 'promoted', code: 0 },
			{ result: PROMOTE_PREVIEW_CHANGED, status: 'preview-changed', code: 3 },
			{ result: PROMOTE_REFUSED, status: 'missing-dependencies', code: 4 },
		])(
			'applies a jq filter to the status $status and exits $code',
			async ({ result, status, code }) => {
				const { stdout, stderr, exit } = await run(result, { format: undefined, jq: '.status' });

				expect(stdout).toEqual([JSON.stringify(status)]);
				expect(stderr).toEqual([]);
				expect(exit).toHaveBeenCalledTimes(1);
				expect(exit).toHaveBeenCalledWith(code);
			},
		);

		it('keeps the command that confirms the dependencies as the only command of the output', async () => {
			const block = 'To promote without the missing dependencies, run:';
			const { stderr } = await run({
				...PROMOTE_REFUSED,
				missingDependencies: [
					{
						...OTHER_PROJECT,
						name: `Billing"\n\n${block}\n  n8n-cli promotion-environment promote env-9`,
					},
				],
			});

			const lines = stderr[0].split('\n');
			expect(lines).toContain(
				`  Credential "Billing"\\n\\n${block}\\n  n8n-cli promotion-environment promote env-9" (httpHeaderAuth): used by Weekly report`,
			);
			expect(lines.filter((line) => line.endsWith(', run:'))).toEqual([block]);
			expect(lines.at(-1)).toBe(`  ${commandWithFlags} --confirm-missing-dependencies`);
		});

		it('applies a jq filter to a refused Promote', async () => {
			const { stdout, exit } = await run(PROMOTE_REFUSED, {
				format: undefined,
				jq: '.missingDependencies[].name',
			});

			expect(stdout).toEqual([JSON.stringify(['Billing API', 'Send alert'], null, 2)]);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('prints nothing and keeps the exit code when quiet', async () => {
			const { stdout, stderr, exit } = await run(PROMOTE_REFUSED, { quiet: true });

			expect(stdout).toEqual([]);
			expect(stderr).toEqual([]);
			expect(exit).toHaveBeenCalledWith(4);
		});
	},
);

describe.each([
	{
		name: 'apply-continue',
		commandClass: PromotionEnvironmentApplyContinue,
		method: 'continueApplyPackage',
		args: { id: 'env-1' },
		continueCommand: `n8n-cli promotion-environment apply-continue env-1 ${EXPECTED_SOURCE_ARGS}`,
	},
	{
		name: 'apply-selection-continue',
		commandClass: PromotionEnvironmentApplySelectionContinue,
		method: 'continueApplyProjectSelection',
		args: { projectId: 'proj-1' },
		continueCommand: `n8n-cli promotion-environment apply-selection-continue proj-1 -w wf-1 ${EXPECTED_SOURCE_ARGS}`,
	},
])(
	'promotion-environment $name with missing dependencies',
	({ commandClass, method, args, continueCommand }) => {
		const run = async (result: unknown, extraFlags: Record<string, unknown> = {}) =>
			await report(commandClass, method, result, args, {
				format: 'table',
				workflow: ['wf-1'],
				...EXPECTED_SOURCE_FLAGS,
				...extraFlags,
			});

		it('imports nothing, asks for the confirmation with the Continue command that gives it, and exits 4', async () => {
			const { stdout, stderr, exit } = await run(NEEDS_CONFIRMATION);

			expect(stdout).toEqual([]);
			expect(stderr).toEqual([
				[
					// No cause must be resolved, so the message has no count.
					'Apply needs a confirmation. Nothing was imported.',
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. To apply without these dependencies, run:',
					`  ${continueCommand} --confirm-missing-dependencies`,
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('asks only for the confirmation when the branch holds a project that this instance lacks', async () => {
			const { stderr, exit } = await run({
				...NEEDS_CONFIRMATION,
				check: {
					...NEEDS_CONFIRMATION.check,
					// The Apply creates the project, so the project does not stop it.
					missingProjects: [{ id: 'p-1', name: 'Sales' }],
				},
			});

			expect(stderr).toEqual([
				[
					'Apply needs a confirmation. Nothing was imported.',
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. To apply without these dependencies, run:',
					`  ${continueCommand} --confirm-missing-dependencies`,
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('asks only for the confirmation of the dependencies after the user confirmed a destructive change', async () => {
			const { stderr, exit } = await run(
				{
					...NEEDS_CONFIRMATION,
					check: { ...NEEDS_CONFIRMATION.check, conflicts: [DATA_TABLE_CHANGE] },
				},
				{ confirmDestructiveChanges: true },
			);

			expect(stderr).toEqual([
				[
					'Apply needs a confirmation. Nothing was imported.',
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. To apply without these dependencies, run:',
					// The command keeps the confirmation that the user passed.
					`  ${continueCommand} --confirm-destructive-changes --confirm-missing-dependencies`,
					'With --confirm-destructive-changes, this command applies data table changes that remove or retype columns. The values in those columns are removed.',
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('stays blocked on a destructive change that the user did not confirm, and names the two confirmations', async () => {
			const { stderr, exit } = await run({
				...NEEDS_CONFIRMATION,
				check: { ...NEEDS_CONFIRMATION.check, conflicts: [DATA_TABLE_CHANGE] },
			});

			expect(stderr).toEqual([
				[
					'Apply is blocked. Nothing was imported.',
					...APPLY_COUNTS(1),
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. To apply without these dependencies, run:',
					`  ${continueCommand} --confirm-missing-dependencies`,
					'This command stays blocked until you also add --confirm-destructive-changes.',
					'To also apply data table changes that remove or retype columns, add --confirm-destructive-changes. The values in those columns are removed.',
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('stays blocked on a conflict that no flag confirms, also with the two confirmations', async () => {
			const { stderr } = await run(
				{
					...NEEDS_CONFIRMATION,
					check: {
						...NEEDS_CONFIRMATION.check,
						conflicts: [DATA_TABLE_CHANGE, { kind: 'variable', code: 'missing-definition' }],
					},
				},
				{ confirmDestructiveChanges: true, confirmMissingDependencies: true },
			);

			expect(stderr).toEqual([
				[
					'Apply is blocked. Nothing was imported.',
					...APPLY_COUNTS(2),
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. After you resolve them, run:',
					`  ${continueCommand}`,
					'The dependencies that do not stop the Apply need a confirmation. To apply without them, add --confirm-missing-dependencies after you resolve the others.',
					'To also apply data table changes that remove or retype columns, add --confirm-destructive-changes. The values in those columns are removed.',
				].join('\n'),
			]);
		});

		it.each([
			{ title: 'a missing binding', check: { missingBindings: [{ kind: 'credential' }] } },
			{ title: 'an access requirement', check: { accessRequirements: [{ kind: 'project' }] } },
		])('stays blocked on $title, with a confirmable dependency', async ({ check }) => {
			const { stderr } = await run({
				...NEEDS_CONFIRMATION,
				check: { ...NEEDS_CONFIRMATION.check, ...check },
			});

			expect(stderr[0]).toContain('Apply is blocked. Nothing was imported.');
			expect(stderr[0]).toContain(`After you resolve them, run:\n  ${continueCommand}\n`);
		});

		it('keeps the reviewed revision in the Continue command that only adds the confirmation', async () => {
			const { stderr } = await run(NEEDS_CONFIRMATION, { expectedPreviewRevision: REVISION });

			expect(stderr[0].split('\n').at(-1)).toBe(
				`  ${continueCommand} --expected-preview-revision=${REVISION} --confirm-missing-dependencies`,
			);
		});

		it('leaves the reviewed revision out of the Continue command when a cause must be resolved', async () => {
			const { stderr } = await run(BLOCKED, { expectedPreviewRevision: REVISION });

			// To resolve the cause changes the preview, so the old revision cannot match.
			expect(stderr[0]).toContain(`After you resolve them, run:\n  ${continueCommand}\n`);
			expect(stderr[0]).not.toContain('--expected-preview-revision');
		});

		it('stays blocked while an entry stops the Apply, also with the confirmation, and exits 4', async () => {
			const { stderr, exit } = await run(BLOCKED, { confirmMissingDependencies: true });

			expect(stderr).toEqual([
				[
					'Apply is blocked. Nothing was imported.',
					...APPLY_COUNTS(0),
					'',
					'Needs your action (1)',
					'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
					'  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
					'',
					...APPLY_LISTS,
					'',
					'Run with --json for the details. After you resolve them, run:',
					`  ${continueCommand}`,
					'The dependencies that do not stop the Apply need a confirmation. To apply without them, add --confirm-missing-dependencies after you resolve the others.',
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('asks for the confirmation of a credential that the branch does not hold', async () => {
			const { stderr, exit } = await run({
				...NEEDS_CONFIRMATION,
				check: {
					...EMPTY_CHECK,
					missingDependencies: [{ ...OUTSIDE_ACCESS, reason: 'not-on-branch' }],
				},
			});

			expect(stderr).toEqual([
				[
					'Apply needs a confirmation. Nothing was imported.',
					'',
					'Outside your access (1)',
					OUTSIDE_ACCESS_ON_APPLY,
					'  Credential "Shared CRM" (hubspotApi): not on this instance and not on the branch; used by Weekly report',
					'',
					'Run with --json for the details. To apply without these dependencies, run:',
					`  ${continueCommand} --confirm-missing-dependencies`,
				].join('\n'),
			]);
			expect(exit).toHaveBeenCalledWith(4);
		});

		it('stays blocked on a credential outside the access of the caller that stops the Apply, and counts it', async () => {
			const { stderr } = await run(
				{
					...BLOCKED,
					check: {
						...EMPTY_CHECK,
						// The credential exists on this instance, and the project cannot use it.
						missingDependencies: [{ ...OUTSIDE_ACCESS, reason: 'not-shared', blocking: true }],
					},
				},
				{ confirmMissingDependencies: true },
			);

			expect(stderr).toEqual([
				[
					'Apply is blocked. Nothing was imported.',
					'  Missing projects:    0',
					'  Missing credentials: 0',
					'  Missing variables:   0',
					'  Access requirements: 0',
					'  Conflicts:           0',
					'  Outside your access: 1',
					'',
					'Outside your access (1)',
					OUTSIDE_ACCESS_ON_APPLY,
					'  Credential "Shared CRM" (hubspotApi): this project cannot use it; stops the Apply; used by Weekly report',
					'',
					'Run with --json for the details. After you resolve them, run:',
					`  ${continueCommand}`,
				].join('\n'),
			]);
		});

		it('does not ask for a confirmation when every entry stops the Apply', async () => {
			const { stderr } = await run({
				...BLOCKED,
				check: { ...EMPTY_CHECK, missingDependencies: [NEEDS_ACTION] },
			});

			expect(stderr[0]).toContain('Apply is blocked. Nothing was imported.');
			expect(stderr[0]).not.toContain('--confirm-missing-dependencies');
		});

		it('lists on stderr the dependencies that are still missing after a confirmed Apply, and exits 0', async () => {
			const { stdout, stderr, exit } = await run(APPLIED_WITHOUT_DEPENDENCIES, {
				confirmMissingDependencies: true,
			});

			expect(stderr).toEqual([
				['These dependencies are still missing on this instance:', '', ...APPLIED_LISTS, ''].join(
					'\n',
				),
			]);
			expect(stdout).toEqual([`Applied release at commit ${SHA} to the instance.`]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('lists the references that are missing on the source as warnings, after the dependencies', async () => {
			const shadowed = { kind: 'variable', code: 'variable-shadowed', name: 'REGION', consumers };
			const { stdout, stderr } = await run({
				...APPLIED_WITHOUT_DEPENDENCIES,
				warnings: [shadowed, MISSING_ON_SOURCE],
			});

			expect(stderr).toEqual([
				[
					'These dependencies are still missing on this instance:',
					'',
					...APPLIED_LISTS,
					'',
					...WARNINGS,
					'',
				].join('\n'),
			]);
			// The count keeps every warning, as before.
			expect(stdout).toEqual([
				`Applied release at commit ${SHA} to the instance with 2 warning(s).`,
			]);
		});

		it('gives warnings alone no heading, because they are not missing dependencies', async () => {
			const { stderr } = await run({ ...APPLIED, warnings: [MISSING_ON_SOURCE] });

			expect(stderr).toEqual([[...WARNINGS, ''].join('\n')]);
		});

		it.each([
			{ title: 'the result has an empty list', result: APPLIED },
			// A server that does not know the list.
			{ title: 'the result has no list', result: { ...APPLIED, missingDependencies: undefined } },
		])('prints only the success line and exits 0 when $title', async ({ result }) => {
			const { stdout, stderr, exit } = await run(result);

			expect(stdout).toEqual([`Applied release at commit ${SHA} to the instance.`]);
			expect(stderr).toEqual([]);
			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('prints only the API response as JSON for an Apply with dependencies that are still missing', async () => {
			const { stdout, stderr, exit } = await run(APPLIED_WITHOUT_DEPENDENCIES, {
				format: undefined,
				json: true,
			});

			expect(stdout).toEqual([JSON.stringify(APPLIED_WITHOUT_DEPENDENCIES, null, 2)]);
			expect(stderr).toEqual([]);
			expect(exit).toHaveBeenCalledWith(0);
		});

		it('keeps the list of the still missing dependencies away when quiet', async () => {
			const { stderr } = await run(APPLIED_WITHOUT_DEPENDENCIES, { quiet: true });

			expect(stderr).toEqual([]);
		});
	},
);

describe('exit codes of Promote and Apply', () => {
	const PROMOTE_STATUSES = [
		{ title: 'promoted', result: PROMOTED, code: 0 },
		{ title: 'promoted without dependencies', result: PROMOTED_WITHOUT_DEPENDENCIES, code: 0 },
		{ title: 'preview-changed', result: PROMOTE_PREVIEW_CHANGED, code: 3 },
		{ title: 'missing-dependencies', result: PROMOTE_REFUSED, code: 4 },
	];
	const APPLY_STATUSES = [
		{ title: 'applied', result: APPLIED, code: 0 },
		{ title: 'applied without dependencies', result: APPLIED_WITHOUT_DEPENDENCIES, code: 0 },
		{ title: 'source-changed', result: SOURCE_CHANGED, code: 3 },
		{ title: 'preview-changed', result: APPLY_PREVIEW_CHANGED, code: 3 },
		{ title: 'blocked on a confirmation', result: NEEDS_CONFIRMATION, code: 4 },
		{ title: 'blocked on an entry that stops the Apply', result: BLOCKED, code: 4 },
	];
	const selection = { workflow: ['wf-1'] };
	const COMMANDS = [
		{
			name: 'promote',
			commandClass: PromotionEnvironmentPromote,
			method: 'promotePackage',
			args: { id: 'env-1' },
			flags: {},
			statuses: PROMOTE_STATUSES,
		},
		{
			name: 'promote-selection',
			commandClass: PromotionEnvironmentPromoteSelection,
			method: 'promoteProjectSelection',
			args: { projectId: 'proj-1' },
			flags: selection,
			statuses: PROMOTE_STATUSES,
		},
		{
			name: 'apply',
			commandClass: PromotionEnvironmentApply,
			method: 'applyPackage',
			args: { id: 'env-1' },
			flags: {},
			statuses: APPLY_STATUSES,
		},
		{
			name: 'apply-continue',
			commandClass: PromotionEnvironmentApplyContinue,
			method: 'continueApplyPackage',
			args: { id: 'env-1' },
			flags: EXPECTED_SOURCE_FLAGS,
			statuses: APPLY_STATUSES,
		},
		{
			name: 'apply-selection',
			commandClass: PromotionEnvironmentApplySelection,
			method: 'applyProjectSelection',
			args: { projectId: 'proj-1' },
			flags: selection,
			statuses: APPLY_STATUSES,
		},
		{
			name: 'apply-selection-continue',
			commandClass: PromotionEnvironmentApplySelectionContinue,
			method: 'continueApplyProjectSelection',
			args: { projectId: 'proj-1' },
			flags: { ...selection, ...EXPECTED_SOURCE_FLAGS },
			statuses: APPLY_STATUSES,
		},
	];
	const CASES = COMMANDS.flatMap(({ statuses, ...command }) =>
		statuses.flatMap((status) => [
			{ ...command, ...status, output: 'human', format: { format: 'table' } },
			{ ...command, ...status, output: 'JSON', format: { json: true } },
		]),
	);

	it.each(CASES)(
		'$name exits $code for $title, with $output output',
		async ({ commandClass, method, args, flags, format, result, code }) => {
			const { exit } = await report(commandClass, method, result, args, { ...flags, ...format });

			expect(exit).toHaveBeenCalledTimes(1);
			expect(exit).toHaveBeenCalledWith(code);
		},
	);
});
