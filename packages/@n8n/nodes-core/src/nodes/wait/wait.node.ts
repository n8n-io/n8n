import { defineNode, t, type BatchContext, type Wait } from '@n8n/node-sdk';

/** Holds the items until a time. The host can suspend the execution until then. */
export const wait = defineNode({ id: 'wait', displayName: 'Wait' });

export const heldItems = t.passedItem();

/** Waits until `at`, then passes every item on unchanged. */
export async function* holdUntil(at: Date, items: BatchContext<unknown>['items'], host: Wait) {
	await host.until(at);
	yield* items.map((item) => ({ item }));
}
