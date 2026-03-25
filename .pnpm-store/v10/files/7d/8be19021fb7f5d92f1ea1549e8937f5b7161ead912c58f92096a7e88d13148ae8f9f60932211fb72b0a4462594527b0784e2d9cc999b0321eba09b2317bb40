import { Validator } from './Validator';
import { ValidationError } from './ValidationError';
import { ValidationMetadata } from '../metadata/ValidationMetadata';
import { ValidatorOptions } from './ValidatorOptions';
/**
 * Executes validation over given object.
 */
export declare class ValidationExecutor {
    private validator;
    private validatorOptions?;
    awaitingPromises: Promise<any>[];
    ignoreAsyncValidations: boolean;
    private metadataStorage;
    constructor(validator: Validator, validatorOptions?: ValidatorOptions);
    execute(object: object, targetSchema: string, validationErrors: ValidationError[]): void;
    whitelist(object: any, groupedMetadatas: {
        [propertyName: string]: ValidationMetadata[];
    }, validationErrors: ValidationError[]): void;
    stripEmptyErrors(errors: ValidationError[]): ValidationError[];
    private performValidations;
    private generateValidationError;
    private conditionalValidations;
    private customValidations;
    private nestedValidations;
    private mapContexts;
    private createValidationError;
    private getConstraintType;
}
