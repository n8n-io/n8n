"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionListener = void 0;
const Rx = __importStar(require("rxjs"));
const operators_1 = require("rxjs/operators");
/**
 * Provides logic to determine whether lists of commands ran successfully.
 */
class CompletionListener {
    constructor({ successCondition = 'all', scheduler, }) {
        this.successCondition = successCondition;
        this.scheduler = scheduler;
    }
    isSuccess(events) {
        if (this.successCondition === 'first') {
            return events[0].exitCode === 0;
        }
        else if (this.successCondition === 'last') {
            return events[events.length - 1].exitCode === 0;
        }
        const commandSyntaxMatch = this.successCondition.match(/^!?command-(.+)$/);
        if (commandSyntaxMatch == null) {
            // If not a `command-` syntax, then it's an 'all' condition or it's treated as such.
            return events.every(({ exitCode }) => exitCode === 0);
        }
        // Check `command-` syntax condition.
        // Note that a command's `name` is not necessarily unique,
        // in which case all of them must meet the success condition.
        const nameOrIndex = commandSyntaxMatch[1];
        const targetCommandsEvents = events.filter(({ command, index }) => command.name === nameOrIndex || index === Number(nameOrIndex));
        if (this.successCondition.startsWith('!')) {
            // All commands except the specified ones must exit succesfully
            return events.every((event) => targetCommandsEvents.includes(event) || event.exitCode === 0);
        }
        // Only the specified commands must exit succesfully
        return (targetCommandsEvents.length > 0 &&
            targetCommandsEvents.every((event) => event.exitCode === 0));
    }
    /**
     * Given a list of commands, wait for all of them to exit and then evaluate their exit codes.
     *
     * @returns A Promise that resolves if the success condition is met, or rejects otherwise.
     */
    listen(commands) {
        const closeStreams = commands.map((command) => command.close);
        return Rx.lastValueFrom(Rx.merge(...closeStreams).pipe((0, operators_1.bufferCount)(closeStreams.length), (0, operators_1.switchMap)((exitInfos) => this.isSuccess(exitInfos)
            ? this.emitWithScheduler(Rx.of(exitInfos))
            : this.emitWithScheduler(Rx.throwError(() => exitInfos))), (0, operators_1.take)(1)));
    }
    emitWithScheduler(input) {
        return this.scheduler ? input.pipe(Rx.observeOn(this.scheduler)) : input;
    }
}
exports.CompletionListener = CompletionListener;
