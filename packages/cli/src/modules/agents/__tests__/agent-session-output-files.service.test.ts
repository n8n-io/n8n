import {
	MAX_SESSION_OUTPUT_FILE_BYTES,
	MAX_SESSION_OUTPUT_FILE_COUNT,
	MAX_SESSION_OUTPUT_PERSIST_BYTES,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkspaceFilesystem } from '@n8n/agents';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentSessionOutputFilesService } from '../agent-session-output-files.service';
import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentSessionUploadFilesService } from '../agent-session-upload-files.service';
import type { AgentSessionOutputFile } from '../entities/agent-session-output-file.entity';
import type { AgentSessionOutputFileRepository } from '../repositories/agent-session-output-file.repository';

const sessionId = 'sess-1';
const workspaceRoot = '/workspace';
const outputAbs = `${workspaceRoot}/outputs/${sessionId}`;

function makeService() {
	const binaryDataService = mock<BinaryDataService>();
	const repository = mock<AgentSessionOutputFileRepository>();
	const attachments = mock<AgentChatAttachmentService>();
	binaryDataService.store.mockResolvedValue({
		id: 'bin-1',
		data: 'filesystem-v2',
		mimeType: 'text/markdown',
	});
	repository.create.mockImplementation((input) => input as AgentSessionOutputFile);
	repository.save.mockImplementation(async (input) => input as AgentSessionOutputFile);
	repository.findByThreadAndFileName.mockResolvedValue(null);
	repository.findByThread.mockResolvedValue([]);
	repository.countByThread.mockResolvedValue(0);
	repository.sumFileSizeBytesByThread.mockResolvedValue(0);
	attachments.listSessionFiles.mockResolvedValue([]);
	const uploads = mock<AgentSessionUploadFilesService>();
	uploads.decorateList.mockImplementation((_sessionId, files) => ({ files }));
	const service = new AgentSessionOutputFilesService(
		mock<Logger>(),
		binaryDataService,
		repository,
		attachments,
		uploads,
	);
	return { service, binaryDataService, repository, attachments };
}

function fakeFilesystem(files: Record<string, { content: string; size?: number }>) {
	const filesystem = mock<WorkspaceFilesystem>();
	filesystem.mkdir.mockResolvedValue(undefined);
	filesystem.readdir.mockResolvedValue(
		Object.keys(files).map((name) => ({ name, type: 'file' as const })),
	);
	filesystem.stat.mockImplementation(async (path) => {
		const name = path.slice(`${outputAbs}/`.length);
		const file = files[name];
		if (!file) throw new Error('missing');
		return { size: file.size ?? Buffer.byteLength(file.content) } as never;
	});
	filesystem.readFile.mockImplementation(async (path) => {
		const name = path.slice(`${outputAbs}/`.length);
		const file = files[name];
		if (!file) throw new Error('missing');
		return file.content;
	});
	return filesystem;
}

describe('AgentSessionOutputFilesService', () => {
	it('copies a file from the output directory after bind', async () => {
		const { service, binaryDataService, repository } = makeService();
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'hi' } });
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
		});

		expect(result.errors).toEqual([]);
		expect(binaryDataService.store).toHaveBeenCalled();
		expect(repository.save).toHaveBeenCalled();
		expect(filesystem.readdir).toHaveBeenCalledWith(outputAbs, { recursive: true });
	});

	it('skips copy when no run is bound', async () => {
		const { service, binaryDataService } = makeService();
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'hi' } });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		await service.sync({ sessionId, writerId: 'parent', filesystem, workspaceRoot });

		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('skips a file over 50 MB and returns the cap error', async () => {
		const { service, binaryDataService } = makeService();
		const filesystem = fakeFilesystem({
			'huge.bin': { content: 'x', size: MAX_SESSION_OUTPUT_FILE_BYTES + 1 },
		});
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
			mutatedOutputFileName: 'huge.bin',
		});

		expect(result.mutatedError).toBe('Output File exceeds 50 MB');
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('skips a new file when the session already has 100 output files', async () => {
		const { service, repository, binaryDataService } = makeService();
		repository.countByThread.mockResolvedValue(MAX_SESSION_OUTPUT_FILE_COUNT);
		const filesystem = fakeFilesystem({ 'extra.md': { content: 'x' } });
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
			mutatedOutputFileName: 'extra.md',
		});

		expect(result.mutatedError).toBe('Session Output Files exceed 100 files');
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('skips a file that would push persisted bytes over 500 MB', async () => {
		const { service, repository, binaryDataService } = makeService();
		repository.sumFileSizeBytesByThread.mockResolvedValue(MAX_SESSION_OUTPUT_PERSIST_BYTES);
		const filesystem = fakeFilesystem({ 'extra.md': { content: 'x' } });
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
			mutatedOutputFileName: 'extra.md',
		});

		expect(result.mutatedError).toBe('Session Output Files exceed 500 MB');
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('overwrites the same fileName without incrementing count', async () => {
		const { service, repository, binaryDataService } = makeService();
		const existing = {
			id: 'out-1',
			writerId: 'parent',
			fileName: 'hello.md',
			fileSizeBytes: 2,
			binaryDataId: 'old-bin',
		} as AgentSessionOutputFile;
		repository.findByThreadAndFileName.mockResolvedValue(existing);
		repository.countByThread.mockResolvedValue(MAX_SESSION_OUTPUT_FILE_COUNT);
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'hello!' } });
		service.bindRun({ sessionId, runId: 'run-2' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
		});

		expect(result.errors).toEqual([]);
		expect(binaryDataService.store).toHaveBeenCalled();
		expect(repository.countByThread).not.toHaveBeenCalled();
	});

	it('prefixes the fileName when another writer already stored that name', async () => {
		const { service, repository } = makeService();
		repository.findByThreadAndFileName.mockImplementation(async (_threadId, fileName) => {
			if (fileName === 'hello.md') {
				return { id: 'out-1', writerId: 'parent', fileName: 'hello.md' } as AgentSessionOutputFile;
			}
			return null;
		});
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'child' } });
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		await service.sync({
			sessionId,
			writerId: 'child-thread',
			filesystem,
			workspaceRoot,
		});

		expect(repository.create).toHaveBeenCalledWith(
			expect.objectContaining({ fileName: 'child-thread-hello.md' }),
		);
	});

	it('deletes durable rows during reconcile when the file is gone', async () => {
		const { service, repository, binaryDataService } = makeService();
		const stale = {
			id: 'out-gone',
			fileName: 'gone.md',
			binaryDataId: 'bin-gone',
		} as AgentSessionOutputFile;
		repository.findByThread.mockResolvedValue([stale]);
		const filesystem = fakeFilesystem({});
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		await service.reconcile(sessionId);

		expect(repository.delete).toHaveBeenCalledWith(['out-gone']);
		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['bin-gone']);
	});

	it('does not list scratch files outside the output directory', async () => {
		const { service, binaryDataService } = makeService();
		const filesystem = fakeFilesystem({});
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, {
			agentId: 'agent-1',
			projectId: 'project-1',
			filesystem,
			workspaceRoot,
		});

		await service.sync({ sessionId, writerId: 'parent', filesystem, workspaceRoot });

		expect(filesystem.readdir).toHaveBeenCalledWith(outputAbs, { recursive: true });
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});
});
