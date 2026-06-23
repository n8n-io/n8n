import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob, CronTime } from 'cron';
import type { CronContext, Workflow } from 'n8n-workflow';

import { ErrorReporter } from '@/errors';
import { InstanceSettings } from '@/instance-settings';

type CronKey = string; // see `ScheduledTaskManager.toCronKey`
type WorkflowCron = { job: CronJob; summary: string; ctx: CronContext };
type ScheduledCron = { job: CronJob; summary: string; ctx: NormalizedScheduledTaskContext };
type CronsByWorkflow = Map<Workflow['id'], Map<CronKey, WorkflowCron>>;
type CronsByOwner = Map<string, Map<CronKey, ScheduledCron>>;

export type ScheduledCronOwnerType = 'workflow' | 'agent-task';

export type ScheduledTaskContext = {
	ownerType: ScheduledCronOwnerType;
	ownerId: string;
	targetId: string;
	timezone: string;
	expression: string;
	recurrence?: CronContext['recurrence'];
};

type NormalizedScheduledTaskContext = ScheduledTaskContext;

@Service()
export class ScheduledTaskManager {
	readonly cronsByWorkflow: CronsByWorkflow = new Map();

	private readonly cronsByAgentTaskOwner: CronsByOwner = new Map();

	private logInterval?: NodeJS.Timeout;

	/** Crons currently active instance-wide, to display in logs. */
	private get loggableCrons() {
		const loggableCrons: Record<string, string[]> = {};

		for (const [workflowId, crons] of this.cronsByWorkflow) {
			loggableCrons[`workflowId-${workflowId}`] = Array.from(crons.values()).map(
				({ summary }) => summary,
			);
		}

		for (const [ownerId, crons] of this.cronsByAgentTaskOwner) {
			loggableCrons[`agentTaskOwnerId-${ownerId}`] = Array.from(crons.values()).map(
				({ summary }) => summary,
			);
		}

		return loggableCrons;
	}

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		{ activeInterval }: CronLoggingConfig,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = this.logger.scoped('cron');

		if (activeInterval === 0) return;

