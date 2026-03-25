/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {ColorConsole} = require('./utils/color');

const npm = {
    utils: require('./utils')
};

/**
 * @class DatabasePool
 * @static
 * @private
 */
class DatabasePool {

    /**
     * Global instance of the database pool repository.
     *
     * @returns {{dbMap: {}, dbs: Array}}
     */
    static get instance() {
        const s = Symbol.for('pgPromiseDatabasePool');
        let scope = global[s];
        if (!scope) {
            scope = {
                dbMap: {}, // map of used database context keys (connection + dc)
                dbs: [] // all database objects
            };
            global[s] = scope;
        }
        return scope;
    }

    /**
     * @method DatabasePool.register
     * @static
     * @description
     *  - Registers each database object, to make sure no duplicates connections are used,
     *    and if they are, produce a warning;
     *  - Registers each Pool object, to be able to release them all when requested.
     *
     * @param {Database} db - The new Database object being registered.
     */
    static register(db) {
        const cnKey = DatabasePool.createContextKey(db);
        npm.utils.addReadProp(db, '$cnKey', cnKey, true);
        const {dbMap, dbs} = DatabasePool.instance;
        if (cnKey in dbMap) {
            dbMap[cnKey]++;
            /* istanbul ignore if */
            if (!db.$config.options.noWarnings) {
                ColorConsole.warn(`WARNING: Creating a duplicate database object for the same connection.\n${npm.utils.getLocalStack(4, 3)}\n`);
            }
        } else {
            dbMap[cnKey] = 1;
        }
        dbs.push(db);
    }

    /**
     * @method DatabasePool.unregister
     * @static
     * @param db
     */
    static unregister(db) {
        const cnKey = db.$cnKey;
        const {dbMap} = DatabasePool.instance;
        if (!--dbMap[cnKey]) {
            delete dbMap[cnKey];
        }
    }

    /**
     * @method DatabasePool.shutDown
     * @static
     */
    static shutDown() {
        const {instance} = DatabasePool;
        instance.dbs.forEach(db => {
            db.$destroy();
        });
        instance.dbs.length = 0;
        instance.dbMap = {};
    }

    /**
     * @method DatabasePool.createContextKey
     * @static
     * @description
     * For connections that are objects it reorders the keys alphabetically,
     * and then serializes the result into a JSON string.
     *
     * @param {Database} db - Database instance.
     */
    static createContextKey(db) {
        let cn = db.$cn;
        if (typeof cn === 'object') {
            const obj = {}, keys = Object.keys(cn).sort();
            keys.forEach(name => {
                obj[name] = cn[name];
            });
            cn = obj;
        }
        return npm.utils.toJson(npm.utils.getSafeConnection(cn)) + npm.utils.toJson(db.$dc);
    }
}

module.exports = {DatabasePool};
