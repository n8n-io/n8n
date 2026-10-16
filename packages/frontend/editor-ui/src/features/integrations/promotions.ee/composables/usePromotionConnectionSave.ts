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

/** Saves independent writes. Target changes must succeed before direction settings. */
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
				// The response re-reads every config, so its checkout state reflects the
				// new target. Reusing the local configs would keep a stale checkout.
				return await updatePromotionConnection(context, connectionId, write.payload);
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
		let targetFailed = false;

		isSaving.value = true;
		try {
			for (const write of writes) {
				if (targetFailed && write.kind !== 'connection') {
					failed.push(write);
					continue;
				}
				try {
					connection = await runWrite(current.id, write, connection);
				} catch (writeError) {
					failed.push(write);
					error ??= writeError;
					if (
						write.kind === 'connection' &&
						(write.payload.target !== undefined || write.payload.providerId !== undefined)
					) {
						targetFailed = true;
					}
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
