import { mock } from 'jest-mock-extended';
import { mkdtemp, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRepository } from '../repositories/agent.repository';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

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
	let service: AgentKnowledgeService;

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		service = new AgentKnowledgeService(agentRepository);
	});

	it('rejects uploads for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'upload.txt');
		await writeFile(tempFilePath, 'hello');

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ path: tempFilePath, buffer: undefined }),
			]),
		).rejects.toThrow(NotFoundError);
		await expect(access(tempFilePath)).rejects.toThrow();
	});

	it('rejects listing files for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.listFiles(agentId, projectId)).rejects.toThrow(NotFoundError);
	});

	it('rejects deleting files for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).rejects.toThrow(NotFoundError);
	});

	it('returns an empty list for a valid agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(service.listFiles(agentId, projectId)).resolves.toEqual([]);
	});

	it('returns an empty array for a valid upload and cleans temp files', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'upload.txt');
		await writeFile(tempFilePath, 'hello');

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ path: tempFilePath, buffer: undefined }),
			]),
		).resolves.toEqual([]);

		await expect(access(tempFilePath)).rejects.toThrow();
	});

	it('resolves delete for a valid agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();
	});

	it('resolves deleteAllFilesForAgent without touching storage', async () => {
		await expect(service.deleteAllFilesForAgent(agentId)).resolves.toBeUndefined();
	});
});
