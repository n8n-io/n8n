import { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionEnvironmentApply from '../commands/promotion-environment/apply';
import PromotionEnvironmentApplyContinue from '../commands/promotion-environment/apply-continue';
import PromotionEnvironmentApplySelection from '../commands/promotion-environment/apply-selection';
import PromotionEnvironmentApplySelectionContinue from '../commands/promotion-environment/apply-selection-continue';
import {
	parseCommitSha,
	parseNonEmpty,
	toExpectedSource,
} from '../commands/promotion-environment/expected-source';
import PromotionEnvironmentPromote from '../commands/promotion-environment/promote';
import PromotionEnvironmentPromoteSelection from '../commands/promotion-environment/promote-selection';

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface OperationInternals {
	parse: () => Promise<{ args: { id: string }; flags: Record<string, unknown> }>;
	getClient: () => N8nClient;
	succeed: (message: string, ...rest: unknown[]) => void;
}

interface ApplyInternals extends OperationInternals {
	output: (data: unknown, flags: unknown) => void;
	logToStderr: (message: string) => void;
	exit: (code: number) => never;
}

const PROMOTE_RESULT = {
	environmentId: 'env-1',
	counts: { workflows: 3, folders: 1, credentials: 0, dataTables: 0, variables: 2, tags: 1 },
	git: { commitSha: 'abc1234', branchName: 'main' },
};

const PROMOTE_SELECTION_RESULT = { status: 'promoted', ...PROMOTE_RESULT };

const SHA = 'd'.repeat(40);
const IDENTITY = {
	environmentId: 'env-1',
	git: { commitSha: SHA, branchName: 'release' },
};
const APPLY_RESULT = { ...IDENTITY, status: 'applied', counts: {}, warnings: [] };
const SOURCE_CHANGED_RESULT = { ...IDENTITY, status: 'source-changed' };
const PREVIEW_CHANGED_RESULT = { ...IDENTITY, status: 'preview-changed' };
const PREVIEW_REVISION = 'b'.repeat(64);
const BLOCKED_RESULT = {
	...IDENTITY,
	status: 'blocked',
	check: {
		missingProjects: [{ id: 'p-1', name: 'Sales' }],
		missingBindings: [
			{ kind: 'credential', sourceId: 'c-1' },
			{ kind: 'credential', sourceId: 'c-2' },
			{ kind: 'variable', name: 'API_URL' },
		],
		accessRequirements: [],
		conflicts: [{ kind: 'variable', code: 'missing-definition' }],
		warnings: [],
	},
};
const consumers = [
	{
		project: { id: 'proj-finance', name: 'Finance' },
		workflows: [{ id: 'wf-1', name: 'Weekly report' }],
	},
];
const NEEDS_ACTION_DEPENDENCY = {
	kind: 'credential',
	id: 'c-1',
	name: 'Billing API',
	credentialType: 'httpHeaderAuth',
	group: 'needs-action',
	reason: 'not-on-instance',
	accessible: true,
	blocking: true,
	consumers,
};
const OUTSIDE_ACCESS_DEPENDENCY = {
	...NEEDS_ACTION_DEPENDENCY,
	id: 'c-9',
	name: 'Shared CRM',
	credentialType: 'hubspotApi',
	group: 'outside-access',
	accessible: false,
	blocking: false,
};
/** This Apply only needs a confirmation: no entry stops it, and no other list has an entry. */
const BLOCKED_BY_DEPENDENCIES_RESULT = {
	...IDENTITY,
	status: 'blocked',
	check: {
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		missingDependencies: [OUTSIDE_ACCESS_DEPENDENCY],
	},
};
const PINNED_FLAGS = {
	expectedEnvironmentId: 'env-1',
	expectedBranch: 'release',
	expectedCommitSha: SHA,
};
const EXPECTED_SOURCE = { environmentId: 'env-1', branchName: 'release', commitSha: SHA };

function stubCommand(
	command:
		| PromotionEnvironmentPromote
		| PromotionEnvironmentApply
		| PromotionEnvironmentApplyContinue,
	flags: Record<string, unknown>,
	client: Partial<N8nClient>,
) {
	const internals = command as unknown as OperationInternals;

	// Bypass oclif arg parsing, connection setup, and the success/exit path.
	vi.spyOn(internals, 'parse').mockResolvedValue({ args: { id: 'env-1' }, flags });
	vi.spyOn(internals, 'getClient').mockReturnValue(client as N8nClient);
	const succeed = vi.spyOn(internals, 'succeed').mockImplementation(() => {});

	return succeed;
}

function stubApplyCommand(
	command: PromotionEnvironmentApply | PromotionEnvironmentApplyContinue,
	flags: Record<string, unknown>,
	client: Partial<N8nClient>,
) {
	const succeed = stubCommand(command, flags, client);
	const internals = command as unknown as ApplyInternals;
	const output = vi.spyOn(internals, 'output').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
	const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);
	return { succeed, output, logToStderr, exit };
}

