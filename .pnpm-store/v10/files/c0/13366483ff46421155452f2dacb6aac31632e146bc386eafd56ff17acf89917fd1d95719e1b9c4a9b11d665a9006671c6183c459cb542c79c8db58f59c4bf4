"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunAdminCommandOperation = exports.RunCommandOperation = void 0;
const utils_1 = require("../utils");
const operation_1 = require("./operation");
/** @internal */
class RunCommandOperation extends operation_1.AbstractOperation {
    constructor(parent, command, options) {
        super(options);
        this.command = command;
        this.options = options;
        this.ns = parent.s.namespace.withCollection('$cmd');
    }
    get commandName() {
        return 'runCommand';
    }
    async execute(server, session, timeoutContext) {
        this.server = server;
        const res = await server.command(this.ns, this.command, {
            ...this.options,
            readPreference: this.readPreference,
            session,
            timeoutContext
        }, this.options.responseType);
        return res;
    }
}
exports.RunCommandOperation = RunCommandOperation;
class RunAdminCommandOperation extends operation_1.AbstractOperation {
    constructor(command, options) {
        super(options);
        this.command = command;
        this.options = options;
        this.ns = new utils_1.MongoDBNamespace('admin', '$cmd');
    }
    get commandName() {
        return 'runCommand';
    }
    async execute(server, session, timeoutContext) {
        this.server = server;
        const res = await server.command(this.ns, this.command, {
            ...this.options,
            readPreference: this.readPreference,
            session,
            timeoutContext
        });
        return res;
    }
}
exports.RunAdminCommandOperation = RunAdminCommandOperation;
//# sourceMappingURL=run_command.js.map