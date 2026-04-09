import { EventEmitter } from 'events';
import { type ParserOptions } from './stream-parser';
import Debug from '../debug';
import { Readable } from 'stream';
import Message from '../message';
import { TokenHandler } from './handler';
export declare class Parser extends EventEmitter {
    debug: Debug;
    options: ParserOptions;
    parser: Readable;
    constructor(message: Message, debug: Debug, handler: TokenHandler, options: ParserOptions);
    on: (((event: 'end', listener: () => void) => this) & ((event: string | symbol, listener: (...args: any[]) => void) => this));
    pause(): Readable;
    resume(): Readable;
}
