import { Workspace, type WorkspaceFilesystem, type WorkspaceSandbox } from '@n8n/agents';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	absoluteSessionOutputDir,
	resolveParentOutputPath,
	wrapWorkspaceForSessionOutputs,
	type SessionOutputSyncHost,
} from '../session-output-directory';

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
});
