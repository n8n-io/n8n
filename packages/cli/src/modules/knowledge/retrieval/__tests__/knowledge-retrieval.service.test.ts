import { mock } from 'vitest-mock-extended';

import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeSandboxProviderProxy } from '../../knowledge-sandbox-provider-proxy';
import type { KnowledgeFileRepository } from '../../repositories/knowledge-file.repository';
import type { KnowledgeCollectionSourceService } from '../collection-source.service';
import { KnowledgeRetrievalService } from '../knowledge-retrieval.service';
import type { KnowledgeMirrorService } from '../mirror.service';
import type {
	FindKnowledgeFilesResult,
	ReadKnowledgeFileResult,
	SearchKnowledgeTextResult,
} from '../retrieval-schemas';

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

describe('KnowledgeRetrievalService', () => {
	const fileRepository = mock<KnowledgeFileRepository>();
	const mirrorService = mock<KnowledgeMirrorService>();
	const sandboxProviderProxy = mock<KnowledgeSandboxProviderProxy>();
	const collectionSourceService = mock<KnowledgeCollectionSourceService>();
	const service = new KnowledgeRetrievalService(
		fileRepository,
		mirrorService,
		sandboxProviderProxy,
		collectionSourceService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		fileRepository.hasFilesForAgent.mockResolvedValue(false);
		collectionSourceService.hasSearchableCollection.mockResolvedValue(false);
		collectionSourceService.hasSearchableCollectionFile.mockResolvedValue(false);
	});

	it('answers that the scope has files from the file repository, without a collection check', async () => {
		fileRepository.hasFilesForAgent.mockResolvedValue(true);

		await expect(service.hasFiles(scope)).resolves.toBe(true);

		expect(fileRepository.hasFilesForAgent).toHaveBeenCalledWith('agent-1', {});
		expect(collectionSourceService.hasSearchableCollection).not.toHaveBeenCalled();
	});

	it('answers that a scope without files of its own has files when it has a collection', async () => {
		collectionSourceService.hasSearchableCollection.mockResolvedValue(true);

		await expect(service.hasFiles(scope)).resolves.toBe(true);

		expect(collectionSourceService.hasSearchableCollection).toHaveBeenCalledWith(scope);
	});

	it('answers that a scope without files and without collections has no files', async () => {
		await expect(service.hasFiles(scope)).resolves.toBe(false);
	});

	it('warms the sandbox when the scope has files', async () => {
		fileRepository.hasFilesForAgent.mockResolvedValue(true);

		await service.warmSandbox(scope);

		expect(sandboxProviderProxy.warm).toHaveBeenCalledExactlyOnceWith(scope);
	});

	it('warms the sandbox when the scope has a collection with files and no files of its own', async () => {
		collectionSourceService.hasSearchableCollection.mockResolvedValue(true);
		collectionSourceService.hasSearchableCollectionFile.mockResolvedValue(true);

		await service.warmSandbox(scope);

		expect(sandboxProviderProxy.warm).toHaveBeenCalledExactlyOnceWith(scope);
		expect(collectionSourceService.hasSearchableCollectionFile).toHaveBeenCalledWith(scope);
	});

	it('does not warm the sandbox of a scope whose only collection is empty, although it has the tools', async () => {
		collectionSourceService.hasSearchableCollection.mockResolvedValue(true);

		await expect(service.hasFiles(scope)).resolves.toBe(true);
		await service.warmSandbox(scope);

		expect(sandboxProviderProxy.warm).not.toHaveBeenCalled();
	});

	it('does not warm the sandbox of a scope without files', async () => {
		await service.warmSandbox(scope);

		expect(sandboxProviderProxy.warm).not.toHaveBeenCalled();
	});

	it('destroys the sandbox on request without reading the file rows', async () => {
		await service.destroySandbox(scope);

		expect(sandboxProviderProxy.destroy).toHaveBeenCalledExactlyOnceWith(scope);
		expect(fileRepository.hasFilesForAgent).not.toHaveBeenCalled();
		expect(collectionSourceService.hasSearchableCollection).not.toHaveBeenCalled();
	});

	it('finds, searches and reads through the mirror with the scope unchanged', async () => {
		const found = mock<FindKnowledgeFilesResult>();
		const searched = mock<SearchKnowledgeTextResult>();
		const read = mock<ReadKnowledgeFileResult>();
		mirrorService.findFiles.mockResolvedValue(found);
		mirrorService.searchText.mockResolvedValue(searched);
		mirrorService.readFile.mockResolvedValue(read);

		await expect(service.findFiles(scope, { pattern: '*' })).resolves.toBe(found);
		await expect(service.searchText(scope, { pattern: 'refund' })).resolves.toBe(searched);
		await expect(service.readFile(scope, { file: 'notes.txt' })).resolves.toBe(read);

		expect(mirrorService.findFiles).toHaveBeenCalledWith(scope, { pattern: '*' });
		expect(mirrorService.searchText).toHaveBeenCalledWith(scope, { pattern: 'refund' }, undefined);
		expect(mirrorService.readFile).toHaveBeenCalledWith(scope, { file: 'notes.txt' }, undefined);
	});

	it('passes the observer of a search or read to the mirror', async () => {
		const observer = { onPreparationWait: vi.fn() };

		await service.searchText(scope, { pattern: 'refund' }, observer);
		await service.readFile(scope, { file: 'notes.txt' }, observer);

		expect(mirrorService.searchText).toHaveBeenCalledWith(scope, { pattern: 'refund' }, observer);
		expect(mirrorService.readFile).toHaveBeenCalledWith(scope, { file: 'notes.txt' }, observer);
	});
});
