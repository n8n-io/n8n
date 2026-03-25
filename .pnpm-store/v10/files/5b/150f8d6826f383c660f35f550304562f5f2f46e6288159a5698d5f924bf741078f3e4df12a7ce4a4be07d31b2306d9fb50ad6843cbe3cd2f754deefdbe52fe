"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogExit = void 0;
/**
 * Logs the exit code/signal of commands.
 */
class LogExit {
    constructor({ logger }) {
        this.logger = logger;
    }
    handle(commands) {
        commands.forEach((command) => command.close.subscribe(({ exitCode }) => {
            this.logger.logCommandEvent(`${command.command} exited with code ${exitCode}`, command);
        }));
        return { commands };
    }
}
exports.LogExit = LogExit;
