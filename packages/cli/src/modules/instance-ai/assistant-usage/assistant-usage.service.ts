import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { BuilderUsageItem, InstanceAiChangedArtifact } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import {
	AssistantUsageRepository,
	type CreatedResourceType,
	type NewAssistantTokenUsage,
} from './database/assistant-usage.repository';

/** The artifacts that count as usage when the Assistant creates them, and their event types. */
const CREATED_EVENT_TYPES = {
	workflow: 'workflow-created',
	agent: 'agent-created',
	'data-table': 'data-table-created',
} satisfies Partial<Record<InstanceAiChangedArtifact['type'], CreatedResourceType>>;

type CountedArtifactType = keyof typeof CREATED_EVENT_TYPES;

function isCountedArtifact(type: InstanceAiChangedArtifact['type']): type is CountedArtifactType {
	return Object.hasOwn(CREATED_EVENT_TYPES, type);
}

/** The user, the thread and the working project of the thread that a record belongs to. */
export type AssistantUsageScope = { userId: string; threadId: string; projectId: string | null };

/** The length of the `model` column. */
const MAX_MODEL_LENGTH = 128;

/** One row for each model, with the tokens of its calls added up. Rows without tokens are dropped. */
function toTokenRows(
	scope: AssistantUsageScope,
	usage: BuilderUsageItem[],
): NewAssistantTokenUsage[] {
	const byModel = new Map<string, NewAssistantTokenUsage>();
	for (const item of usage) {
		const model = item.model.slice(0, MAX_MODEL_LENGTH);
		const row = byModel.get(model) ?? {
			...scope,
			model,
			inputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
		};
		row.inputTokens += Math.round(item.uncachedInput + item.cacheRead + item.cacheWrite);
		row.outputTokens += Math.round(item.output);
		row.cacheReadTokens += Math.round(item.cacheRead);
		row.cacheWriteTokens += Math.round(item.cacheWrite);
		byModel.set(model, row);
	}
	return [...byModel.values()].filter((row) => row.inputTokens + row.outputTokens > 0);
}

/**
 * Records what users do with the n8n Assistant on the Agents runtime: the
 * messages that they send, the resources that the Assistant creates, and the
 * tokens of its model calls. The records outlive threads, so the history stays
 * when users delete their conversations.
 */
@Service()
export class AssistantUsageService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: AssistantUsageRepository,
		private readonly config: InstanceAiConfig,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/** Records a message that a user sent. Best effort: a failure never affects the turn. */
	async recordMessage(scope: AssistantUsageScope): Promise<void> {
		try {
			await this.repository.addMessage(scope, {});
		} catch (error) {
			this.logger.warn('Failed to record Assistant usage of a message', {
				threadId: scope.threadId,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Records the tokens of model calls of the Assistant: turns, background calls
	 * and helper calls. Best effort: a failure never affects the turn.
	 */
	async recordTokens(scope: AssistantUsageScope, usage: BuilderUsageItem[]): Promise<void> {
		try {
			await this.repository.addTokenUsage(toTokenRows(scope, usage), {});
		} catch (error) {
			this.logger.warn('Failed to record Assistant usage of tokens', {
				threadId: scope.threadId,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Records a workflow, agent or data table that the Assistant created. Other
	 * artifacts and changes to existing ones are skipped. Best effort.
	 */
	async recordArtifact(scope: AssistantUsageScope & { artifact: InstanceAiChangedArtifact }) {
		const { artifact } = scope;
		if (!artifact.created || !isCountedArtifact(artifact.type)) return;
		try {
			await this.repository.addCreatedResource(
				{
					userId: scope.userId,
					threadId: scope.threadId,
					projectId: artifact.projectId ?? scope.projectId,
					type: CREATED_EVENT_TYPES[artifact.type],
					resourceId: artifact.id,
				},
				{},
			);
		} catch (error) {
			this.logger.warn('Failed to record Assistant usage of a created resource', {
				threadId: scope.threadId,
				resourceType: artifact.type,
				error: getErrorMessage(error),
			});
		}
	}

	/** Deletes the usage records past the retention period. A failure propagates to the caller. */
	async pruneOldEvents(now = Date.now()): Promise<void> {
		const maxAgeDays = this.config.usageMaxAgeDays;
		if (maxAgeDays <= 0) return;
		const deleted = await this.repository.deleteCreatedBefore(
			new Date(now - maxAgeDays * Time.days.toMilliseconds),
			{},
		);
		if (deleted > 0) this.logger.debug('Pruned Assistant usage records', { count: deleted });
	}
}
