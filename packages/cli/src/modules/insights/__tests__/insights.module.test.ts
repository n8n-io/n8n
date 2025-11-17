import { LicenseState, Logger } from '@n8n/backend-common';
import { createTeamProject, mockLogger, testDb } from '@n8n/backend-test-utils';
import type { InstanceType } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { InsightsModule } from '../insights.module';

describe('InsightsModule', () => {
	let insightsModule: InsightsModule;
	let mockInstanceSettings: MockProxy<InstanceSettings>;

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		jest.clearAllMocks();
		await testDb.truncate(['Project']);
		insightsModule = Container.get(InsightsModule);
		mockInstanceSettings = mock<InstanceSettings>();
		Container.set(InstanceSettings, mockInstanceSettings);
		Container.set(Logger, mockLogger());
		Container.set(LicenseState, mock<LicenseState>());
		await createTeamProject();
	});

	describe('Dynamic conditional import of InsightsCollectionService', () => {
		it('should not import InsightsCollectionService for worker instances', async () => {
			// ARRANGE
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(mockInstanceSettings as any).instanceType = 'worker';

			// Get the path to InsightsCollectionService
			const collectionServicePath = require.resolve('../insights-collection.service');
			expect(collectionServicePath).not.toBeNull();

			// Clear it from cache to ensure a clean test
			delete require.cache[collectionServicePath];

			// ACT - Call init AND setttings which should NOT load InsightsCollectionService for workers
			await insightsModule.init();
			await insightsModule.settings();

			// ASSERT - Module should not be loaded
			expect(require.cache[collectionServicePath]).toBeUndefined();
		});

		it.each<InstanceType>(['main', 'webhook'])(
			'should import InsightsCollectionService for non-worker instances',
			async (instanceType) => {
				// ARRANGE
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(mockInstanceSettings as any).instanceType = instanceType;

				// Get the path to InsightsCollectionService
				const collectionServicePath = require.resolve('../insights-collection.service');
				expect(collectionServicePath).not.toBeNull();

				// Clear it from cache if it's there to ensure a clean test
				delete require.cache[collectionServicePath];

				// ACT - Call init which should load InsightsCollectionService for non-workers
				await insightsModule.init();

				// ASSERT - Module should now be loaded
				expect(require.cache[collectionServicePath]).toBeDefined();
			},
		);
	});
});
