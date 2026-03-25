import { RedisCommandArgument, RedisCommandArguments } from '.';
import { AuthOptions } from './AUTH';
interface MigrateOptions {
    COPY?: true;
    REPLACE?: true;
    AUTH?: AuthOptions;
}
export declare function transformArguments(host: RedisCommandArgument, port: number, key: RedisCommandArgument | Array<RedisCommandArgument>, destinationDb: number, timeout: number, options?: MigrateOptions): RedisCommandArguments;
export declare function transformReply(): string;
export {};
