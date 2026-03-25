import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface GreaterThanEqualsFilterOptions {
    attribute?: string;
    value?: string;
}
export declare class GreaterThanEqualsFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    value: string;
    constructor(options?: GreaterThanEqualsFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
