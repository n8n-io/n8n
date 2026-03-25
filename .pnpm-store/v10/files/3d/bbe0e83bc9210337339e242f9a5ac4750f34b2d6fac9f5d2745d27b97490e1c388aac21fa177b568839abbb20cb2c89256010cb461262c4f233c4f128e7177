import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface LessThanEqualsFilterOptions {
    attribute?: string;
    value?: string;
}
export declare class LessThanEqualsFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    value: string;
    constructor(options?: LessThanEqualsFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
