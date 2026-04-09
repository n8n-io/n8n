"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdAlloc = void 0;
const errors_js_1 = require("./errors.js");
// An allocator of non-negative integer ids.
//
// This clever data structure has these "ideal" properties:
// - It consumes memory proportional to the number of used ids (which is optimal).
// - All operations are O(1) time.
// - The allocated ids are small (with a slight modification, we could always provide the smallest possible
// id).
class IdAlloc {
    // Set of all allocated ids
    #usedIds;
    // Set of all free ids lower than `#usedIds.size`
    #freeIds;
    constructor() {
        this.#usedIds = new Set();
        this.#freeIds = new Set();
    }
    // Returns an id that was free, and marks it as used.
    alloc() {
        // this "loop" is just a way to pick an arbitrary element from the `#freeIds` set
        for (const freeId of this.#freeIds) {
            this.#freeIds.delete(freeId);
            this.#usedIds.add(freeId);
            // maintain the invariant of `#freeIds`
            if (!this.#usedIds.has(this.#usedIds.size - 1)) {
                this.#freeIds.add(this.#usedIds.size - 1);
            }
            return freeId;
        }
        // the `#freeIds` set is empty, so there are no free ids lower than `#usedIds.size`
        // this means that `#usedIds` is a set that contains all numbers from 0 to `#usedIds.size - 1`,
        // so `#usedIds.size` is free
        const freeId = this.#usedIds.size;
        this.#usedIds.add(freeId);
        return freeId;
    }
    free(id) {
        if (!this.#usedIds.delete(id)) {
            throw new errors_js_1.InternalError("Freeing an id that is not allocated");
        }
        // maintain the invariant of `#freeIds`
        this.#freeIds.delete(this.#usedIds.size);
        if (id < this.#usedIds.size) {
            this.#freeIds.add(id);
        }
    }
}
exports.IdAlloc = IdAlloc;
