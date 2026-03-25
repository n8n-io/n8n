"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilingLevelOperation = void 0;
const error_1 = require("../error");
const command_1 = require("./command");
/** @internal */
class ProfilingLevelOperation extends command_1.CommandOperation {
    constructor(db, options) {
        super(db, options);
        this.options = options;
    }
    get commandName() {
        return 'profile';
    }
    async execute(server, session, timeoutContext) {
        const doc = await super.executeCommand(server, session, { profile: -1 }, timeoutContext);
        if (doc.ok === 1) {
            const was = doc.was;
            if (was === 0)
                return 'off';
            if (was === 1)
                return 'slow_only';
            if (was === 2)
                return 'all';
            throw new error_1.MongoUnexpectedServerResponseError(`Illegal profiling level value ${was}`);
        }
        else {
            throw new error_1.MongoUnexpectedServerResponseError('Error with profile command');
        }
    }
}
exports.ProfilingLevelOperation = ProfilingLevelOperation;
//# sourceMappingURL=profiling_level.js.map