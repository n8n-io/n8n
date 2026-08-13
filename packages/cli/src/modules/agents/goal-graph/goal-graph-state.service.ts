import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { toSlotValue } from './expressions';
import type { GoalGraphDefinition, GoalGraphPersistence, SlotValues } from './types';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const METADATA_KEY = 'goalGraph';

/**
 * Holds the goal-graph slot values per agent thread.
 *
 * The in-memory map is the source of truth during a run — the runtime hooks
 * (`toolsFilter` / `instructionsSuffix`) are synchronous, so they read from
 * the cache only. `ensureLoaded()` must be awaited before a run starts (see
 * `AgentsService.executeForChat`) to hydrate the cache from thread metadata.
 *
 * Every write is mirrored into `agents_threads.metadata.goalGraph`
 * (best-effort, serialized per thread) so state survives restarts and spans
 * user turns. Single-instance only — an acceptable POC constraint.
 */
@Service()
export class GoalGraphStateService {
	private readonly cache = new Map<string, SlotValues>();

	/** Per-thread chain serializing metadata writes. */
	private readonly pendingWrites = new Map<string, Promise<void>>();

	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly logger: Logger,
	) {}

	private cacheKey(agentId: string, threadId: string | undefined): string {
		// Runs without persistence (no memory backend) share one ephemeral,
		// non-persisted state per agent. Chat/build runs always have a thread.
		return `${agentId}:${threadId ?? '__ephemeral__'}`;
	}

	private seedState(definition: GoalGraphDefinition): SlotValues {
		const state: SlotValues = {};
		for (const slot of definition.slots) {
			state[slot.name] = slot.initialValue === undefined ? null : toSlotValue(slot.initialValue);
		}
		return state;
	}

	/**
	 * Hydrate the cache for a thread from persisted metadata. Must be awaited
	 * before the run starts so the synchronous runtime hooks see current state.
	 */
	async ensureLoaded(
		agentId: string,
		threadId: string | undefined,
		definition: GoalGraphDefinition,
	): Promise<void> {
		const key = this.cacheKey(agentId, threadId);
		if (this.cache.has(key)) return;

		const state = this.seedState(definition);
		if (threadId) {
			const entity = await this.threadRepository.findOneBy({ id: threadId });
			if (entity?.metadata) {
				const metadata = jsonParse<Record<string, unknown>>(entity.metadata, { fallbackValue: {} });
				const persisted = metadata[METADATA_KEY];
				if (persisted && typeof persisted === 'object' && !Array.isArray(persisted)) {
					// Only declared slots are restored — removed slots drop silently.
					for (const slot of definition.slots) {
						if (slot.name in persisted) {
							state[slot.name] = toSlotValue((persisted as Record<string, unknown>)[slot.name]);
						}
					}
				}
			}
		}
		this.cache.set(key, state);
	}

	/**
	 * Current slot values for a thread (synchronous, cache-only). Seeds from
	 * initial values when the thread was never loaded — correct for fresh
	 * threads; persisted state is picked up by `ensureLoaded` at run start.
	 */
	getState(
		agentId: string,
		threadId: string | undefined,
		definition: GoalGraphDefinition,
	): SlotValues {
		const key = this.cacheKey(agentId, threadId);
		let state = this.cache.get(key);
		if (!state) {
			state = this.seedState(definition);
			this.cache.set(key, state);
		}
		return state;
	}

	/** Write a slot value and mirror the state into thread metadata. */
	setSlot(
		agentId: string,
		persistence: GoalGraphPersistence | undefined,
		definition: GoalGraphDefinition,
		slotName: string,
		value: unknown,
	): { previous: unknown } {
		const state = this.getState(agentId, persistence?.threadId, definition);
		const previous = state[slotName];
		state[slotName] = toSlotValue(value);
		if (persistence) this.schedulePersist(persistence, state);
		return { previous };
	}

	private schedulePersist(persistence: GoalGraphPersistence, state: SlotValues): void {
		const snapshot = { ...state };
		const previous = this.pendingWrites.get(persistence.threadId) ?? Promise.resolve();
		const next = previous
			.then(async () => await this.persist(persistence, snapshot))
			.catch((error: unknown) => {
				this.logger.warn('Failed to persist goal-graph state to thread metadata', {
					threadId: persistence.threadId,
					error,
				});
			});
		this.pendingWrites.set(persistence.threadId, next);
	}

	private async persist(persistence: GoalGraphPersistence, state: SlotValues): Promise<void> {
		const existing = await this.threadRepository.findOneBy({ id: persistence.threadId });
		if (existing) {
			const metadata = existing.metadata
				? jsonParse<Record<string, unknown>>(existing.metadata, { fallbackValue: {} })
				: {};
			metadata[METADATA_KEY] = state;
			existing.metadata = JSON.stringify(metadata);
			await this.threadRepository.save(existing);
			return;
		}
		// First slot write can land before the memory layer creates the thread
		// row (messages are persisted at end of turn). `N8nMemory.saveThread`
		// merges metadata on existing rows, so creating it here is compatible.
		await this.threadRepository.save(
			this.threadRepository.create({
				id: persistence.threadId,
				resourceId: persistence.resourceId,
				title: null,
				metadata: JSON.stringify({ [METADATA_KEY]: state }),
			}),
		);
	}
}
