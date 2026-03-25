"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnContextStateCollection = void 0;
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const TURN_STATE_SCOPE_CACHE = Symbol('turnStateScopeCache');
/**
 * A collection for managing state within a turn context.
 */
class TurnContextStateCollection extends Map {
    get(key) {
        return super.get(key);
    }
    /**
     * Pushes a value onto the stack for the specified key.
     * @param key The key of the element to push.
     * @param value The value to push onto the stack.
     */
    push(key, value) {
        var _a;
        const current = this.get(key);
        const cache = this.get(TURN_STATE_SCOPE_CACHE) || new Map();
        if (cache.has(key)) {
            (_a = cache.get(key)) === null || _a === void 0 ? void 0 : _a.push(current);
        }
        else {
            cache.set(key, [current]);
        }
        if (value === undefined) {
            value = current;
        }
        this.set(key, value);
        this.set(TURN_STATE_SCOPE_CACHE, cache);
    }
    /**
     * Pops a value from the stack for the specified key.
     * @param key The key of the element to pop.
     * @returns The value that was popped from the stack.
     */
    pop(key) {
        var _a;
        const current = this.get(key);
        let previous;
        const cache = this.get(TURN_STATE_SCOPE_CACHE) || new Map();
        if (cache.has(key)) {
            previous = (_a = cache.get(key)) === null || _a === void 0 ? void 0 : _a.pop();
        }
        this.set(key, previous);
        this.set(TURN_STATE_SCOPE_CACHE, cache);
        return current;
    }
}
exports.TurnContextStateCollection = TurnContextStateCollection;
//# sourceMappingURL=turnContextStateCollection.js.map