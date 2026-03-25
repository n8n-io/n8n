"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BufferComposer {
    constructor() {
        Object.defineProperty(this, "chunks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    write(buffer) {
        this.chunks.push(buffer);
    }
    end(buffer) {
        this.write(buffer);
        return Buffer.concat(this.chunks.splice(0));
    }
    reset() {
        this.chunks = [];
    }
}
exports.default = BufferComposer;
