/// <reference types="node" />
import { Service, CreateOptions } from './index';
export interface ReplService {
    readonly state: EvalState;
    /**
     * Bind this REPL to a ts-node compiler service.  A compiler service must be bound before `eval`-ing code or starting the REPL
     */
    setService(service: Service): void;
    /**
     * Append code to the virtual <repl> source file, compile it to JavaScript, throw semantic errors if the typechecker is enabled,
     * and execute it.
     *
     * Note: typically, you will want to call `start()` instead of using this method.
     *
     * @param code string of TypeScript.
     */
    evalCode(code: string): any;
    /**
     * `eval` implementation compatible with node's REPL API
     *
     * Can be used in advanced scenarios if you want to manually create your own
     * node REPL instance and delegate eval to this `ReplService`.
     *
     * Example:
     *
     *     import {start} from 'repl';
     *     const replService: tsNode.ReplService = ...; // assuming you have already created a ts-node ReplService
     *     const nodeRepl = start({eval: replService.eval});
     */
    nodeEval(code: string, context: any, _filename: string, callback: (err: Error | null, result?: any) => any): void;
    evalAwarePartialHost: EvalAwarePartialHost;
    /** Start a node REPL */
    start(): void;
    /**
     * Start a node REPL, evaling a string of TypeScript before it starts.
     * @deprecated
     */
    start(code: string): void;
}
/** @category REPL */
export interface CreateReplOptions {
    service?: Service;
    state?: EvalState;
    stdin?: NodeJS.ReadableStream;
    stdout?: NodeJS.WritableStream;
    stderr?: NodeJS.WritableStream;
}
/**
 * Create a ts-node REPL instance.
 *
 * Pay close attention to the example below.  Today, the API requires a few lines
 * of boilerplate to correctly bind the `ReplService` to the ts-node `Service` and
 * vice-versa.
 *
 * Usage example:
 *
 *     const repl = tsNode.createRepl();
 *     const service = tsNode.create({...repl.evalAwarePartialHost});
 *     repl.setService(service);
 *     repl.start();
 *
 * @category REPL
 */
export declare function createRepl(options?: CreateReplOptions): ReplService;
/**
 * Eval state management. Stores virtual `[eval].ts` file
 */
export declare class EvalState {
    path: string;
    __tsNodeEvalStateBrand: unknown;
    constructor(path: string);
}
/**
 * Filesystem host functions which are aware of the "virtual" `[eval].ts`, `<repl>`, or `[stdin].ts` file used to compile REPL inputs.
 * Must be passed to `create()` to create a ts-node compiler service which can compile REPL inputs.
 */
export declare type EvalAwarePartialHost = Pick<CreateOptions, 'readFile' | 'fileExists'>;
export declare function createEvalAwarePartialHost(state: EvalState, composeWith?: EvalAwarePartialHost): EvalAwarePartialHost;
