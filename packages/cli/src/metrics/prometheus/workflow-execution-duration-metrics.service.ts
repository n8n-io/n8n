import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Observes workflow execution duration as a histogram (`n8n_workflow_execution_duration_seconds`).
 * Labels: `status` (success/failed), `mode` (manual/trigger/webhook/etc.),
 * and optionally `workflow_id` (gated by config flag).
 */
@Service()
export class PrometheusWorkflowExecutionDurationMetricsService
	implements PrometheusMetricsCollector
{
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.config.includeWorkflowExecutionDuration;
	}

	init() {
		const labelNames = ['status', 'mode'];
		if (this.config.includeWorkflowIdLabel) {
			labelNames.push('workflow_id');
		}

		const durationHistogram = new promClient.Histogram({
			name: `${this.config.prefix}workflow_execution_duration_seconds`,
			help: 'Workflow execution duration in seconds.',
			labelNames,
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.eventService.on('workflow-post-execute', ({ runData, workflow }) => {
			if (runData?.stoppedAt) {
				const durationSeconds = (runData.stoppedAt.getTime() - runData.startedAt.getTime()) / 1000;
				const labels: Record<string, string> = {
					status: runData.status === 'success' ? 'success' : 'failed',
					mode: runData.mode,
				};

				if (this.config.includeWorkflowIdLabel) {
					labels.workflow_id = String(workflow.id ?? 'unknown');
				}

				durationHistogram.observe(labels, durationSeconds);
			}
		});
	}
}
