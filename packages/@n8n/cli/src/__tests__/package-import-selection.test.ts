import { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageImportSelection from '../commands/package/import-selection';

vi.mock('node:fs');

// Tests run with the package directory as cwd (see AGENTS.md), so this is the
// @n8n/cli package root oclif needs to read the command manifest.
const packageRoot = process.cwd();

interface ImportSelectionFlags {
	file: string;
	selectedProjectId: string;
	selectedWorkflowIds?: string[];
	deletedWorkflowIds?: string[];
	workflowConflictPolicy?: string;
	workflowIdPolicy?: string;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ImportSelectionInternals {
	parse: () => Promise<{ flags: ImportSelectionFlags }>;
	getClient: () => N8nClient;
	output: () => void;
}

function stubCommand(
	flags: ImportSelectionFlags,
	importPackageSelection = vi.fn().mockResolvedValue({ workflows: [] }),
) {
	vi.mocked(fs.existsSync).mockReturnValue(true);
	vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('pkg'));
	const command = new PackageImportSelection([], {} as Config);
	const internals = command as unknown as ImportSelectionInternals;
	// Bypass oclif arg parsing, connection setup, and the output path.
	vi.spyOn(internals, 'parse').mockResolvedValue({ flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({
		importPackageSelection,
	} as unknown as N8nClient);
	vi.spyOn(internals, 'output').mockImplementation(() => {});
	return { command, internals, importPackageSelection };
}

describe('package import-selection command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('forwards the selection and options to the client, with the id lists as arrays', async () => {
		const { command, importPackageSelection } = stubCommand({
			file: '/tmp/export.n8np',
			selectedProjectId: 'sp-1',
			selectedWorkflowIds: ['w-1', 'w-2'],
			deletedWorkflowIds: ['w-3'],
			workflowConflictPolicy: 'skip',
			workflowIdPolicy: 'new',
		});

		await command.run();

		expect(importPackageSelection).toHaveBeenCalledOnce();
		expect(importPackageSelection.mock.calls[0][0]).toStrictEqual({
			buffer: Buffer.from('pkg'),
			filename: 'export.n8np',
		});
		expect(importPackageSelection.mock.calls[0][1]).toStrictEqual({
			selectedProjectId: 'sp-1',
			selectedWorkflowIds: ['w-1', 'w-2'],
			deletedWorkflowIds: ['w-3'],
			workflowConflictPolicy: 'skip',
			workflowIdPolicy: 'new',
		});
	});

	it('defaults omitted id lists to an empty selected list and undefined deletes', async () => {
		const { command, importPackageSelection } = stubCommand({
			file: '/tmp/export.n8np',
			selectedProjectId: 'sp-1',
			workflowConflictPolicy: 'new-version',
		});

		await command.run();

		expect(importPackageSelection.mock.calls[0][1]).toStrictEqual({
			selectedProjectId: 'sp-1',
			selectedWorkflowIds: [],
			deletedWorkflowIds: undefined,
			workflowConflictPolicy: 'new-version',
			workflowIdPolicy: undefined,
		});
	});

	it('defines the enum flags with kebab aliases and the full server option lists', () => {
		const conflictPolicy = PackageImportSelection.flags.workflowConflictPolicy;
		expect(conflictPolicy.aliases).toEqual(['workflow-conflict-policy']);
		expect(conflictPolicy.options).toEqual(['new-version', 'fail', 'skip']);
		expect(conflictPolicy.default).toBe('new-version');

		const idPolicy = PackageImportSelection.flags.workflowIdPolicy;
		expect(idPolicy.aliases).toEqual(['workflow-id-policy']);
		expect(idPolicy.options).toEqual(['new', 'source']);
		expect(idPolicy.default).toBeUndefined();
	});

	// Real oclif parsing exercises the flag defaults, aliases, and array parsing,
	// which the stubbed `parse` above cannot.
	describe('flag resolution (real parse)', () => {
		async function runWithArgv(argv: string[]) {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from([1, 2, 3]));

			const config = await Config.load(packageRoot);
			const command = new PackageImportSelection(argv, config);
			const internals = command as unknown as ImportSelectionInternals;
			const importPackageSelection = vi.fn().mockResolvedValue({ imported: true });
			vi.spyOn(internals, 'getClient').mockReturnValue({
				importPackageSelection,
			} as unknown as N8nClient);
			vi.spyOn(internals, 'output').mockImplementation(() => {});

			await command.run();
			return importPackageSelection;
		}

		it('splits comma-separated id lists into arrays', async () => {
			const importPackageSelection = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--selected-project-id=sp-1',
				'--selected-workflow-ids=w-1,w-2',
				'--deleted-workflow-ids=w-3,w-4',
			]);

			expect(importPackageSelection).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					selectedWorkflowIds: ['w-1', 'w-2'],
					deletedWorkflowIds: ['w-3', 'w-4'],
				}),
			);
		});

		it('collects a repeated id flag into an array', async () => {
			const importPackageSelection = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--selected-project-id=sp-1',
				'--selected-workflow-ids=w-1',
				'--selected-workflow-ids=w-2',
			]);

			expect(importPackageSelection).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ selectedWorkflowIds: ['w-1', 'w-2'] }),
			);
		});

		it('applies the new-version conflict-policy default and defaults an omitted selection to []', async () => {
			const importPackageSelection = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--selected-project-id=sp-1',
			]);

			expect(importPackageSelection).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					selectedProjectId: 'sp-1',
					selectedWorkflowIds: [],
					workflowConflictPolicy: 'new-version',
				}),
			);
		});

		it('requires the --file flag', async () => {
			const config = await Config.load(packageRoot);
			const command = new PackageImportSelection(['--selected-project-id=sp-1'], config);

			await expect(command.run()).rejects.toThrow(/Missing required flag.*file/i);
		});

		it('requires the --selected-project-id flag', async () => {
			const config = await Config.load(packageRoot);
			const command = new PackageImportSelection(['--file=/tmp/export.n8np'], config);

			await expect(command.run()).rejects.toThrow(
				/Missing required flag.*(selected-project-id|selectedProjectId)/i,
			);
		});
	});
});
