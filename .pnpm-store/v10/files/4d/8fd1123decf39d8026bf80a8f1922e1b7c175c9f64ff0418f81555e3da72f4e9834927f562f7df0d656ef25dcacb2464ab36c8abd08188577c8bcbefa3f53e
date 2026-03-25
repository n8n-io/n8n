import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface ExtensibleFilterOptions {
    rule?: string;
    matchType?: string;
    value?: string;
    dnAttributes?: boolean;
    initial?: string;
    any?: string[];
    final?: string;
}
export declare class ExtensibleFilter extends Filter {
    type: SearchFilter;
    value: string;
    rule: string;
    matchType: string;
    dnAttributes: boolean;
    constructor(options?: ExtensibleFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(_?: {
        [index: string]: string;
    }, __?: boolean): void;
    toString(): string;
}
