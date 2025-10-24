import type { Logger } from '@n8n/backend-common';
import type { IRunExecutionData } from 'n8n-workflow';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ObjectStoreService } from '../../binary-data/object-store/object-store.service.ee';
import type { ExecutionDataConfig } from '../execution-data.config';
import { ExecutionDataService } from '../execution-data.service';

describe('ExecutionDataService', () => {
	let service: ExecutionDataService;
	let mockConfig: ExecutionDataConfig;
	let mockObjectStoreService: ObjectStoreService;
	let mockLogger: Logger;

	beforeEach(() => {
		mockConfig = {
			mode: 's3',
		} as ExecutionDataConfig;

		mockObjectStoreService = {
			put: vi.fn(),
			get: vi.fn(),
			deleteOne: vi.fn(),
		} as any;

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
		} as any;

		service = new ExecutionDataService(mockConfig, mockObjectStoreService, mockLogger);
	});

	describe('isS3Mode', () => {
		it('should return true when mode is s3', () => {
			expect(service.isS3Mode()).toBe(true);
		});

		it('should return false when mode is database', () => {
			mockConfig.mode = 'database';
			expect(service.isS3Mode()).toBe(false);
		});
	});

	describe('store', () => {
		it('should store execution data in S3 with compression', async () => {
			const executionId = 'test-execution-id';
			const executionData: IRunExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const mockBuffer = Buffer.from('compressed-data');
			vi.spyOn(service as any, 'compressExecutionData').mockResolvedValue(mockBuffer);
			vi.spyOn(mockObjectStoreService, 'put').mockResolvedValue({} as any);

			const result = await service.store(executionId, executionData);

			expect(result).toBe(`executions/${executionId}/execution-data.json.gz`);
			expect(mockObjectStoreService.put).toHaveBeenCalledWith(
				`executions/${executionId}/execution-data.json.gz`,
				mockBuffer,
				{
					fileName: 'execution-data.json.gz',
					mimeType: 'application/gzip',
				},
			);
		});
	});

	describe('retrieve', () => {
		it('should retrieve and decompress execution data from S3', async () => {
			const executionId = 'test-execution-id';
			const s3Key = `executions/${executionId}/execution-data.json.gz`;
			const mockBuffer = Buffer.from('compressed-data');
			const expectedData: IRunExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			vi.spyOn(mockObjectStoreService, 'get').mockResolvedValue(mockBuffer);
			vi.spyOn(service as any, 'decompressExecutionData').mockResolvedValue(expectedData);

			const result = await service.retrieve(executionId, s3Key);

			expect(result).toEqual(expectedData);
			expect(mockObjectStoreService.get).toHaveBeenCalledWith(s3Key, { mode: 'buffer' });
		});
	});

	describe('delete', () => {
		it('should delete execution data from S3', async () => {
			const s3Keys = ['key1', 'key2'];

			await service.delete(s3Keys);

			expect(mockObjectStoreService.deleteOne).toHaveBeenCalledWith('key1');
			expect(mockObjectStoreService.deleteOne).toHaveBeenCalledWith('key2');
		});

		it('should handle empty array', async () => {
			await service.delete([]);

			expect(mockObjectStoreService.deleteOne).not.toHaveBeenCalled();
		});
	});
});
