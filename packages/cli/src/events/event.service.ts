import { Service } from 'typedi';
import { TypedEmitter } from '@/TypedEmitter';
import type { RelayEventMap } from './relay-event-map';
import type { QueueMetricsEventMap } from './queue-metrics-event-map';

@Service()
export class EventService extends TypedEmitter<RelayEventMap & QueueMetricsEventMap> {}
