import type { BerReader } from 'asn1';
import { BerWriter } from 'asn1';
import type { ControlOptions } from './Control';
import { Control } from './Control';
export interface ServerSideSortingRequestValue {
    attributeType: string;
    orderingRule?: string;
    reverseOrder?: boolean;
}
export interface ServerSideSortingRequestControlOptions extends ControlOptions {
    value?: ServerSideSortingRequestValue | ServerSideSortingRequestValue[];
}
export declare class ServerSideSortingRequestControl extends Control {
    static type: string;
    values: ServerSideSortingRequestValue[];
    constructor(options?: ServerSideSortingRequestControlOptions);
    parseControl(reader: BerReader): void;
    writeControl(writer: BerWriter): void;
}
