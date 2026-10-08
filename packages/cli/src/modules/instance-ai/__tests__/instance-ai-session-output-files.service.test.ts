import { MAX_SESSION_OUTPUT_FILE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkspaceFilesystem } from '@n8n/agents';
import type { BinaryDataService } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InstanceAiSessionOutputFilesService } from '../instance-ai-session-output-files.service';
import type { InstanceAiChatAttachmentService } from '../instance-ai-chat-attachment.service';
import type { InstanceAiSessionUploadFilesService } from '../instance-ai-session-upload-files.service';
import type { InstanceAiSessionOutputFile } from '../entities/instance-ai-session-output-file.entity';
import type { InstanceAiSessionOutputFileRepository } from '../repositories/instance-ai-session-output-file.repository';

const sessionId = '00000000-0000-4000-8000-000000000001';
const workspaceRoot = '/workspace';
const outputAbs = `${workspaceRoot}/outputs/${sessionId}`;

function makeService() {
	const binaryDataService = mock<BinaryDataService>();
	const repository = mock<InstanceAiSessionOutputFileRepository>();
	const attachments = mock<InstanceAiChatAttachmentService>();
	binaryDataService.store.mockResolvedValue({
		id: 'bin-1',
		data: 'filesystem-v2',
		mimeType: 'text/markdown',
	});
	repository.create.mockImplementation((input) => input as InstanceAiSessionOutputFile);
	repository.save.mockImplementation(async (input) => input as InstanceAiSessionOutputFile);
	repository.findByThreadAndFileName.mockResolvedValue(null);
	repository.findByThread.mockResolvedValue([]);
	repository.countByThread.mockResolvedValue(0);
	repository.sumFileSizeBytesByThread.mockResolvedValue(0);
	attachments.listSessionFiles.mockResolvedValue([]);
	const uploads = mock<InstanceAiSessionUploadFilesService>();
	uploads.decorateList.mockImplementation((_sessionId, files) => ({ files }));
	const service = new InstanceAiSessionOutputFilesService(
		mock<Logger>(),
		binaryDataService,
		repository,
		attachments,
		uploads,
	);
	return { service, binaryDataService, repository };
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

describe('InstanceAiSessionOutputFilesService', () => {
	it('copies a file from the output directory after bind', async () => {
		const { service, binaryDataService, repository } = makeService();
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'hi' } });
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

		const result = await service.sync({
			sessionId,
			writerId: 'parent',
			filesystem,
			workspaceRoot,
		});

		expect(result.errors).toEqual([]);
		expect(binaryDataService.store).toHaveBeenCalled();
		expect(repository.save).toHaveBeenCalled();
	});

	it('skips a file over 50 MB', async () => {
		const { service, binaryDataService } = makeService();
		const filesystem = fakeFilesystem({
			'huge.bin': { content: 'x', size: MAX_SESSION_OUTPUT_FILE_BYTES + 1 },
		});
		service.bindRun({ sessionId, runId: 'run-1' });
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

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

	it('does not copy when the run is unbound', async () => {
		const { service, binaryDataService } = makeService();
		const filesystem = fakeFilesystem({ 'hello.md': { content: 'hi' } });
		service.registerWorkspace(sessionId, { filesystem, workspaceRoot });

		await service.sync({ sessionId, writerId: 'parent', filesystem, workspaceRoot });

		expect(binaryDataService.store).not.toHaveBeenCalled();
	});
});
