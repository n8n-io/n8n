import type { BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface OrFilterOptions {
    filters: Filter[];
}
export declare class OrFilter extends Filter {
    type: SearchFilter;
    filters: Filter[];
    constructor(options: OrFilterOptions);
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
