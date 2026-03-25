/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {InnerState} = require('./inner-state');
const {addInspection} = require('./utils');
const {assert} = require('./assert');

/**
 * @enum {number}
 * @alias txMode.isolationLevel
 * @readonly
 * @summary Transaction Isolation Level.
 * @description
 * The type is available from the {@link txMode} namespace.
 *
 * @see $[Transaction Isolation]
 */
const isolationLevel = {
    /** Isolation level not specified. */
    none: 0,

    /** ISOLATION LEVEL SERIALIZABLE */
    serializable: 1,

    /** ISOLATION LEVEL REPEATABLE READ */
    repeatableRead: 2,

    /** ISOLATION LEVEL READ COMMITTED */
    readCommitted: 3

    // From the official documentation: http://www.postgresql.org/docs/9.5/static/sql-set-transaction.html
    // The SQL standard defines one additional level, READ UNCOMMITTED. In PostgreSQL READ UNCOMMITTED is treated as READ COMMITTED.
    // => skipping `READ UNCOMMITTED`.
};

/**
 * @class txMode.TransactionMode
 * @description
 * Constructs a complete transaction-opening `BEGIN` command, from these options:
 *  - isolation level
 *  - access mode
 *  - deferrable mode
 *
 * The type is available from the {@link txMode} namespace.
 *
 * @param {} [options]
 * Transaction Mode options.
 *
 * @param {txMode.isolationLevel} [options.tiLevel]
 * Transaction Isolation Level.
 *
 * @param {boolean} [options.readOnly]
 * Sets transaction access mode based on the read-only flag:
 *  - `undefined` - access mode not specified (default)
 *  - `true` - access mode is set to `READ ONLY`
 *  - `false` - access mode is set to `READ WRITE`
 *
 * @param {boolean} [options.deferrable]
 * Sets transaction deferrable mode based on the boolean value:
 *  - `undefined` - deferrable mode not specified (default)
 *  - `true` - mode is set to `DEFERRABLE`
 *  - `false` - mode is set to `NOT DEFERRABLE`
 *
 * It is used only when `tiLevel`=`isolationLevel.serializable`
 * and `readOnly`=`true`, or else it is ignored.
 *
 * @returns {txMode.TransactionMode}
 *
 * @see $[BEGIN], {@link txMode.isolationLevel}
 *
 * @example
 *
 * const {TransactionMode, isolationLevel} = pgp.txMode;
 *
 * // Create a reusable transaction mode (serializable + read-only + deferrable):
 * const mode = new TransactionMode({
 *     tiLevel: isolationLevel.serializable,
 *     readOnly: true,
 *     deferrable: true
 * });
 *
 * db.tx({mode}, t => {
 *     return t.any('SELECT * FROM table');
 * })
 *     .then(data => {
 *         // success;
 *     })
 *     .catch(error => {
 *         // error
 *     });
 *
 * // Instead of the default BEGIN, such transaction will start with:
 *
 * // BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE
 *
 */
class TransactionMode extends InnerState {

    constructor(options) {
        options = assert(options, ['tiLevel', 'deferrable', 'readOnly']);
        const {readOnly, deferrable} = options;
        let {tiLevel} = options;
        let level, accessMode, deferrableMode, begin = 'begin';
        tiLevel = (tiLevel > 0) ? parseInt(tiLevel) : 0;

        if (tiLevel > 0 && tiLevel < 4) {
            const values = ['serializable', 'repeatable read', 'read committed'];
            level = 'isolation level ' + values[tiLevel - 1];
        }
        if (readOnly) {
            accessMode = 'read only';
        } else {
            if (readOnly !== undefined) {
                accessMode = 'read write';
            }
        }
        // From the official documentation: http://www.postgresql.org/docs/9.5/static/sql-set-transaction.html
        // The DEFERRABLE transaction property has no effect unless the transaction is also SERIALIZABLE and READ ONLY
        if (tiLevel === isolationLevel.serializable && readOnly) {
            if (deferrable) {
                deferrableMode = 'deferrable';
            } else {
                if (deferrable !== undefined) {
                    deferrableMode = 'not deferrable';
                }
            }
        }
        if (level) {
            begin += ' ' + level;
        }
        if (accessMode) {
            begin += ' ' + accessMode;
        }
        if (deferrableMode) {
            begin += ' ' + deferrableMode;
        }

        super({begin, capBegin: begin.toUpperCase()});
    }

    /**
     * @method txMode.TransactionMode#begin
     * @description
     * Returns a complete BEGIN statement, according to all the parameters passed into the class.
     *
     * This method is primarily for internal use by the library.
     *
     * @param {boolean} [cap=false]
     * Indicates whether the returned SQL must be capitalized.
     *
     * @returns {string}
     */
    begin(cap) {
        return cap ? this._inner.capBegin : this._inner.begin;
    }
}

addInspection(TransactionMode, function () {
    return this.begin(true);
});

/**
 * @namespace txMode
 * @description
 * Transaction Mode namespace, available as `pgp.txMode`, before and after initializing the library.
 *
 * Extends the default `BEGIN` with Transaction Mode parameters:
 *  - isolation level
 *  - access mode
 *  - deferrable mode
 *
 * @property {function} TransactionMode
 * {@link txMode.TransactionMode TransactionMode} class constructor.
 *
 * @property {txMode.isolationLevel} isolationLevel
 * Transaction Isolation Level enumerator
 *
 * @see $[BEGIN]
 */
module.exports = {
    isolationLevel,
    TransactionMode
};

