import type { InstanceAiEvent, InstanceAiSetupItem } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { InstanceAiEventBus } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import { N8nMemory } from '../../agents/integrations/n8n-memory';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

/** Thread metadata key for the setup panel: the latest items per workflow. */
export const SETUP_ITEMS_METADATA_KEY = 'instanceAiSetupItems';

type SetupItemsByWorkflow = Record<string, InstanceAiSetupItem[]>;

/**
 * The Assistant streams through the Agents runtime, so tools no longer need an
 * event log. Tools still publish `InstanceAiEvent`s through this interface.
 * The sink keeps the one fact the UI reads outside the turn stream (the setup
 * panel items) in thread metadata and drops the rest.
 */
@Service()
export class AssistantEventSink implements InstanceAiEventBus {
	private readonly pendingWrites = new Map<string, Promise<unknown>>();

	constructor(private readonly logger: Logger) {}

	publish(threadId: string, event: InstanceAiEvent): void {
		if (event.type !== 'setup-items') return;
		const { workflowId, items } = event.payload;
		const previous = this.pendingWrites.get(threadId) ?? Promise.resolve();
		const write = previous
			.catch(() => {})
			.then(async () => await this.saveSetupItems(threadId, workflowId, items))
			.catch((error: unknown) => {
				this.logger.warn('Failed to store Assistant setup items', { threadId, error });
			});
		this.pendingWrites.set(threadId, write);
		void write.finally(() => {
			if (this.pendingWrites.get(threadId) === write) this.pendingWrites.delete(threadId);
		});
	}

	subscribe(): () => void {
		return () => {};
	}

	/** The thread's setup items per workflow, after pending writes land. */
	async readSetupItems(
		threadId: string,
	): Promise<Array<{ workflowId: string; items: InstanceAiSetupItem[] }>> {
		await this.pendingWrites.get(threadId);
		const thread = await this.memory().getThread(threadId);
		const stored = thread?.metadata?.[SETUP_ITEMS_METADATA_KEY];
		if (!isRecord(stored)) return [];
		return Object.entries(stored).flatMap(([workflowId, items]) =>
			Array.isArray(items) ? [{ workflowId, items: items as InstanceAiSetupItem[] }] : [],
		);
	}

	private async saveSetupItems(threadId: string, workflowId: string, items: InstanceAiSetupItem[]) {
		await this.memory().patchThread({
			threadId,
			update: ({ metadata }) => {
				const current = metadata?.[SETUP_ITEMS_METADATA_KEY];
				const byWorkflow: SetupItemsByWorkflow = isRecord(current)
					? { ...(current as SetupItemsByWorkflow) }
					: {};
				// Re-insert so the most recently announced workflow is last.
				delete byWorkflow[workflowId];
				byWorkflow[workflowId] = items;
				return { metadata: { ...metadata, [SETUP_ITEMS_METADATA_KEY]: byWorkflow } };
			},
		});
	}

	private memory() {
		return Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
	}
}
