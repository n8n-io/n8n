import { RedisCommandArgument, RedisCommandArguments } from '.';
type SingleParameter = [parameter: RedisCommandArgument, value: RedisCommandArgument];
type MultipleParameters = [config: Record<string, RedisCommandArgument>];
export declare function transformArguments(...[parameterOrConfig, value]: SingleParameter | MultipleParameters): RedisCommandArguments;
export declare function transformReply(): string;
export {};
