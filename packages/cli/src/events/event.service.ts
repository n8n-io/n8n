import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AiEventMap } from './maps/ai.event-map';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map';
import type { InstanceAiEventMap } from './maps/instance-ai.event-map';
import type { McpPostSaveMetricsEventMap } from './maps/mcp-post-save-metrics.event-map';
import type { PollTriggerMetricsEventMap } from './maps/poll-trigger-metrics.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';
import type { WorkflowPublicationMetricsEventMap } from './maps/workflow-publication-metrics.event-map';

type EventMap = RelayEventMap &
	QueueMetricsEventMap &
	AiEventMap &
	ExecutionDataEventMap &
	InstanceAiEventMap &
	McpPostSaveMetricsEventMap &
	WorkflowPublicationMetricsEventMap &
	PollTriggerMetricsEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
