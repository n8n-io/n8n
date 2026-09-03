import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BinaryDataService } from 'n8n-core';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/** Output slots as a trigger produces them; v1 uses `null` for a slot it has no data for. */
type PayloadSlots = Array<INodeExecutionData[] | null | undefined>;

/**
 * Guards the files a trigger payload carries on the engine 2.0 path.
 *
 * The engine takes its payload as JSON, so an item's binary data cannot travel
 * with it. Worse, the control plane may already have written the file to
 * storage by the time the refusal happens, and a v2 run keeps no control-plane
 * execution row — so no execution ever owns the file and no pruning ever
 * reclaims it. Every refusal that discards such a payload deletes its files
 * here instead.
 *
 * Shared by every v2 entry path whose trigger can produce files: the webhook
 * surface and the active-trigger surface.
 */
@Service()
export class EngineV2PayloadGuard {
	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly logger: Logger,
	) {}

	/**
	 * Rejects a payload that carries files, deleting any already stored.
	 *
	 * `reason` names the surface, so the user hears which trigger could not be
	 * served rather than a generic message.
	 */
	async assertNoFiles(slots: PayloadSlots, reason: string): Promise<void> {
		const files = this.filesIn(slots);
		if (files.length === 0) return;

		await this.deleteStoredFiles(files);

		throw new UserError(reason);
	}

	/**
	 * Deletes the files of a payload that is being discarded for some other
	 * reason. Never throws: the caller's own refusal is the answer.
	 */
	async discardFiles(slots: PayloadSlots): Promise<void> {
		const files = this.filesIn(slots);
		if (files.length === 0) return;

		await this.deleteStoredFiles(files);
	}

	/** An empty `binary` map carries no file, so it does not count. */
	private filesIn(slots: PayloadSlots): IBinaryData[] {
		return slots.flatMap((slot) => slot ?? []).flatMap((item) => Object.values(item.binary ?? {}));
	}

	/**
	 * Only stored modes give a file an id; in memory the data rides on the item and
	 * there is nothing to delete. A failed delete leaks a file, which must not
	 * replace the caller's reason with a storage error.
	 */
	private async deleteStoredFiles(files: IBinaryData[]): Promise<void> {
		const storedIds = files.map((file) => file.id).filter((id) => id !== undefined);
		if (storedIds.length === 0) return;

		try {
			await this.binaryDataService.deleteManyByBinaryDataId(storedIds);
		} catch (error) {
			this.logger.error('Failed to delete the files of a rejected engine 2.0 payload', { error });
		}
	}
}