describe('promotion-environment promote command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the commit message and force flag, and names the branch it pushed to', async () => {
		const command = new PromotionEnvironmentPromote([], {} as Config);
		const promotePackage = vi.fn().mockResolvedValue(PROMOTE_RESULT);
		const succeed = stubCommand(
			command,
			{ format: 'table', message: 'Promote team projects', force: true },
			{ promotePackage } as unknown as Partial<N8nClient>,
		);

		await command.run();

		// `-m` travels as `commitMessage`.
		expect(promotePackage).toHaveBeenCalledWith('env-1', {
			commitMessage: 'Promote team projects',
			force: true,
		});
		// The branch and commit live under `git`. Reading them flat prints
		// "undefined" while succeed() still exits 0, so a script sees success.
		expect(succeed).toHaveBeenCalledWith(
			'Promoted to main as commit abc1234.',
			expect.anything(),
			PROMOTE_RESULT,
		);
	});

	it('leaves the commit message out when no message is given', async () => {
		const command = new PromotionEnvironmentPromote([], {} as Config);
		const promotePackage = vi.fn().mockResolvedValue(PROMOTE_RESULT);
		stubCommand(command, { format: 'table', force: false }, {
			promotePackage,
		} as unknown as Partial<N8nClient>);

		await command.run();

		expect(promotePackage).toHaveBeenCalledWith('env-1', {
			commitMessage: undefined,
			force: false,
		});
	});
});

describe('promotion-environment apply command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function runApply(result: unknown, flags: Record<string, unknown> = { format: 'table' }) {
		const command = new PromotionEnvironmentApply([], {} as Config);
		const applyPackage = vi.fn().mockResolvedValue(result);
		const stubs = stubApplyCommand(command, flags, {
			applyPackage,
		} as unknown as Partial<N8nClient>);
		return { run: async () => await command.run(), applyPackage, ...stubs };
	}

	it('sends the reviewed source and the reviewed preview revision', async () => {
		const { run, applyPackage } = runApply(APPLY_RESULT, {
			format: 'table',
			...PINNED_FLAGS,
			expectedPreviewRevision: PREVIEW_REVISION,
		});

		await run();

		expect(applyPackage).toHaveBeenCalledWith('env-1', EXPECTED_SOURCE, PREVIEW_REVISION);
	});

	it('names the branch and commit it applied, and exits through succeed', async () => {
		const { run, succeed, exit } = runApply(APPLY_RESULT);

		await run();

		expect(succeed).toHaveBeenCalledWith(
			`Applied release at commit ${SHA} to the instance.`,
			expect.anything(),
			APPLY_RESULT,
		);
		expect(exit).not.toHaveBeenCalled();
	});

	it('counts the warnings of a successful Apply in the Applied message', async () => {
		const result = { ...APPLY_RESULT, warnings: [{}, {}] };
		const { run, succeed } = runApply(result);

		await run();

		expect(succeed).toHaveBeenCalledWith(
			`Applied release at commit ${SHA} to the instance with 2 warning(s).`,
			expect.anything(),
			result,
		);
	});

	it('exits 3 without reporting success when the source changed since the review', async () => {
		const { run, succeed, logToStderr, exit } = runApply(SOURCE_CHANGED_RESULT);

		await run();

		expect(succeed).not.toHaveBeenCalled();
		expect(logToStderr).toHaveBeenCalledWith(expect.stringContaining('Nothing was imported.'));
		expect(logToStderr).toHaveBeenCalledWith(
			expect.stringContaining(`environment env-1, branch release, commit ${SHA}`),
		);
		expect(exit).toHaveBeenCalledWith(3);
	});

	it('exits 3 and names the command that shows the new preview when the preview changed', async () => {
		const { run, logToStderr, exit } = runApply(PREVIEW_CHANGED_RESULT);

		await run();

		expect(logToStderr).toHaveBeenCalledWith(
			expect.stringContaining('Run n8n-cli promotion-environment list-apply-changes env-1 --json.'),
		);
		expect(exit).toHaveBeenCalledWith(3);
	});

	it('exits 4 with binding counts and a ready Continue command when bindings are missing', async () => {
		const { run, succeed, logToStderr, exit } = runApply(BLOCKED_RESULT);

		await run();

		expect(succeed).not.toHaveBeenCalled();
		const message = logToStderr.mock.calls[0][0];
		expect(message).toContain('Missing projects:    1');
		expect(message).toContain('Missing credentials: 2');
		expect(message).toContain('Missing variables:   1');
		expect(message).toContain('Access requirements: 0');
		expect(message).toContain('Conflicts:           1');
		expect(message).toContain(
			`n8n-cli promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}`,
		);
		expect(message).not.toContain('--confirm-destructive-changes');
		expect(exit).toHaveBeenCalledWith(4);
	});

	it('exits 4 and tells how to confirm a destructive data table change', async () => {
		const { run, logToStderr, exit } = runApply({
			...BLOCKED_RESULT,
			check: {
				...BLOCKED_RESULT.check,
				conflicts: [{ kind: 'data-table', code: 'destructive-change' }],
			},
		});

		await run();

		const message = logToStderr.mock.calls[0][0];
		expect(message).toContain(
			`n8n-cli promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}\n` +
				'To also apply data table changes that remove or retype columns, add --confirm-destructive-changes. The values in those columns are removed.',
		);
		expect(exit).toHaveBeenCalledWith(4);
	});

	it('exits 4 and lists the projects that a confirmed Apply deletes', async () => {
		const { run, logToStderr, exit } = runApply({
			...BLOCKED_RESULT,
			check: {
				...BLOCKED_RESULT.check,
				conflicts: [
					{
						kind: 'project',
						code: 'project-deletion',
						project: { id: 'proj-2', name: 'Sales' },
					},
				],
			},
		});

		await run();

		const message = logToStderr.mock.calls[0][0];
		expect(message).toContain(
			'Apply deletes these projects with everything in them:\n' + '  Sales (proj-2)',
		);
		expect(message).toContain(
			"To also delete the projects listed above, add --confirm-destructive-changes. You can't undo this.",
		);
		expect(exit).toHaveBeenCalledWith(4);
	});

	it('quotes source values in the Continue command so it is safe to paste', async () => {
		const { run, logToStderr } = runApply({
			...BLOCKED_RESULT,
			git: { commitSha: SHA, branchName: "release;$(id)'s" },
		});

		await run();

		expect(logToStderr.mock.calls[0][0]).toContain(
			`--expected-branch='release;$(id)'\\''s' --expected-commit-sha=${SHA}`,
		);
	});

	it.each([
		{ result: APPLY_RESULT, code: 0 },
		{ result: BLOCKED_RESULT, code: 4 },
	])(
		'sends the $result.status result through the jq-aware output in JSON mode',
		async ({ result, code }) => {
			const { run, succeed, output, logToStderr, exit } = runApply(result, { jq: '.status' });

			await run();

			expect(output).toHaveBeenCalledWith(result, expect.objectContaining({ jq: '.status' }));
			expect(succeed).not.toHaveBeenCalled();
			expect(logToStderr).not.toHaveBeenCalled();
			expect(exit).toHaveBeenCalledWith(code);
		},
	);

	it('keeps the exit code when quiet', async () => {
		const { run, logToStderr, exit } = runApply(SOURCE_CHANGED_RESULT, {
			format: 'table',
			quiet: true,
		});

		await run();

		expect(logToStderr).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(3);
	});
});

