import type { InstanceAiThreadRunTarget, LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { patchThread } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { N8nMemory } from '../../agents/integrations/n8n-memory';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_RUN_TARGET_LOST_KEY,
	ASSISTANT_TURN_DEFAULTS_KEY,
} from '../assistant-turn-options';
import { keepFirstRunTarget, LOCAL_RUN_TARGET, storedRunTargetOf } from './run-target';

type LinkedRunTarget = Extract<InstanceAiThreadRunTarget, { kind: 'linked' }>;
/** The part of a chat message request that the run target reads. */
type ChatRequest = { runTarget?: RunTarget };

const LINKED_INSTANCES_MODULE = 'linked-instances';

/**
 * Decides where an Assistant chat runs. The run target of a chat is set by its first message
 * and kept after that. Turns still build on this instance; the target only names the place
 * for work that can go elsewhere.
 */
@Service()
export class RunTargetService {
	constructor(
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly memory: N8nMemory,
	) {}

	/**
	 * The run target of one chat message. A shared chat runs locally. A link that the owner no
	 * longer holds makes the chat local, and the chat keeps the lost link name until the owner
	 * acknowledges it.
	 */
	async forChatTurn(
		thread: AgentExecutionThread,
		metadata: Record<string, unknown> | undefined,
		request: ChatRequest | undefined,
	): Promise<InstanceAiThreadRunTarget> {
		const ownerId = thread.ownerId;
		// While the module is off, the links are hidden. The stored target waits for the module.
		if (!ownerId || !this.linkedInstancesOn()) return LOCAL_RUN_TARGET;
		const defaults = metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
		const stored = storedRunTargetOf(defaults);
		// Defaults without a target come from a chat that started before run targets existed.
		if (stored === undefined && isRecord(defaults)) return LOCAL_RUN_TARGET;
		let target = stored;
		try {
			target = stored ?? (await this.storeFirstTarget(thread, ownerId, request?.runTarget));
			return await this.resolveTarget(thread, ownerId, target);
		} catch (error) {
			// A failed lookup must not fail the message or drop the link. The stored target stays.
			this.logger.warn('Failed to resolve the run target of a chat message', {
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return target ?? LOCAL_RUN_TARGET;
		}
	}

	/** Stores the target of the first message. Concurrent first messages keep the first write. */
	private async storeFirstTarget(
		thread: AgentExecutionThread,
		ownerId: string,
		requested: RunTarget | undefined,
	): Promise<InstanceAiThreadRunTarget> {
		// A shared chat never takes a remote target, so none is stored for it.
		const candidate = isSharedThread(thread)
			? LOCAL_RUN_TARGET
			: await this.chosenTarget(ownerId, requested);
		let kept = candidate;
		await patchThread(this.memory.getImplementation(ASSISTANT_AGENT_ID), {
			threadId: thread.id,
			update: ({ metadata }) => {
				const current = metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
				kept = keepFirstRunTarget(current, candidate);
				return {
					metadata: {
						...metadata,
						[ASSISTANT_TURN_DEFAULTS_KEY]: {
							...(isRecord(current) ? current : {}),
							runTarget: kept,
						},
					},
				};
			},
		});
		return kept;
	}

	/** The requested target when the owner holds its link. Anything else is local. */
	private async chosenTarget(
		ownerId: string,
		requested: RunTarget | undefined,
	): Promise<InstanceAiThreadRunTarget> {
		if (requested?.kind !== 'linked') return LOCAL_RUN_TARGET;
		const link = await this.findLink(ownerId, requested.instanceId);
		return link ? { kind: 'linked', instanceId: link.id, name: link.name } : LOCAL_RUN_TARGET;
	}

	/** The target a message runs on. A shared chat and a local target run here. A lost link is dropped. */
	private async resolveTarget(
		thread: AgentExecutionThread,
		ownerId: string,
		target: InstanceAiThreadRunTarget,
	): Promise<InstanceAiThreadRunTarget> {
		if (target.kind === 'local' || isSharedThread(thread)) return LOCAL_RUN_TARGET;
		if (await this.findLink(ownerId, target.instanceId)) return target;
		return await this.dropLostLink(thread, target);
	}

	/**
	 * Makes the chat local and records the lost link name, in one write. The stored target
	 * changes only in this write, so the name is recorded once.
	 */
	private async dropLostLink(
		thread: AgentExecutionThread,
		lost: LinkedRunTarget,
	): Promise<InstanceAiThreadRunTarget> {
		await patchThread(this.memory.getImplementation(ASSISTANT_AGENT_ID), {
			threadId: thread.id,
			update: ({ metadata }) => {
				const current = metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
				const now = storedRunTargetOf(current);
				if (now?.kind !== 'linked' || now.instanceId !== lost.instanceId) return null;
				return {
					metadata: {
						...metadata,
						[ASSISTANT_TURN_DEFAULTS_KEY]: {
							...(isRecord(current) ? current : {}),
							runTarget: LOCAL_RUN_TARGET,
						},
						[ASSISTANT_RUN_TARGET_LOST_KEY]: { name: lost.name },
					},
				};
			},
		});
		return LOCAL_RUN_TARGET;
	}

	private linkedInstancesOn(): boolean {
		return this.moduleRegistry.isActive(LINKED_INSTANCES_MODULE);
	}

	/** The owner's link with this id, or `null`. Without the linked-instances module there are no links. */
	private async findLink(
		ownerId: string,
		instanceId: string,
	): Promise<LinkedInstanceSummary | null> {
		if (!this.linkedInstancesOn()) return null;
		// Loaded on use: the linked-instances tables are needed only while the module is on.
		const { LinkedInstanceStore } = await import(
			'../../linked-instances/linked-instance.store.js'
		);
		return await Container.get(LinkedInstanceStore).getForUser(ownerId, instanceId);
	}
}
