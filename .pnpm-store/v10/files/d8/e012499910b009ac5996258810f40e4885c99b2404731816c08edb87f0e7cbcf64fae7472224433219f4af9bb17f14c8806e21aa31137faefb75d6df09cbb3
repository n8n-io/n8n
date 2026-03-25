"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbStatsOperation = void 0;
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class DbStatsOperation extends command_1.CommandOperation {
    constructor(db, options) {
        super(db, options);
        this.options = options;
    }
    get commandName() {
        return 'dbStats';
    }
    async execute(server, session, timeoutContext) {
        const command = { dbStats: true };
        if (this.options.scale != null) {
            command.scale = this.options.scale;
        }
        return await super.executeCommand(server, session, command, timeoutContext);
    }
}
exports.DbStatsOperation = DbStatsOperation;
(0, operation_1.defineAspects)(DbStatsOperation, [operation_1.Aspect.READ_OPERATION]);
//# sourceMappingURL=stats.js.map