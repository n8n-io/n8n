"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillOthers = void 0;
const lodash_1 = __importDefault(require("lodash"));
const operators_1 = require("rxjs/operators");
const command_1 = require("../command");
/**
 * Sends a SIGTERM signal to all commands when one of the commands exits with a matching condition.
 */
class KillOthers {
    constructor({ logger, conditions, killSignal, }) {
        this.logger = logger;
        this.conditions = lodash_1.default.castArray(conditions);
        this.killSignal = killSignal;
    }
    handle(commands) {
        const conditions = this.conditions.filter((condition) => condition === 'failure' || condition === 'success');
        if (!conditions.length) {
            return { commands };
        }
        const closeStates = commands.map((command) => command.close.pipe((0, operators_1.map)(({ exitCode }) => exitCode === 0 ? 'success' : 'failure'), (0, operators_1.filter)((state) => conditions.includes(state))));
        closeStates.forEach((closeState) => closeState.subscribe(() => {
            const killableCommands = commands.filter((command) => command_1.Command.canKill(command));
            if (killableCommands.length) {
                this.logger.logGlobalEvent(`Sending ${this.killSignal || 'SIGTERM'} to other processes..`);
                killableCommands.forEach((command) => command.kill(this.killSignal));
            }
        }));
        return { commands };
    }
}
exports.KillOthers = KillOthers;
