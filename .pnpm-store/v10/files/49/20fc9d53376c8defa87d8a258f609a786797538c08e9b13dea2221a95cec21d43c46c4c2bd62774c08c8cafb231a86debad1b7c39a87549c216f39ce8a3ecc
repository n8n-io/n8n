"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const number_allocator_1 = require("number-allocator");
class UniqueMessageIdProvider {
    constructor() {
        this.numberAllocator = new number_allocator_1.NumberAllocator(1, 65535);
    }
    allocate() {
        this.lastId = this.numberAllocator.alloc();
        return this.lastId;
    }
    getLastAllocated() {
        return this.lastId;
    }
    register(messageId) {
        return this.numberAllocator.use(messageId);
    }
    deallocate(messageId) {
        this.numberAllocator.free(messageId);
    }
    clear() {
        this.numberAllocator.clear();
    }
}
exports.default = UniqueMessageIdProvider;
//# sourceMappingURL=unique-message-id-provider.js.map