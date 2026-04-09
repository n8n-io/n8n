import { Resource } from 'utilium/cache.js';
import { ErrnoError } from '../../internal/error.js';
import { err, warn } from '../../internal/log.js';
import '../../polyfills.js';
/**
 * A transaction for a store.
 * @category Stores and Transactions
 */
export class Transaction {
    constructor(store) {
        this.store = store;
    }
}
/**
 * Transaction that implements asynchronous operations with synchronous ones
 * @category Stores and Transactions
 */
export class SyncTransaction extends Transaction {
    /* eslint-disable @typescript-eslint/require-await */
    async get(id, offset, end) {
        return this.getSync(id, offset, end);
    }
    async set(id, data, offset) {
        return this.setSync(id, data, offset);
    }
    async remove(id) {
        return this.removeSync(id);
    }
}
/**
 * Transaction that implements synchronous operations with a cache
 * Implementors: You *must* update the cache and wait for `store.asyncDone` in your asynchronous methods.
 * @todo Make sure we handle abortions correctly, especially since the cache is shared between transactions.
 * @category Stores and Transactions
 */
export class AsyncTransaction extends Transaction {
    constructor() {
        super(...arguments);
        this.asyncDone = Promise.resolve();
    }
    /**
     * Run a asynchronous operation from a sync context. Not magic and subject to (race) conditions.
     * @internal
     */
    async(promise) {
        this.asyncDone = this.asyncDone.then(() => promise);
    }
    /**
     * Gets a cache resource
     * If `info` is set and the resource doesn't exist, it will be created
     * @internal
     */
    _cached(id, info) {
        var _a;
        var _b;
        (_a = (_b = this.store).cache) !== null && _a !== void 0 ? _a : (_b.cache = new Map());
        const resource = this.store.cache.get(id);
        if (!resource)
            return !info ? undefined : new Resource(id, info.size, {}, this.store.cache);
        if (info)
            resource.size = info.size;
        return resource;
    }
    getSync(id, offset, end) {
        var _a;
        const resource = this._cached(id);
        if (!resource)
            return;
        end !== null && end !== void 0 ? end : (end = resource.size);
        const missing = resource.missing(offset, end);
        for (const { start, end } of missing) {
            this.async(this.get(id, start, end));
        }
        if (missing.length)
            throw err(ErrnoError.With('EAGAIN', (_a = this.store._fs) === null || _a === void 0 ? void 0 : _a._path(id)));
        const region = resource.regionAt(offset);
        if (!region) {
            warn('Missing cache region for ' + id);
            return;
        }
        return region.data.subarray(offset - region.offset, end - region.offset);
    }
    setSync(id, data, offset) {
        this.async(this.set(id, data, offset));
    }
    removeSync(id) {
        var _a;
        this.async(this.remove(id));
        (_a = this.store.cache) === null || _a === void 0 ? void 0 : _a.delete(id);
    }
}
/**
 * Wraps a transaction with the ability to roll-back changes, among other things.
 * This is used by `StoreFS`
 * @category Stores and Transactions
 * @internal @hidden
 */
