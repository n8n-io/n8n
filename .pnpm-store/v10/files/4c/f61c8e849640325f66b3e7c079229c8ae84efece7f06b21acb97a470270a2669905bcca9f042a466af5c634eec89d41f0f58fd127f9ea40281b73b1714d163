/// <reference types="node" />
import { Writable } from 'stream';
import { CloseEvent, Command, CommandInfo, KillProcess, SpawnCommand } from './command';
import { SuccessCondition } from './completion-listener';
import { FlowController } from './flow-control/flow-controller';
import { Logger } from './logger';
/**
 * A command that is to be passed into `concurrently()`.
 * If value is a string, then that's the command's command line.
 * Fine grained options can be defined by using the object format.
 */
export type ConcurrentlyCommandInput = string | ({
    command: string;
} & Partial<CommandInfo>);
export type ConcurrentlyResult = {
    /**
     * All commands created and ran by concurrently.
     */
    commands: Command[];
    /**
     * A promise that resolves when concurrently ran successfully according to the specified
     * success condition, or reject otherwise.
     *
     * Both the resolved and rejected value is the list of all command's close events.
     */
    result: Promise<CloseEvent[]>;
};
export type ConcurrentlyOptions = {
    logger?: Logger;
    /**
     * Which stream should the commands output be written to.
     */
    outputStream?: Writable;
    /**
     * Whether the output should be ordered as if the commands were run sequentially.
     */
    group?: boolean;
    /**
     * Comma-separated list of chalk colors to use on prefixes.
     */
    prefixColors?: string[];
    /**
     * Maximum number of commands to run at once.
     * Exact number or a percent of CPUs available (for example "50%").
     *
     * If undefined, then all processes will start in parallel.
     * Setting this value to 1 will achieve sequential running.
     */
    maxProcesses?: number | string;
    /**
     * Whether commands should be spawned in raw mode.
     * Defaults to false.
     */
    raw?: boolean;
    /**
     * The current working directory of commands which didn't specify one.
     * Defaults to `process.cwd()`.
     */
    cwd?: string;
    /**
     * @see CompletionListener
     */
    successCondition?: SuccessCondition;
    /**
     * Which flow controllers should be applied on commands spawned by concurrently.
     * Defaults to an empty array.
     */
    controllers: FlowController[];
    /**
     * A function that will spawn commands.
     * Defaults to the `spawn-command` module.
     */
    spawn: SpawnCommand;
    /**
     * A function that will kill processes.
     * Defaults to the `tree-kill` module.
     */
    kill: KillProcess;
    /**
     * Signal to send to killed processes.
     */
    killSignal?: string;
    /**
     * List of additional arguments passed that will get replaced in each command.
     * If not defined, no argument replacing will happen.
     *
     * @see ExpandArguments
     */
    additionalArguments?: string[];
};
/**
 * Core concurrently functionality -- spawns the given commands concurrently and
 * returns the commands themselves + the result according to the specified success condition.
 *
 * @see CompletionListener
 */
export declare function concurrently(baseCommands: ConcurrentlyCommandInput[], baseOptions?: Partial<ConcurrentlyOptions>): ConcurrentlyResult;
