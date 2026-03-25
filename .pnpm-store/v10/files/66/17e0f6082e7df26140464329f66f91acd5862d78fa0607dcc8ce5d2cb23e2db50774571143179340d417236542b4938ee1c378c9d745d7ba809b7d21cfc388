/// <reference types="node" />
import { Readable, ReadableOptions } from "stream";
interface Options extends ReadableOptions {
    key?: string;
    match?: string;
    type?: string;
    command: string;
    redis: any;
    count?: string | number;
}
/**
 * Convenient class to convert the process of scanning keys to a readable stream.
 */
export default class ScanStream extends Readable {
    private opt;
    private _redisCursor;
    private _redisDrained;
    constructor(opt: Options);
    _read(): void;
    close(): void;
}
export {};
