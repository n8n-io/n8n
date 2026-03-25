/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { ChildProcess as BaseChildProcess, SpawnOptions } from 'child_process';
import * as Rx from 'rxjs';
import { EventEmitter, Writable } from 'stream';
/**
 * Identifier for a command; if string, it's the command's name, if number, it's the index.
 */
export type CommandIdentifier = string | number;
export interface CommandInfo {
    /**
     * Command's name.
     */
    name: string;
    /**
     * Which command line the command has.
     */
    command: string;
    /**
     * Which environment variables should the spawned process have.
     */
    env?: Record<string, unknown>;
    /**
     * The current working directory of the process when spawned.
     */
    cwd?: string;
    /**
     * Color to use on prefix of the command.
     */
    prefixColor?: string;
    /**
     * Output command in raw format.
     */
    raw?: boolean;
}
export interface CloseEvent {
    command: CommandInfo;
    /**
     * The command's index among all commands ran.
     */
    index: number;
    /**
     * Whether the command exited because it was killed.
     */
    killed: boolean;
    /**
     * The exit code or signal for the command.
     */
    exitCode: string | number;
    timings: {
        startDate: Date;
        endDate: Date;
        durationSeconds: number;
    };
}
export interface TimerEvent {
    startDate: Date;
    endDate?: Date;
}
/**
 * Subtype of NodeJS's child_process including only what's actually needed for a command to work.
 */
export type ChildProcess = EventEmitter & Pick<BaseChildProcess, 'pid' | 'stdin' | 'stdout' | 'stderr'>;
/**
 * Interface for a function that must kill the process with `pid`, optionally sending `signal` to it.
 */
export type KillProcess = (pid: number, signal?: string) => void;
/**
 * Interface for a function that spawns a command and returns its child process instance.
 */
export type SpawnCommand = (command: string, options: SpawnOptions) => ChildProcess;
export declare class Command implements CommandInfo {
    private readonly killProcess;
    private readonly spawn;
    private readonly spawnOpts;
    readonly index: number;
    /** @inheritdoc */
    readonly name: string;
    /** @inheritdoc */
    readonly command: string;
    /** @inheritdoc */
    readonly prefixColor?: string;
    /** @inheritdoc */
    readonly env: Record<string, unknown>;
    /** @inheritdoc */
    readonly cwd?: string;
    readonly close: Rx.Subject<CloseEvent>;
    readonly error: Rx.Subject<unknown>;
    readonly stdout: Rx.Subject<Buffer>;
    readonly stderr: Rx.Subject<Buffer>;
    readonly timer: Rx.Subject<TimerEvent>;
    process?: ChildProcess;
    stdin?: Writable;
    pid?: number;
    killed: boolean;
    exited: boolean;
    /** @deprecated */
    get killable(): boolean;
    constructor({ index, name, command, prefixColor, env, cwd }: CommandInfo & {
        index: number;
    }, spawnOpts: SpawnOptions, spawn: SpawnCommand, killProcess: KillProcess);
    /**
     * Starts this command, piping output, error and close events onto the corresponding observables.
     */
    start(): void;
    /**
     * Kills this command, optionally specifying a signal to send to it.
     */
    kill(code?: string): void;
    /**
     * Detects whether a command can be killed.
     *
     * Also works as a type guard on the input `command`.
     */
    static canKill(command: Command): command is Command & {
        pid: number;
        process: ChildProcess;
    };
}
