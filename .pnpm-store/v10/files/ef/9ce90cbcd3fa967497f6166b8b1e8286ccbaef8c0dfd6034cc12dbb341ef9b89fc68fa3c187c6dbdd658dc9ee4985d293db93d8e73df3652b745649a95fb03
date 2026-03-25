/// <reference types="node" />
import { ClientCommandOptions } from '../client';
import { CommandOptions } from '../command-options';
import { RedisScriptConfig, SHA1 } from '../lua-script';
export type RedisCommandRawReply = string | number | Buffer | null | undefined | Array<RedisCommandRawReply>;
export type RedisCommandArgument = string | Buffer;
export type RedisCommandArguments = Array<RedisCommandArgument> & {
    preserve?: unknown;
};
export interface RedisCommand {
    FIRST_KEY_INDEX?: number | ((...args: Array<any>) => RedisCommandArgument | undefined);
    IS_READ_ONLY?: boolean;
    TRANSFORM_LEGACY_REPLY?: boolean;
    transformArguments(this: void, ...args: Array<any>): RedisCommandArguments;
    transformReply?(this: void, reply: any, preserved?: any): any;
}
export type RedisCommandReply<C extends RedisCommand> = C['transformReply'] extends (...args: any) => infer T ? T : RedisCommandRawReply;
export type ConvertArgumentType<Type, ToType> = Type extends RedisCommandArgument ? (Type extends (string & ToType) ? Type : ToType) : (Type extends Set<infer Member> ? Set<ConvertArgumentType<Member, ToType>> : (Type extends Map<infer Key, infer Value> ? Map<Key, ConvertArgumentType<Value, ToType>> : (Type extends Array<infer Member> ? Array<ConvertArgumentType<Member, ToType>> : (Type extends Date ? Type : (Type extends Record<PropertyKey, any> ? {
    [Property in keyof Type]: ConvertArgumentType<Type[Property], ToType>;
} : Type)))));
export type RedisCommandSignature<Command extends RedisCommand, Params extends Array<unknown> = Parameters<Command['transformArguments']>> = <Options extends CommandOptions<ClientCommandOptions>>(...args: Params | [options: Options, ...rest: Params]) => Promise<ConvertArgumentType<RedisCommandReply<Command>, Options['returnBuffers'] extends true ? Buffer : string>>;
export interface RedisCommands {
    [command: string]: RedisCommand;
}
export interface RedisModule {
    [command: string]: RedisCommand;
}
export interface RedisModules {
    [module: string]: RedisModule;
}
export interface RedisFunction extends RedisCommand {
    NUMBER_OF_KEYS?: number;
}
export interface RedisFunctionLibrary {
    [fn: string]: RedisFunction;
}
export interface RedisFunctions {
    [library: string]: RedisFunctionLibrary;
}
export type RedisScript = RedisScriptConfig & SHA1;
export interface RedisScripts {
    [script: string]: RedisScript;
}
export interface RedisExtensions<M extends RedisModules = RedisModules, F extends RedisFunctions = RedisFunctions, S extends RedisScripts = RedisScripts> {
    modules?: M;
    functions?: F;
    scripts?: S;
}
export type ExcludeMappedString<S> = string extends S ? never : S;
