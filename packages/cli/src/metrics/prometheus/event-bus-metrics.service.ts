import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { EventMessageTypeNames } from 'n8n-workflow';
import promClient, { Counter } from 'prom-client';

import { EventMessageTypes } from '@/eventbus';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import type { PrometheusMetricsCollector } from './base';

/**
 * Creates per-event Prometheus counters driven by MessageEventBus events.
 * Counter names and labels are derived from event name and type (workflow, node, audit).
 */
@Service()
export class PrometheusEventBusMetricsService implements PrometheusMetricsCollector {
	private readonly countersByEventName = new Map<string, Counter<string>>();

	constructor(
		private readonly eventBus: MessageEventBus,
		private readonly config: PrometheusMetricsConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeMessageEventBusMetrics;
	}

	init() {
		this.eventBus.on('metrics.eventBus.event', (event: EventMessageTypes) => {
			const counter = this.toCounter(event);
			if (counter) {
				const labels = this.toLabels(event);
				counter.inc(labels, 1);
			}
		});
	}

	private toCounter(event: EventMessageTypes): Counter | undefined {
		const { eventName } = event;

		if (!this.countersByEventName.has(eventName)) {
			const metricName = this.toMetricName(eventName);

			if (metricName) {
				const labels = this.toLabels(event);

				const counter = new promClient.Counter({
					name: metricName,
					help: `Total number of ${eventName} events.`,
					labelNames: Object.keys(labels),
				});
				this.countersByEventName.set(eventName, counter);
			}
		}

		return this.countersByEventName.get(eventName);
	}

	private toMetricName(eventName: string): string | null {
		const metricName = `${this.config.prefix}${eventName.replace('n8n.', '').replace(/\./g, '_')}_total`;

		if (promClient.validateMetricName(metricName)) {
			return metricName;
		}
		return null;
	}

	private toLabels(event: EventMessageTypes): Record<string, string> {
		const { __type, eventName, payload } = event;

		switch (__type) {
			case EventMessageTypeNames.audit:
				if (eventName.startsWith('n8n.audit.user.credentials')) {
					return this.config.includeCredentialTypeLabel
						? {
								credential_type: String(
									(event.payload.credentialType ?? 'unknown').replace(/\./g, '_'),
								),
							}
						: {};
				}

				if (eventName.startsWith('n8n.audit.workflow')) {
					return this.buildWorkflowLabels(payload);
				}
				break;

			case EventMessageTypeNames.node: {
				const nodeLabels: Record<string, string> = this.buildWorkflowLabels(payload);

				if (this.config.includeNodeTypeLabel) {
					nodeLabels.node_type = String(
						(payload.nodeType ?? 'unknown').replace('n8n-nodes-', '').replace(/\./g, '_'),
					);
				}

				return nodeLabels;
			}

			case EventMessageTypeNames.workflow:
				return this.buildWorkflowLabels(payload);
		}

		return {};
	}

	private buildWorkflowLabels(payload: { workflowId?: unknown; workflowName?: unknown }): Record<
		string,
		string
	> {
		const labels: Record<string, string> = {};
		if (this.config.includeWorkflowIdLabel) {
			labels.workflow_id = typeof payload.workflowId === 'string' ? payload.workflowId : 'unknown';
		}
		if (this.config.includeWorkflowNameLabel) {
			labels.workflow_name =
				typeof payload.workflowName === 'string' ? payload.workflowName : 'unknown';
		}
		return labels;
	}
}
