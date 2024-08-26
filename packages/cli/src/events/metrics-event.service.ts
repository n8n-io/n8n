import { Service } from 'typedi';
import { TypedEmitter } from '@/TypedEmitter';
import type { QueueMetricsEventMap } from './queue-metrics-event-map';

@Service()
export class MetricsEventService extends TypedEmitter<QueueMetricsEventMap> {}
