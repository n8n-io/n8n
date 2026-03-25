import type { BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface AndFilterOptions {
    filters: Filter[];
}
export declare class AndFilter extends Filter {
    type: SearchFilter;
    filters: Filter[];
    constructor(options: AndFilterOptions);
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
