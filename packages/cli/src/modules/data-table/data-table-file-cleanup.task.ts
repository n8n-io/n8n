import { GlobalConfig } from '@n8n/config';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

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

	readonly effects: SystemTaskEffects = 'idempotent';

	/** The upload directory is on the local disk of each main. */
	readonly placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['main'],
	};

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly fileCleanupService: DataTableFileCleanupService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.fileCleanupService.cleanupOrphanedFiles(signal);
	}
}
