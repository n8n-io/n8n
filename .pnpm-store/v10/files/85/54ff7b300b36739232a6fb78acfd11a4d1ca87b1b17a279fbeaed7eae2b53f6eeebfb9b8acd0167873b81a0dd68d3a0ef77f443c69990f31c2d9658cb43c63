import { RedisCommand, RedisCommandArguments, RedisCommandRawReply, RedisFunction, RedisScript } from './commands';
import { ErrorReply } from './errors';
export interface RedisMultiQueuedCommand {
    args: RedisCommandArguments;
    transformReply?: RedisCommand['transformReply'];
}
export default class RedisMultiCommand {
    static generateChainId(): symbol;
    readonly queue: Array<RedisMultiQueuedCommand>;
    readonly scriptsInUse: Set<string>;
    addCommand(args: RedisCommandArguments, transformReply?: RedisCommand['transformReply']): void;
    addFunction(name: string, fn: RedisFunction, args: Array<unknown>): RedisCommandArguments;
    addScript(script: RedisScript, args: Array<unknown>): RedisCommandArguments;
    handleExecReplies(rawReplies: Array<RedisCommandRawReply | ErrorReply>): Array<RedisCommandRawReply>;
    transformReplies(rawReplies: Array<RedisCommandRawReply | ErrorReply>): Array<RedisCommandRawReply>;
}
