import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BinaryDataService, TEMP_EXECUTION_ID } from 'n8n-core';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';

import type { ExecutionIdV2 } from '@/executions/execution-id';

/** Output slots as a trigger produces them; v1 uses `null` for a slot it has no data for. */
type PayloadSlots = Array<INodeExecutionData[] | null | undefined>;

/** A reference to a file in the store, so its id is set: `<mode>:<fileId>`. */
type StoredRef = IBinaryData & { id: string };

/** A stored reference, with `fileId` set to its id without the `<mode>:` prefix. */
type StoredFile = { ref: StoredRef; fileId: string };

const isStored = (ref: IBinaryData): ref is StoredRef => ref.id !== undefined;

/**
 * The files a trigger payload refers to, on the engine v2 path.
 *
 * A webhook or trigger node runs on the control plane and stores its files
 * before the data plane knows the run. Until the run starts, the control plane
 * owns those files. This service moves them under the execution when the run
 * starts, and deletes them when it does not.
 */
@Service()
export class EngineV2PayloadFiles {
	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly logger: Logger,
	) {}

	/**
	 * Moves the files stored under the temporary execution path to the path of
	 * the execution, and updates the references in place. A file written with
	 * the execution id already known is left alone. Throws when a move fails, so
	 * the caller refuses the run instead of starting it with a reference that
	 * points nowhere. Waits for every move first, so the caller deletes the files
	 * only after no move is still running.
	 */
	async claimForExecution(slots: PayloadSlots, executionId: ExecutionIdV2): Promise<void> {
		const temporarySegment = `/${TEMP_EXECUTION_ID}/`;
		const refsByFileId = new Map<string, StoredFile[]>();
		for (const file of this.storedFilesIn(slots)) {
			if (!file.fileId.includes(temporarySegment)) continue;
			refsByFileId.set(file.fileId, [...(refsByFileId.get(file.fileId) ?? []), file]);
		}

		const executionSegment = `/${executionId}/`;
		const moves = await Promise.allSettled(
			[...refsByFileId].map(async ([fileId, refs]) => {
				await this.binaryDataService.rename(
					fileId,
					fileId.replace(temporarySegment, executionSegment),
				);
				// Updated per file as soon as it is moved, so a failed move leaves every
				// reference pointing at where its file is.
				for (const { ref } of refs) ref.id = ref.id.replace(temporarySegment, executionSegment);
			}),
		);

		const failed = moves.find((move) => move.status === 'rejected');
		if (failed) throw failed.reason;
	}

	/**
	 * Deletes the stored files of a payload whose run does not start. Never
	 * throws: a failed delete leaks a file, which must not replace the reason the
	 * run was refused.
	 */
	async discard(slots: PayloadSlots): Promise<void> {
		const ids = this.storedFilesIn(slots).map(({ ref }) => ref.id);
		if (ids.length === 0) return;

		try {
			await this.binaryDataService.deleteManyByBinaryDataId(ids);
		} catch (error) {
			this.logger.error('Failed to delete the files of an engine v2 payload that did not run', {
				error,
			});
		}
	}

	/** Only stored modes give a file an id; in memory the data is on the item itself. */
	private storedFilesIn(slots: PayloadSlots): StoredFile[] {
		return slots
			.flatMap((slot) => slot ?? [])
			.flatMap((item) => Object.values(item.binary ?? {}))
			.filter(isStored)
			.flatMap((ref) => {
				const [, fileId] = ref.id.split(':');
				return fileId ? [{ ref, fileId }] : [];
			});
	}
}
