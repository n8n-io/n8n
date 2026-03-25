import { Readable, Writable } from 'stream';
import { EmitterAugmentation1 } from './events';
export type WriteCallback = (error: Error | null | undefined) => void;
export interface IntermediateObjectReadable<T> extends Readable {
    read(size?: number): any & T;
}
export type ObjectReadable<T> = {
    read(size?: number): T;
} & EmitterAugmentation1<'data', T> & IntermediateObjectReadable<T>;
export interface IntermediateObjectWritable<T> extends Writable {
    _write(chunk: any & T, encoding: string, callback: Function): void;
    write(chunk: any & T, cb?: WriteCallback): boolean;
    write(chunk: any & T, encoding?: any, cb?: WriteCallback): boolean;
    setDefaultEncoding(encoding: string): this;
    end(): ReturnType<Writable['end']> extends Writable ? this : void;
    end(chunk: any & T, cb?: Function): ReturnType<Writable['end']> extends Writable ? this : void;
    end(chunk: any & T, encoding?: any, cb?: Function): ReturnType<Writable['end']> extends Writable ? this : void;
}
export interface ObjectWritable<T> extends IntermediateObjectWritable<T> {
    _write(chunk: T, encoding: string, callback: Function): void;
    write(chunk: T, cb?: Function): boolean;
    write(chunk: T, encoding?: any, cb?: Function): boolean;
    setDefaultEncoding(encoding: string): this;
    end(): ReturnType<Writable['end']> extends Writable ? this : void;
    end(chunk: T, cb?: Function): ReturnType<Writable['end']> extends Writable ? this : void;
    end(chunk: T, encoding?: any, cb?: Function): ReturnType<Writable['end']> extends Writable ? this : void;
}
