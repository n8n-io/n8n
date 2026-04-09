import Parser, { type ParserOptions } from './token/stream-parser';
import { type Metadata } from './metadata-parser';
import { Result } from './token/helpers';
declare function readValue(buf: Buffer, offset: number, metadata: Metadata, options: ParserOptions): Result<unknown>;
declare function isPLPStream(metadata: Metadata): boolean | undefined;
declare function readPLPStream(parser: Parser): Promise<null | Buffer[]>;
export { readValue, isPLPStream, readPLPStream };
