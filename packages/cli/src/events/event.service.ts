import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter.js';

import type { AiEventMap } from './maps/ai.event-map.js';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map.js';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map.js';
import type { RelayEventMap } from './maps/relay.event-map.js';

type EventMap = RelayEventMap & QueueMetricsEventMap & AiEventMap & ExecutionDataEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
