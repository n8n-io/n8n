"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogOutput = void 0;
/**
 * Logs the stdout and stderr output of commands.
 */
class LogOutput {
    constructor({ logger }) {
        this.logger = logger;
    }
    handle(commands) {
        commands.forEach((command) => {
            command.stdout.subscribe((text) => this.logger.logCommandText(text.toString(), command));
            command.stderr.subscribe((text) => this.logger.logCommandText(text.toString(), command));
        });
        return { commands };
    }
}
exports.LogOutput = LogOutput;
