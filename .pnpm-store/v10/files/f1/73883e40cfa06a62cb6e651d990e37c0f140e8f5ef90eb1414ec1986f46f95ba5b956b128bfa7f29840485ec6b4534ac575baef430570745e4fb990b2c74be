/// <reference types="node" />
import { Socket } from "net";
import { TLSSocket } from "tls";
export declare type Callback<T = any> = (err?: Error | null, result?: T) => void;
export declare type NetStream = Socket | TLSSocket;
export declare type CommandParameter = string | Buffer | number | any[];
export interface Respondable {
    name: string;
    args: CommandParameter[];
    resolve(result: any): void;
    reject(error: Error): void;
}
export interface PipelineWriteableStream {
    isPipeline: true;
    write(data: string | Buffer): unknown;
    destination: {
        redis: {
            stream: NetStream;
        };
    };
}
export declare type WriteableStream = NetStream | PipelineWriteableStream;
export interface CommandItem {
    command: Respondable;
    stream: WriteableStream;
    select: number;
}
export interface ScanStreamOptions {
    match?: string;
    type?: string;
    count?: number;
}
