import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IRunExecutionData } from 'n8n-workflow';

import { compressExecutionData, decompressExecutionData } from './compression.utils';
import { ExecutionDataConfig } from './execution-data.config';
import { ObjectStoreService } from '../binary-data/object-store/object-store.service.ee';

@Service()
export class ExecutionDataService {
	constructor(
		private readonly config: ExecutionDataConfig,
		private readonly objectStoreService: ObjectStoreService,
		private readonly logger: Logger,
	) {}

	/**
	 * Store execution data in S3 with gzip compression
	 */
	async store(executionId: string, data: IRunExecutionData): Promise<string> {
		const s3Key = this.generateS3Key(executionId);

		try {
			const compressedData = await compressExecutionData(data);

			await this.objectStoreService.put(s3Key, compressedData, {
				fileName: 'execution-data.json.gz',
				mimeType: 'application/gzip',
			});

			this.logger.debug('Stored execution data in S3', {
				executionId,
				s3Key,
				compressedSize: compressedData.length,
			});

			return s3Key;
		} catch (error) {
			this.logger.error('Failed to store execution data in S3', { executionId, s3Key, error });
			throw error;
		}
	}

	/**
	 * Retrieve execution data from S3 and decompress
	 */
	async retrieve(executionId: string, s3Key: string): Promise<IRunExecutionData> {
		try {
			const compressedData = await this.objectStoreService.get(s3Key, { mode: 'buffer' });
			const data = await decompressExecutionData(compressedData);

			this.logger.debug('Retrieved execution data from S3', {
				executionId,
				s3Key,
				compressedSize: compressedData.length,
			});

			return data;
		} catch (error) {
			this.logger.error('Failed to retrieve execution data from S3', { executionId, s3Key, error });
			throw error;
		}
	}

	/**
	 * Delete execution data from S3
	 */
	async delete(s3Keys: string[]): Promise<void> {
		if (s3Keys.length === 0) return;

		try {
			for (const s3Key of s3Keys) {
				await this.objectStoreService.deleteOne(s3Key);
			}
			this.logger.debug('Deleted execution data from S3', { s3Keys });
		} catch (error) {
			this.logger.error('Failed to delete execution data from S3', { s3Keys, error });
			throw error;
		}
	}

	/**
	 * Check if execution data service is configured for S3 mode
	 */
	isS3Mode(): boolean {
		return this.config.mode === 's3';
	}

	/**
	 * Generate S3 key for execution data
	 */
	private generateS3Key(executionId: string): string {
		return `executions/${executionId}/execution-data.json.gz`;
	}
}
