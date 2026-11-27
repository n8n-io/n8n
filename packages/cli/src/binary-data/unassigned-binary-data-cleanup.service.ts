import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { DatabaseManager } from '@/binary-data/database.manager';
import { UnassignedBinaryDataBackfillService } from '@/binary-data/unassigned-binary-data-backfill.service';

/**
 * An execution assigns its files when it ends or starts to wait. A file that is
 * still unassigned after this time has no execution that can assign it.
 */
const UNASSIGNED_FILE_MAX_AGE_MS = Time.days.toMilliseconds;

const DELETE_BATCH_SIZE = 100;

const staleFileCutoff = () => new Date(Date.now() - UNASSIGNED_FILE_MAX_AGE_MS);

/**
 * Deletes the database files that no execution owns, for example the files of
 * an execution that was pruned before n8n assigned such files to their execution.
 */
@Service()
export class UnassignedBinaryDataCleanupService {
	constructor(
		private readonly backfillService: UnassignedBinaryDataBackfillService,
		private readonly databaseManager: DatabaseManager,
	) {}

	/**
	 * Deletes the files that stayed unassigned for more than one day, and returns
	 * how many. Deletes nothing while the backfill is not complete, because until
	 * then an unassigned file can belong to a past execution. Stops when `signal` aborts.
	 */
	async deleteStaleFiles(signal: AbortSignal): Promise<number> {
		return (await this.backfillService.isComplete())
			? await this.deleteFilesCreatedBefore(staleFileCutoff(), signal)
			: 0;
	}

	private async deleteFilesCreatedBefore(createdBefore: Date, signal: AbortSignal) {
		let total = 0;
		let found: number;

		do {
			found = await this.databaseManager.deleteUnassignedExecutionFilesCreatedBefore(
				createdBefore,
				DELETE_BATCH_SIZE,
			);
			total += found;
		} while (found >= DELETE_BATCH_SIZE && !signal.aborted);

		return total;
	}
}
