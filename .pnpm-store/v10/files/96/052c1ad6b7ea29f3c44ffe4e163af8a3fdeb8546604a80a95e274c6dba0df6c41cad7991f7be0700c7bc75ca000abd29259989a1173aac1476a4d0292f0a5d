/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {assert} = require('../assert');

const npm = {
    fs: require('fs'),
    path: require('path'),
    utils: require('./'),
    package: require('../../package.json')
};

/**
 * @method utils.camelize
 * @description
 * Camelizes a text string.
 *
 * Case-changing characters include:
 * - _hyphen_
 * - _underscore_
 * - _period_
 * - _space_
 *
 * @param {string} text
 * Input text string.
 *
 * @returns {string}
 * Camelized text string.
 *
 * @see
 * {@link utils.camelizeVar camelizeVar}
 *
 */
function camelize(text) {
    text = text.replace(/[-_\s.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    return text.substring(0, 1).toLowerCase() + text.substring(1);
}

/**
 * @method utils.camelizeVar
 * @description
 * Camelizes a text string, while making it compliant with JavaScript variable names:
 * - contains symbols `a-z`, `A-Z`, `0-9`, `_` and `$`
 * - cannot have leading digits
 *
 * First, it removes all symbols that do not meet the above criteria, except for _hyphen_, _period_ and _space_,
 * and then it forwards into {@link utils.camelize camelize}.
 *
 * @param {string} text
 * Input text string.
 *
 * If it doesn't contain any symbols to make up a valid variable name, the result will be an empty string.
 *
 * @returns {string}
 * Camelized text string that can be used as an open property name.
 *
 * @see
 * {@link utils.camelize camelize}
 *
 */
function camelizeVar(text) {
    text = text.replace(/[^a-zA-Z0-9$_\-\s.]/g, '').replace(/^[0-9_\-\s.]+/, '');
    return camelize(text);
}

function _enumSql(dir, options, cb, namePath) {
    const tree = {};
    npm.fs.readdirSync(dir).forEach(file => {
        let stat;
        const fullPath = npm.path.join(dir, file);
        try {
            stat = npm.fs.statSync(fullPath);
        } catch (e) {
            // while it is very easy to test manually, it is very difficult to test for
            // access-denied errors automatically; therefore excluding from the coverage:
            // istanbul ignore next
            if (options.ignoreErrors) {
                return; // on to the next file/folder;
            }
            // istanbul ignore next
            throw e;
        }
        if (stat.isDirectory()) {
            if (options.recursive) {
                const dirName = camelizeVar(file);
                const np = namePath ? (namePath + '.' + dirName) : dirName;
                const t = _enumSql(fullPath, options, cb, np);
                if (Object.keys(t).length) {
                    if (!dirName.length || dirName in tree) {
                        if (!options.ignoreErrors) {
                            throw new Error('Empty or duplicate camelized folder name: ' + fullPath);
                        }
                    }
                    tree[dirName] = t;
                }
            }
        } else {
            if (npm.path.extname(file).toLowerCase() === '.sql') {
                const name = camelizeVar(file.replace(/\.[^/.]+$/, ''));
                if (!name.length || name in tree) {
                    if (!options.ignoreErrors) {
                        throw new Error('Empty or duplicate camelized file name: ' + fullPath);
                    }
                }
                tree[name] = fullPath;
                if (cb) {
                    const result = cb(fullPath, name, namePath ? (namePath + '.' + name) : name);
                    if (result !== undefined) {
                        tree[name] = result;
                    }
                }
            }
        }
    });
    return tree;
}

/**
 * @method utils.enumSql
 * @description
 * Synchronously enumerates all SQL files (within a given directory) into a camelized SQL tree.
 *
 * All property names within the tree are camelized via {@link utils.camelizeVar camelizeVar},
 * so they can be used in the code directly, as open property names.
 *
 * @param {string} dir
 * Directory path where SQL files are located, either absolute or relative to the current directory.
 *
 * SQL files are identified by using `.sql` extension (case-insensitive).
 *
 * @param {{}} [options]
 * Search options.
 *
 * @param {boolean} [options.recursive=false]
 * Include sub-directories into the search.
 *
 * Sub-directories without SQL files will be skipped from the result.
 *
 * @param {boolean} [options.ignoreErrors=false]
 * Ignore the following types of errors:
 * - access errors, when there is no read access to a file or folder
 * - empty or duplicate camelized property names
 *
 * This flag does not affect errors related to invalid input parameters, or if you pass in a
 * non-existing directory.
 *
 * @param {function} [cb]
 * A callback function that takes three arguments:
 * - `file` - SQL file path, relative or absolute, according to how you specified the search directory
 * - `name` - name of the property that represents the SQL file
 * - `path` - property resolution path (full property name)
 *
 * If the function returns anything other than `undefined`, it overrides the corresponding property value in the tree.
 *
 * @returns {object}
 * Camelized SQL tree object, with each value being an SQL file path (unless changed via the callback).
 *
 * @example
 *
 * // simple SQL tree generation for further processing:
 * const tree = pgp.utils.enumSql('../sql', {recursive: true});
 *
 * @example
 *
 * // generating an SQL tree for dynamic use of names:
 * const sql = pgp.utils.enumSql(__dirname, {recursive: true}, file => {
 *     return new pgp.QueryFile(file, {minify: true});
 * });
 *
 * @example
 *
 * const {join: joinPath} = require('path');
 *
 * // replacing each relative path in the tree with a full one:
 * const tree = pgp.utils.enumSql('../sql', {recursive: true}, file => {
 *     return joinPath(__dirname, file);
 * });
 *
 */
function enumSql(dir, options, cb) {
    if (!npm.utils.isText(dir)) {
        throw new TypeError('Parameter \'dir\' must be a non-empty text string.');
    }
    options = assert(options, ['recursive', 'ignoreErrors']);
    cb = (typeof cb === 'function') ? cb : null;
    return _enumSql(dir, options, cb, '');
}

/**
 * @method utils.taskArgs
 * @description
 * Normalizes/prepares arguments for tasks and transactions.
 *
 * Its main purpose is to simplify adding custom methods {@link Database#task task}, {@link Database#taskIf taskIf},
 * {@link Database#tx tx} and {@link Database#txIf txIf} within event {@link event:extend extend}, as the those methods use fairly
 * complex logic for parsing inputs.
 *
 * @param args {Object}
 * Array-like object of `arguments` that was passed into the method. It is expected that the `arguments`
 * are always made of two parameters - `(options, cb)`, same as all the default task/transaction methods.
 *
 * And if your custom method needs additional parameters, they should be passed in as extra properties within `options`.
 *
 * @returns {Array}
 * Array of arguments that can be passed into a task or transaction.
 *
 * It is extended with properties `options` and `cb` to access the corresponding array elements `[0]` and `[1]` by name.
 *
 * @example
 *
 * // Registering a custom transaction method that assigns a default Transaction Mode:
 *
 * const initOptions = {
 *     extend: obj => {
 *         obj.myTx = function(options, cb) {
 *             const args = pgp.utils.taskArgs(arguments); // prepare arguments
 *
 *             if (!('mode' in args.options)) {
 *                 // if no 'mode' was specified, set default for transaction mode:
 *                 args.options.mode = myTxModeObject; // of type pgp.txMode.TransactionMode
 *             }
 *
 *             return obj.tx.apply(this, args);
 *             // or explicitly, if needed:
 *             // return obj.tx.call(this, args.options, args.cb);
 *         }
 *     }
 * };
 *
 */
function taskArgs(args) {

    if (!args || typeof args.length !== 'number') {
        throw new TypeError('Parameter \'args\' must be an array-like object of arguments.');
    }

    let options = args[0], cb;
    if (typeof options === 'function') {
        cb = options;
        options = {};
        if (cb.name) {
            options.tag = cb.name;
        }
    } else {
        if (typeof args[1] === 'function') {
            cb = args[1];
        }
        if (typeof options === 'string' || typeof options === 'number') {
            options = {tag: options};
        } else {
            options = (typeof options === 'object' && options) || {};
            if (!('tag' in options) && cb && cb.name) {
                options.tag = cb.name;
            }
        }
    }

    const res = [options, cb];

    Object.defineProperty(res, 'options', {
        get: function () {
            return this[0];
        },
        set: function (newValue) {
            this[0] = newValue;
        },
        enumerable: true
    });

    Object.defineProperty(res, 'cb', {
        get: function () {
            return this[1];
        },
        set: function (newValue) {
            this[1] = newValue;
        },
        enumerable: true
    });

    return res;
}

/**
 * @namespace utils
 *
 * @description
 * Namespace for general-purpose static functions, available as `pgp.utils`, before and after initializing the library.
 *
 * @property {function} camelize
 * {@link utils.camelize camelize} - camelizes a text string
 *
 * @property {function} camelizeVar
 * {@link utils.camelizeVar camelizeVar} - camelizes a text string as a variable
 *
 * @property {function} enumSql
 * {@link utils.enumSql enumSql} - enumerates SQL files in a directory
 *
 * @property {function} taskArgs
 * {@link utils.taskArgs taskArgs} - prepares arguments for tasks and transactions
 */
module.exports = {
    camelize,
    camelizeVar,
    enumSql,
    taskArgs
};
