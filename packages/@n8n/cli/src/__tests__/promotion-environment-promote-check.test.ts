import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient, PromotionPromoteCheck } from '../client';
import PromotionEnvironmentPromoteCheck from '../commands/promotion-environment/promote-check';
import { commands } from '../index';

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface PromoteCheckInternals {
	parse: () => Promise<{ args: { id: string }; flags: Record<string, unknown> }>;
	getClient: () => N8nClient;
	log: (message: string) => void;
	logToStderr: (message: string) => void;
	exit: (code: number) => never;
}

const consumers = [
	{
		project: { id: 'proj-finance', name: 'Finance' },
		workflows: [
			{ id: 'wf-1', name: 'Weekly report' },
			{ id: 'wf-2', name: 'Invoices' },
		],
	},
];

const CHECK: PromotionPromoteCheck = {
	missingDependencies: [
		{
			kind: 'credential',
			id: 'cred-1',
			name: 'My token',
			credentialType: 'httpHeaderAuth',
			group: 'personal',
			reason: 'personal-project',
			accessible: true,
			blocking: false,
			consumers,
		},
		{
			kind: 'workflow',
			id: 'wf-9',
			name: 'Send alert',
			group: 'personal',
			reason: 'personal-project',
			accessible: false,
			blocking: false,
			consumers,
		},
	],
	warnings: [{ kind: 'variable', code: 'missing-on-source', name: 'API_URL', consumers }],
	revision: 'c'.repeat(64),
};

const WARNINGS = [
	'Warnings (1)',
	'These references point to something that does not exist on the source instance.',
	'  Variable "API_URL": used by Weekly report, Invoices',
];

const NOTHING_MISSING: PromotionPromoteCheck = { ...CHECK, missingDependencies: [], warnings: [] };

async function runPromoteCheck(flags: Record<string, unknown>, check: PromotionPromoteCheck) {
	const command = new PromotionEnvironmentPromoteCheck([], {} as Config);
	const internals = command as unknown as PromoteCheckInternals;
	const getPromoteCheck = vi.fn().mockResolvedValue(check);

	// Bypass oclif arg parsing and connection setup. Keep the real rendering.
	vi.spyOn(internals, 'parse').mockResolvedValue({ args: { id: 'env-1' }, flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({ getPromoteCheck } as unknown as N8nClient);
	const log = vi.spyOn(internals, 'log').mockImplementation(() => {});
	const logToStderr = vi.spyOn(internals, 'logToStderr').mockImplementation(() => {});
	const exit = vi.spyOn(internals, 'exit').mockImplementation(() => undefined as never);

	await command.run();

	return { stdout: log.mock.calls.map(([line]) => line), logToStderr, exit, getPromoteCheck };
}

describe('promotion-environment promote-check command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('is registered under its command name', () => {
		expect(commands['promotion-environment:promote-check']).toBe(PromotionEnvironmentPromoteCheck);
	});

	it('prints the groups, the warnings and the command that confirms this list, and exits 0', async () => {
		const { stdout, logToStderr, exit, getPromoteCheck } = await runPromoteCheck(
			{ format: 'table' },
			CHECK,
		);

		expect(getPromoteCheck).toHaveBeenCalledWith('env-1');
		expect(stdout).toEqual([
			[
				'Cannot be promoted (2)',
				'These dependencies are in a personal project. Someone with access must move them to a team project to promote them.',
				'  Credential "My token" (httpHeaderAuth): used by Weekly report, Invoices',
				'  Workflow "Send alert": used by Weekly report, Invoices',
				'',
				...WARNINGS,
				'',
				'The Promote needs --confirm-missing-dependencies. To confirm exactly this list, run:',
				`  n8n-cli promotion-environment promote env-1 --expected-preview-revision=${CHECK.revision} --confirm-missing-dependencies`,
			].join('\n'),
		]);
		expect(logToStderr).not.toHaveBeenCalled();
		// The command only shows. An entry does not change the exit code.
		expect(exit).not.toHaveBeenCalled();
	});

	it('prints no command when the check has only warnings, because they need no confirmation', async () => {
		const { stdout } = await runPromoteCheck(
			{ format: 'table' },
			{ ...CHECK, missingDependencies: [] },
		);

		expect(stdout).toEqual([WARNINGS.join('\n')]);
	});

	it('does not name the project of a consumer', async () => {
		const { stdout } = await runPromoteCheck({ format: 'table' }, CHECK);

		expect(stdout.join('\n')).not.toContain('Finance');
		expect(stdout.join('\n')).not.toContain('proj-finance');
	});

	it('prints one line when nothing is missing, and exits 0', async () => {
		const { stdout, exit } = await runPromoteCheck({ format: 'table' }, NOTHING_MISSING);

		expect(stdout).toEqual(['No missing dependencies and no warnings.']);
		expect(exit).not.toHaveBeenCalled();
	});

	it('lists an entry of a group that it does not know', async () => {
		const { stdout } = await runPromoteCheck(
			{ format: 'table' },
			{
				...NOTHING_MISSING,
				missingDependencies: [{ ...CHECK.missingDependencies[0], group: 'future-group' as never }],
			},
		);

		// An entry of any group needs the confirmation.
		expect(stdout).toEqual([
			[
				'Other (1)',
				'  Credential "My token" (httpHeaderAuth): used by Weekly report, Invoices',
				'',
				'The Promote needs --confirm-missing-dependencies. To confirm exactly this list, run:',
				`  n8n-cli promotion-environment promote env-1 --expected-preview-revision=${CHECK.revision} --confirm-missing-dependencies`,
			].join('\n'),
		]);
	});

	it.each([CHECK, NOTHING_MISSING])(
		'prints the API response as JSON, and exits 0',
		async (check) => {
			const { stdout, exit } = await runPromoteCheck({ json: true }, check);

			expect(stdout).toEqual([JSON.stringify(check, null, 2)]);
			expect(exit).not.toHaveBeenCalled();
		},
	);

	it('applies a jq filter to the API response', async () => {
		const { stdout } = await runPromoteCheck({ jq: '.missingDependencies[].name' }, CHECK);

		expect(stdout).toEqual([JSON.stringify(['My token', 'Send alert'], null, 2)]);
	});

	it('prints nothing when quiet', async () => {
		const { stdout } = await runPromoteCheck({ format: 'table', quiet: true }, CHECK);

		expect(stdout).toEqual([]);
	});
});
