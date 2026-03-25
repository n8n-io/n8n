import { Type } from './type';
export interface SchemaDefinition {
    include?: Schema[];
    implicit?: Type[];
    explicit?: Type[];
}
export declare class Schema {
    include: Schema[];
    implicit: Type[];
    explicit: Type[];
    compiledImplicit: any[];
    compiledExplicit: any[];
    compiledTypeMap: any[];
    constructor(definition: SchemaDefinition);
    static DEFAULT: any;
    static create: () => Schema;
}
