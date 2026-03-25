import { Schema, ProtoOptions, ProtoConfluentSchema } from './@types';
export default class ProtoSchema implements Schema {
    private message;
    constructor(schema: ProtoConfluentSchema, opts?: ProtoOptions);
    private getNestedTypeName;
    private getTypeName;
    private trimStart;
    toBuffer(payload: object): Buffer;
    fromBuffer(buffer: Buffer): any;
    isValid(payload: object, opts?: {
        errorHook: (path: Array<string>, value: any, type?: any) => void;
    }): boolean;
}
