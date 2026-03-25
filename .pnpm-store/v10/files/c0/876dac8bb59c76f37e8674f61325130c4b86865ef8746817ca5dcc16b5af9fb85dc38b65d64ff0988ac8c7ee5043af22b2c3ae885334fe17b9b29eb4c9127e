import type { BerReader, BerWriter } from 'asn1';
export interface ControlOptions {
    critical?: boolean;
}
export declare class Control {
    type: string;
    critical: boolean;
    constructor(type: string, options?: ControlOptions);
    write(writer: BerWriter): void;
    parse(reader: BerReader): void;
    protected writeControl(_: BerWriter): void;
    protected parseControl(_: BerReader): void;
}
