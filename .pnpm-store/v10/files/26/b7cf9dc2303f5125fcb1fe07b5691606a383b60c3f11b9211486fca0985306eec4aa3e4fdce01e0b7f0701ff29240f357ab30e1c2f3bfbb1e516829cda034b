"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DefaultMessageIdProvider {
    constructor() {
        this.nextId = Math.max(1, Math.floor(Math.random() * 65535));
    }
    allocate() {
        const id = this.nextId++;
        if (this.nextId === 65536) {
            this.nextId = 1;
        }
        return id;
    }
    getLastAllocated() {
        return this.nextId === 1 ? 65535 : this.nextId - 1;
    }
    register(messageId) {
        return true;
    }
    deallocate(messageId) { }
    clear() { }
}
exports.default = DefaultMessageIdProvider;
//# sourceMappingURL=default-message-id-provider.js.map