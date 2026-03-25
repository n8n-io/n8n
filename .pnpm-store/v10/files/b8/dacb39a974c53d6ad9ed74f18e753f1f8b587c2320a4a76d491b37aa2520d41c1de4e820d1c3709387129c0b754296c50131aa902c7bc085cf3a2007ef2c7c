/// <reference types="node" />
import type { BerReader, BerWriter } from 'asn1';
import type { SearchFilter } from '../SearchFilter';
export declare abstract class Filter {
    abstract type: SearchFilter;
    write(writer: BerWriter): void;
    parse(reader: BerReader): void;
    matches(_?: {
        [index: string]: string;
    }, __?: boolean): boolean | void;
    /**
     * RFC 2254 Escaping of filter strings
     * Raw                     Escaped
     * (o=Parens (R Us))       (o=Parens \28R Us\29)
     * (cn=star*)              (cn=star\2A)
     * (filename=C:\MyFile)    (filename=C:\5cMyFile)
     *
     * @param {string|Buffer} input
     */
    escape(input: Buffer | string): string;
    protected parseFilter(_: BerReader): void;
    protected writeFilter(_: BerWriter): void;
    protected getObjectValue(objectToCheck: {
        [index: string]: string;
    }, key: string, strictAttributeCase?: boolean): string | undefined;
}
