import { LicenseState, Logger } from '@n8n/backend-common';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { InstanceType } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { InsightsDemoService } from '../insights-demo.service';
import { InsightsModule } from '../insights.module';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let insightsModule: InsightsModule;
	let mockInstanceSettings: MockProxy<InstanceSettings>;
	let insightsDemoService: MockProxy<InsightsDemoService>;
	let scopedLogger: MockProxy<Logger>;

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		jest.clearAllMocks();
		await testDb.truncate(['Project']);

		mockInstanceSettings = mock<InstanceSettings>();
		scopedLogger = mock<Logger>();
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(scopedLogger);
		Container.set(InstanceSettings, mockInstanceSettings);
		Container.set(Logger, logger);
		Container.set(LicenseState, mock<LicenseState>());
		Container.set(
			InsightsService,
			new InsightsService(
				mock(),
				mock(),
				mock(),
				Container.get(LicenseState),
				mockInstanceSettings,
				Container.get(Logger),
			),
		);
		insightsDemoService = mock<InsightsDemoService>();
		Container.set(InsightsDemoService, insightsDemoService);
		insightsModule = Container.get(InsightsModule);
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

	describe('Insights Analyst demo seeding', () => {
		it('should not fail module initialization when demo data seeding fails', async () => {
			// ARRANGE
			const seedError = new Error('Failed to seed demo data');
			insightsDemoService.seed.mockRejectedValueOnce(seedError);

			// ACT & ASSERT
			await expect(insightsModule.init()).resolves.toBeUndefined();
			expect(scopedLogger.warn).toHaveBeenCalledWith('Failed to seed Insights Analyst demo data', {
				error: seedError,
			});
		});
	});
});