describe('missing dependencies of a blocked Apply', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const CONTINUE = `  n8n-cli promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}`;
	const OUTSIDE_ACCESS_LIST = [
		'Outside your access (1)',
		'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
		'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
	];

	async function blockedMessageOf(result: unknown, flags: Record<string, unknown> = {}) {
		const command = new PromotionEnvironmentApply([], {} as Config);
		const { logToStderr, exit } = stubApplyCommand(command, { format: 'table', ...flags }, {
			applyPackage: vi.fn().mockResolvedValue(result),
		} as unknown as Partial<N8nClient>);

		await command.run();

		expect(logToStderr).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(4);
		return logToStderr.mock.calls[0][0];
	}

	it('asks for a confirmation, with the Continue command that gives it, when nothing stops the Apply', async () => {
		expect(await blockedMessageOf(BLOCKED_BY_DEPENDENCIES_RESULT)).toBe(
			[
				// No cause must be resolved, so the message has no count.
				'Apply needs a confirmation. Nothing was imported.',
				'',
				...OUTSIDE_ACCESS_LIST,
				'',
				'Run with --json for the details. To apply without these dependencies, run:',
				`${CONTINUE} --confirm-missing-dependencies`,
			].join('\n'),
		);
	});

	it('asks only for the confirmation when the branch holds a project that this instance lacks', async () => {
		const message = await blockedMessageOf({
			...BLOCKED_BY_DEPENDENCIES_RESULT,
			check: {
				...BLOCKED_BY_DEPENDENCIES_RESULT.check,
				// The Apply creates the project, so the project does not stop it.
				missingProjects: [{ id: 'p-1', name: 'Sales' }],
			},
		});

		expect(message).toBe(
			[
				'Apply needs a confirmation. Nothing was imported.',
				'',
				...OUTSIDE_ACCESS_LIST,
				'',
				'Run with --json for the details. To apply without these dependencies, run:',
				`${CONTINUE} --confirm-missing-dependencies`,
			].join('\n'),
		);
	});

	it('keeps the reviewed revision in the Continue command that only adds the confirmation', async () => {
		const message = await blockedMessageOf(BLOCKED_BY_DEPENDENCIES_RESULT, {
			...PINNED_FLAGS,
			expectedPreviewRevision: PREVIEW_REVISION,
		});

		expect(message.split('\n').at(-1)).toBe(
			`${CONTINUE} --expected-preview-revision=${PREVIEW_REVISION} --confirm-missing-dependencies`,
		);
	});

	it('leaves the reviewed revision out of the Continue command when a cause must be resolved', async () => {
		const message = await blockedMessageOf(
			{
				...BLOCKED_BY_DEPENDENCIES_RESULT,
				check: {
					...BLOCKED_BY_DEPENDENCIES_RESULT.check,
					missingDependencies: [NEEDS_ACTION_DEPENDENCY, OUTSIDE_ACCESS_DEPENDENCY],
				},
			},
			{ ...PINNED_FLAGS, expectedPreviewRevision: PREVIEW_REVISION },
		);

		// To resolve the cause changes the preview, so the old revision cannot match.
		expect(message).toContain(`After you resolve them, run:\n${CONTINUE}\n`);
		expect(message).not.toContain('--expected-preview-revision');
	});

	it('stays blocked when an entry stops the Apply, and tells that the other entries need a confirmation', async () => {
		const message = await blockedMessageOf({
			...BLOCKED_RESULT,
			check: {
				...BLOCKED_RESULT.check,
				missingDependencies: [
					OUTSIDE_ACCESS_DEPENDENCY,
					NEEDS_ACTION_DEPENDENCY,
					{
						kind: 'workflow',
						id: 'wf-9',
						name: 'Send alert',
						group: 'needs-action',
						reason: 'archived',
						accessible: true,
						blocking: false,
						consumers,
					},
				],
			},
		});

		expect(message).toBe(
			[
				'Apply is blocked. Nothing was imported.',
				'  Missing projects:    1',
				'  Missing credentials: 2',
				'  Missing variables:   1',
				'  Access requirements: 0',
				'  Conflicts:           1',
				'  Outside your access: 0',
				'',
				'Needs your action (2)',
				'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
				'  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report',
				'  Workflow "Send alert": archived on this instance; used by Weekly report',
				'',
				'Outside your access (1)',
				'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
				'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
				'',
				'Run with --json for the details. After you resolve them, run:',
				CONTINUE,
				'The dependencies that do not stop the Apply need a confirmation. To apply without them, add --confirm-missing-dependencies after you resolve the others.',
			].join('\n'),
		);
		expect(message).not.toContain('Finance');
		expect(message).not.toContain('proj-finance');
	});

	it('counts only the entries that stop the Apply, and keeps every entry in the group', async () => {
		const message = await blockedMessageOf({
			...BLOCKED_BY_DEPENDENCIES_RESULT,
			check: {
				...BLOCKED_BY_DEPENDENCIES_RESULT.check,
				missingDependencies: [
					// The credential exists on this instance, and the project cannot use it.
					{ ...OUTSIDE_ACCESS_DEPENDENCY, reason: 'not-shared', blocking: true },
					{ ...OUTSIDE_ACCESS_DEPENDENCY, name: 'Old CRM' },
				],
			},
		});

		expect(message).toContain(
			[
				'Apply is blocked. Nothing was imported.',
				'  Missing projects:    0',
				'  Missing credentials: 0',
				'  Missing variables:   0',
				'  Access requirements: 0',
				'  Conflicts:           0',
				'  Outside your access: 1',
				'',
				'Outside your access (2)',
				'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
				'  Credential "Shared CRM" (hubspotApi): this project cannot use it; stops the Apply; used by Weekly report',
				'  Credential "Old CRM" (hubspotApi): not on this instance; used by Weekly report',
				'',
				'Run with --json for the details. After you resolve them, run:',
				CONTINUE,
				'The dependencies that do not stop the Apply need a confirmation.',
			].join('\n'),
		);
	});

	it('lists the entry of a group that it does not know when only that entry stops the Apply', async () => {
		const message = await blockedMessageOf({
			...BLOCKED_BY_DEPENDENCIES_RESULT,
			check: {
				...BLOCKED_BY_DEPENDENCIES_RESULT.check,
				missingDependencies: [
					{ ...OUTSIDE_ACCESS_DEPENDENCY, group: 'future-group', blocking: true },
				],
			},
		});

		expect(message).toContain(
			[
				'  Outside your access: 0',
				'',
				'Other (1)',
				'  Credential "Shared CRM" (hubspotApi): not on this instance; stops the Apply; used by Weekly report',
				'',
				'Run with --json for the details.',
			].join('\n'),
		);
	});

	it.each([
		{ title: 'the check has an empty list', missingDependencies: [] },
		// A server that does not know the list.
		{ title: 'the check has no list', missingDependencies: undefined },
	])('adds only a zero count when $title', async ({ missingDependencies }) => {
		const message = await blockedMessageOf({
			...BLOCKED_RESULT,
			check: { ...BLOCKED_RESULT.check, missingDependencies },
		});

		expect(message).toBe(
			[
				'Apply is blocked. Nothing was imported.',
				'  Missing projects:    1',
				'  Missing credentials: 2',
				'  Missing variables:   1',
				'  Access requirements: 0',
				'  Conflicts:           1',
				'  Outside your access: 0',
				'Run with --json for the details. After you resolve them, run:',
				CONTINUE,
			].join('\n'),
		);
	});
});

