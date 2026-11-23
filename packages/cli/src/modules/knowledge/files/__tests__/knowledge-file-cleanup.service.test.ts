import type { ExecutionDataJsonStore } from '@n8n/backend-services';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import type { BinaryDataRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ErrorReporter, FsByteStoreService, StorageConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeFileCleanupRepository } from '../../repositories/knowledge-file-cleanup.repository';
import { KnowledgeFileCleanupService } from '../knowledge-file-cleanup.service';
import { KnowledgeFileStore } from '../knowledge-file-store';

describe('KnowledgeFileCleanupService', () => {
	const scope: KnowledgeConsumerScope = {
		kind: 'agent',
		projectId: 'project-1',
		agentId: 'agent-1',
	};
	const fileCleanupRepository = mock<KnowledgeFileCleanupRepository>();
	const fsByteStore = mock<FsByteStoreService>();
	const binaryDataRepository = mock<BinaryDataRepository>();
	const objectStore = mock<ObjectStoreService>();
	const azureBlob = mock<AzureBlobService>();
	const executionDataJsonStore = mock<ExecutionDataJsonStore>();
	const errorReporter = mock<ErrorReporter>();
	let service: KnowledgeFileCleanupService;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(ObjectStoreService, objectStore);
		Container.set(AzureBlobService, azureBlob);
		const fileStore = new KnowledgeFileStore(
			fsByteStore,
			mock<StorageConfig>(),
			binaryDataRepository,
			errorReporter,
		);
		service = new KnowledgeFileCleanupService(
			fileCleanupRepository,
			fileStore,
			executionDataJsonStore,
		);
	});

	it('registers configured blob stores on demand and deletes each recorded storage key', async () => {
		executionDataJsonStore.hasLocation.mockReturnValue(true);
		const legacyKey = 'agents/agent-1/knowledge-files/legacy/binary_data/file-1';
		fileCleanupRepository.findStorageReferencesByAgentId.mockResolvedValue([
			{ storedAt: 's3', storageKey: 's3-key' },
			{ storedAt: 'az', storageKey: 'azure-key' },
			{ storedAt: 'db', storageKey: 'database-key' },
			{ storedAt: 'fs', storageKey: 'filesystem-key' },
			{ storedAt: 'fs', storageKey: legacyKey },
		]);

		await service.deleteStoredBytes(scope);

		expect(fileCleanupRepository.findStorageReferencesByAgentId).toHaveBeenCalledWith(
			scope.agentId,
		);
		expect(objectStore.deleteByKeys).toHaveBeenCalledExactlyOnceWith(['s3-key']);
		expect(azureBlob.delete).toHaveBeenCalledExactlyOnceWith('azure-key');
		expect(binaryDataRepository.deleteByFileIds).toHaveBeenCalledExactlyOnceWith(['database-key']);
		expect(fsByteStore.delete).toHaveBeenCalledExactlyOnceWith([
			'filesystem-key',
			legacyKey,
			`${legacyKey}.metadata`,
		]);
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	it('skips byte-store setup when the agent has no files', async () => {
		fileCleanupRepository.findStorageReferencesByAgentId.mockResolvedValue([]);

		await service.deleteStoredBytes(scope);

		expect(executionDataJsonStore.hasLocation).not.toHaveBeenCalled();
		expect(binaryDataRepository.deleteByFileIds).not.toHaveBeenCalled();
		expect(fsByteStore.delete).not.toHaveBeenCalled();
	});

	it('passes a storage failure to the caller that owns best-effort agent deletion', async () => {
		const error = new Error('Storage unavailable');
		fileCleanupRepository.findStorageReferencesByAgentId.mockResolvedValue([
			{ storedAt: 'fs', storageKey: 'filesystem-key' },
		]);
		fsByteStore.delete.mockRejectedValue(error);

		await expect(service.deleteStoredBytes(scope)).rejects.toBe(error);
	});
});
