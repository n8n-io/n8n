/// <reference types="node" />
import { IpcNetConnectOpts, TcpNetConnectOpts } from "net";
import { ConnectionOptions } from "tls";
import { NetStream } from "../types";
import AbstractConnector, { ErrorEmitter } from "./AbstractConnector";
declare type TcpOptions = Pick<TcpNetConnectOpts, "port" | "host" | "family">;
declare type IpcOptions = Pick<IpcNetConnectOpts, "path">;
export declare type StandaloneConnectionOptions = Partial<TcpOptions & IpcOptions> & {
    disconnectTimeout?: number;
    tls?: ConnectionOptions;
};
export default class StandaloneConnector extends AbstractConnector {
    protected options: StandaloneConnectionOptions;
    constructor(options: StandaloneConnectionOptions);
    connect(_: ErrorEmitter): Promise<NetStream>;
}
export {};
