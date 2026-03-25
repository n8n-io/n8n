import { AggregateOptions, AggregateRawReply, AggregateReply } from './AGGREGATE';
export { FIRST_KEY_INDEX, IS_READ_ONLY } from './AGGREGATE';
interface AggregateWithCursorOptions extends AggregateOptions {
    COUNT?: number;
}
export declare function transformArguments(index: string, query: string, options?: AggregateWithCursorOptions): import("@redis/client/dist/lib/commands").RedisCommandArguments;
type AggregateWithCursorRawReply = [
    result: AggregateRawReply,
    cursor: number
];
interface AggregateWithCursorReply extends AggregateReply {
    cursor: number;
}
export declare function transformReply(reply: AggregateWithCursorRawReply): AggregateWithCursorReply;
