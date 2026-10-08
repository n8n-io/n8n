import { GlobalConfig } from '@n8n/config';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { DataTableFileCleanupService } from './data-table-file-cleanup.service';

/**
 * Deletes the uploaded CSV files that no data table used.
 */
@SystemTask()
export class DataTableFileCleanupTask implements SystemTask {
	readonly name = 'data-table-file-cleanup';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.globalConfig.dataTable.cleanupIntervalMs,
	);

	/** The upload directory is on the local disk of each main. */
	readonly target = { scope: 'instance', instanceTypes: ['main'] } satisfies SystemTaskTarget;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly fileCleanupService: DataTableFileCleanupService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.fileCleanupService.cleanupOrphanedFiles(signal);
	}
}
