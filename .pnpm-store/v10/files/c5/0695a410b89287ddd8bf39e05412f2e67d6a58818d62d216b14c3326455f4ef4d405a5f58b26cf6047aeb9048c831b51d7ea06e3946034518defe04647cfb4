"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryLock = void 0;
class QueryLock {
    constructor() {
        this.queue = [];
    }
    async acquire() {
        let release;
        const waitingPromise = new Promise((ok) => (release = ok));
        // Get track of everyone we need to wait on..
        const otherWaitingPromises = [...this.queue];
        // Put ourselves onto the end of the queue
        this.queue.push(waitingPromise);
        if (otherWaitingPromises.length > 0) {
            await Promise.all(otherWaitingPromises);
        }
        return () => {
            release();
            if (this.queue.includes(waitingPromise)) {
                this.queue.splice(this.queue.indexOf(waitingPromise), 1);
            }
        };
    }
}
exports.QueryLock = QueryLock;

//# sourceMappingURL=QueryLock.js.map