		this.logInterval = setInterval(() => {
			if (Object.keys(this.loggableCrons).length === 0) return;
			this.logger.debug('Currently active crons', { active: this.loggableCrons });
		}, activeInterval * Time.minutes.toMilliseconds);
	}

	/**
	 * @param onTick - Callback invoked when the cron fires.
	 */
	registerCron(ctx: CronContext, onTick: (scheduledTime: Date) => void): boolean;
	registerCron(ctx: ScheduledTaskContext, onTick: (scheduledTime: Date) => void): boolean;
	registerCron(ctx: CronContext | ScheduledTaskContext, onTick: (scheduledTime: Date) => void) {
		const normalizedCtx = this.normalizeContext(ctx);
		const { ownerType, ownerId, targetId, timezone, expression, recurrence } = normalizedCtx;

		const summary = recurrence?.activated
			? `${expression} (every ${recurrence.intervalSize} ${recurrence.typeInterval})`
			: expression;

		const ownerCrons = this.getOwnerCrons(ownerType, ownerId);
		const key = this.toCronKey(normalizedCtx);

		if (ownerCrons?.has(key)) {
			this.errorReporter.error('Skipped registration for already registered cron', {
				tags: { cron: 'duplicate' },
				extra: {
					ownerType,
					ownerId,
					targetId,
					timezone,
					expression,
					recurrence,
					instanceRole: this.instanceSettings.instanceRole,
				},
			});
			return false;
		}

		// `scheduledTime` always holds the canonical time of the upcoming
		// fire. We use it as a unique key to identify the cron execution.
		// It gets updated on each tick.
		const cronTime = new CronTime(expression, timezone);
		const computeNext = (): Date => cronTime.sendAt().toJSDate();
		let scheduledTime: Date = computeNext();

		const handleTick = () => {
			if (!this.instanceSettings.isLeader) return;

			// Capture the time this firing was scheduled for, then advance
			// `scheduledTime` to the next upcoming fire.
			const firedFor = scheduledTime;
			scheduledTime = computeNext();

			this.logger.debug('Executing cron', {
				ownerType,
				ownerId,
				targetId,
				cron: summary,
				instanceRole: this.instanceSettings.instanceRole,
			});

			onTick(firedFor);
		};

		const job: CronJob = new CronJob(
			expression,
			handleTick,
			/* onComplete= */ undefined,
			/* start= */ true,
			timezone,
		);

		this.setCron(ownerType, ownerId, key, { job, summary, ctx }, normalizedCtx);

		this.logger.debug('Registered cron', {
			ownerType,
			ownerId,
			targetId,
			cron: summary,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	/** Returns whether any crons were registered for the owner and got stopped. */
	deregisterCrons(ownerId: string, ownerType: ScheduledCronOwnerType = 'workflow'): boolean {
		const ownerCrons = this.getOwnerCrons(ownerType, ownerId);

		if (!ownerCrons || ownerCrons.size === 0) return false;

		const summaries: string[] = [];

		for (const cron of ownerCrons.values()) {
			summaries.push(cron.summary);
			void cron.job.stop();
		}

		this.deleteOwnerCrons(ownerType, ownerId);

		this.logger.info('Deregistered all crons', {
			ownerType,
			ownerId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	/** Ids of workflows that currently have crons registered. */
	getWorkflowIdsWithCrons(): string[] {
		return Array.from(this.cronsByWorkflow.keys());
	}

	/** Distinct node ids that currently have crons registered for the workflow. */
	getCronNodeIds(workflowId: string): string[] {
		const workflowCrons = this.cronsByWorkflow.get(workflowId);
		if (!workflowCrons) return [];

		const nodeIds = new Set<string>();
		for (const cron of workflowCrons.values()) {
			nodeIds.add(cron.ctx.nodeId);
		}

		return Array.from(nodeIds);
	}

	/** Deregister the crons registered for a single node of a workflow. */
	deregisterCron(
		ownerId: string,
		targetId: string,
		ownerType: ScheduledCronOwnerType = 'workflow',
	) {
		const ownerCrons = this.getOwnerCrons(ownerType, ownerId);

		if (!ownerCrons || ownerCrons.size === 0) return;

		const summaries: string[] = [];

		for (const [key, cron] of ownerCrons) {
			if (this.getCronTargetId(cron, ownerType) !== targetId) continue;
			summaries.push(cron.summary);
			void cron.job.stop();
			ownerCrons.delete(key);
		}

		if (ownerCrons.size === 0) this.deleteOwnerCrons(ownerType, ownerId);

		if (summaries.length === 0) return;

		this.logger.info('Deregistered crons', {
			ownerType,
			ownerId,
			targetId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	/** Whether any crons are currently registered for the workflow. */
	hasCrons(ownerId: string, ownerType: ScheduledCronOwnerType = 'workflow') {
		const ownerCrons = this.getOwnerCrons(ownerType, ownerId);
		return ownerCrons !== undefined && ownerCrons.size > 0;
	}

	deregisterAllCrons() {
		for (const workflowId of [...this.cronsByWorkflow.keys()]) {
			this.deregisterCrons(workflowId);
		}

		for (const ownerId of [...this.cronsByAgentTaskOwner.keys()]) {
			this.deregisterCrons(ownerId, 'agent-task');
		}

		clearInterval(this.logInterval);
		this.logInterval = undefined;
	}

	private normalizeContext(
		ctx: CronContext | ScheduledTaskContext,
	): NormalizedScheduledTaskContext {
		if ('ownerType' in ctx) return ctx;

		return {
			ownerType: 'workflow',
			ownerId: ctx.workflowId,
			targetId: ctx.nodeId,
			timezone: ctx.timezone,
			expression: ctx.expression,
			recurrence: ctx.recurrence,
		};
	}

	private getOwnerCrons(ownerType: ScheduledCronOwnerType, ownerId: string) {
		if (ownerType === 'workflow') return this.cronsByWorkflow.get(ownerId);

		return this.cronsByAgentTaskOwner.get(ownerId);
	}

	private deleteOwnerCrons(ownerType: ScheduledCronOwnerType, ownerId: string) {
		if (ownerType === 'workflow') {
			this.cronsByWorkflow.delete(ownerId);
			return;
		}

		this.cronsByAgentTaskOwner.delete(ownerId);
	}

	private setCron(
		ownerType: ScheduledCronOwnerType,
		ownerId: string,
		key: CronKey,
		cron: { job: CronJob; summary: string; ctx: CronContext | ScheduledTaskContext },
		normalizedCtx: NormalizedScheduledTaskContext,
	) {
		if (ownerType === 'workflow') {
			const workflowCron: WorkflowCron = {
				job: cron.job,
				summary: cron.summary,
				ctx: this.toWorkflowContext(cron.ctx, normalizedCtx),
			};
			const workflowCrons = this.cronsByWorkflow.get(ownerId);
			if (!workflowCrons) {
				this.cronsByWorkflow.set(ownerId, new Map([[key, workflowCron]]));
			} else {
				workflowCrons.set(key, workflowCron);
			}
			return;
		}

		const scheduledCron: ScheduledCron = {
			job: cron.job,
			summary: cron.summary,
			ctx: normalizedCtx,
		};
		const ownerCrons = this.cronsByAgentTaskOwner.get(ownerId);
		if (!ownerCrons) {
			this.cronsByAgentTaskOwner.set(ownerId, new Map([[key, scheduledCron]]));
		} else {
			ownerCrons.set(key, scheduledCron);
		}
	}

	private toWorkflowContext(
		ctx: CronContext | ScheduledTaskContext,
		normalizedCtx: NormalizedScheduledTaskContext,
	): CronContext {
		if (!('ownerType' in ctx)) return ctx;

		return {
			workflowId: normalizedCtx.ownerId,
			nodeId: normalizedCtx.targetId,
			timezone: normalizedCtx.timezone,
			expression: normalizedCtx.expression as CronContext['expression'],
			recurrence: normalizedCtx.recurrence,
		};
	}

	private getCronTargetId(
		cron: WorkflowCron | ScheduledCron,
		ownerType: ScheduledCronOwnerType,
	): string {
		return ownerType === 'workflow'
			? (cron as WorkflowCron).ctx.nodeId
			: (cron as ScheduledCron).ctx.targetId;
	}

	private toCronKey(ctx: NormalizedScheduledTaskContext): CronKey {
		const { recurrence, ...rest } = ctx;
		const flattened: Record<string, unknown> = !recurrence
			? rest
			: {
					...rest,
					recurrenceActivated: recurrence.activated,
					...(recurrence.activated && {
						recurrenceIndex: recurrence.index,
						recurrenceIntervalSize: recurrence.intervalSize,
						recurrenceTypeInterval: recurrence.typeInterval,
					}),
				};

		const sorted = Object.keys(flattened)
			.sort()
			.reduce<Record<string, unknown>>((result, key) => {
				result[key] = flattened[key];
				return result;
			}, {});

		return JSON.stringify(sorted);
	}
}
