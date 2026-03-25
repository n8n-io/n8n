/// <reference types="node" />
import type { BerReader } from 'asn1';
import { BerWriter } from 'asn1';
import type { ControlOptions } from './Control';
import { Control } from './Control';
export interface PagedResultsValue {
    size: number;
    cookie?: Buffer;
}
export interface PagedResultsControlOptions extends ControlOptions {
    value?: PagedResultsValue;
}
export declare class PagedResultsControl extends Control {
    static type: string;
    value?: PagedResultsValue;
    constructor(options?: PagedResultsControlOptions);
    parseControl(reader: BerReader): void;
    writeControl(writer: BerWriter): void;
}
