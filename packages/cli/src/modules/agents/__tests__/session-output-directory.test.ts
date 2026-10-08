import { Workspace, type WorkspaceFilesystem, type WorkspaceSandbox } from '@n8n/agents';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	absoluteSessionOutputDir,
	resolveParentOutputPath,
	wrapWorkspaceForSessionOutputs,
	type SessionOutputSyncHost,
} from '../session-output-directory';
import {
	absoluteSessionUploadDir,
	resolveParentUploadPath,
	type SessionUploadHost,
} from '../session-upload-directory';

const sessionId = 'sess-1';
const workspaceRoot = '/workspace';
const scopedRoot = '/workspace/subagents/child-1';

describe('session-output-directory', () => {
	it('rewrites relative outputs/<sessionId> paths to the parent output dir', () => {
		expect(
			resolveParentOutputPath(`outputs/${sessionId}/a.md`, workspaceRoot, sessionId, scopedRoot),
		).toBe(`${workspaceRoot}/outputs/${sessionId}/a.md`);
	});

	it('rewrites a scoped-root escape into the parent output dir', () => {
		expect(
			resolveParentOutputPath(
				`${absoluteSessionOutputDir(workspaceRoot, sessionId)}/a.md`,
				workspaceRoot,
				sessionId,
				scopedRoot,
			),
		).toBe(`${workspaceRoot}/outputs/${sessionId}/a.md`);
	});

	it('does not rewrite scratch files', () => {
		expect(resolveParentOutputPath('scratch.md', workspaceRoot, sessionId, scopedRoot)).toBeNull();
	});

	it('writes delegated output files on the parent filesystem', async () => {
		const inner = mock<WorkspaceFilesystem>();
		const parent = mock<WorkspaceFilesystem>();
		inner.writeFile.mockResolvedValue(undefined);
		parent.writeFile.mockResolvedValue(undefined);
		const host: SessionOutputSyncHost = {
			sync: vi.fn().mockResolvedValue({ errors: [] }),
		};
		const wrapped = wrapWorkspaceForSessionOutputs(
			new Workspace({ filesystem: inner, sandbox: mock<WorkspaceSandbox>() }),
			{
				sessionId,
				workspaceRoot,
				scopedRoot,
				parentFilesystem: parent,
				writerId: 'child-1',
				host,
			},
		);

		await wrapped.filesystem?.writeFile(`outputs/${sessionId}/a.md`, 'hello');

		expect(parent.writeFile).toHaveBeenCalledWith(
			`${workspaceRoot}/outputs/${sessionId}/a.md`,
			'hello',
			undefined,
		);
		expect(inner.writeFile).not.toHaveBeenCalled();
		expect(host.sync).toHaveBeenCalled();
	});

	it('throws UserError when a mutated output file fails copy', async () => {
		const inner = mock<WorkspaceFilesystem>();
		inner.writeFile.mockResolvedValue(undefined);
		const host: SessionOutputSyncHost = {
			sync: vi.fn().mockResolvedValue({
				errors: ['Output File exceeds 50 MB'],
				mutatedError: 'Output File exceeds 50 MB',
			}),
		};
		const wrapped = wrapWorkspaceForSessionOutputs(new Workspace({ filesystem: inner }), {
			sessionId,
			workspaceRoot,
			scopedRoot: workspaceRoot,
			parentFilesystem: inner,
			writerId: 'parent',
			host,
		});

		await expect(
			wrapped.filesystem?.writeFile(`outputs/${sessionId}/huge.bin`, 'x'),
		).rejects.toBeInstanceOf(UserError);
	});

	it('appends output instructions and cap errors on executeCommand', async () => {
		const sandbox = {
			getInstructions: vi.fn(() => 'base'),
			executeCommand: vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
		};
		const host: SessionOutputSyncHost = {
			sync: vi.fn().mockResolvedValue({ errors: ['Output File exceeds 50 MB'] }),
		};
		const wrapped = wrapWorkspaceForSessionOutputs(
			new Workspace({ sandbox: sandbox as unknown as WorkspaceSandbox }),
			{
				sessionId,
				workspaceRoot,
				scopedRoot: workspaceRoot,
				parentFilesystem: mock<WorkspaceFilesystem>(),
				writerId: 'parent',
				host,
			},
		);

		expect(wrapped.sandbox?.getInstructions?.()).toContain(`${workspaceRoot}/outputs/${sessionId}`);
		const result = await wrapped.sandbox?.executeCommand?.('echo', ['ok']);
		expect(result?.stderr).toContain('Output File exceeds 50 MB');
		expect(result?.exitCode).toBe(0);
	});

	it('rewrites delegated upload reads onto the parent filesystem after materialize', async () => {
		const inner = mock<WorkspaceFilesystem>();
		const parent = mock<WorkspaceFilesystem>();
		parent.readFile.mockResolvedValue('a,b\n1,2\n');
		const host: SessionOutputSyncHost = {
			sync: vi.fn().mockResolvedValue({ errors: [] }),
		};
		const uploadHost: SessionUploadHost = {
			materialize: vi.fn().mockResolvedValue({ changed: false }),
		};
		const wrapped = wrapWorkspaceForSessionOutputs(
			new Workspace({ filesystem: inner, sandbox: mock<WorkspaceSandbox>() }),
			{
				sessionId,
				workspaceRoot,
				scopedRoot,
				parentFilesystem: parent,
				writerId: 'child-1',
				host,
				uploadHost,
			},
		);

		const content = await wrapped.filesystem?.readFile(`uploads/${sessionId}/m/data.csv`);

		expect(uploadHost.materialize).toHaveBeenCalled();
		expect(parent.readFile).toHaveBeenCalledWith(
			`${absoluteSessionUploadDir(workspaceRoot, sessionId)}/m/data.csv`,
			undefined,
		);
		expect(inner.readFile).not.toHaveBeenCalled();
		expect(content).toBe('a,b\n1,2\n');
	});

	it('injects N8N_* env and materializes before executeCommand', async () => {
		const executeCommand = vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 }));
		const sandbox = {
			getInstructions: vi.fn(() => 'base'),
			executeCommand,
		};
		const host: SessionOutputSyncHost = {
			sync: vi.fn().mockResolvedValue({ errors: [] }),
			onUploadsMaterialized: vi.fn().mockResolvedValue(undefined),
		};
		const uploadHost: SessionUploadHost = {
			materialize: vi.fn().mockResolvedValue({ changed: true }),
		};
		const wrapped = wrapWorkspaceForSessionOutputs(
			new Workspace({ sandbox: sandbox as unknown as WorkspaceSandbox }),
			{
				sessionId,
				workspaceRoot,
				scopedRoot: workspaceRoot,
				parentFilesystem: mock<WorkspaceFilesystem>(),
				writerId: 'parent',
				host,
				uploadHost,
			},
		);

		expect(wrapped.sandbox?.getInstructions?.()).toContain('$N8N_UPLOADS_DIR');
		expect(wrapped.sandbox?.getInstructions?.()).toContain('$N8N_OUTPUTS_DIR');
		expect(wrapped.sandbox?.getInstructions?.()).toContain('workspace_run_javascript');
		await wrapped.sandbox?.executeCommand?.('echo', ['ok'], {
			env: { KEEP: 'yes', N8N_UPLOADS_DIR: 'wrong' },
		});

		expect(uploadHost.materialize).toHaveBeenCalled();
		expect(host.onUploadsMaterialized).toHaveBeenCalledWith(sessionId);
		expect(executeCommand).toHaveBeenCalledWith(
			'echo',
			['ok'],
			expect.objectContaining({
				env: expect.objectContaining({
					KEEP: 'yes',
					N8N_SESSION_ID: sessionId,
					N8N_UPLOADS_DIR: `${workspaceRoot}/uploads/${sessionId}`,
					N8N_OUTPUTS_DIR: `${workspaceRoot}/outputs/${sessionId}`,
					N8N_UPLOADS_MANIFEST: `${workspaceRoot}/uploads/${sessionId}/manifest.json`,
				}),
			}),
		);
		expect(host.sync).toHaveBeenCalled();
	});
});

describe('resolveParentUploadPath', () => {
	it('rewrites relative uploads/<sessionId> paths to the parent upload dir', () => {
		expect(
			resolveParentUploadPath(`uploads/${sessionId}/a.csv`, workspaceRoot, sessionId, scopedRoot),
		).toBe(`${workspaceRoot}/uploads/${sessionId}/a.csv`);
	});
});
