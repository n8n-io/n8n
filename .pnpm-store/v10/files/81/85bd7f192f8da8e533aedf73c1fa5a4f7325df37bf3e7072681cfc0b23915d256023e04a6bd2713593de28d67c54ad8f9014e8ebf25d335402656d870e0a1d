import COMMANDS from './commands';
import { RedisCommand, RedisCommandArgument, RedisCommandArguments, RedisCommandRawReply, RedisFunctions, RedisModules, RedisExtensions, RedisScript, RedisScripts, ExcludeMappedString, RedisFunction } from '../commands';
import { RedisMultiQueuedCommand } from '../multi-command';
type RedisClusterMultiCommandSignature<C extends RedisCommand, M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = (...args: Parameters<C['transformArguments']>) => RedisClusterMultiCommandType<M, F, S>;
type WithCommands<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof typeof COMMANDS]: RedisClusterMultiCommandSignature<(typeof COMMANDS)[P], M, F, S>;
};
type WithModules<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof M as ExcludeMappedString<P>]: {
        [C in keyof M[P] as ExcludeMappedString<C>]: RedisClusterMultiCommandSignature<M[P][C], M, F, S>;
    };
};
type WithFunctions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof F as ExcludeMappedString<P>]: {
        [FF in keyof F[P] as ExcludeMappedString<FF>]: RedisClusterMultiCommandSignature<F[P][FF], M, F, S>;
    };
};
type WithScripts<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = {
    [P in keyof S as ExcludeMappedString<P>]: RedisClusterMultiCommandSignature<S[P], M, F, S>;
};
export type RedisClusterMultiCommandType<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = RedisClusterMultiCommand & WithCommands<M, F, S> & WithModules<M, F, S> & WithFunctions<M, F, S> & WithScripts<M, F, S>;
export type InstantiableRedisClusterMultiCommandType<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts> = new (...args: ConstructorParameters<typeof RedisClusterMultiCommand>) => RedisClusterMultiCommandType<M, F, S>;
export type RedisClusterMultiExecutor = (queue: Array<RedisMultiQueuedCommand>, firstKey?: RedisCommandArgument, chainId?: symbol) => Promise<Array<RedisCommandRawReply>>;
export default class RedisClusterMultiCommand {
    #private;
    static extend<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts>(extensions?: RedisExtensions<M, F, S>): InstantiableRedisClusterMultiCommandType<M, F, S>;
    constructor(executor: RedisClusterMultiExecutor, firstKey?: RedisCommandArgument);
    commandsExecutor(command: RedisCommand, args: Array<unknown>): this;
    addCommand(firstKey: RedisCommandArgument | undefined, args: RedisCommandArguments, transformReply?: RedisCommand['transformReply']): this;
    functionsExecutor(fn: RedisFunction, args: Array<unknown>, name: string): this;
    scriptsExecutor(script: RedisScript, args: Array<unknown>): this;
    exec(execAsPipeline?: boolean): Promise<Array<RedisCommandRawReply>>;
    EXEC: (execAsPipeline?: boolean) => Promise<Array<RedisCommandRawReply>>;
    execAsPipeline(): Promise<Array<RedisCommandRawReply>>;
}
export {};
