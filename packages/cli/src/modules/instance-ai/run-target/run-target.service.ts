import type { InstanceAiThreadRunTarget, LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { patchThread } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { N8nMemory } from '../../agents/integrations/n8n-memory';
import type { SystemAgentStartTurn } from '../../agents/system-agents/system-agent.types';
import { EXECUTION_METADATA_KEY } from '../../agents/types/agent-queued-message';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { ASSISTANT_AGENT_ID, ASSISTANT_TURN_DEFAULTS_KEY } from '../assistant-turn-options';
import {
	keepFirstRunTarget,
	LOCAL_RUN_TARGET,
	lostLinkNotice,
	storedRunTargetOf,
} from './run-target';

type LinkedRunTarget = Extract<InstanceAiThreadRunTarget, { kind: 'linked' }>;
/** The part of a chat message request that the run target reads. */
type ChatRequest = { runTarget?: RunTarget };
/** The turn fields that a notice needs to reach the chat history. */
export type RunTargetNoticeScope = Pick<SystemAgentStartTurn, 'thread' | 'resourceId' | 'executionId'>;

const LINKED_INSTANCES_MODULE = 'linked-instances';

/** The run target that a chat message runs on, and the notice that its turn posts, if any. */
export interface ChatTurnRunTarget {
	runTarget: InstanceAiThreadRunTarget;
	/** Set once, by the turn that finds its link gone. */
	notice?: string;
}

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
		request: ChatRequest | undefined,
	): Promise<ChatTurnRunTarget> {
		const ownerId = thread.ownerId;
		// While the module is off, the links are hidden. The stored target waits for the module.
		if (!ownerId || !this.linkedInstancesOn()) return { runTarget: LOCAL_RUN_TARGET };
		const stored = storedRunTargetOf(defaults);
		// Defaults without a target come from a chat that started before run targets existed.
		if (stored === undefined && isRecord(defaults)) return { runTarget: LOCAL_RUN_TARGET };
		const target = stored ?? (await this.storeFirstTarget(thread, ownerId, request?.runTarget));
		if (target.kind === 'local' || isSharedThread(thread)) return { runTarget: LOCAL_RUN_TARGET };
		if (await this.findLink(ownerId, target.instanceId)) return { runTarget: target };
		return await this.dropLostLink(thread, target);
	}

	/**
	 * Writes the notice of a turn into the chat. The write is linked to the turn's execution, so
	 * the chat history shows it. A failed write must not fail the message.
	 */
	async postTurnNotice(turn: RunTargetNoticeScope, text: string): Promise<void> {
		const threadId = turn.thread.id;
		if (!turn.executionId) {
			this.logger.warn('Skipped the run target notice, because the turn has no execution', {
				threadId,
			});
			return;
		}
		try {
			await this.memory.getImplementation(ASSISTANT_AGENT_ID).saveMessages({
				threadId,
				resourceId: turn.resourceId,
				messages: [
					{
						id: nanoid(),
						createdAt: new Date(),
						role: 'assistant',
						content: [{ type: 'text', text }],
					},
				],
				hostMetadata: { [EXECUTION_METADATA_KEY]: turn.executionId },
			});
		} catch (error) {
			this.logger.warn('Failed to post the run target notice', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
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

	/**
	 * Makes the chat local. The stored target changes only in this call, so only this call
	 * returns the notice.
	 */
	private async dropLostLink(
		thread: AgentExecutionThread,
		lost: LinkedRunTarget,
	): Promise<ChatTurnRunTarget> {
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
		return dropped
			? { runTarget: LOCAL_RUN_TARGET, notice: lostLinkNotice(lost.name) }
			: { runTarget: LOCAL_RUN_TARGET };
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
		const { LinkedInstanceStore } = await import('../../linked-instances/linked-instance.store');
		return await Container.get(LinkedInstanceStore).getForUser(ownerId, instanceId);
	}
}
