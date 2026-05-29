import type { BinaryDataService } from 'n8n-core';
import { generateNanoId } from '@n8n/utils';
import { mock } from 'jest-mock-extended';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

const mockGetText = jest.fn<Promise<{ text: string; total: number }>, []>();
const mockDestroy = jest.fn<Promise<void>, []>();

jest.mock('pdf-parse', () => ({
	__esModule: true,
	PDFParse: jest.fn().mockImplementation(() => ({
		getText: mockGetText,
		destroy: mockDestroy,
	})),
}));

jest.mock('@n8n/utils', () => ({
	...jest.requireActual('@n8n/utils'),
	generateNanoId: jest.fn(() => 'file-1'),
}));

const agentId = 'agent-1';
const projectId = 'project-1';

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

describe('AgentKnowledgeService', () => {
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentFileRepository: jest.Mocked<AgentFileRepository>;
	let binaryDataService: jest.Mocked<BinaryDataService>;
	let service: AgentKnowledgeService;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		agentFileRepository = mock<AgentFileRepository>();
		binaryDataService = mock<BinaryDataService>();

		agentFileRepository.create.mockImplementation((data?: Partial<unknown>) => data as never);
		binaryDataService.store.mockResolvedValue({ id: 'binary-1' } as never);
		agentFileRepository.save.mockImplementation(
			async (file) =>
				({
					createdAt: new Date('2026-05-24T12:00:00.000Z'),
					...file,
				}) as never,
		);
		binaryDataService.getAsStream.mockImplementation(async () =>
			Readable.from(Buffer.from('stored text')),
		);
		jest.mocked(generateNanoId).mockReset().mockReturnValue('file-1');
		mockGetText.mockReset();
		mockDestroy.mockReset().mockResolvedValue(undefined);

		service = new AgentKnowledgeService(agentRepository, agentFileRepository, binaryDataService);
	});

	it('rejects files for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.uploadFiles(agentId, projectId, [makeMulterFile()])).rejects.toThrow(
			NotFoundError,
		);

		expect(binaryDataService.store).not.toHaveBeenCalled();
		expect(agentFileRepository.save).not.toHaveBeenCalled();
	});

	it('rejects listing files for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.listFiles(agentId, projectId)).rejects.toThrow(NotFoundError);

		expect(agentFileRepository.findByAgentId).not.toHaveBeenCalled();
	});

	it('rejects deleting files for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).rejects.toThrow(NotFoundError);

		expect(agentFileRepository.findByIdAndAgentId).not.toHaveBeenCalled();
		expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
	});

	it('lists file rows for the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByAgentId.mockResolvedValue([
			{
				id: 'file-1',
				agentId,
				fileName: 'document.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
		] as never);

		await expect(service.listFiles(agentId, projectId)).resolves.toEqual([
			{
				id: 'file-1',
				agentId,
				fileName: 'document.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
				createdAt: '2026-05-24T12:00:00.000Z',
			},
		]);
		expect(agentFileRepository.findByAgentId).toHaveBeenCalledWith(agentId);
	});
	it('stores binary data and creates file rows for the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		const [file] = await service.uploadFiles(agentId, projectId, [makeMulterFile()]);

		expect(binaryDataService.store).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceType: 'agent_file',
				sourceId: 'file-1',
				pathSegments: ['agents', agentId, 'files', 'file-1'],
			}),
			Buffer.from('hello'),
			expect.objectContaining({
				fileName: 'document.txt',
				mimeType: 'text/plain',
				fileSize: '5',
				bytes: 5,
			}),
		);
		expect(agentFileRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'file-1',
				agentId,
				binaryDataId: 'binary-1',
				fileName: 'document.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
			}),
		);
		expect(file).toEqual({
			id: 'file-1',
			agentId,
			fileName: 'document.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
			createdAt: '2026-05-24T12:00:00.000Z',
		});
	});

	it('rolls back stored files and removes temp files when batch upload fails', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		jest.mocked(generateNanoId).mockReturnValueOnce('file-1').mockReturnValueOnce('file-2');
		binaryDataService.store
			.mockResolvedValueOnce({ id: 'binary-1' } as never)
			.mockRejectedValueOnce(new Error('disk full'));
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const firstPath = path.join(tempDirectory, 'first-upload');
		const secondPath = path.join(tempDirectory, 'second-upload');
		await writeFile(firstPath, 'first');
		await writeFile(secondPath, 'second');

		try {
			await expect(
				service.uploadFiles(agentId, projectId, [
					makeMulterFile({
						originalname: 'first.txt',
						buffer: undefined as never,
						path: firstPath,
						size: 5,
					}),
					makeMulterFile({
						originalname: 'second.txt',
						buffer: undefined as never,
						path: secondPath,
						size: 6,
					}),
				]),
			).rejects.toThrow('disk full');

			expect(agentFileRepository.delete).toHaveBeenCalledWith(['file-1']);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['binary-1']);
			await expect(access(firstPath)).rejects.toThrow();
			await expect(access(secondPath)).rejects.toThrow();
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}
	});

	it('rejects file names longer than the metadata column limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ originalname: `${'a'.repeat(256)}.txt` }),
			]),
		).rejects.toThrow(BadRequestError);

		expect(binaryDataService.store).not.toHaveBeenCalled();
		expect(agentFileRepository.save).not.toHaveBeenCalled();
	});

	it('rejects MIME types longer than the metadata column limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ mimetype: 'text/'.concat('a'.repeat(256)) }),
			]),
		).rejects.toThrow(BadRequestError);

		expect(binaryDataService.store).not.toHaveBeenCalled();
		expect(agentFileRepository.save).not.toHaveBeenCalled();
	});

	it('deletes the file row and stored binary data for the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByIdAndAgentId.mockResolvedValue({
			id: 'file-1',
			agentId,
			binaryDataId: 'binary-1',
			fileName: 'document.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
			createdAt: new Date('2026-05-24T12:00:00.000Z'),
		} as never);

		await service.deleteFile(agentId, projectId, 'file-1');

		expect(agentFileRepository.delete).toHaveBeenCalledWith({ id: 'file-1', agentId });
		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['binary-1']);
		expect(binaryDataService.deleteManyByBinaryDataId.mock.invocationCallOrder[0]).toBeLessThan(
			agentFileRepository.delete.mock.invocationCallOrder[0],
		);
	});

	it('deletes all stored binary data before deleting agent file rows', async () => {
		agentFileRepository.findByAgentId.mockResolvedValue([
			{
				id: 'file-1',
				agentId,
				binaryDataId: 'binary-1',
				fileName: 'document.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
			{
				id: 'file-2',
				agentId,
				binaryDataId: 'binary-2',
				fileName: 'notes.md',
				mimeType: 'text/markdown',
				fileSizeBytes: 9,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
		] as never);

		await service.deleteAllFilesForAgent(agentId);

		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
			'binary-1',
			'binary-2',
		]);
		expect(agentFileRepository.delete).toHaveBeenCalledWith({ agentId });
		expect(binaryDataService.deleteManyByBinaryDataId.mock.invocationCallOrder[0]).toBeLessThan(
			agentFileRepository.delete.mock.invocationCallOrder[0],
		);
	});

	it('rejects deleting files that are not attached to the agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByIdAndAgentId.mockResolvedValue(null);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).rejects.toThrow(NotFoundError);

		expect(agentFileRepository.delete).not.toHaveBeenCalled();
		expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
	});

	it('stores extracted PDF text as the binary payload while preserving the PDF filename', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		mockGetText.mockResolvedValue({ text: 'Extracted PDF text', total: 1 });

		const [file] = await service.uploadFiles(agentId, projectId, [
			makeMulterFile({
				originalname: 'document.pdf',
				mimetype: 'application/pdf',
				buffer: Buffer.from('%PDF original bytes'),
				size: 19,
			}),
		]);

		expect(binaryDataService.store).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceType: 'agent_file',
				sourceId: 'file-1',
			}),
			Buffer.from('Extracted PDF text', 'utf8'),
			expect.objectContaining({
				fileName: 'document.pdf.txt',
				mimeType: 'text/plain',
				fileSize: '18',
				bytes: 18,
				fileExtension: 'txt',
			}),
		);
		expect(agentFileRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				fileName: 'document.pdf',
				mimeType: 'text/plain',
				fileSizeBytes: 19,
			}),
		);
		expect(file).toMatchObject({
			fileName: 'document.pdf',
			mimeType: 'text/plain',
			fileSizeBytes: 19,
		});
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('rejects PDFs with no extractable text', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		mockGetText.mockResolvedValue({ text: '   ', total: 1 });

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({
					originalname: 'empty.pdf',
					mimetype: 'application/pdf',
					buffer: Buffer.from('%PDF original bytes'),
				}),
			]),
		).rejects.toThrow(BadRequestError);

		expect(binaryDataService.store).not.toHaveBeenCalled();
		expect(agentFileRepository.save).not.toHaveBeenCalled();
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('materializes stored PDF text as a text file', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByAgentId.mockResolvedValue([
			{
				id: 'file-1',
				agentId,
				binaryDataId: 'binary-1',
				fileName: 'document.pdf',
				mimeType: 'text/plain',
				fileSizeBytes: 19,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
		] as never);
		binaryDataService.getAsStream.mockImplementation(async () =>
			Readable.from(Buffer.from('stored PDF text')),
		);
		const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-service-'));
		try {
			const files = await service.materializeWorkspace(agentId, projectId, workspaceRoot);

			expect(files).toEqual([
				expect.objectContaining({
					fileName: 'document.pdf',
					mimeType: 'text/plain',
					relativePath: 'file-1.pdf.txt',
				}),
			]);
			await expect(readFile(path.join(workspaceRoot, 'file-1.pdf.txt'), 'utf8')).resolves.toBe(
				'stored PDF text',
			);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
	it('materializes only requested files when file references are provided', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByAgentId.mockResolvedValue([
			{
				id: 'file-1',
				agentId,
				binaryDataId: 'binary-1',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 17,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
			{
				id: 'file-2',
				agentId,
				binaryDataId: 'binary-2',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 10,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
		] as never);
		binaryDataService.getAsStream.mockImplementation(async () =>
			Readable.from(Buffer.from('name,age\nAlice,30\n')),
		);
		const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-service-'));
		try {
			const files = await service.materializeWorkspace(agentId, projectId, workspaceRoot, {
				fileReferences: ['file-1'],
			});

			expect(files).toEqual([expect.objectContaining({ id: 'file-1' })]);
			expect(binaryDataService.getAsStream).toHaveBeenCalledTimes(1);
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('binary-1');
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it('materializes files requested by display file name', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		agentFileRepository.findByAgentId.mockResolvedValue([
			{
				id: 'file-1',
				agentId,
				binaryDataId: 'binary-1',
				fileName: 'data.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 17,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
			{
				id: 'file-2',
				agentId,
				binaryDataId: 'binary-2',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 10,
				createdAt: new Date('2026-05-24T12:00:00.000Z'),
			},
		] as never);
		binaryDataService.getAsStream.mockImplementation(async () =>
			Readable.from(Buffer.from('name,age\nAlice,30\n')),
		);
		const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-service-'));
		try {
			const files = await service.materializeWorkspace(agentId, projectId, workspaceRoot, {
				fileReferences: ['data.csv'],
			});

			expect(files).toEqual([expect.objectContaining({ id: 'file-1', fileName: 'data.csv' })]);
			expect(binaryDataService.getAsStream).toHaveBeenCalledTimes(1);
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('binary-1');
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});
