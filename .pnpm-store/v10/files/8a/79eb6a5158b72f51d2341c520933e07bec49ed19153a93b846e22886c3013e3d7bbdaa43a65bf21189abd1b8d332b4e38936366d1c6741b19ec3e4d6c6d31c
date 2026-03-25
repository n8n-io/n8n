import { PassThrough, Transform } from "stream";
import { IncomingForm, Options } from "../";

export class MultipartParser extends Transform {
    constructor(options?: Partial<Options>);
    _final(callback: () => void): void;
    _handleCallback(name: string, buffer: Buffer, start?: number, end?: number): void;
    _transform(buffer: Buffer, _: any, callback: () => void): number;
    explain(): string;
    initWithBoundary(str: string): void;

    static stateToString: (stateNumber: number) => string;

    static STATES: Record<
        | "PARSER_UNINITIALIZED"
        | "START"
        | "START_BOUNDARY"
        | "HEADER_FIELD_START"
        | "HEADER_FIELD"
        | "HEADER_VALUE_START"
        | "HEADER_VALUE"
        | "HEADER_VALUE_ALMOST_DONE"
        | "HEADERS_ALMOST_DONE"
        | "PART_DATA_START"
        | "PART_DATA"
        | "PART_END"
        | "END",
        number
    >;
}

export class OctetStreamParser extends PassThrough {
    constructor(options?: Partial<Options>);
}

export class QuerystringParser extends Transform {
    constructor(options?: Partial<Options>);
    _flush(callback: () => void): void;
    _transform(buffer: Buffer, encoding: BufferEncoding, callback: () => void): void;
}

export class StreamingQuerystring extends QuerystringParser {
    emitField(key: string, val?: string): void;
    getSection(buffer: Buffer, i: number): string;
}

export class DummyParser extends Transform {
    constructor(incomingForm: typeof IncomingForm, options?: Partial<Options>);
    _flush(callback: () => void): void;
}

export class JSONParser extends Transform {
    constructor(options?: Partial<Options>);
    _flush(callback: () => void): void;
    _transform(chunk: any, encoding: BufferEncoding, callback: () => void): void;
}
