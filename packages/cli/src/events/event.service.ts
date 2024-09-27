import { Service } from 'typedi';

import { TypedEmitter } from '@/typed-emitter';

import type { AiEventMap } from './event-maps/ai.event-map';
import type { PubSubEventMap } from './event-maps/pub-sub.event-map';
import type { QueueMetricsEventMap } from './event-maps/queue-metrics.event-map';
import type { RelayEventMap } from './event-maps/relay.event-map';

type EventMap = RelayEventMap & QueueMetricsEventMap & AiEventMap & PubSubEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
