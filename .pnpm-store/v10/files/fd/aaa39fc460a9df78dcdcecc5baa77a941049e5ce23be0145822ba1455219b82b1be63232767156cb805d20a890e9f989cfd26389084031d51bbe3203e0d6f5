import { Schema, SchemaDraft, ValidationResult } from './types.js';
export declare class Validator {
    private readonly schema;
    private readonly draft;
    private readonly shortCircuit;
    private readonly lookup;
    constructor(schema: Schema | boolean, draft?: SchemaDraft, shortCircuit?: boolean);
    validate(instance: any): ValidationResult;
    addSchema(schema: Schema, id?: string): void;
}
