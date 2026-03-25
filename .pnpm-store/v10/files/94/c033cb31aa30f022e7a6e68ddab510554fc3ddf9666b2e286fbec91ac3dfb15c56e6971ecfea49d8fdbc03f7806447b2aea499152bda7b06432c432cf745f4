/// <reference types="node" />
import type { BerReader, BerWriter } from 'asn1';
export interface AttributeOptions {
    type?: string;
    values?: Buffer[] | string[];
}
export declare class Attribute {
    private buffers;
    type: string;
    values: Buffer[] | string[];
    constructor(options?: AttributeOptions);
    get parsedBuffers(): Buffer[];
    write(writer: BerWriter): void;
    parse(reader: BerReader): void;
    private _isBinaryType;
}
