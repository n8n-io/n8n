import type { Logger } from '@n8n/backend-common';
import type { OperationContext, Transaction } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { makeKnowledgeAvailabilityService } from '@/modules/knowledge/__tests__/test-utils/knowledge-availability.service';
import type {
	KnowledgeFileService,
	UploadedKnowledgeFile,
} from '@/modules/knowledge/files/knowledge-file.service';
import type { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import type { KnowledgeConsumerScope } from '@/modules/knowledge/knowledge-consumer-scope';

import type { AgentKnowledgeMirrorService } from '@/modules/knowledge/retrieval/mirror.service';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentProjectDeletionRepository } from '../repositories/agent-project-deletion.repository';
import type { AgentRepository } from '../repositories/agent.repository';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

const agentId = 'agent-1';
const projectId = 'project-1';
const scope: KnowledgeConsumerScope = { kind: 'agent', projectId, agentId };

function makeMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
	return {
		fieldname: 'files',
		originalname: 'document.txt',
		encoding: '7bit',
		mimetype: 'text/plain',
		buffer: Buffer.from('hello'),
		size: 5,
		stream: null as never,
		destination: '',
		filename: '',
		path: '',
		...overrides,
	};
}

const uploadedFile: UploadedKnowledgeFile = {
	file: {
		id: 'file-1',
		agentId,
		fileName: 'document.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 5,
		createdAt: '2026-06-01T10:00:00.000Z',
	},
	contentHash: 'hash',
};

