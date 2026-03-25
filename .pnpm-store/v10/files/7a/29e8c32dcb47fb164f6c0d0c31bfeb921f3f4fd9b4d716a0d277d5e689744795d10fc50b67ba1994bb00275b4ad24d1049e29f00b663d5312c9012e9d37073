"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountOperation = void 0;
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class CountOperation extends command_1.CommandOperation {
    constructor(namespace, filter, options) {
        super({ s: { namespace: namespace } }, options);
        this.options = options;
        this.collectionName = namespace.collection;
        this.query = filter;
    }
    get commandName() {
        return 'count';
    }
    async execute(server, session, timeoutContext) {
        const options = this.options;
        const cmd = {
            count: this.collectionName,
            query: this.query
        };
        if (typeof options.limit === 'number') {
            cmd.limit = options.limit;
        }
        if (typeof options.skip === 'number') {
            cmd.skip = options.skip;
        }
        if (options.hint != null) {
            cmd.hint = options.hint;
        }
        if (typeof options.maxTimeMS === 'number') {
            cmd.maxTimeMS = options.maxTimeMS;
        }
        const result = await super.executeCommand(server, session, cmd, timeoutContext);
        return result ? result.n : 0;
    }
}
exports.CountOperation = CountOperation;
(0, operation_1.defineAspects)(CountOperation, [operation_1.Aspect.READ_OPERATION, operation_1.Aspect.RETRYABLE]);
//# sourceMappingURL=count.js.map