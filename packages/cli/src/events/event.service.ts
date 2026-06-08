import { Service } from '@n8n/di';

import { TypedEmitter } from '@/typed-emitter.js';

<<<<<<< HEAD
import type { AiEventMap } from './maps/ai.event-map';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';
=======
import type { AiEventMap } from './maps/ai.event-map.js';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map.js';
import type { RelayEventMap } from './maps/relay.event-map.js';
>>>>>>> 566376fa25 (chore: switch to NodeNext module resolution + add import extensions (no-changelog))

type EventMap = RelayEventMap & QueueMetricsEventMap & AiEventMap & ExecutionDataEventMap;

@Service()
export class EventService extends TypedEmitter<EventMap> {}
