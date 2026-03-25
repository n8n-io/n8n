import COMMANDS from './commands';
import { RedisCommand, RedisCommandArguments, RedisCommandRawReply, RedisFunctions, RedisModules, RedisExtensions, RedisScript, RedisScripts, ExcludeMappedString, RedisFunction } from '../commands';
import { RedisMultiQueuedCommand } from '../multi-command';
type CommandSignature<C extends RedisCommand, M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = (...args: Parameters<C['transformArguments']>) => RedisClientMultiCommandType<M, F, S>;
type WithCommands<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof typeof COMMANDS]: CommandSignature<(typeof COMMANDS)[P], M, F, S>;
};
type WithModules<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof M as ExcludeMappedString<P>]: {
        [C in keyof M[P] as ExcludeMappedString<C>]: CommandSignature<M[P][C], M, F, S>;
    };
};
type WithFunctions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof F as ExcludeMappedString<P>]: {
        [FF in keyof F[P] as ExcludeMappedString<FF>]: CommandSignature<F[P][FF], M, F, S>;
    };
};
type WithScripts<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof S as ExcludeMappedString<P>]: CommandSignature<S[P], M, F, S>;
};
export type RedisClientMultiCommandType<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = RedisClientMultiCommand & WithCommands<M, F, S> & WithModules<M, F, S> & WithFunctions<M, F, S> & WithScripts<M, F, S>;
type InstantiableRedisMultiCommand<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = new (...args: ConstructorParameters<typeof RedisClientMultiCommand>) => RedisClientMultiCommandType<M, F, S>;
export type RedisClientMultiExecutor = (queue: Array<RedisMultiQueuedCommand>, selectedDB?: number, chainId?: symbol) => Promise<Array<RedisCommandRawReply>>;
export default class RedisClientMultiCommand {
    #private;
    static extend<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts>(extensions?: RedisExtensions<M, F, S>): InstantiableRedisMultiCommand<M, F, S>;
    readonly v4: Record<string, any>;
    constructor(executor: RedisClientMultiExecutor, legacyMode?: boolean);
    commandsExecutor(command: RedisCommand, args: Array<unknown>): this;
    SELECT(db: number, transformReply?: RedisCommand['transformReply']): this;
    select: (db: number, transformReply?: RedisCommand['transformReply']) => this;
    addCommand(args: RedisCommandArguments, transformReply?: RedisCommand['transformReply']): this;
    functionsExecutor(fn: RedisFunction, args: Array<unknown>, name: string): this;
    scriptsExecutor(script: RedisScript, args: Array<unknown>): this;
    exec(execAsPipeline?: boolean): Promise<Array<RedisCommandRawReply>>;
    EXEC: (execAsPipeline?: boolean) => Promise<Array<RedisCommandRawReply>>;
    execAsPipeline(): Promise<Array<RedisCommandRawReply>>;
}
export {};
