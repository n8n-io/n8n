import { LicenseState, Logger } from '@n8n/backend-common';
import { createTeamProject, mockLogger, testDb } from '@n8n/backend-test-utils';
import type { InstanceType } from '@n8n/constants';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsCollectionService } from '../insights-collection.service';
import { InsightsModule } from '../insights.module';
import { InsightsService } from '../insights.service';

describe('InsightsModule', () => {
	let insightsModule: InsightsModule;
	let mockInstanceSettings: MockProxy<InstanceSettings>;
	let mockCollectionService: MockProxy<InsightsCollectionService>;

	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		await testDb.truncate(['Project']);

		mockInstanceSettings = mock<InstanceSettings>();
		mockCollectionService = mock<InsightsCollectionService>();
		Container.set(InstanceSettings, mockInstanceSettings);
		Container.set(Logger, mockLogger());
		Container.set(LicenseState, mock<LicenseState>());
		// The conditional `await import('./insights-collection.service')` resolves
		// this DI token, so asserting on the mock's lifecycle calls verifies the
		// load happened without probing module-loader internals.
		Container.set(InsightsCollectionService, mockCollectionService);
		Container.set(InsightsByPeriodRepository, mock<InsightsByPeriodRepository>());
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
		insightsModule = Container.get(InsightsModule);
		await createTeamProject();
	});

	describe('Dynamic conditional import of InsightsCollectionService', () => {
		it('should not import InsightsCollectionService for worker instances', async () => {
			// ARRANGE
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(mockInstanceSettings as any).instanceType = 'worker';

			// ACT - Call init AND settings which should NOT load InsightsCollectionService for workers
			await insightsModule.init();
			await insightsModule.settings();

			// ASSERT - Collection service is never activated for workers
			expect(mockCollectionService.init).not.toHaveBeenCalled();
		});

		it.each<InstanceType>(['main', 'webhook'])(
			'should import InsightsCollectionService for non-worker instances',
			async (instanceType) => {
				// ARRANGE
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(mockInstanceSettings as any).instanceType = instanceType;

				// ACT - Call init which should load InsightsCollectionService for non-workers
				await insightsModule.init();

				// ASSERT - Collection service is activated
				expect(mockCollectionService.init).toHaveBeenCalledTimes(1);
			},
		);
	});
});
