import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter';

import type { AiEventMap } from './maps/ai.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';

type EventMap = RelayEventMap & QueueMetricsEventMap & AiEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
