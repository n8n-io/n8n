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
	projectId?: string;
	folderId?: string;
	conflictPolicy?: string;
	publishingPolicy?: string;
	idPolicy?: string;
	missingNodeTypeMode?: string;
	projectConflictPolicy?: string;
	folderConflictPolicy?: string;
	overwriteDeletionPolicy?: string;
	credentialMatchingMode?: string;
	credentialMissingMode?: string;
	credentialConflictPolicy?: string;
	dataTableMatchingMode?: string;
	dataTableMissingMode?: string;
	dataTableSchemaConflictPolicy?: string;
	variableMissingMode?: string;
	variableConflictPolicy?: string;
	variableParentPolicy?: string;
	tagMissingMode?: string;
	tagConflictPolicy?: string;
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

	it('forwards publishingPolicy and all sibling options to the import API', async () => {
		const { command, importPackage } = stubCommand({
			file: '/tmp/export.n8np',
			projectId: 'p-1',
			folderId: 'f-1',
			conflictPolicy: 'fail',
			publishingPolicy: 'publish-all',
			idPolicy: 'source',
			missingNodeTypeMode: 'import-anyway',
			projectConflictPolicy: 'overwrite',
			folderConflictPolicy: 'merge',
			overwriteDeletionPolicy: 'hard-delete',
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'create-stub',
			credentialConflictPolicy: 'overwrite',
			dataTableMatchingMode: 'by-id',
			dataTableMissingMode: 'create',
			dataTableSchemaConflictPolicy: 'keep-existing',
			variableMissingMode: 'create-with-value',
			variableConflictPolicy: 'overwrite',
			variableParentPolicy: 'global',
			tagMissingMode: 'do-nothing',
			tagConflictPolicy: 'rename',
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
			conflictPolicy: 'fail',
			publishingPolicy: 'publish-all',
			idPolicy: 'source',
			missingNodeTypeMode: 'import-anyway',
			projectConflictPolicy: 'overwrite',
			folderConflictPolicy: 'merge',
			overwriteDeletionPolicy: 'hard-delete',
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'create-stub',
			credentialConflictPolicy: 'overwrite',
			dataTableMatchingMode: 'by-id',
			dataTableMissingMode: 'create',
			dataTableSchemaConflictPolicy: 'keep-existing',
			variableMissingMode: 'create-with-value',
			variableConflictPolicy: 'overwrite',
			variableParentPolicy: 'global',
			tagMissingMode: 'do-nothing',
			tagConflictPolicy: 'rename',
			bindings: '{}',
		});
	});

	it('defines the tag flags with kebab aliases, server option lists, and no client-side default', () => {
		const missingMode = PackageImport.flags.tagMissingMode;
		expect(missingMode.aliases).toEqual(['tag-missing-mode']);
		expect(missingMode.options).toEqual(['create', 'do-nothing']);
		expect(missingMode.default).toBeUndefined();

		const conflictPolicy = PackageImport.flags.tagConflictPolicy;
		expect(conflictPolicy.aliases).toEqual(['tag-conflict-policy']);
		expect(conflictPolicy.options).toEqual(['skip', 'fail', 'rename']);
		expect(conflictPolicy.default).toBeUndefined();
	});

	it('returns Agent summaries, channel setup, and publication failures without failing the definition import', async () => {
		const result = {
			agents: [
				{
					sourceAgentId: 'source',
					localId: 'source',
					name: 'Reviewer',
					projectId: 'project',
					activeVersionId: null,
					status: 'created',
					publishing: { state: 'failed', error: 'Publication refused' },
					channels: [],
				},
				{
					sourceAgentId: 'helper',
					localId: 'helper',
					name: 'Helper',
					projectId: 'project',
					activeVersionId: null,
					status: 'created',
					publishing: { state: 'blocked', blockedReason: 'channel-setup-required' },
					channels: [
						{
							type: 'slack',
							status: 'setup-required',
							reason: 'new-channel',
							setupUrl: 'https://n8n.example.com/projects/project/agents/helper',
						},
					],
				},
			],
			workflows: [],
			bindings: { agents: { source: 'source', helper: 'helper' }, workflows: {}, credentials: {} },
			counts: { agents: { created: 2, updated: 0, skipped: 0 } },
		};
		const { command, internals } = stubCommand(
			{ file: '/tmp/agent.n8np', conflictPolicy: 'new-version', publishingPolicy: 'publish-all' },
			vi.fn().mockResolvedValue(result),
		);
		await expect(command.run()).resolves.toBeUndefined();
		expect(internals.output).toHaveBeenCalledWith(result, expect.anything());
	});

	// Real oclif parsing exercises the flag default and alias resolution, which
	// the stubbed `parse` above cannot.
	describe('conflict-policy flag resolution (real parse)', () => {
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
				expect.objectContaining({
					conflictPolicy: 'new-version',
					idPolicy: undefined,
					publishingPolicy: undefined,
					credentialConflictPolicy: undefined,
				}),
			);
		});

		it.each(['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'])(
			'parses shared policies with publication set to %s',
			async (publishingPolicy) => {
				const importPackage = await runWithArgv([
					'--file=/tmp/export.n8np',
					'--conflict-policy=fail',
					'--id-policy=source',
					`--publishing-policy=${publishingPolicy}`,
				]);
				expect(importPackage).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({
						conflictPolicy: 'fail',
						idPolicy: 'source',
						publishingPolicy,
					}),
				);
			},
		);

		it('resolves the --project-id and --folder-id flags', async () => {
			const importPackage = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--project-id=p-1',
				'--folder-id=f-1',
			]);

			expect(importPackage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ projectId: 'p-1', folderId: 'f-1' }),
			);
		});

		it('resolves the backward-compatible --project and --folder aliases', async () => {
			const importPackage = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--project=p-1',
				'--folder=f-1',
			]);

			expect(importPackage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ projectId: 'p-1', folderId: 'f-1' }),
			);
		});

		it('resolves the --project-conflict-policy alias', async () => {
			const importPackage = await runWithArgv([
				'--file=/tmp/export.n8np',
				'--project-conflict-policy=merge',
			]);

			expect(importPackage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ projectConflictPolicy: 'merge' }),
			);
		});

		it.each(['keep-existing', 'overwrite', 'fail'])(
			'parses --credential-conflict-policy=%s',
			async (credentialConflictPolicy) => {
				const importPackage = await runWithArgv([
					'--file=/tmp/export.n8np',
					`--credential-conflict-policy=${credentialConflictPolicy}`,
				]);
				expect(importPackage).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ credentialConflictPolicy }),
				);
			},
		);

		it('rejects an unsupported credential conflict policy', async () => {
			await expect(
				runWithArgv(['--file=/tmp/export.n8np', '--credential-conflict-policy=merge']),
			).rejects.toThrow(/Expected --credentialConflictPolicy=merge/);
		});

		it.each([
			'workflow-conflict-policy',
			'workflowConflictPolicy',
			'workflow-id-policy',
			'workflowIdPolicy',
			'agent-id-policy',
			'agentIdPolicy',
			'workflow-publishing-policy',
			'workflowPublishingPolicy',
			'agent-publishing-policy',
			'agentPublishingPolicy',
		])('rejects the removed --%s flag', async (flag) => {
			await expect(runWithArgv(['--file=/tmp/export.n8np', `--${flag}=source`])).rejects.toThrow(
				/Nonexistent flag/i,
			);
		});
	});
});