describe.each([
	{
		name: 'apply',
		commandClass: PromotionEnvironmentApply,
		method: 'applyPackage',
		args: { id: 'env-1' },
	},
	{
		name: 'apply-continue',
		commandClass: PromotionEnvironmentApplyContinue,
		method: 'continueApplyPackage',
		args: { id: 'env-1' },
	},
	{
		name: 'apply-selection',
		commandClass: PromotionEnvironmentApplySelection,
		method: 'applyProjectSelection',
		args: { projectId: 'proj-1' },
	},
	{
		name: 'apply-selection-continue',
		commandClass: PromotionEnvironmentApplySelectionContinue,
		method: 'continueApplyProjectSelection',
		args: { projectId: 'proj-1' },
	},
])('promotion-environment $name result reporting', ({ commandClass, method, args }) => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const RESULTS = [
		{ result: APPLY_RESULT, code: 0 },
		{ result: BLOCKED_BY_DEPENDENCIES_RESULT, code: 4 },
		{ result: SOURCE_CHANGED_RESULT, code: 3 },
		{ result: PREVIEW_CHANGED_RESULT, code: 3 },
	];

	/** Runs the command with the real reporting, and catches the two streams and the exit code. */
	async function report(result: unknown, flags: Record<string, unknown>) {
		const command = new commandClass([], {} as Config);
		const internals = command as unknown as ApplyInternals & {
			parse: () => Promise<{ args: typeof args; flags: Record<string, unknown> }>;
			log: (message: string) => void;
		};
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args,
			flags: { workflow: ['wf-1'], ...PINNED_FLAGS, ...flags },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({
			[method]: vi.fn().mockResolvedValue(result),
		} as unknown as N8nClient);
		const log = vi.spyOn(internals, 'log').mockImplementation(() => {});
		const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
		const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

		await command.run();

		return { stdout: log.mock.calls.map(([line]) => line), logToStderr, exit };
	}

	it.each(RESULTS)('exits $code for the status $result.status', async ({ result, code }) => {
		const { exit } = await report(result, { format: 'table' });

		expect(exit).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(code);
	});

	it.each(RESULTS)(
		'prints only the API response as JSON and exits $code for the status $result.status',
		async ({ result, code }) => {
			const { stdout, logToStderr, exit } = await report(result, { json: true });

			expect(stdout).toEqual([JSON.stringify(result, null, 2)]);
			expect(logToStderr).not.toHaveBeenCalled();
			expect(exit).toHaveBeenCalledWith(code);
		},
	);

	it('lists the entries of a blocked Apply by group on stderr', async () => {
		const { stdout, logToStderr } = await report(BLOCKED_BY_DEPENDENCIES_RESULT, {
			format: 'table',
		});

		expect(stdout).toEqual([]);
		expect(logToStderr.mock.calls[0][0]).toContain(
			[
				'Apply needs a confirmation. Nothing was imported.',
				'',
				'Outside your access (1)',
				'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
				'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
				'',
				'Run with --json for the details.',
			].join('\n'),
		);
	});
});

