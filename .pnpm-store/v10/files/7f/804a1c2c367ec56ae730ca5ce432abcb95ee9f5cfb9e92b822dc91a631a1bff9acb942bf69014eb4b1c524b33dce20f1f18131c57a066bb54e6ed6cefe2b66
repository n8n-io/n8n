import { ClientCommandOptions } from './client';
import { CommandOptions } from './command-options';
import { RedisCommand, RedisCommandArgument, RedisCommandArguments, RedisCommandReply, RedisFunction, RedisFunctions, RedisModules, RedisScript, RedisScripts } from './commands';
type Instantiable<T = any> = new (...args: Array<any>) => T;
type CommandsExecutor<C extends RedisCommand = RedisCommand> = (command: C, args: Array<unknown>, name: string) => unknown;
interface AttachCommandsConfig<C extends RedisCommand> {
    BaseClass: Instantiable;
    commands: Record<string, C>;
    executor: CommandsExecutor<C>;
}
export declare function attachCommands<C extends RedisCommand>({ BaseClass, commands, executor }: AttachCommandsConfig<C>): void;
interface AttachExtensionsConfig<T extends Instantiable = Instantiable> {
    BaseClass: T;
    modulesExecutor: CommandsExecutor;
    modules?: RedisModules;
    functionsExecutor: CommandsExecutor<RedisFunction>;
    functions?: RedisFunctions;
    scriptsExecutor: CommandsExecutor<RedisScript>;
    scripts?: RedisScripts;
}
export declare function attachExtensions(config: AttachExtensionsConfig): any;
export declare function transformCommandArguments<T = ClientCommandOptions>(command: RedisCommand, args: Array<unknown>): {
    jsArgs: Array<unknown>;
    args: RedisCommandArguments;
    options: CommandOptions<T> | undefined;
};
export declare function transformLegacyCommandArguments(args: Array<any>): Array<any>;
export declare function transformCommandReply<C extends RedisCommand>(command: C, rawReply: unknown, preserved: unknown): RedisCommandReply<C>;
export declare function fCallArguments(name: RedisCommandArgument, fn: RedisFunction, args: RedisCommandArguments): RedisCommandArguments;
export {};
