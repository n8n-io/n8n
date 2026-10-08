import type { InstanceAiThreadRunTarget, LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { patchThread } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { N8nMemory } from '../../agents/integrations/n8n-memory';
import { draftChatMemoryResourceId } from '../../agents/utils/agent-memory-scope';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { LinkedInstanceStore } from '../../linked-instances/linked-instance.store';
import { ASSISTANT_AGENT_ID, ASSISTANT_TURN_DEFAULTS_KEY } from '../assistant-turn-options';
import {
	keepFirstRunTarget,
	LOCAL_RUN_TARGET,
	lostLinkNotice,
	storedRunTargetOf,
} from './run-target';

type LinkedRunTarget = Extract<InstanceAiThreadRunTarget, { kind: 'linked' }>;

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
	 * longer holds makes the chat local, and the chat gets one notice.
	 */
	async forChatTurn(
		thread: AgentExecutionThread,
		defaults: unknown,
		requested: RunTarget | undefined,
	): Promise<InstanceAiThreadRunTarget> {
		const ownerId = thread.ownerId;
		if (!ownerId) return LOCAL_RUN_TARGET;
		const stored = storedRunTargetOf(defaults);
		// Defaults without a target come from a chat that started before run targets existed.
		if (stored === undefined && isRecord(defaults)) return LOCAL_RUN_TARGET;
		const target = stored ?? (await this.storeFirstTarget(thread.id, ownerId, requested));
		if (target.kind === 'local' || isSharedThread(thread)) return LOCAL_RUN_TARGET;
		if (await this.findLink(ownerId, target.instanceId)) return target;
		return await this.dropLostLink(thread, ownerId, target);
	}

	/** Stores the target of the first message. Concurrent first messages keep the first write. */
	private async storeFirstTarget(
		threadId: string,
		ownerId: string,
		requested: RunTarget | undefined,
	): Promise<InstanceAiThreadRunTarget> {
		const candidate = await this.chosenTarget(ownerId, requested);
		let kept = candidate;
		await patchThread(this.memory.getImplementation(ASSISTANT_AGENT_ID), {
			threadId,
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

	/** Makes the chat local, and posts the notice only when this call made the change. */
	private async dropLostLink(
		thread: AgentExecutionThread,
		ownerId: string,
		lost: LinkedRunTarget,
	): Promise<InstanceAiThreadRunTarget> {
		let dropped = false;
		await patchThread(this.memory.getImplementation(ASSISTANT_AGENT_ID), {
			threadId: thread.id,
			update: ({ metadata }) => {
				const current = metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
				const now = storedRunTargetOf(current);
				if (now?.kind !== 'linked' || now.instanceId !== lost.instanceId) return null;
				dropped = true;
				return {
					metadata: {
						...metadata,
						[ASSISTANT_TURN_DEFAULTS_KEY]: {
							...(isRecord(current) ? current : {}),
							runTarget: LOCAL_RUN_TARGET,
						},
					},
				};
			},
		});
		if (dropped) await this.postNotice(thread.id, ownerId, lostLinkNotice(lost.name));
		return LOCAL_RUN_TARGET;
	}

	/** The owner's link with this id, or `null`. Without the linked-instances module there are no links. */
	private async findLink(ownerId: string, instanceId: string): Promise<LinkedInstanceSummary | null> {
		if (!this.moduleRegistry.isActive('linked-instances')) return null;
		return await Container.get(LinkedInstanceStore).getForUser(ownerId, instanceId);
	}

	/** Writes an assistant message into the chat. A failed write must not fail the message. */
	private async postNotice(threadId: string, ownerId: string, text: string): Promise<void> {
		try {
			await this.memory.getImplementation(ASSISTANT_AGENT_ID).saveMessages({
				threadId,
				resourceId: draftChatMemoryResourceId(ownerId),
				messages: [
					{
						id: nanoid(),
						createdAt: new Date(),
						role: 'assistant',
						content: [{ type: 'text', text }],
					},
				],
			});
		} catch (error) {
			this.logger.warn('Failed to post the run target notice', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