describe('promotion-environment apply-continue command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('continues with the reviewed source and reports the result like Apply', async () => {
		const command = new PromotionEnvironmentApplyContinue([], {} as Config);
		const continueApplyPackage = vi.fn().mockResolvedValue(SOURCE_CHANGED_RESULT);
		const { exit } = stubApplyCommand(command, { format: 'table', ...PINNED_FLAGS }, {
			continueApplyPackage,
		} as unknown as Partial<N8nClient>);

		await command.run();

		expect(continueApplyPackage).toHaveBeenCalledWith(
			'env-1',
			EXPECTED_SOURCE,
			undefined,
			undefined,
			undefined,
		);
		expect(exit).toHaveBeenCalledWith(3);
	});

	it('confirms only the destructive changes of the reviewed preview', async () => {
		const command = new PromotionEnvironmentApplyContinue(
			[
				'env-1',
				`--expected-environment-id=${EXPECTED_SOURCE.environmentId}`,
				`--expected-branch=${EXPECTED_SOURCE.branchName}`,
				`--expected-commit-sha=${SHA}`,
				`--expected-preview-revision=${PREVIEW_REVISION}`,
				'--confirm-destructive-changes',
				'--format=table',
			],
			await Config.load(process.cwd()),
		);
		const internals = command as unknown as ApplyInternals;
		const continueApplyPackage = vi.fn().mockResolvedValue(APPLY_RESULT);
		vi.spyOn(internals, 'getClient').mockReturnValue({
			continueApplyPackage,
		} as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		expect(continueApplyPackage).toHaveBeenCalledWith(
			'env-1',
			EXPECTED_SOURCE,
			true,
			PREVIEW_REVISION,
			undefined,
		);
	});

	const CONTINUE = `  n8n-cli promotion-environment apply-continue env-1 --expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}`;
	const OUTSIDE_ACCESS_LIST = [
		'Outside your access (1)',
		'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
		'  Credential "Shared CRM" (hubspotApi): not on this instance; used by Weekly report',
	];
	const projectDeletion = (name: string) => ({
		...BLOCKED_BY_DEPENDENCIES_RESULT,
		check: {
			...BLOCKED_BY_DEPENDENCIES_RESULT.check,
			conflicts: [{ kind: 'project', code: 'project-deletion', project: { id: 'proj-2', name } }],
		},
	});

	async function blockedMessageOf(result: unknown, flags: Record<string, unknown>) {
		const command = new PromotionEnvironmentApplyContinue([], {} as Config);
		const { logToStderr, exit } = stubApplyCommand(
			command,
			{ format: 'table', ...PINNED_FLAGS, ...flags },
			{ continueApplyPackage: vi.fn().mockResolvedValue(result) } as unknown as Partial<N8nClient>,
		);

		await command.run();

		expect(logToStderr).toHaveBeenCalledTimes(1);
		expect(exit).toHaveBeenCalledWith(4);
		return logToStderr.mock.calls[0][0];
	}

	it('asks only for the confirmation of the dependencies after the user confirmed a project deletion', async () => {
		const message = await blockedMessageOf(projectDeletion('Sales'), {
			expectedPreviewRevision: PREVIEW_REVISION,
			confirmDestructiveChanges: true,
		});

		expect(message).toBe(
			[
				'Apply needs a confirmation. Nothing was imported.',
				'Apply deletes these projects with everything in them:',
				'  Sales (proj-2)',
				'',
				...OUTSIDE_ACCESS_LIST,
				'',
				'Run with --json for the details. To apply without these dependencies, run:',
				// The command keeps the pin and the confirmation that the user passed.
				`${CONTINUE} --expected-preview-revision=${PREVIEW_REVISION} --confirm-destructive-changes --confirm-missing-dependencies`,
				"With --confirm-destructive-changes, this command deletes the projects listed above. You can't undo this.",
			].join('\n'),
		);
	});

	it('stays blocked on a project deletion that the user did not confirm, and names the two confirmations', async () => {
		const message = await blockedMessageOf(projectDeletion('Sales'), {
			expectedPreviewRevision: PREVIEW_REVISION,
		});

		expect(message).toBe(
			[
				'Apply is blocked. Nothing was imported.',
				'  Missing projects:    0',
				'  Missing credentials: 0',
				'  Missing variables:   0',
				'  Access requirements: 0',
				'  Conflicts:           1',
				'  Outside your access: 0',
				'Apply deletes these projects with everything in them:',
				'  Sales (proj-2)',
				'',
				...OUTSIDE_ACCESS_LIST,
				'',
				'Run with --json for the details. To apply without these dependencies, run:',
				`${CONTINUE} --expected-preview-revision=${PREVIEW_REVISION} --confirm-missing-dependencies`,
				'This command stays blocked until you also add --confirm-destructive-changes.',
				"To also delete the projects listed above, add --confirm-destructive-changes. You can't undo this.",
			].join('\n'),
		);
	});

	it('keeps the name of a project to delete on one line', async () => {
		const message = await blockedMessageOf(
			projectDeletion('Sales\n\nRun with --json for the details. After you resolve them, run:'),
			{},
		);

		expect(message).toContain(
			'  Sales\\n\\nRun with --json for the details. After you resolve them, run: (proj-2)\n',
		);
		expect(message.split('\n').filter((line) => line.endsWith(', run:'))).toHaveLength(1);
	});
});

