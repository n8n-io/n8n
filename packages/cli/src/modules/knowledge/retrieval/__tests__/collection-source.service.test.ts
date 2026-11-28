import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { makeKnowledgeAvailabilityService } from '../../__tests__/test-utils/knowledge-availability.service';
import type { KnowledgeCollection, KnowledgeFile } from '../../entities';
import type { KnowledgeAvailabilityService } from '../../knowledge-availability.service';
import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeCollectionFileRepository } from '../../repositories/knowledge-collection-file.repository';
import type { KnowledgeCollectionRepository } from '../../repositories/knowledge-collection.repository';
import { KnowledgeCollectionSourceService } from '../collection-source.service';

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

function makeCollection(overrides: Partial<KnowledgeCollection> = {}): KnowledgeCollection {
	return {
		id: 'collection-1',
		name: 'Employee handbook',
		description: 'Company policies on leave, expenses and benefits',
		slug: 'employee_handbook',
		kind: 'shared',
		projectId: scope.projectId,
		agentId: null,
		isGlobal: false,
		createdById: null,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	} as KnowledgeCollection;
}

function makeFile(overrides: Partial<KnowledgeFile> = {}): KnowledgeFile {
	const id = overrides.id ?? 'file-1';
	return {
		id,
		knowledgeCollectionId: 'collection-1',
		name: 'leave-policy.pdf',
		description: null,
		storedAt: 'fs',
		storageKey: `knowledge-collections/collection-1/files/${id}/content`,
		mimeType: 'application/pdf',
		fileSizeBytes: 100,
		createdById: null,
		createdAt: new Date('2024-02-01T00:00:00.000Z'),
		updatedAt: new Date('2024-02-01T00:00:00.000Z'),
		...overrides,
	} as KnowledgeFile;
}

function makeService({
	availabilityService = makeKnowledgeAvailabilityService(),
	collectionRepository = mock<KnowledgeCollectionRepository>(),
	fileRepository = mock<KnowledgeCollectionFileRepository>(),
	logger = mock<Logger>(),
}: {
	availabilityService?: KnowledgeAvailabilityService;
	collectionRepository?: ReturnType<typeof mock<KnowledgeCollectionRepository>>;
	fileRepository?: ReturnType<typeof mock<KnowledgeCollectionFileRepository>>;
	logger?: ReturnType<typeof mock<Logger>>;
} = {}) {
	logger.scoped.mockReturnValue(logger);
	return {
		service: new KnowledgeCollectionSourceService(
			availabilityService,
			collectionRepository,
			fileRepository,
			logger,
		),
		collectionRepository,
		fileRepository,
		logger,
	};
}

