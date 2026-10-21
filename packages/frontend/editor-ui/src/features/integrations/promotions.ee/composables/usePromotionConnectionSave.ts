import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import {
	createPromotionEnvironment,
	deletePromotionEnvironment,
	updatePromotionEnvironment,
	type PromotionConnection,
} from '../promotionsSettings.api';
import { toConnection, withEnvironment, type ConnectionWrite } from '../promotionsSettings.utils';

export type ConnectionSaveResult = {
	/** State after all successful writes. */
	connection: PromotionConnection | null;
	failed: ConnectionWrite[];
	error?: unknown;
};

/** Saves each direction's environment on its own, so one failure does not block the other. */
export function usePromotionConnectionSave() {
	const rootStore = useRootStore();

	const isSaving = ref(false);
	const failedWrites = ref<ConnectionWrite[]>([]);

	const runWrite = async (
		write: ConnectionWrite,
		configs: PromotionConnection['configs'],
	): Promise<PromotionConnection['configs']> => {
		const context = rootStore.publicApiContext;

		switch (write.kind) {
			case 'create':
				return withEnvironment(configs, await createPromotionEnvironment(context, write.payload));
			case 'update':
				// The response re-reads the checkout state, so a remote change cannot keep a stale one.
				return withEnvironment(
					configs,
					await updatePromotionEnvironment(context, write.environmentId, write.payload),
				);
			case 'delete': {
				try {
					await deletePromotionEnvironment(context, write.environmentId);
				} catch (error) {
					// An environment that is already gone means the delete is done, so a retry can finish.
					if (!(error instanceof ResponseError) || error.httpStatusCode !== 404) throw error;
				}
				const next = { ...configs };
				delete next[write.direction];
				return next;
			}
		}
	};

	const run = async (
		current: PromotionConnection | null,
		writes: ConnectionWrite[],
	): Promise<ConnectionSaveResult> => {
		let configs = { ...current?.configs };
		const failed: ConnectionWrite[] = [];
		let error: unknown;

		isSaving.value = true;
		try {
			for (const write of writes) {
				try {
					configs = await runWrite(write, configs);
				} catch (writeError) {
					failed.push(write);
					error ??= writeError;
				}
			}
		} finally {
			isSaving.value = false;
		}

		failedWrites.value = failed;

		return { connection: toConnection(configs), failed, error };
	};

	const reset = () => {
		failedWrites.value = [];
	};

	return { isSaving, failedWrites, run, reset };
}
