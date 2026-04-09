import { AsyncTransaction, SyncTransaction } from './store.js';
/**
 * Transaction for map stores.
 * @category Stores and Transactions
 * @see SyncMapStore
 */
export class SyncMapTransaction extends SyncTransaction {
    // eslint-disable-next-line @typescript-eslint/require-await
    async keys() {
        return this.store.keys();
    }
    async get(id) {
        var _a, _b, _c;
        return await ((_c = (_b = (_a = this.store).getAsync) === null || _b === void 0 ? void 0 : _b.call(_a, id)) !== null && _c !== void 0 ? _c : this.store.get(id));
    }
    getSync(id) {
        return this.store.get(id);
    }
    setSync(id, data) {
        this.store.set(id, data);
    }
    removeSync(id) {
        this.store.delete(id);
    }
}
/**
 * @category Stores and Transactions
 */
export class AsyncMapTransaction extends AsyncTransaction {
    async keys() {
        await this.asyncDone;
        return this.store.keys();
    }
    async get(id, offset, end) {
        await this.asyncDone;
        return await this.store.get(id, offset, end);
    }
    getSync(id, offset, end) {
        return this.store.cached(id, offset, end);
    }
    async set(id, data, offset = 0) {
        await this.asyncDone;
        await this.store.set(id, data, offset);
    }
    async remove(id) {
        await this.asyncDone;
        await this.store.delete(id);
    }
}