describe('KnowledgeCollectionSourceService', () => {
	describe('hasSearchableCollection', () => {
		it('asks the repository with the agent and the project of the scope', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.hasSearchableByAgent.mockResolvedValue(true);

			await expect(service.hasSearchableCollection(scope)).resolves.toBe(true);

			expect(collectionRepository.hasSearchableByAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{},
			);
		});

		it('is false without a repository call while collections are off', async () => {
			const { service, collectionRepository } = makeService({
				availabilityService: makeKnowledgeAvailabilityService({ collectionsFlag: false }),
			});

			await expect(service.hasSearchableCollection(scope)).resolves.toBe(false);

			expect(collectionRepository.hasSearchableByAgent).not.toHaveBeenCalled();
		});
	});

	describe('hasSearchableCollectionFile', () => {
		it('asks the repository for a file in a searchable collection of the scope', async () => {
			const { service, collectionRepository } = makeService();
			collectionRepository.hasSearchableFileByAgent.mockResolvedValue(true);

			await expect(service.hasSearchableCollectionFile(scope)).resolves.toBe(true);

			expect(collectionRepository.hasSearchableFileByAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{},
			);
		});

		it('is false without a repository call while collections are off', async () => {
			const { service, collectionRepository } = makeService({
				availabilityService: makeKnowledgeAvailabilityService({ collectionsFlag: false }),
			});

			await expect(service.hasSearchableCollectionFile(scope)).resolves.toBe(false);

			expect(collectionRepository.hasSearchableFileByAgent).not.toHaveBeenCalled();
		});
	});

	describe('loadSearchableCollections', () => {
		it('returns the collections of the scope with their files under one directory each', async () => {
			const { service, collectionRepository, fileRepository } = makeService();
			collectionRepository.findSearchableByAgent.mockResolvedValue([
				makeCollection(),
				makeCollection({
					id: 'collection-2',
					name: 'Product docs',
					description: null,
					slug: 'product_docs',
				}),
				makeCollection({ id: 'collection-3', name: 'Empty', slug: 'empty' }),
			]);
			fileRepository.findByCollectionIds.mockResolvedValue([
				makeFile(),
				makeFile({ id: 'file-2', name: 'expenses.md', mimeType: 'text/markdown' }),
				makeFile({ id: 'file-3', knowledgeCollectionId: 'collection-2', name: 'api.txt' }),
			]);

			const source = await service.loadSearchableCollections(scope);

			expect(collectionRepository.findSearchableByAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				{},
			);
			expect(fileRepository.findByCollectionIds).toHaveBeenCalledWith(
				['collection-1', 'collection-2', 'collection-3'],
				{},
			);
			expect(source.collections).toEqual([
				{
					dir: 'employee_handbook',
					name: 'Employee handbook',
					description: 'Company policies on leave, expenses and benefits',
					fileCount: 2,
				},
				{ dir: 'product_docs', name: 'Product docs', description: null, fileCount: 1 },
				{
					dir: 'empty',
					name: 'Empty',
					description: 'Company policies on leave, expenses and benefits',
					fileCount: 0,
				},
			]);
			expect(source.files).toEqual([
				{
					file: 'employee_handbook/leave-policy.txt',
					fileId: 'file-1',
					storedAt: 'fs',
					storageKey: 'knowledge-collections/collection-1/files/file-1/content',
					displayName: 'leave-policy.pdf',
					mimeType: 'application/pdf',
					fileSizeBytes: 100,
					createdAt: '2024-02-01T00:00:00.000Z',
				},
				expect.objectContaining({
					file: 'employee_handbook/expenses.md',
					fileId: 'file-2',
					displayName: 'expenses.md',
				}),
				expect.objectContaining({
					file: 'product_docs/api.txt',
					fileId: 'file-3',
					displayName: 'api.txt',
				}),
			]);
		});

		it('is empty without a repository call while collections are off', async () => {
			const { service, collectionRepository, fileRepository } = makeService({
				availabilityService: makeKnowledgeAvailabilityService({ collectionsFlag: false }),
			});

			await expect(service.loadSearchableCollections(scope)).resolves.toEqual({
				collections: [],
				files: [],
			});

			expect(collectionRepository.findSearchableByAgent).not.toHaveBeenCalled();
			expect(fileRepository.findByCollectionIds).not.toHaveBeenCalled();
		});

		it('reads no files when the scope has no collection', async () => {
			const { service, collectionRepository, fileRepository } = makeService();
			collectionRepository.findSearchableByAgent.mockResolvedValue([]);

			await expect(service.loadSearchableCollections(scope)).resolves.toEqual({
				collections: [],
				files: [],
			});

			expect(fileRepository.findByCollectionIds).not.toHaveBeenCalled();
		});

		it('skips a collection whose slug cannot be a directory name, with a warning', async () => {
			const { service, collectionRepository, fileRepository, logger } = makeService();
			collectionRepository.findSearchableByAgent.mockResolvedValue([
				makeCollection({ id: 'collection-bad', slug: '../escape' }),
				makeCollection(),
			]);
			fileRepository.findByCollectionIds.mockResolvedValue([makeFile()]);

			const source = await service.loadSearchableCollections(scope);

			expect(fileRepository.findByCollectionIds).toHaveBeenCalledWith(['collection-1'], {});
			expect(source.collections.map(({ dir }) => dir)).toEqual(['employee_handbook']);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped a knowledge collection whose slug is not a valid directory name',
				{ collectionId: 'collection-bad', projectId: 'project-1', agentId: 'agent-1' },
			);
		});

		it('skips a file whose stored name cannot be a file name, with a warning, and keeps the others', async () => {
			const { service, collectionRepository, fileRepository, logger } = makeService();
			collectionRepository.findSearchableByAgent.mockResolvedValue([makeCollection()]);
			fileRepository.findByCollectionIds.mockResolvedValue([
				makeFile({ id: 'file-bad', name: '..' }),
				makeFile(),
			]);

			const source = await service.loadSearchableCollections(scope);

			expect(source.files.map(({ fileId }) => fileId)).toEqual(['file-1']);
			expect(source.collections[0].fileCount).toBe(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped a knowledge collection file whose name cannot be a file name',
				{
					collectionId: 'collection-1',
					fileId: 'file-bad',
					projectId: 'project-1',
					agentId: 'agent-1',
				},
			);
		});
	});
});
