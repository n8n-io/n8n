import type { FrontendModuleSettings } from '@n8n/api-types';
import { S3ByteStore } from '@n8n/blob-storage';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import { KnowledgeFile } from '../entities/knowledge-file.entity';
import { KnowledgeFileStore } from '../files/knowledge-file-store';
import { KnowledgeConfig } from '../knowledge.config';
import { KnowledgeModule } from '../knowledge.module';

// Compile-time pin: the settings this module returns are read by the frontend
// under this exact key, so the decorator name must stay a member of
// `FrontendModuleSettings`.
const MODULE_NAME = 'knowledge' satisfies keyof FrontendModuleSettings;

describe('KnowledgeModule', () => {
	it('registers the module entrypoint under the name the registry loads', () => {
		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.class).toBe(KnowledgeModule);
	});

	describe('settings()', () => {
		it('exposes the configured upload limits in bytes and counts', async () => {
			Container.set(
				KnowledgeConfig,
				mock<KnowledgeConfig>({
					maxFileSizeBytes: 5 * 1024 * 1024,
					maxFilesPerUpload: 3,
					maxTotalSizeBytes: 500 * 1024 * 1024,
				}),
			);

			await expect(new KnowledgeModule().settings()).resolves.toEqual({
				limits: {
					maxFileSizeBytes: 5 * 1024 * 1024,
					maxFilesPerUpload: 3,
					maxTotalSizeBytes: 500 * 1024 * 1024,
				},
			});
		});
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
