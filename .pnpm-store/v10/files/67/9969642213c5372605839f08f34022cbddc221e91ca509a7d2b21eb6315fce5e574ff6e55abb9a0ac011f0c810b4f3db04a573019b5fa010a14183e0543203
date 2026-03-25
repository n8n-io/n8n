"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveUserOperation = void 0;
const command_1 = require("./command");
const operation_1 = require("./operation");
/** @internal */
class RemoveUserOperation extends command_1.CommandOperation {
    constructor(db, username, options) {
        super(db, options);
        this.options = options;
        this.username = username;
    }
    get commandName() {
        return 'dropUser';
    }
    async execute(server, session, timeoutContext) {
        await super.executeCommand(server, session, { dropUser: this.username }, timeoutContext);
        return true;
    }
}
exports.RemoveUserOperation = RemoveUserOperation;
(0, operation_1.defineAspects)(RemoveUserOperation, [operation_1.Aspect.WRITE_OPERATION]);
//# sourceMappingURL=remove_user.js.map