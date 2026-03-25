import type { BerReader } from 'asn1';
import { BerWriter } from 'asn1';
import type { ControlOptions } from './Control';
import { Control } from './Control';
export interface EntryChangeNotificationControlValue {
    changeType: number;
    previousDN?: string;
    changeNumber: number;
}
export interface EntryChangeNotificationControlOptions extends ControlOptions {
    value?: EntryChangeNotificationControlValue;
}
export declare class EntryChangeNotificationControl extends Control {
    static type: string;
    value?: EntryChangeNotificationControlValue;
    constructor(options?: EntryChangeNotificationControlOptions);
    parseControl(reader: BerReader): void;
    writeControl(writer: BerWriter): void;
}
