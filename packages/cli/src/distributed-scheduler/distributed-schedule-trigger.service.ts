import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	compileScheduleTriggerRules,
	getNextScheduleTime,
	validateCompiledScheduleRule,
} from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTriggerHelpers';
import type { Rule } from 'n8n-nodes-base/dist/nodes/Schedule/SchedulerInterface';
import type { INode, Workflow } from 'n8n-workflow';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';

@Service()
export class DistributedScheduleTriggerService {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly scheduledJobRepository: ScheduledJobRepository,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	get enabled() {
		return this.executionsConfig.distributedSchedulerEnabled;
	}

	isScheduleTrigger(node: INode) {
		return node.type === SCHEDULE_TRIGGER_NODE_TYPE;
	}

	async register(workflow: Workflow, node: INode) {
		console.log('registering distributed schedule trigger jobs', {
			workflowId: workflow.id,
			node,
			isEnabled: this.enabled,
		});

		if (!this.enabled || !this.isScheduleTrigger(node)) return false;

		const rule = node.parameters?.rule as Rule | undefined;
		const rules = compileScheduleTriggerRules({
			node,
			rule: rule ?? { interval: [] },
			version: node.typeVersion,
			workflowId: workflow.id,
		});

		const jobs = rules.map((rule) => {
			validateCompiledScheduleRule(node, rule);
			return {
				workflowId: workflow.id,
				nodeId: node.id,
				ruleIndex: rule.index,
				cronExpression: rule.cronExpression,
				timezone: workflow.timezone,
				recurrence: rule.recurrence,
				nextRunAt: getNextScheduleTime(rule.cronExpression, workflow.timezone),
			};
		});

		await this.scheduledJobRepository.replaceJobsForNode(workflow.id, node.id, jobs);

		this.logger.info('Registered distributed schedule trigger jobs', {
			workflowId: workflow.id,
			nodeId: node.id,
			jobCount: jobs.length,
		});

		return true;
	}

	async deregister(workflowId: string, nodeId: string) {
		if (!this.enabled) return false;
		const hasDistributedJobs = await this.scheduledJobRepository.hasJobsForNode(workflowId, nodeId);
		if (!hasDistributedJobs) return false;

		await this.scheduledJobRepository.disableJobsForNode(workflowId, nodeId);
		this.logger.info('Deregistered distributed schedule trigger jobs', { workflowId, nodeId });
		return true;
	}

	async deregisterWorkflow(workflowId: string) {
		if (!this.enabled) return false;

		await this.scheduledJobRepository.disableJobsForWorkflow(workflowId);
		this.logger.info('Deregistered distributed schedule trigger jobs for workflow', {
			workflowId,
		});
		return true;
	}
}
