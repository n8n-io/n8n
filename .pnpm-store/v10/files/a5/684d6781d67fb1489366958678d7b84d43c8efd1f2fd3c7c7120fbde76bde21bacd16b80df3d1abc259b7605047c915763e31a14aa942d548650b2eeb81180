import { ValidationError } from './ValidationError';
import { ValidatorOptions } from './ValidatorOptions';
/**
 * Validator performs validation of the given object based on its metadata.
 */
export declare class Validator {
    /**
     * Performs validation of the given object based on decorators used in given object class.
     */
    validate(object: object, options?: ValidatorOptions): Promise<ValidationError[]>;
    /**
     * Performs validation of the given object based on validation schema.
     */
    validate(schemaName: string, object: object, options?: ValidatorOptions): Promise<ValidationError[]>;
    /**
     * Performs validation of the given object based on decorators used in given object class and reject on error.
     */
    validateOrReject(object: object, options?: ValidatorOptions): Promise<void>;
    /**
     * Performs validation of the given object based on validation schema and reject on error.
     */
    validateOrReject(schemaName: string, object: object, options?: ValidatorOptions): Promise<void>;
    /**
     * Performs validation of the given object based on decorators used in given object class.
     * NOTE: This method completely ignores all async validations.
     */
    validateSync(object: object, options?: ValidatorOptions): ValidationError[];
    /**
     * Performs validation of the given object based on validation schema.
     */
    validateSync(schemaName: string, object: object, options?: ValidatorOptions): ValidationError[];
    /**
     * Performs validation of the given object based on decorators or validation schema.
     * Common method for `validateOrReject` and `validate` methods.
     */
    private coreValidate;
}