describe('expected environment ID and branch flags', () => {
	it('reject a value that is empty after trimming', async () => {
		await expect(parseNonEmpty('branch name')('   ')).rejects.toThrow(
			'Expected a non-empty branch name',
		);
	});

	it('keep a non-empty value unchanged', async () => {
		await expect(parseNonEmpty('branch name')('release/1.0')).resolves.toBe('release/1.0');
	});
});

describe('expected source from flags', () => {
	it('pins nothing when no flag is given', () => {
		expect(toExpectedSource({})).toBeUndefined();
	});

	it('keeps an empty value so the request fails instead of applying the branch tip', () => {
		expect(
			toExpectedSource({
				expectedEnvironmentId: 'env-1',
				expectedBranch: '',
				expectedCommitSha: SHA,
			}),
		).toEqual({ environmentId: 'env-1', branchName: '', commitSha: SHA });
	});
});

describe('expected commit SHA flag', () => {
	it.each(['a'.repeat(40), '0123456789abcdef'.repeat(4)])('accepts %s', async (sha) => {
		await expect(parseCommitSha(sha)).resolves.toBe(sha);
	});

	it.each(['abc1234', 'A'.repeat(40), 'g'.repeat(40), 'a'.repeat(41)])(
		'rejects %s',
		async (sha) => {
			await expect(parseCommitSha(sha)).rejects.toThrow('full lowercase commit SHA');
		},
	);
});

