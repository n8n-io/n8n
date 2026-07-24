import { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageImport from '../commands/package/import';

vi.mock('node:fs');

// Tests run with the package directory as cwd (see AGENTS.md), so this is the
// @n8n/cli package root oclif needs to read the command manifest.
const packageRoot = process.cwd();

interface ImportFlags {
	file: string;
	project?: string;
	folder?: string;
	workflowConflictPolicy?: string;
	workflowPublishingPolicy?: string;
	workflowIdPolicy?: string;
	missingNodeTypeMode?: string;
	folderConflictPolicy?: string;
	credentialMatchingMode?: string;
	credentialMissingMode?: string;
	dataTableMatchingMode?: string;
	dataTableMissingMode?: string;
	dataTableSchemaConflictPolicy?: string;
	variableMissingMode?: string;
	bindings?: string;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ImportInternals {
	parse: () => Promise<{ flags: ImportFlags }>;
	getClient: () => N8nClient;
	output: () => void;
}

function stubCommand(
	flags: ImportFlags,
	importPackage = vi.fn().mockResolvedValue({ workflows: [] }),
) {
	vi.mocked(fs.existsSync).mockReturnValue(true);
	vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('pkg'));
	const command = new PackageImport([], {} as Config);
	const internals = command as unknown as ImportInternals;
	// Bypass oclif arg parsing, connection setup, and the output path.
	vi.spyOn(internals, 'parse').mockResolvedValue({ flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({ importPackage } as unknown as N8nClient);
	vi.spyOn(internals, 'output').mockImplementation(() => {});
	return { command, internals, importPackage };
}

describe('package import command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('forwards workflowPublishingPolicy and all sibling options to the import API', async () => {
		const { command, importPackage } = stubCommand({
			file: '/tmp/export.n8np',
			project: 'p-1',
			folder: 'f-1',
			workflowConflictPolicy: 'fail',
			workflowPublishingPolicy: 'publish-all',
			workflowIdPolicy: 'new',
			missingNodeTypeMode: 'import-anyway',
			folderConflictPolicy: 'merge',
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'create-stub',
			dataTableMatchingMode: 'by-id',
			dataTableMissingMode: 'create',
			dataTableSchemaConflictPolicy: 'keep-existing',
			variableMissingMode: 'do-nothing',
			bindings: '{}',
		});

		await command.run();

		expect(importPackage).toHaveBeenCalledOnce();
		expect(importPackage.mock.calls[0][0]).toStrictEqual({
			buffer: Buffer.from('pkg'),
			filename: 'export.n8np',
		});
		expect(importPackage.mock.calls[0][1]).toStrictEqual({
			projectId: 'p-1',
			folderId: 'f-1',
			workflowConflictPolicy: 'fail',
			workflowPublishingPolicy: 'publish-all',
			workflowIdPolicy: 'new',
			missingNodeTypeMode: 'import-anyway',
			folderConflictPolicy: 'merge',
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'create-stub',
			dataTableMatchingMode: 'by-id',
			dataTableMissingMode: 'create',
			dataTableSchemaConflictPolicy: 'keep-existing',
			variableMissingMode: 'do-nothing',
			bindings: '{}',
		});
	});

	it('defines the documented alias and the full server option list', () => {
		const flag = PackageImport.flags.workflowPublishingPolicy;
		expect(flag.aliases).toEqual(['workflow-publishing-policy']);
		expect(flag.options).toEqual([
			'preserve-published-state',
			'match-source',
			'publish-all',
			'unpublish-all',
		]);
		expect(flag.default).toBeUndefined();
	});

	// Real oclif parsing exercises the flag default and alias resolution, which
	// the stubbed `parse` above cannot.
	describe('workflow-conflict-policy flag resolution (real parse)', () => {
		async function runWithArgv(argv: string[]) {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from([1, 2, 3]));

			const config = await Config.load(packageRoot);
			const command = new PackageImport(argv, config);
			const internals = command as unknown as ImportInternals;
			const importPackage = vi.fn().mockResolvedValue({ imported: true });
			vi.spyOn(internals, 'getClient').mockReturnValue({
				importPackage,
			} as unknown as N8nClient);
			vi.spyOn(internals, 'output').mockImplementation(() => {});

			await command.run();
			return importPackage;
		}

		it('applies the new-version default when the flag is omitted', async () => {
			const importPackage = await runWithArgv(['--file=/tmp/export.n8np']);

			expect(importPackage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ workflowConflictPolicy: 'new-version' }),
			);
		});

		it('resolves the --workflow-conflict-policy flag', async () => {
			const importPackage = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--workflow-conflict-policy=fail',
			]);

			expect(importPackage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ workflowConflictPolicy: 'fail' }),
			);
		});

		it('rejects the removed --conflict-policy flag', async () => {
			const config = await Config.load(packageRoot);
			const command = new PackageImport(
				['--file=/tmp/export.n8np', '--conflict-policy=fail'],
				config,
			);

			await expect(command.run()).rejects.toThrow(/Nonexistent flag.*conflict-policy/i);
		});
	});
});
