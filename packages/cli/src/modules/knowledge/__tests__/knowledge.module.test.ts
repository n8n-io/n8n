import { S3ByteStore } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import { KnowledgeFile } from '../entities/knowledge-file.entity';
import { KnowledgeFileStore } from '../files/knowledge-file-store';
import { KnowledgeModule } from '../knowledge.module';

describe('KnowledgeModule', () => {
	it('registers the module entrypoint under the name the registry loads', () => {
		expect(Container.get(ModuleMetadata).get('knowledge')?.class).toBe(KnowledgeModule);
	});

	it('is unlicensed and runs on every instance type', () => {
		const entry = Container.get(ModuleMetadata).get('knowledge');

		expect(entry?.licenseFlag).toBeUndefined();
		expect(entry?.instanceTypes).toBeUndefined();
	});

	it('registers the knowledge file entity', async () => {
		await expect(new KnowledgeModule().entities()).resolves.toEqual([KnowledgeFile]);
	});

	it('registers the configured blob backends on the knowledge file store on init', async () => {
		const knowledgeFileStore = mock<KnowledgeFileStore>();
		Container.set(KnowledgeFileStore, knowledgeFileStore);
		Container.set(
			ExecutionDataJsonStore,
			mock<ExecutionDataJsonStore>({ hasLocation: (location: string) => location === 's3' }),
		);
		Container.set(ObjectStoreService, mock<ObjectStoreService>());

		await new KnowledgeModule().init();

		expect(knowledgeFileStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(knowledgeFileStore.registerByteStore).toHaveBeenCalledWith(
			's3',
			expect.any(S3ByteStore),
		);
	});
});
