import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface ApproximateFilterOptions {
    attribute?: string;
    value?: string;
}
export declare class ApproximateFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    value: string;
    constructor(options?: ApproximateFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(_?: {
        [index: string]: string;
    }, __?: boolean): void;
    toString(): string;
}
