/// <reference types="node" />
/// <reference types="fs-extra" />

import { Buffer } from 'node:buffer';
import cp, { type ChildProcess, type IOType, type StdioOptions } from 'node:child_process';
import { type Encoding } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { type Readable, type Writable } from 'node:stream';
import { inspect } from 'node:util';
import { Fail } from './error.js';
import { log } from './log.js';
import { type TSpawnStore } from './vendor-core.js';
import { type Duration, quote } from './util.js';
export { bus } from './internals.js';
export { default as path } from 'node:path';
export * as os from 'node:os';
export { Fail } from './error.js';
export { log, type LogEntry } from './log.js';
export { chalk, which, ps } from './vendor-core.js';
export { type Duration, quote, quotePowerShell } from './util.js';
declare const CWD: unique symbol;
declare const SYNC: unique symbol;
declare const SHOT: unique symbol;
export interface Options {
    [CWD]: string;
    [SYNC]: boolean;
    cwd?: string;
    ac?: AbortController;
    signal?: AbortSignal;
    input?: string | Buffer | Readable | ProcessOutput | ProcessPromise;
    timeout?: Duration;
    timeoutSignal?: NodeJS.Signals;
    stdio: StdioOptions;
    verbose: boolean;
    sync: boolean;
    env: NodeJS.ProcessEnv;
    shell: string | true;
    nothrow: boolean;
    prefix?: string;
    postfix?: string;
    quote?: typeof quote;
    quiet: boolean;
    detached: boolean;
    preferLocal: boolean | string | string[];
    spawn: typeof cp.spawn;
    spawnSync: typeof cp.spawnSync;
    store?: TSpawnStore;
    log: typeof log;
    kill: typeof kill;
    killSignal?: NodeJS.Signals;
    halt?: boolean;
    delimiter?: string | RegExp;
}
type Snapshot = Options & {
    from: string;
    pieces: TemplateStringsArray;
    args: string[];
    cmd: string;
    ee: EventEmitter;
    ac: AbortController;
};
export declare const defaults: Options;
export declare function within<R>(callback: () => R): R;
export interface Shell<S = false, R = S extends true ? ProcessOutput : ProcessPromise> {
    (pieces: TemplateStringsArray, ...args: any[]): R;
    <O extends Partial<Options> = Partial<Options>, R = O extends {
        sync: true;
    } ? Shell<true> : Shell>(opts: O): R;
    sync: {
        (pieces: TemplateStringsArray, ...args: any[]): ProcessOutput;
        (opts: Partial<Omit<Options, 'sync'>>): Shell<true>;
    };
}
export type $ = Shell & Options;
export declare const $: $;
type ProcessStage = 'initial' | 'halted' | 'running' | 'fulfilled' | 'rejected';
type Resolve = (out: ProcessOutput) => void;
type Reject = (error: ProcessOutput | Error) => void;
type PromiseCallback = {
    (resolve: Resolve, reject: Reject): void;
    [SHOT]?: Snapshot;
};
type PromisifiedStream<D extends Writable = Writable> = D & PromiseLike<ProcessOutput & D> & {
    run(): void;
};
type PipeAcceptor = Writable | ProcessPromise;
type PipeMethod = {
    (dest: TemplateStringsArray, ...args: any[]): ProcessPromise;
    (file: string): PromisifiedStream;
    <D extends Writable>(dest: D): PromisifiedStream<D>;
    <D extends ProcessPromise>(dest: D): D;
};
export declare class ProcessPromise extends Promise<ProcessOutput> {
    private _stage;
    private _id;
    private _snapshot;
    private _timeoutId?;
    private _piped;
    private _stdin;
    private _zurk;
    private _output;
    private _resolve;
    private _reject;
    constructor(executor: PromiseCallback);
    private build;
    run(): this;
    private _breakerData?;
    private break;
    private finalize;
    abort(reason?: string): void;
    kill(signal?: NodeJS.Signals | null): Promise<void>;
    stdio(stdin: IOType | StdioOptions, stdout?: IOType, stderr?: IOType): this;
    nothrow(v?: boolean): this;
    quiet(v?: boolean): this;
    verbose(v?: boolean): this;
    timeout(d?: Duration, signal?: NodeJS.Signals | undefined): this;
    /**
     *  @deprecated Use $({halt: true})`cmd` instead.
     */
    halt(): this;
    get id(): string;
    get pid(): number | undefined;
    get cmd(): string;
    get fullCmd(): string;
    get child(): ChildProcess | undefined;
    get stdin(): Writable;
    get stdout(): Readable;
    get stderr(): Readable;
    get exitCode(): Promise<number | null>;
    get signal(): AbortSignal;
    get ac(): AbortController;
    get output(): ProcessOutput | null;
    get stage(): ProcessStage;
    get sync(): boolean;
    get [Symbol.toStringTag](): string;
    [Symbol.toPrimitive](): string;
    json<T = any>(): Promise<T>;
    text(encoding?: Encoding): Promise<string>;
    lines(delimiter?: Options['delimiter']): Promise<string[]>;
    buffer(): Promise<Buffer>;
    blob(type?: string): Promise<Blob>;
    isQuiet(): boolean;
    isVerbose(): boolean;
    isNothrow(): boolean;
    isHalted(): boolean;
    private isSettled;
    private isRunning;
    get pipe(): PipeMethod & {
        [key in keyof TSpawnStore]: PipeMethod;
    };
    unpipe(to?: PipeAcceptor): this;
    private _pipe;
    private static bus;
    private static promisifyStream;
    then<R = ProcessOutput, E = ProcessOutput>(onfulfilled?: ((value: ProcessOutput) => PromiseLike<R> | R) | undefined | null, onrejected?: ((reason: ProcessOutput) => PromiseLike<E> | E) | undefined | null): Promise<R | E>;
    catch<T = ProcessOutput>(onrejected?: ((reason: ProcessOutput) => PromiseLike<T> | T) | undefined | null): Promise<ProcessOutput | T>;
    [Symbol.asyncIterator](): AsyncIterator<string>;
    private writable;
    private emit;
    private on;
    private once;
    private write;
    private end;
    private removeListener;
    private static disarm;
}
type ProcessDto = {
    code: number | null;
    signal: NodeJS.Signals | null;
    duration: number;
    error: any;
    from: string;
    store: TSpawnStore;
    delimiter?: string | RegExp;
};
export declare class ProcessOutput extends Error {
    private readonly _dto;
    cause: Error | null;
    message: string;
    stdout: string;
    stderr: string;
    stdall: string;
    constructor(dto: ProcessDto);
    constructor(code?: number | null, signal?: NodeJS.Signals | null, stdout?: string, stderr?: string, stdall?: string, message?: string, duration?: number);
    get exitCode(): number | null;
    get signal(): NodeJS.Signals | null;
    get duration(): number;
    get [Symbol.toStringTag](): string;
    get ok(): boolean;
    json<T = any>(): T;
    buffer(): Buffer;
    blob(type?: string): Blob;
    text(encoding?: Encoding): string;
    lines(delimiter?: string | RegExp): string[];
    toString(): string;
    valueOf(): string;
    [Symbol.toPrimitive](): string;
    [Symbol.iterator](dlmtr?: Options['delimiter']): Iterator<string>;
    [inspect.custom](): string;
    static getExitMessage: typeof Fail.formatExitMessage;
    static getErrorMessage: typeof Fail.formatErrorMessage;
    static getErrorDetails: typeof Fail.formatErrorDetails;
    static getExitCodeInfo: typeof Fail.getExitCodeInfo;
    static fromError(error: Error): ProcessOutput;
}
export declare const useBash: () => void;
export declare const usePwsh: () => void;
export declare const usePowerShell: () => void;
export declare function syncProcessCwd(flag?: boolean): void;
export declare function cd(dir: string | ProcessOutput): void;
export declare function kill(pid: number | `${number}`, signal?: NodeJS.Signals): Promise<void>;
export declare function resolveDefaults(defs?: Options, prefix?: string, env?: NodeJS.ProcessEnv, allowed?: Set<string>): Options;
