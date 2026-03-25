import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface PresenceFilterOptions {
    attribute?: string;
}
export declare class PresenceFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    constructor(options?: PresenceFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
