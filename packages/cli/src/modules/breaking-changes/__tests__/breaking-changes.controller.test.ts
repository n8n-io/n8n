import type { BreakingChangeLightReportResult, BreakingChangeReportQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { BreakingChangeMigrationService } from '../breaking-changes.migration.service';
import type { BreakingChangeService } from '../breaking-changes.service';
import { BreakingChangesController } from '../breaking-changes.controller';
import type { MigrationFindingQueryService } from '../query/migration-finding-query.service';
import type { MigrationFindingSyncService } from '../sync/migration-finding-sync.service';

const req = mock<AuthenticatedRequest>();
const res = mock<Response>();

function lightReport(generatedAt: Date): BreakingChangeLightReportResult {
	return {
		report: {
			generatedAt,
			targetVersion: 'v2',
			currentVersion: '2.0.0',
			instanceResults: [],
			workflowResults: [],
		},
		totalWorkflows: 3,
		totalAffectedWorkflows: 2,
		shouldCache: false,
	};
}

describe('BreakingChangesController', () => {
	let service: MockProxy<BreakingChangeService>;
	let migrationService: MockProxy<BreakingChangeMigrationService>;
	let syncService: MockProxy<MigrationFindingSyncService>;
	let queryService: MockProxy<MigrationFindingQueryService>;
	let controller: BreakingChangesController;

	beforeEach(() => {
		service = mock<BreakingChangeService>();
		migrationService = mock<BreakingChangeMigrationService>();
		syncService = mock<MigrationFindingSyncService>();
		queryService = mock<MigrationFindingQueryService>();
		controller = new BreakingChangesController(
			service,
			migrationService,
			syncService,
			queryService,
		);
	});

	describe('GET /report', () => {
		it('syncs when stale, then returns the query service result unchanged', async () => {
			const expected = lightReport(new Date('2026-01-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.syncIfStale.mockImplementation(async () => {
				callOrder.push('syncIfStale');
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const query: BreakingChangeReportQueryDto = { version: 'v3' };
			const result = await controller.getDetectionReport(req, res, query);

			expect(result).toBe(expected);
			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3');
			expect(callOrder).toEqual(['syncIfStale', 'getLightReport']);
			expect(syncService.sync).not.toHaveBeenCalled();
			expect(service.getDetectionResults).not.toHaveBeenCalled();
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.getDetectionReport(req, res, {});

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2');
		});
	});

	describe('POST /report/refresh', () => {
		it('runs a full sync, then returns the fresh overview', async () => {
			const expected = lightReport(new Date('2026-02-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.sync.mockImplementation(async () => {
				callOrder.push('sync');
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const result = await controller.refreshCache(req, res, { version: 'v3' });

			expect(result).toBe(expected);
			expect(syncService.sync).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3');
			expect(callOrder).toEqual(['sync', 'getLightReport']);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
			expect(service.refreshDetectionResults).not.toHaveBeenCalled();
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.refreshCache(req, res, {});

			expect(syncService.sync).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2');
		});
	});
});
