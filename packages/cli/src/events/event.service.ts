import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AiEventMap } from './maps/ai.event-map';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';

type EventMap = RelayEventMap & QueueMetricsEventMap & AiEventMap & ExecutionDataEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
