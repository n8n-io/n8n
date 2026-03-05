/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
/**
 * Internal bridge that wraps an n8n CheckpointStore into Mastra's storage.
 *
 * Uses Mastra's InMemoryStore as the base (so all internal domains work
 * correctly during execution), then hooks persistWorkflowSnapshot and
 * loadWorkflowSnapshot to also delegate to the external CheckpointStore.
 * This gives the engine durable snapshot persistence while keeping Mastra's
 * execution engine fully functional.
 *
 * This file is NOT exported from the package.
 */

import { InMemoryStore } from '@mastra/core/storage';

import type { CheckpointStore, RunSnapshot } from '../types';

/**
 * Extends InMemoryStore to intercept snapshot persistence.
 * All other storage operations use the in-memory defaults, which
 * Mastra's execution engine depends on during workflow resume.
 *
 * The CheckpointStore receives snapshots for durable persistence —
 * this is what the engine would back with its own database.
 */
export class CheckpointBridgeStore extends InMemoryStore {
	private checkpointStore: CheckpointStore;

	constructor(store: CheckpointStore) {
		super();
		this.checkpointStore = store;
	}

	/**
	 * After init, override the workflows domain's snapshot methods
	 * to also persist/load from the external CheckpointStore.
	 */
	async init(): Promise<void> {
		await super.init();

		const workflowsDomain = await this.getStore('workflows');
		if (!workflowsDomain) return;

		const originalPersist = workflowsDomain.persistWorkflowSnapshot.bind(workflowsDomain);

		const { checkpointStore } = this;

		workflowsDomain.persistWorkflowSnapshot = async (opts: any) => {
			// Write to both: in-memory for Mastra's transient execution state,
			// external store as the durable source of truth.
			await originalPersist(opts);
			const key = `${opts.workflowName as string}:${opts.runId as string}`;
			await checkpointStore.save(key, opts.snapshot as RunSnapshot);
		};

		workflowsDomain.loadWorkflowSnapshot = async (opts: any) => {
			// Always read from the external store — it is the source of truth.
			const key = `${opts.workflowName as string}:${opts.runId as string}`;
			const snapshot = await checkpointStore.load(key);
			return (snapshot as any) ?? null;
		};
	}
}
