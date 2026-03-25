import { type Queue, type RunFunction } from './queue.js';
import { type QueueAddOptions } from './options.js';
export type PriorityQueueOptions = {
    priority?: number;
} & QueueAddOptions;
export default class PriorityQueue implements Queue<RunFunction, PriorityQueueOptions> {
    #private;
    enqueue(run: RunFunction, options?: Partial<PriorityQueueOptions>): void;
    setPriority(id: string, priority: number): void;
    dequeue(): RunFunction | undefined;
    filter(options: Readonly<Partial<PriorityQueueOptions>>): RunFunction[];
    get size(): number;
}
