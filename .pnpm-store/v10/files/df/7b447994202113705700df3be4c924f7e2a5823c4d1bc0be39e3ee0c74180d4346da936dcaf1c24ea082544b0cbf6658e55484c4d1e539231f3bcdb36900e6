import type { BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface NotFilterOptions {
    filter: Filter;
}
export declare class NotFilter extends Filter {
    type: SearchFilter;
    filter: Filter;
    constructor(options: NotFilterOptions);
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
