import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface SubstringFilterOptions {
    attribute?: string;
    initial?: string;
    any?: string[];
    final?: string;
}
export declare class SubstringFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    initial: string;
    any: string[];
    final: string;
    constructor(options?: SubstringFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
    private static _escapeRegExp;
}