describe('promotion-environment promote-selection command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends the project id and workflow ids, and names the branch it pushed to', async () => {
		const command = new PromotionEnvironmentPromoteSelection([], {} as Config);
		const internals = command as unknown as OperationInternals & {
			parse: () => Promise<{ args: { projectId: string }; flags: Record<string, unknown> }>;
		};

		const promoteProjectSelection = vi.fn().mockResolvedValue(PROMOTE_SELECTION_RESULT);
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { projectId: 'proj-1' },
			flags: { format: 'table', workflow: ['wf-1', 'wf-2'] },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({
			promoteProjectSelection,
		} as unknown as N8nClient);
		const succeed = vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		// `-w` values travel as the `workflowIds` array, with no message flag set.
		expect(promoteProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1', 'wf-2'] },
			undefined,
			undefined,
			undefined,
		);
		// A selection can be deletions only, so the summary names the branch and
		// commit instead of a workflow count that would read "0" for that case.
		expect(succeed).toHaveBeenCalledWith(
			'Promoted selection to main as commit abc1234.',
			expect.anything(),
			PROMOTE_SELECTION_RESULT,
		);
	});

	it('passes the message flag as the commit message', async () => {
		const command = new PromotionEnvironmentPromoteSelection([], {} as Config);
		const internals = command as unknown as OperationInternals & {
			parse: () => Promise<{ args: { projectId: string }; flags: Record<string, unknown> }>;
		};

		const promoteProjectSelection = vi.fn().mockResolvedValue(PROMOTE_SELECTION_RESULT);
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { projectId: 'proj-1' },
			flags: { format: 'table', workflow: ['wf-1'], message: 'Promote checkout flow' },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({
			promoteProjectSelection,
		} as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		expect(promoteProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1'] },
			'Promote checkout flow',
			undefined,
			undefined,
		);
	});

	it('sends the reviewed revision, and exits 3 without a success message when the preview changed', async () => {
		const command = new PromotionEnvironmentPromoteSelection([], {} as Config);
		const internals = command as unknown as ApplyInternals & {
			parse: () => Promise<{ args: { projectId: string }; flags: Record<string, unknown> }>;
		};
		const revision = 'f'.repeat(64);

		const promoteProjectSelection = vi
			.fn()
			.mockResolvedValue({ status: 'preview-changed', environmentId: 'env-1' });
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { projectId: 'proj-1' },
			flags: { format: 'table', workflow: ['wf-1'], expectedPreviewRevision: revision },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({
			promoteProjectSelection,
		} as unknown as N8nClient);
		const succeed = vi.spyOn(internals, 'succeed').mockImplementation(() => {});
		const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
		const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

		await command.run();

		expect(promoteProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1'] },
			undefined,
			revision,
			undefined,
		);
		expect(logToStderr).toHaveBeenCalledWith(
			expect.stringContaining(
				'The Promote preview changed since you reviewed it. Nothing was pushed.',
			),
		);
		expect(exit).toHaveBeenCalledWith(3);
		expect(succeed).not.toHaveBeenCalled();
	});
});

