import lowerBound from './lower-bound.js';
export default class PriorityQueue {
    #queue = [];
    enqueue(run, options) {
        const { priority = 0, id, } = options ?? {};
        const element = {
            priority,
            id,
            run,
        };
        if (this.size === 0 || this.#queue[this.size - 1].priority >= priority) {
            this.#queue.push(element);
            return;
        }
        const index = lowerBound(this.#queue, element, (a, b) => b.priority - a.priority);
        this.#queue.splice(index, 0, element);
    }
    setPriority(id, priority) {
        const index = this.#queue.findIndex((element) => element.id === id);
        if (index === -1) {
            throw new ReferenceError(`No promise function with the id "${id}" exists in the queue.`);
        }
        const [item] = this.#queue.splice(index, 1);
        this.enqueue(item.run, { priority, id });
    }
    dequeue() {
        const item = this.#queue.shift();
        return item?.run;
    }
    filter(options) {
        return this.#queue.filter((element) => element.priority === options.priority).map((element) => element.run);
    }
    get size() {
        return this.#queue.length;
    }
}
