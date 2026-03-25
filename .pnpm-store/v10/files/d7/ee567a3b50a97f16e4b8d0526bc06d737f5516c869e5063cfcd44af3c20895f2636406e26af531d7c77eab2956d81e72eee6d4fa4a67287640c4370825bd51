import { Queue, RunFunction } from './queue';
import { QueueAddOptions } from './options';
export interface PriorityQueueOptions extends QueueAddOptions {
    priority?: number;
}
export default class PriorityQueue implements Queue<RunFunction, PriorityQueueOptions> {
    private readonly _queue;
    enqueue(run: RunFunction, options?: Partial<PriorityQueueOptions>): void;
    dequeue(): RunFunction | undefined;
    filter(options: Readonly<Partial<PriorityQueueOptions>>): RunFunction[];
    get size(): number;
}