describe('AgentKnowledgeService', () => {
	let agentRepository: Mocked<AgentRepository>;
	let knowledgeFileService: Mocked<KnowledgeFileService>;
	let agentSandboxRuntimeService: Mocked<AgentSandboxRuntimeService>;
	let agentKnowledgeMirrorService: Mocked<AgentKnowledgeMirrorService>;
	let projectDeletion: Mocked<AgentProjectDeletionRepository>;
	let logger: Mocked<Logger>;
	let service: AgentKnowledgeService;

	function makeService(
		knowledgeAvailabilityService: KnowledgeAvailabilityService = makeKnowledgeAvailabilityService(),
	) {
		return new AgentKnowledgeService(
			agentRepository,
			knowledgeFileService,
			agentSandboxRuntimeService,
			agentKnowledgeMirrorService,
			knowledgeAvailabilityService,
			projectDeletion,
			logger,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		knowledgeFileService = mock<KnowledgeFileService>();
		agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>();
		agentKnowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		projectDeletion = mock<AgentProjectDeletionRepository>();
		projectDeletion.withWritableProject.mockImplementation(
			async (_projectId, write, ctx = {}) => await write(ctx),
		);
		logger = mock<Logger>();
		service = makeService();
	});

	it('uploads with the agent scope, reserves each row inside the project-deletion fence, and pre-warms the mirror', async () => {
		const ctx: OperationContext = { trx: mock<Transaction>() };
		projectDeletion.withWritableProject.mockImplementation(
			async (_projectId, write) => await write(ctx),
		);
		const files = [makeMulterFile()];
		knowledgeFileService.uploadFiles.mockImplementation(async (_scope, _files, reserveRow) => {
			await expect(reserveRow(async (writeCtx) => writeCtx)).resolves.toBe(ctx);
			return [uploadedFile];
		});

		await expect(service.uploadFiles(agentId, projectId, files)).resolves.toEqual([uploadedFile]);

		expect(knowledgeFileService.uploadFiles).toHaveBeenCalledWith(
			scope,
			files,
			expect.any(Function),
		);
		expect(projectDeletion.withWritableProject).toHaveBeenCalledWith(
			projectId,
			expect.any(Function),
		);
		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it('does not pre-warm the mirror when the upload is rejected', async () => {
		knowledgeFileService.uploadFiles.mockRejectedValue(new Error('rejected'));

		await expect(service.uploadFiles(agentId, projectId, [makeMulterFile()])).rejects.toThrow(
			'rejected',
		);

		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
	});

	it('lists the files of the agent through the knowledge module', async () => {
		knowledgeFileService.listFiles.mockResolvedValue([uploadedFile.file]);

		await expect(service.listFiles(agentId, projectId)).resolves.toEqual([uploadedFile.file]);

		expect(knowledgeFileService.listFiles).toHaveBeenCalledWith(scope);
	});

	it('warms the knowledge sandbox when the agent has files', async () => {
		knowledgeFileService.hasFiles.mockResolvedValue(true);

		await expect(service.warmKnowledgeSandbox(agentId, projectId)).resolves.toBeUndefined();

		expect(knowledgeFileService.hasFiles).toHaveBeenCalledWith(scope);
		expect(agentSandboxRuntimeService.warmKnowledgeSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it('does not warm the knowledge sandbox without files', async () => {
		knowledgeFileService.hasFiles.mockResolvedValue(false);

		await expect(service.warmKnowledgeSandbox(agentId, projectId)).resolves.toBeUndefined();

		expect(agentSandboxRuntimeService.warmKnowledgeSandbox).not.toHaveBeenCalled();
	});

	it('returns false and leaves the sandbox alone when the agent has no such file', async () => {
		knowledgeFileService.deleteFile.mockResolvedValue(false);

		await expect(service.deleteFile(agentId, projectId, 'missing-file')).resolves.toBe(false);

		expect(knowledgeFileService.deleteFile).toHaveBeenCalledWith(scope, 'missing-file');
		expect(knowledgeFileService.hasFiles).not.toHaveBeenCalled();
		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).not.toHaveBeenCalled();
	});

	it('pre-warms the mirror when files remain after a deletion', async () => {
		knowledgeFileService.deleteFile.mockResolvedValue(true);
		knowledgeFileService.hasFiles.mockResolvedValue(true);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBe(true);

		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).not.toHaveBeenCalled();
	});

	it('destroys the knowledge sandbox after the final file is deleted', async () => {
		knowledgeFileService.deleteFile.mockResolvedValue(true);
		knowledgeFileService.hasFiles.mockResolvedValue(false);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBe(true);

		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
	});

	it('deletes all files of the agent through the knowledge module', async () => {
		await expect(service.deleteAllFilesForAgent(projectId, agentId)).resolves.toBeUndefined();

		expect(knowledgeFileService.deleteAll).toHaveBeenCalledWith(scope);
	});

	it('destroys the knowledge sandbox on request', async () => {
		await service.destroyKnowledgeSandbox(projectId, agentId);

		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it.each([
		['uploadFiles', async () => await service.uploadFiles(agentId, projectId, [makeMulterFile()])],
		['listFiles', async () => await service.listFiles(agentId, projectId)],
		['warmKnowledgeSandbox', async () => await service.warmKnowledgeSandbox(agentId, projectId)],
		['deleteFile', async () => await service.deleteFile(agentId, projectId, 'file-1')],
	])('rejects %s for an agent outside the project before delegating', async (_name, call) => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(call()).rejects.toThrow(NotFoundError);

		expect(knowledgeFileService.uploadFiles).not.toHaveBeenCalled();
		expect(knowledgeFileService.listFiles).not.toHaveBeenCalled();
		expect(knowledgeFileService.hasFiles).not.toHaveBeenCalled();
		expect(knowledgeFileService.deleteFile).not.toHaveBeenCalled();
	});

	it('removes the temp files of an upload that is rejected before it reaches the knowledge module', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-facade-'));
		try {
			const tempFilePath = path.join(tempDirectory, 'notes.txt');
			await writeFile(tempFilePath, 'hello');

			await expect(
				service.uploadFiles(agentId, projectId, [makeMulterFile({ path: tempFilePath })]),
			).rejects.toThrow(NotFoundError);

			await expect(access(tempFilePath)).rejects.toThrow();
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}
	});

	describe('with the knowledge module inactive', () => {
		beforeEach(() => {
			service = makeService(makeKnowledgeAvailabilityService({ isKnowledgeActive: false }));
		});

		it.each([
			[
				'uploadFiles',
				async () => await service.uploadFiles(agentId, projectId, [makeMulterFile()]),
			],
			['listFiles', async () => await service.listFiles(agentId, projectId)],
			['warmKnowledgeSandbox', async () => await service.warmKnowledgeSandbox(agentId, projectId)],
			['deleteFile', async () => await service.deleteFile(agentId, projectId, 'file-1')],
		])('rejects %s before delegating', async (_name, call) => {
			await expect(call()).rejects.toThrow(NotFoundError);

			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
			expect(knowledgeFileService.uploadFiles).not.toHaveBeenCalled();
			expect(knowledgeFileService.listFiles).not.toHaveBeenCalled();
			expect(knowledgeFileService.hasFiles).not.toHaveBeenCalled();
			expect(knowledgeFileService.deleteFile).not.toHaveBeenCalled();
			expect(agentSandboxRuntimeService.warmKnowledgeSandbox).not.toHaveBeenCalled();
		});

		it('keeps the stored blobs on agent deletion and warns, because the file entity is not registered', async () => {
			await service.deleteAllFilesForAgent(projectId, agentId);

			expect(knowledgeFileService.deleteAll).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Knowledge module is inactive'),
				{ agentId },
			);
		});

		it('still destroys the sandbox, which needs no module entity', async () => {
			await service.destroyKnowledgeSandbox(projectId, agentId);

			expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
				projectId,
				agentId,
			);
		});
	});
});