describe('promotion-environment apply-selection command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function runApplySelection(
		result: unknown,
		flags: Record<string, unknown> = { format: 'table', workflow: ['wf-1', 'wf-2'] },
	) {
		const command = new PromotionEnvironmentApplySelection([], {} as Config);
		const applyProjectSelection = vi.fn().mockResolvedValue(result);
		const internals = command as unknown as ApplyInternals & {
			parse: () => Promise<{ args: { projectId: string }; flags: Record<string, unknown> }>;
		};
		vi.spyOn(internals, 'parse').mockResolvedValue({ args: { projectId: 'proj-1' }, flags });
		vi.spyOn(internals, 'getClient').mockReturnValue({
			applyProjectSelection,
		} as unknown as N8nClient);
		const succeed = vi.spyOn(internals, 'succeed').mockImplementation(() => {});
		const output = vi.spyOn(internals, 'output').mockImplementation(() => {});
		const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
		const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);
		return {
			run: async () => await command.run(),
			applyProjectSelection,
			succeed,
			output,
			logToStderr,
			exit,
		};
	}

	it('sends the project id, the workflow ids, and no source by default', async () => {
		const { run, applyProjectSelection } = runApplySelection(APPLY_RESULT);

		await run();

		expect(applyProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1', 'wf-2'] },
			undefined,
			undefined,
		);
	});

	it('sends the reviewed source and the reviewed preview revision', async () => {
		const { run, applyProjectSelection } = runApplySelection(APPLY_RESULT, {
			format: 'table',
			workflow: ['wf-1'],
			...PINNED_FLAGS,
			expectedPreviewRevision: PREVIEW_REVISION,
		});

		await run();

		expect(applyProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1'] },
			EXPECTED_SOURCE,
			PREVIEW_REVISION,
		);
	});

	it('names the branch and commit it applied, and exits through succeed', async () => {
		const { run, succeed, exit } = runApplySelection(APPLY_RESULT);

		await run();

		expect(succeed).toHaveBeenCalledWith(
			`Applied release at commit ${SHA} to the instance.`,
			expect.anything(),
			APPLY_RESULT,
		);
		expect(exit).not.toHaveBeenCalled();
	});

	it('exits 3 without reporting success when the source changed since the review', async () => {
		const { run, succeed, exit } = runApplySelection(SOURCE_CHANGED_RESULT);

		await run();

		expect(succeed).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(3);
	});

	it('names the project preview command when the preview changed', async () => {
		const { run, logToStderr } = runApplySelection(PREVIEW_CHANGED_RESULT);

		await run();

		expect(logToStderr).toHaveBeenCalledWith(
			expect.stringContaining(
				'Run n8n-cli promotion-environment list-changes proj-1 apply --json.',
			),
		);
	});

	it('exits 4 with a Continue command that resends the same workflow and folder ids', async () => {
		const { run, applyProjectSelection, logToStderr, exit } = runApplySelection(BLOCKED_RESULT, {
			format: 'table',
			workflow: ['wf-1', 'wf-2'],
			folder: ['f-1'],
		});

		await run();

		expect(applyProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1', 'wf-2'], folderIds: ['f-1'] },
			undefined,
			undefined,
		);
		expect(logToStderr.mock.calls[0][0]).toContain(
			`n8n-cli promotion-environment apply-selection-continue proj-1 -w wf-1 -w wf-2 --folder f-1 --expected-environment-id=env-1 --expected-branch=release --expected-commit-sha=${SHA}`,
		);
		expect(exit).toHaveBeenCalledWith(4);
	});
});

describe('promotion-environment apply-selection-continue command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('continues with the reviewed source and the same workflow ids', async () => {
		const command = new PromotionEnvironmentApplySelectionContinue([], {} as Config);
		const continueApplyProjectSelection = vi.fn().mockResolvedValue(SOURCE_CHANGED_RESULT);
		const internals = command as unknown as ApplyInternals & {
			parse: () => Promise<{ args: { projectId: string }; flags: Record<string, unknown> }>;
		};
		vi.spyOn(internals, 'parse').mockResolvedValue({
			args: { projectId: 'proj-1' },
			flags: { format: 'table', workflow: ['wf-1'], ...PINNED_FLAGS },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({
			continueApplyProjectSelection,
		} as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});
		vi.spyOn(internals, 'output').mockImplementation(() => {});
		vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
		const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

		await command.run();

		expect(continueApplyProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1'] },
			EXPECTED_SOURCE,
			undefined,
			undefined,
			undefined,
		);
		expect(exit).toHaveBeenCalledWith(3);
	});

	it('sends the confirmation of destructive data table changes', async () => {
		const command = new PromotionEnvironmentApplySelectionContinue(
			[
				'proj-1',
				'-w',
				'wf-1',
				`--expected-environment-id=${EXPECTED_SOURCE.environmentId}`,
				`--expected-branch=${EXPECTED_SOURCE.branchName}`,
				`--expected-commit-sha=${SHA}`,
				'--confirm-destructive-changes',
				'--format=table',
			],
			await Config.load(process.cwd()),
		);
		const internals = command as unknown as ApplyInternals;
		const continueApplyProjectSelection = vi.fn().mockResolvedValue(APPLY_RESULT);
		vi.spyOn(internals, 'getClient').mockReturnValue({
			continueApplyProjectSelection,
		} as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		expect(continueApplyProjectSelection).toHaveBeenCalledWith(
			'proj-1',
			{ workflowIds: ['wf-1'] },
			EXPECTED_SOURCE,
			true,
			undefined,
			undefined,
		);
	});
});
