"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isSentinelEql(a, b) {
    return ((a.host || "127.0.0.1") === (b.host || "127.0.0.1") &&
        (a.port || 26379) === (b.port || 26379));
}
class SentinelIterator {
    constructor(sentinels) {
        this.cursor = 0;
        this.sentinels = sentinels.slice(0);
    }
    next() {
        const done = this.cursor >= this.sentinels.length;
        return { done, value: done ? undefined : this.sentinels[this.cursor++] };
    }
    reset(moveCurrentEndpointToFirst) {
        if (moveCurrentEndpointToFirst &&
            this.sentinels.length > 1 &&
            this.cursor !== 1) {
            this.sentinels.unshift(...this.sentinels.splice(this.cursor - 1));
        }
        this.cursor = 0;
    }
    add(sentinel) {
        for (let i = 0; i < this.sentinels.length; i++) {
            if (isSentinelEql(sentinel, this.sentinels[i])) {
                return false;
            }
        }
        this.sentinels.push(sentinel);
        return true;
    }
    toString() {
        return `${JSON.stringify(this.sentinels)} @${this.cursor}`;
    }
}
exports.default = SentinelIterator;
