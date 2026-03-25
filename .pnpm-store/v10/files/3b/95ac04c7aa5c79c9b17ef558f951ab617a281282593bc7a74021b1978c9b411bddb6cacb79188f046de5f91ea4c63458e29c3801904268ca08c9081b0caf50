"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLRU = void 0;
const createLRU = (options) => {
    let { max } = options;
    if (!(Number.isInteger(max) && max > 0))
        throw new TypeError('`max` must be a positive integer');
    let size = 0;
    let head = 0;
    let tail = 0;
    let free = [];
    const { onEviction } = options;
    const keyMap = new Map();
    const keyList = new Array(max).fill(undefined);
    const valList = new Array(max).fill(undefined);
    const next = new Array(max).fill(0);
    const prev = new Array(max).fill(0);
    const linkTail = (index) => {
        next[tail] = index;
        prev[index] = tail;
        next[index] = 0;
        tail = index;
    };
    const moveToTail = (index) => {
        if (index === tail)
            return;
        const nextIndex = next[index];
        const prevIndex = prev[index];
        if (index === head)
            head = nextIndex;
        else
            next[prevIndex] = nextIndex;
        prev[nextIndex] = prevIndex;
        linkTail(index);
    };
    const _shrink = (newMax) => {
        let current = tail;
        const preserve = Math.min(size, newMax);
        const remove = size - preserve;
        const newKeyList = new Array(preserve);
        const newValList = new Array(preserve);
        for (let i = 0; i < remove; i++) {
            const key = keyList[head];
            onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[head]);
            keyMap.delete(key);
            head = next[head];
        }
        for (let i = preserve - 1; i >= 0; i--) {
            newKeyList[i] = keyList[current];
            newValList[i] = valList[current];
            keyMap.set(keyList[current], i);
            current = prev[current];
        }
        head = 0;
        tail = preserve - 1;
        size = preserve;
        keyList.length = newMax;
        valList.length = newMax;
        next.length = newMax;
        prev.length = newMax;
        for (let i = 0; i < preserve; i++) {
            keyList[i] = newKeyList[i];
            valList[i] = newValList[i];
            next[i] = i + 1;
            prev[i] = i - 1;
        }
        free = [];
        for (let i = preserve; i < newMax; i++)
            free.push(i);
    };
    const _grow = (newMax) => {
        keyList.length = newMax;
        valList.length = newMax;
        next.length = newMax;
        prev.length = newMax;
        keyList.fill(undefined, max);
        valList.fill(undefined, max);
        next.fill(0, max);
        prev.fill(0, max);
    };
    return {
        /** Adds a key-value pair to the cache. Updates the value if the key already exists. */
        set(key, value) {
            if (key === undefined)
                return;
            let index = keyMap.get(key);
            if (index === undefined) {
                if (size === max) {
                    index = head;
                    const evictKey = keyList[index];
                    onEviction === null || onEviction === void 0 ? void 0 : onEviction(evictKey, valList[index]);
                    keyMap.delete(evictKey);
                    head = next[index];
                    prev[head] = 0;
                }
                else {
                    index = free.length > 0 ? free.pop() : size;
                    size++;
                }
                keyMap.set(key, index);
                keyList[index] = key;
                valList[index] = value;
                if (size === 1)
                    head = tail = index;
                else
                    linkTail(index);
            }
            else {
                onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[index]);
                valList[index] = value;
                moveToTail(index);
            }
        },
        /** Retrieves the value for a given key and moves the key to the most recent position. */
        get(key) {
            const index = keyMap.get(key);
            if (index === undefined)
                return;
            if (index !== tail)
                moveToTail(index);
            return valList[index];
        },
        /** Retrieves the value for a given key without changing its position. */
        peek: (key) => {
            const index = keyMap.get(key);
            return index !== undefined ? valList[index] : undefined;
        },
        /** Checks if a key exists in the cache. */
        has: (key) => keyMap.has(key),
        /** Iterates over all keys in the cache, from most recent to least recent. */
        *keys() {
            let current = tail;
            for (let i = 0; i < size; i++) {
                yield keyList[current];
                current = prev[current];
            }
        },
        /** Iterates over all values in the cache, from most recent to least recent. */
        *values() {
            let current = tail;
            for (let i = 0; i < size; i++) {
                yield valList[current];
                current = prev[current];
            }
        },
        /** Iterates over `[key, value]` pairs in the cache, from most recent to least recent. */
        *entries() {
            let current = tail;
            for (let i = 0; i < size; i++) {
                yield [keyList[current], valList[current]];
                current = prev[current];
            }
        },
        /** Iterates over each value-key pair in the cache, from most recent to least recent. */
        forEach: (callback) => {
            let current = tail;
            for (let i = 0; i < size; i++) {
                const key = keyList[current];
                const value = valList[current];
                callback(value, key);
                current = prev[current];
            }
        },
        /** Deletes a key-value pair from the cache. */
        delete(key) {
            const index = keyMap.get(key);
            if (index === undefined)
                return false;
            onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[index]);
            keyMap.delete(key);
            free.push(index);
            keyList[index] = undefined;
            valList[index] = undefined;
            const prevIndex = prev[index];
            const nextIndex = next[index];
            if (index === head)
                head = nextIndex;
            else
                next[prevIndex] = nextIndex;
            if (index === tail)
                tail = prevIndex;
            else
                prev[nextIndex] = prevIndex;
            size--;
            return true;
        },
        /** Evicts the oldest item or the specified number of the oldest items from the cache. */
        evict: (number) => {
            let toPrune = Math.min(number, size);
            while (toPrune > 0) {
                const evictHead = head;
                const key = keyList[evictHead];
                onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[evictHead]);
                keyMap.delete(key);
                keyList[evictHead] = undefined;
                valList[evictHead] = undefined;
                head = next[evictHead];
                prev[head] = 0;
                size--;
                free.push(evictHead);
                toPrune--;
            }
            if (size === 0)
                head = tail = 0;
        },
        /** Clears all key-value pairs from the cache. */
        clear() {
            if (onEviction) {
                let current = head;
                for (let i = 0; i < size; i++) {
                    onEviction(keyList[current], valList[current]);
                    current = next[current];
                }
            }
            keyMap.clear();
            keyList.fill(undefined);
            valList.fill(undefined);
            free = [];
            size = 0;
            head = tail = 0;
        },
        /** Resizes the cache to a new maximum size, evicting items if necessary. */
        resize: (newMax) => {
            if (!(Number.isInteger(newMax) && newMax > 0))
                throw new TypeError('`max` must be a positive integer');
            if (newMax === max)
                return;
            if (newMax < max)
                _shrink(newMax);
            else
                _grow(newMax);
            max = newMax;
        },
        /** Returns the maximum number of items that can be stored in the cache. */
        get max() {
            return max;
        },
        /** Returns the number of items currently stored in the cache. */
        get size() {
            return size;
        },
        /** Returns the number of currently available slots in the cache before reaching the maximum size. */
        get available() {
            return max - size;
        },
    };
};
exports.createLRU = createLRU;
