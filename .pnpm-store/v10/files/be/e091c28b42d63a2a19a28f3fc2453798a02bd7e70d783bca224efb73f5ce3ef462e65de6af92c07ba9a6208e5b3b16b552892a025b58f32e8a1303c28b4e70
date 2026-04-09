export class SqlCache {
    #owner;
    #sqls;
    capacity;
    constructor(owner, capacity) {
        this.#owner = owner;
        this.#sqls = new Lru();
        this.capacity = capacity;
    }
    // Replaces SQL strings with cached `hrana.Sql` objects in the statements in `hranaStmts`. After this
    // function returns, we guarantee that all `hranaStmts` refer to valid (not closed) `hrana.Sql` objects,
    // but _we may invalidate any other `hrana.Sql` objects_ (by closing them, thus removing them from the
    // server).
    //
    // In practice, this means that after calling this function, you can use the statements only up to the
    // first `await`, because concurrent code may also use the cache and invalidate those statements.
    apply(hranaStmts) {
        if (this.capacity <= 0) {
            return;
        }
        const usedSqlObjs = new Set();
        for (const hranaStmt of hranaStmts) {
            if (typeof hranaStmt.sql !== "string") {
                continue;
            }
            const sqlText = hranaStmt.sql;
            // Stored SQL cannot exceed 5kb.
            // https://github.com/tursodatabase/libsql/blob/e9d637e051685f92b0da43849507b5ef4232fbeb/libsql-server/src/hrana/http/request.rs#L10
            if (sqlText.length >= 5000) {
                continue;
            }
            let sqlObj = this.#sqls.get(sqlText);
            if (sqlObj === undefined) {
                while (this.#sqls.size + 1 > this.capacity) {
                    const [evictSqlText, evictSqlObj] = this.#sqls.peekLru();
                    if (usedSqlObjs.has(evictSqlObj)) {
                        // The SQL object that we are trying to evict is already in use in this batch, so we
                        // must not evict and close it.
                        break;
                    }
                    evictSqlObj.close();
                    this.#sqls.delete(evictSqlText);
                }
                if (this.#sqls.size + 1 <= this.capacity) {
                    sqlObj = this.#owner.storeSql(sqlText);
                    this.#sqls.set(sqlText, sqlObj);
                }
            }
            if (sqlObj !== undefined) {
                hranaStmt.sql = sqlObj;
                usedSqlObjs.add(sqlObj);
            }
        }
    }
}
class Lru {
    // This maps keys to the cache values. The entries are ordered by their last use (entires that were used
    // most recently are at the end).
    #cache;
    constructor() {
        this.#cache = new Map();
    }
    get(key) {
        const value = this.#cache.get(key);
        if (value !== undefined) {
            // move the entry to the back of the Map
            this.#cache.delete(key);
            this.#cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        this.#cache.set(key, value);
    }
    peekLru() {
        for (const entry of this.#cache.entries()) {
            return entry;
        }
        return undefined;
    }
    delete(key) {
        this.#cache.delete(key);
    }
    get size() {
        return this.#cache.size;
    }
}
