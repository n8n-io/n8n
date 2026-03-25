import type { BerReader } from 'asn1';
import { BerWriter } from 'asn1';
import type { ControlOptions } from './Control';
import { Control } from './Control';
export interface PersistentSearchValue {
    changeTypes: number;
    changesOnly: boolean;
    returnECs: boolean;
}
export interface PersistentSearchControlOptions extends ControlOptions {
    value?: PersistentSearchValue;
}
export declare class PersistentSearchControl extends Control {
    static type: string;
    value?: PersistentSearchValue;
    constructor(options?: PersistentSearchControlOptions);
    parseControl(reader: BerReader): void;
    writeControl(writer: BerWriter): void;
}
