import {JSONPath} from './jsonpath.js';

/**
 * @typedef {any} ContextItem
 */

/**
 * @typedef {any} EvaluatedResult
 */

/**
 * @callback ConditionCallback
 * @param {ContextItem} item
 * @returns {boolean}
 */

/**
 * Copy items out of one array into another.
 * @param {GenericArray} source Array with items to copy
 * @param {GenericArray} target Array to which to copy
 * @param {ConditionCallback} conditionCb Callback passed the current item;
 *     will move item if evaluates to `true`
 * @returns {void}
 */
const moveToAnotherArray = function (source, target, conditionCb) {
    const il = source.length;
    for (let i = 0; i < il; i++) {
        const item = source[i];
        if (conditionCb(item)) {
            // eslint-disable-next-line @stylistic/max-len -- Long
            // eslint-disable-next-line sonarjs/updated-loop-counter -- Convenient
            target.push(source.splice(i--, 1)[0]);
        }
    }
};

/**
 * In-browser replacement for NodeJS' VM.Script.
 */
class Script {
    /**
     * @param {string} expr Expression to evaluate
     */
    constructor (expr) {
        this.code = expr;
    }

    /**
     * @param {object} context Object whose items will be added
     *   to evaluation
     * @returns {EvaluatedResult} Result of evaluated code
     */
    runInNewContext (context) {
        let expr = this.code;
        const keys = Object.keys(context);
        const funcs = [];
        moveToAnotherArray(keys, funcs, (key) => {
            return typeof context[key] === 'function';
        });
        const values = keys.map((vr) => {
            return context[vr];
        });

        const funcString = funcs.reduce((s, func) => {
            let fString = context[func].toString();
            if (!(/function/u).test(fString)) {
                fString = 'function ' + fString;
            }
            return 'var ' + func + '=' + fString + ';' + s;
        }, '');

        expr = funcString + expr;

        // Mitigate http://perfectionkills.com/global-eval-what-are-the-options/#new_function
        if (!(/(['"])use strict\1/u).test(expr) && !keys.includes('arguments')) {
            expr = 'var arguments = undefined;' + expr;
        }

        // Remove last semi so `return` will be inserted before
        //  the previous one instead, allowing for the return
        //  of a bare ending expression
        expr = expr.replace(/;\s*$/u, '');

        // Insert `return`
        const lastStatementEnd = expr.lastIndexOf(';');
        const code =
            lastStatementEnd !== -1
                ? expr.slice(0, lastStatementEnd + 1) +
                  ' return ' +
                  expr.slice(lastStatementEnd + 1)
                : ' return ' + expr;

        // eslint-disable-next-line no-new-func -- User's choice
        return new Function(...keys, code)(...values);
    }
}

JSONPath.prototype.vm = {
    Script
};

export {JSONPath};
