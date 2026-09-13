import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import {
	deletePromotionConfig,
	updatePromotionConnection,
	upsertPromotionApplyConfig,
	upsertPromotionPromoteConfig,
	type PromotionConnection,
} from '../promotionsSettings.api';
import type { ConnectionWrite } from '../promotionsSettings.utils';

export type ConnectionSaveResult = {
	/** State after all successful writes. */
	connection: PromotionConnection;
	failed: ConnectionWrite[];
	error?: unknown;
};

/** Tries every write and returns the successful state and failed writes. */
export function usePromotionConnectionSave() {
	const rootStore = useRootStore();

	const isSaving = ref(false);
	const failedWrites = ref<ConnectionWrite[]>([]);

	const runWrite = async (
		connectionId: string,
		write: ConnectionWrite,
		connection: PromotionConnection,
	): Promise<PromotionConnection> => {
		const context = rootStore.publicApiContext;

		switch (write.kind) {
			case 'connection': {
				const updated = await updatePromotionConnection(context, connectionId, write.payload);
				// Keep config results from earlier writes.
				return { ...updated, configs: connection.configs };
			}
			case 'config': {
				const config =
					write.direction === 'apply'
						? await upsertPromotionApplyConfig(context, connectionId, write.payload)
						: await upsertPromotionPromoteConfig(context, connectionId, write.payload);
				return {
					...connection,
					configs: { ...connection.configs, [write.direction]: config },
				};
			}
			case 'config-delete': {
				try {
					await deletePromotionConfig(context, connectionId, write.direction);
				} catch (error) {
					// A config that is already gone means the delete is done, so a retry can finish.
					if (!(error instanceof ResponseError) || error.httpStatusCode !== 404) throw error;
				}
				const configs = { ...connection.configs };
				delete configs[write.direction];
				return { ...connection, configs };
			}
		}
	};

	const run = async (
		current: PromotionConnection,
		writes: ConnectionWrite[],
	): Promise<ConnectionSaveResult> => {
		let connection = current;
		const failed: ConnectionWrite[] = [];
		let error: unknown;

		isSaving.value = true;
		try {
			for (const write of writes) {
				try {
					connection = await runWrite(current.id, write, connection);
				} catch (writeError) {
					failed.push(write);
					error ??= writeError;
				}
			}
		} finally {
			isSaving.value = false;
		}

		failedWrites.value = failed;

		return { connection, failed, error };
	};

	const reset = () => {
		failedWrites.value = [];
	};

	return { isSaving, failedWrites, run, reset };
}
