import { NetStream } from "../types";
export declare type ErrorEmitter = (type: string, err: Error) => void;
export default abstract class AbstractConnector {
    firstError?: Error;
    protected connecting: boolean;
    protected stream: NetStream;
    private disconnectTimeout;
    constructor(disconnectTimeout: number);
    check(info: any): boolean;
    disconnect(): void;
    abstract connect(_: ErrorEmitter): Promise<NetStream>;
}
