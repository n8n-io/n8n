import type { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageExport from '../commands/package/export';

vi.mock('node:fs');

const mockedWriteFileSync = vi.mocked(fs.writeFileSync);

interface ExportFlags {
	workflowId?: string[];
	folderId?: string[];
	projectId?: string[];
	output: string;
	includeVariableValues?: string;
	includeTags?: string;
	missingWorkflowDependencyPolicy?: string;
	workflowVersionPolicy?: string;
	credentialExportPolicy?: string;
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ExportInternals {
	parse: () => Promise<{ flags: ExportFlags }>;
	getClient: () => N8nClient;
	succeed: (message: string, ...args: unknown[]) => void;
	error: (message: string) => never;
}

const DEFAULT_COUNTS = {
	workflows: 0,
	folders: 0,
	credentials: 0,
	dataTables: 0,
	variables: 0,
};

function stubCommand(
	flags: ExportFlags,
	exportPackage = vi
		.fn()
		.mockResolvedValue({ archive: Buffer.from([1, 2, 3]), counts: DEFAULT_COUNTS }),
) {
	const command = new PackageExport([], {} as Config);
	const internals = command as unknown as ExportInternals;
	// Bypass oclif arg parsing, connection setup, and the success/exit path.
	vi.spyOn(internals, 'parse').mockResolvedValue({
		flags: { missingWorkflowDependencyPolicy: 'fail', ...flags },
	});
	vi.spyOn(internals, 'getClient').mockReturnValue({ exportPackage } as unknown as N8nClient);
	vi.spyOn(internals, 'succeed').mockImplementation(() => {});
	vi.spyOn(internals, 'error').mockImplementation((message: string) => {
		throw new Error(message);
	});
	return { command, internals, exportPackage };
}

describe('package export command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('forwards workflow ids (and an empty folder list) and writes the archive', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1', 'wf-2'],
			output: '/tmp/team.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1', 'wf-2'],
			folderIds: [],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/team.n8np', Buffer.from([1, 2, 3]));
	});

	it('supports a folder-only export', async () => {
		const { command, exportPackage } = stubCommand({
			folderId: ['fld-1'],
			output: '/tmp/folders.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: [],
			folderIds: ['fld-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/folders.n8np', Buffer.from([1, 2, 3]));
	});

	it('supports exporting workflows and folders together', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			folderId: ['fld-1'],
			output: '/tmp/mixed.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: ['fld-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('forwards a non-default missing workflow dependency policy for workflows and folders', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			folderId: ['fld-1'],
			output: '/tmp/mixed.n8np',
			missingWorkflowDependencyPolicy: 'reference-only',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: ['fld-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'reference-only',
		});
	});

	it('forwards a non-default workflow version policy for workflows and folders', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			folderId: ['fld-1'],
			output: '/tmp/mixed.n8np',
			workflowVersionPolicy: 'published-strict',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: ['fld-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
			workflowVersionPolicy: 'published-strict',
		});
	});

	it('forwards a non-default workflow version policy for projects', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1'],
			output: '/tmp/projects.n8np',
			workflowVersionPolicy: 'ignore-unpublished',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
			workflowVersionPolicy: 'ignore-unpublished',
		});
	});

	it('forwards a non-default credential export policy for workflows and folders', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			output: '/tmp/team.n8np',
			credentialExportPolicy: 'no-values',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: [],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
			credentialExportPolicy: 'no-values',
		});
	});

	it('forwards a non-default credential export policy for projects', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1'],
			output: '/tmp/projects.n8np',
			credentialExportPolicy: 'no-values',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
			credentialExportPolicy: 'no-values',
		});
	});

	it('forwards project ids and writes the archive', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1', 'proj-2'],
			output: '/tmp/projects.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1', 'proj-2'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/projects.n8np', Buffer.from([1, 2, 3]));
	});

	it('forwards a non-default missing workflow dependency policy for projects', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1'],
			output: '/tmp/projects.n8np',
			missingWorkflowDependencyPolicy: 'include-in-package',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1'],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'include-in-package',
		});
	});

	it('forwards includeVariableValues=false when the flag is set', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			output: '/tmp/export.n8np',
			includeVariableValues: 'false',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: [],
			includeVariableValues: false,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('forwards includeVariableValues=false for a project export', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1'],
			output: '/tmp/project.n8np',
			includeVariableValues: 'false',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1'],
			includeVariableValues: false,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('forwards includeTags=false when the flag is set', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			output: '/tmp/export.n8np',
			includeTags: 'false',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: [],
			includeVariableValues: true,
			includeTags: false,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('forwards includeTags=false for a project export', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1'],
			output: '/tmp/project.n8np',
			includeTags: 'false',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			projectIds: ['proj-1'],
			includeVariableValues: true,
			includeTags: false,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('treats an explicit --include-tags=true like the default', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			output: '/tmp/export.n8np',
			includeTags: 'true',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: [],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('declares the includeTags flag with its alias, options, and default', () => {
		const flag = PackageExport.flags.includeTags;
		expect(flag.aliases).toEqual(['include-tags']);
		expect(flag.options).toEqual(['true', 'false']);
		expect(flag.default).toBe('true');
	});

	it('treats an explicit --include-variable-values=true like the default', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			output: '/tmp/export.n8np',
			includeVariableValues: 'true',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({
			workflowIds: ['wf-1'],
			folderIds: [],
			includeVariableValues: true,
			includeTags: true,
			missingWorkflowDependencyPolicy: 'fail',
		});
	});

	it('rejects providing both workflow and project IDs', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			projectId: ['proj-1'],
			output: '/tmp/export.n8np',
		});

		await expect(command.run()).rejects.toThrow(
			'Provide either --workflow-id/--folder-id or --project-id, not both',
		);
		expect(exportPackage).not.toHaveBeenCalled();
	});

	it('rejects providing both folder and project IDs', async () => {
		const { command, exportPackage } = stubCommand({
			folderId: ['fld-1'],
			projectId: ['proj-1'],
			output: '/tmp/export.n8np',
		});

		await expect(command.run()).rejects.toThrow(
			'Provide either --workflow-id/--folder-id or --project-id, not both',
		);
		expect(exportPackage).not.toHaveBeenCalled();
	});

	it('errors when neither a workflow, folder, nor project is given', async () => {
		const { command, exportPackage } = stubCommand({ output: '/tmp/empty.n8np' });

		await expect(command.run()).rejects.toThrow(/at least one/i);
		expect(exportPackage).not.toHaveBeenCalled();
	});

	it('omits a zero folder count from a workflow-only export message', async () => {
		const exportPackage = vi.fn().mockResolvedValue({
			archive: Buffer.from([1, 2, 3]),
			counts: { workflows: 2, folders: 0, credentials: 0, dataTables: 0, variables: 0 },
		});
		const { command, internals } = stubCommand(
			{ workflowId: ['wf-1', 'wf-2'], output: '/tmp/team.n8np' },
			exportPackage,
		);

		await command.run();

		const message = vi.mocked(internals.succeed).mock.calls[0][0];
		expect(message).toBe('Exported 2 workflow(s) to /tmp/team.n8np');
		expect(message).not.toContain('folder');
	});

	it('reports the real bundled workflow count for a folder export', async () => {
		const exportPackage = vi.fn().mockResolvedValue({
			archive: Buffer.from([1, 2, 3]),
			counts: { workflows: 3, folders: 1, credentials: 0, dataTables: 0, variables: 0 },
		});
		const { command, internals } = stubCommand(
			{ folderId: ['fld-1'], output: '/tmp/folders.n8np' },
			exportPackage,
		);

		await command.run();

		const message = vi.mocked(internals.succeed).mock.calls[0][0];
		expect(message).toBe('Exported 3 workflow(s), 1 folder(s) to /tmp/folders.n8np');
	});

	it('includes a non-zero tag count in the export message', async () => {
		const exportPackage = vi.fn().mockResolvedValue({
			archive: Buffer.from([1, 2, 3]),
			counts: { workflows: 2, folders: 0, credentials: 0, dataTables: 0, variables: 0, tags: 2 },
		});
		const { command, internals } = stubCommand(
			{ workflowId: ['wf-1', 'wf-2'], output: '/tmp/team.n8np' },
			exportPackage,
		);

		await command.run();

		const message = vi.mocked(internals.succeed).mock.calls[0][0];
		expect(message).toBe('Exported 2 workflow(s), 2 tag(s) to /tmp/team.n8np');
	});
});
