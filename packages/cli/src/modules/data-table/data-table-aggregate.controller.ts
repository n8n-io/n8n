import { ListDataTableQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { DataTableAggregateService } from './data-table-aggregate.service';
import { DataTableService } from './data-table.service';

@RestController('/data-tables-global')
export class DataTableAggregateController {
	constructor(
		private readonly dataTableAggregateService: DataTableAggregateService,
		private readonly dataTableService: DataTableService,
		private readonly logger: Logger,
	) {}

	private cachedSizeResponse: Awaited<
		ReturnType<typeof this.dataTableService.getDataTablesSize>
	> | null = null;
	private lastCacheTime = 0;
	private readonly STALE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
	private readonly QUERY_TIMEOUT = 5000; // 5 seconds

	@Get('/')
	@GlobalScope('dataTable:list')
	async listDataTables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataTableQueryDto,
	) {
		return await this.dataTableAggregateService.getManyAndCount(req.user, payload);
	}

	@Get('/limits')
	@GlobalScope('dataTable:list')
	async getDataTablesSize(req: AuthenticatedRequest) {
		const now = Date.now();

		try {
			// Race the query against a timeout
			const result = await Promise.race([
				this.dataTableService.getDataTablesSize(req.user),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Query timeout')), this.QUERY_TIMEOUT),
				),
			]);

			// Update cache on success
			this.cachedSizeResponse = result;
			this.lastCacheTime = now;

			return result;
		} catch (error) {
			// If query times out or fails, return stale cache if available
			if (this.cachedSizeResponse && now - this.lastCacheTime < this.STALE_CACHE_TTL) {
				this.logger.warn('Data table size query timed out or failed, returning stale cache', {
					error: error instanceof Error ? error.message : String(error),
					cacheAge: now - this.lastCacheTime,
				});
				return this.cachedSizeResponse;
			}

			// No cache available, return minimal safe response
			this.logger.error('Data table size query failed with no cache available', {
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				totalBytes: 0,
				quotaStatus: 'ok' as const,
				dataTables: {},
			};
		}
	}
}
