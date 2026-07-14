import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AiEventMap } from './maps/ai.event-map.js';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map.js';
import type { InstanceAiEventMap } from './maps/instance-ai.event-map.js';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map.js';
import type { RelayEventMap } from './maps/relay.event-map.js';
import type { WorkflowPublicationMetricsEventMap } from './maps/workflow-publication-metrics.event-map.js';

type EventMap = RelayEventMap &
	QueueMetricsEventMap &
	AiEventMap &
	ExecutionDataEventMap &
	InstanceAiEventMap &
	WorkflowPublicationMetricsEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