export class WrappedTransaction {
    flag(flag) {
        var _a, _b;
        return (_b = (_a = this.raw.store.flags) === null || _a === void 0 ? void 0 : _a.includes(flag)) !== null && _b !== void 0 ? _b : false;
    }
    constructor(raw, fs) {
        this.raw = raw;
        this.fs = fs;
        /**
         * Whether the transaction was committed or aborted
         */
        this.done = false;
        /**
         * Stores data in the keys we modify prior to modifying them.
         * Allows us to roll back commits.
         */
        this.originalData = new Map();
        /**TransactionEntry
         * List of keys modified in this transaction, if any.
         */
        this.modifiedKeys = new Set();
    }
    keys() {
        return this.raw.keys();
    }
    async get(id, offset = 0, end) {
        const data = await this.raw.get(id, offset, end);
        this.stash(id);
        return data;
    }
    getSync(id, offset = 0, end) {
        const data = this.raw.getSync(id, offset, end);
        this.stash(id);
        return data;
    }
    async set(id, data, offset = 0) {
        await this.markModified(id, offset, data.byteLength);
        await this.raw.set(id, data, offset);
    }
    setSync(id, data, offset = 0) {
        this.markModifiedSync(id, offset, data.byteLength);
        this.raw.setSync(id, data, offset);
    }
    async remove(id) {
        await this.markModified(id, 0, undefined);
        await this.raw.remove(id);
    }
    removeSync(id) {
        this.markModifiedSync(id, 0, undefined);
        this.raw.removeSync(id);
    }
    commit() {
        this.done = true;
        return Promise.resolve();
    }
    commitSync() {
        this.done = true;
    }
    async abort() {
        if (this.done)
            return;
        // Rollback old values.
        for (const [id, entries] of this.originalData) {
            if (!this.modifiedKeys.has(id))
                continue;
            // Key didn't exist.
            if (entries.some(ent => !ent.data)) {
                await this.raw.remove(id);
                this.fs._remove(id);
                continue;
            }
            for (const entry of entries.reverse()) {
                await this.raw.set(id, entry.data, entry.offset);
            }
        }
        this.done = true;
    }
    abortSync() {
        if (this.done)
            return;
        // Rollback old values.
        for (const [id, entries] of this.originalData) {
            if (!this.modifiedKeys.has(id))
                continue;
            // Key didn't exist.
            if (entries.some(ent => !ent.data)) {
                this.raw.removeSync(id);
                this.fs._remove(id);
                continue;
            }
            for (const entry of entries.reverse()) {
                this.raw.setSync(id, entry.data, entry.offset);
            }
        }
        this.done = true;
    }
    async [Symbol.asyncDispose]() {
        if (this.done)
            return;
        await this.abort();
    }
    [Symbol.dispose]() {
        if (this.done)
            return;
        this.abortSync();
    }
    /**
     * Stashes given key value pair into `originalData` if it doesn't already exist.
     * Allows us to stash values the program is requesting anyway to
     * prevent needless `get` requests if the program modifies the data later
     * on during the transaction.
     */
    stash(id, data, offset = 0) {
        if (!this.originalData.has(id))
            this.originalData.set(id, []);
        this.originalData.get(id).push({ data, offset });
    }
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    async markModified(id, offset, length) {
        this.modifiedKeys.add(id);
        const end = length ? offset + length : undefined;
        try {
            this.stash(id, await this.raw.get(id, offset, end), offset);
        }
        catch (e) {
            if (!(this.raw instanceof AsyncTransaction))
                throw e;
            /*
                async transaction has a quirk:
                setting the buffer to a larger size doesn't work correctly due to cache ranges
                so, we cache the existing sub-ranges
            */
            const tx = this.raw;
            const resource = tx._cached(id);
            if (!resource)
                throw e;
            for (const range of resource.cached(offset, end !== null && end !== void 0 ? end : offset)) {
                this.stash(id, await this.raw.get(id, range.start, range.end), range.start);
            }
        }
    }
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    markModifiedSync(id, offset, length) {
        this.modifiedKeys.add(id);
        const end = length ? offset + length : undefined;
        try {
            this.stash(id, this.raw.getSync(id, offset, end), offset);
        }
        catch (e) {
            if (!(this.raw instanceof AsyncTransaction))
                throw e;
            /*
                async transaction has a quirk:
                setting the buffer to a larger size doesn't work correctly due to cache ranges
                so, we cache the existing sub-ranges
            */
            const tx = this.raw;
            const resource = tx._cached(id);
            if (!resource)
                throw e;
            for (const range of resource.cached(offset, end !== null && end !== void 0 ? end : offset)) {
                this.stash(id, this.raw.getSync(id, range.start, range.end), range.start);
            }
        }
    }
}
