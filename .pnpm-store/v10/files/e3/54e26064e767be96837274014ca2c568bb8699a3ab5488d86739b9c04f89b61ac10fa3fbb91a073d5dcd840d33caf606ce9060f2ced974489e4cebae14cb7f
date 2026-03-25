export interface RedisPluginClientTypes {
    connection_options?: {
        port?: string;
        host?: string;
    };
    address?: string;
}
export interface RedisCommand {
    command: string;
    args: string[];
    buffer_args: boolean;
    callback: (err: Error | null, reply: unknown) => void;
    call_on_write: boolean;
}
export type Callback<T> = (err: Error | null, reply: T) => void;
//# sourceMappingURL=internal-types.d.ts.map