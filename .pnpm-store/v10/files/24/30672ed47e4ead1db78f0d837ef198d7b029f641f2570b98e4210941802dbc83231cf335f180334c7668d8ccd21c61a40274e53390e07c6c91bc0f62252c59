"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainableCursor = exports.Explain = exports.ExplainVerbosity = void 0;
exports.validateExplainTimeoutOptions = validateExplainTimeoutOptions;
exports.decorateWithExplain = decorateWithExplain;
const abstract_cursor_1 = require("./cursor/abstract_cursor");
const error_1 = require("./error");
/** @public */
exports.ExplainVerbosity = Object.freeze({
    queryPlanner: 'queryPlanner',
    queryPlannerExtended: 'queryPlannerExtended',
    executionStats: 'executionStats',
    allPlansExecution: 'allPlansExecution'
});
/** @internal */
class Explain {
    constructor(verbosity, maxTimeMS) {
        if (typeof verbosity === 'boolean') {
            this.verbosity = verbosity
                ? exports.ExplainVerbosity.allPlansExecution
                : exports.ExplainVerbosity.queryPlanner;
        }
        else {
            this.verbosity = verbosity;
        }
        this.maxTimeMS = maxTimeMS;
    }
    static fromOptions({ explain } = {}) {
        if (explain == null)
            return;
        if (typeof explain === 'boolean' || typeof explain === 'string') {
            return new Explain(explain);
        }
        const { verbosity, maxTimeMS } = explain;
        return new Explain(verbosity, maxTimeMS);
    }
}
exports.Explain = Explain;
function validateExplainTimeoutOptions(options, explain) {
    const { maxTimeMS, timeoutMS } = options;
    if (timeoutMS != null && (maxTimeMS != null || explain?.maxTimeMS != null)) {
        throw new error_1.MongoAPIError('Cannot use maxTimeMS with timeoutMS for explain commands.');
    }
}
/**
 * Applies an explain to a given command.
 * @internal
 *
 * @param command - the command on which to apply the explain
 * @param options - the options containing the explain verbosity
 */
function decorateWithExplain(command, explain) {
    const { verbosity, maxTimeMS } = explain;
    const baseCommand = { explain: command, verbosity };
    if (typeof maxTimeMS === 'number') {
        baseCommand.maxTimeMS = maxTimeMS;
    }
    return baseCommand;
}
/**
 * @public
 *
 * A base class for any cursors that have `explain()` methods.
 */
class ExplainableCursor extends abstract_cursor_1.AbstractCursor {
    resolveExplainTimeoutOptions(verbosity, options) {
        let explain;
        let timeout;
        if (verbosity == null && options == null) {
            explain = undefined;
            timeout = undefined;
        }
        else if (verbosity != null && options == null) {
            explain =
                typeof verbosity !== 'object'
                    ? verbosity
                    : 'verbosity' in verbosity
                        ? verbosity
                        : undefined;
            timeout = typeof verbosity === 'object' && 'timeoutMS' in verbosity ? verbosity : undefined;
        }
        else {
            // @ts-expect-error TS isn't smart enough to determine that if both options are provided, the first is explain options
            explain = verbosity;
            timeout = options;
        }
        return { timeout, explain };
    }
}
exports.ExplainableCursor = ExplainableCursor;
//# sourceMappingURL=explain.js.map