import type {
	AssistantUsageDay,
	AssistantUsageResourceType,
	AssistantUsageResponse,
	AssistantUsageUsersResponse,
	AssistantUsageUsersSortBy,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { InstanceAiChangedArtifact } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { DateTime } from 'luxon';

import type { AssistantUsageEvent } from './database/assistant-usage-event.entity';
import { AssistantUsageRepository } from './database/assistant-usage.repository';

const CREATED_EVENT_TYPES = {
	workflow: 'workflow-created',
	agent: 'agent-created',
	'data-table': 'data-table-created',
} satisfies Record<AssistantUsageResourceType, AssistantUsageEvent['type']>;

function isCountedResource(
	type: InstanceAiChangedArtifact['type'],
): type is AssistantUsageResourceType {
	return Object.hasOwn(CREATED_EVENT_TYPES, type);
}

type UsageScope = { userId: string; threadId: string; projectId: string | null };

/**
 * Records what users do with the n8n Assistant (v2, on the Agents runtime), and
 * adds it up for the admin usage page. The records outlive threads, so the
 * history stays when users delete their conversations.
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
	async recordMessage(scope: UsageScope): Promise<void> {
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
	 * Records a workflow, agent or data table that the Assistant created. Other
	 * artifacts and changes to existing ones are skipped. Best effort.
	 */
	async recordArtifact(scope: UsageScope & { artifact: InstanceAiChangedArtifact }) {
		const { artifact } = scope;
		if (!artifact.created || !isCountedResource(artifact.type)) return;
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

	async getUsage(query: {
		startDate: Date;
		endDate: Date;
		projectId?: string;
		timeZone?: string;
	}): Promise<AssistantUsageResponse> {
		const { startDate, endDate, projectId } = query;
		const timeZone = query.timeZone ?? 'UTC';
		const range = { startDate, endDate, projectId };
		const [summary, days] = await Promise.all([
			this.repository.summarize(range, {}),
			this.repository.countByDay(range, timeZone, {}),
		]);
		return { summary, byDay: this.fillDays(days, startDate, endDate, timeZone) };
	}

	async getUsers(query: {
		startDate: Date;
		endDate: Date;
		projectId?: string;
		skip: number;
		take: number;
		sortBy?: AssistantUsageUsersSortBy;
	}): Promise<AssistantUsageUsersResponse> {
		const { startDate, endDate, projectId, skip, take } = query;
		return await this.repository.countByUser(
			{ startDate, endDate, projectId },
			{ skip, take, sortBy: query.sortBy ?? 'messages:desc' },
			{},
		);
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

	/** Every day of the range in the time zone, with zeros for days without usage. */
	private fillDays(
		days: AssistantUsageDay[],
		startDate: Date,
		endDate: Date,
		timeZone: string,
	): AssistantUsageDay[] {
		const byDate = new Map(days.map((day) => [day.date, day]));
		const result: AssistantUsageDay[] = [];
		const last = DateTime.fromJSDate(endDate).setZone(timeZone).startOf('day');
		// The controller caps the range, so this loop is short.
		for (
			let current = DateTime.fromJSDate(startDate).setZone(timeZone).startOf('day');
			current <= last;
			current = current.plus({ days: 1 })
		) {
			const date = current.toISODate();
			if (!date) continue;
			result.push(
				byDate.get(date) ?? {
					date,
					conversations: 0,
					messages: 0,
					workflowsCreated: 0,
					agentsCreated: 0,
					dataTablesCreated: 0,
				},
			);
		}
		return result;
	}
}
