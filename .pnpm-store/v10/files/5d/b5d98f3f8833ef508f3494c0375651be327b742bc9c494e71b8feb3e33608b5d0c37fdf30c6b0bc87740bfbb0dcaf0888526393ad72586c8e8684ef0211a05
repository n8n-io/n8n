/// <reference types="node" />
import type { BerReader, BerWriter } from 'asn1';
import { SearchFilter } from '../SearchFilter';
import { Filter } from './Filter';
export interface EqualityFilterOptions {
    attribute?: string;
    value?: Buffer | string;
}
export declare class EqualityFilter extends Filter {
    type: SearchFilter;
    attribute: string;
    value: Buffer | string;
    constructor(options?: EqualityFilterOptions);
    parseFilter(reader: BerReader): void;
    writeFilter(writer: BerWriter): void;
    matches(objectToCheck?: {
        [index: string]: string;
    }, strictAttributeCase?: boolean): boolean;
    toString(): string;
}
