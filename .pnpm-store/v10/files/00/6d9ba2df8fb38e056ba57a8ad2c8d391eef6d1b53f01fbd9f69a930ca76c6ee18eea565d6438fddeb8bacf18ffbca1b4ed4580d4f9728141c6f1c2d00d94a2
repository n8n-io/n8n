import { Transform } from 'stream';
import Debug from './debug';
import Message from './message';
import { ConnectionError } from './errors';
/**
  IncomingMessageStream
  Transform received TDS data into individual IncomingMessage streams.
*/
declare class IncomingMessageStream extends Transform {
    debug: Debug;
    bl: any;
    currentMessage: Message | undefined;
    constructor(debug: Debug);
    pause(): this;
    resume(): this;
    processBufferedData(callback: (err?: ConnectionError) => void): void;
    _transform(chunk: Buffer, _encoding: string, callback: () => void): void;
}
export default IncomingMessageStream;
