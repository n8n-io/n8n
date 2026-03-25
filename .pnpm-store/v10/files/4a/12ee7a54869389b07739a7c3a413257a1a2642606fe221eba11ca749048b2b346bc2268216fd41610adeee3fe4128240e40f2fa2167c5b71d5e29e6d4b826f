import type { BerReader, BerWriter } from 'asn1';
import { Attribute } from './Attribute';
export interface ChangeOptions {
    operation?: 'add' | 'delete' | 'replace';
    modification: Attribute;
}
export declare class Change {
    operation: 'add' | 'delete' | 'replace';
    modification: Attribute;
    constructor(options?: ChangeOptions);
    write(writer: BerWriter): void;
    parse(reader: BerReader): void;
}
