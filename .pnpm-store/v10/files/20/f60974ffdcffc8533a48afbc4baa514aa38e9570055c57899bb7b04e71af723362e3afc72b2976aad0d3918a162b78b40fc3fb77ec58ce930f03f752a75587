import { ValidationError } from './validation/ValidationError';
import { ValidatorOptions } from './validation/ValidatorOptions';
import { ValidationSchema } from './validation-schema/ValidationSchema';
export * from './container';
export * from './decorator/decorators';
export * from './decorator/ValidationOptions';
export * from './validation/ValidatorConstraintInterface';
export * from './validation/ValidationError';
export * from './validation/ValidatorOptions';
export * from './validation/ValidationArguments';
export * from './validation/ValidationTypes';
export * from './validation/Validator';
export * from './validation-schema/ValidationSchema';
export * from './register-decorator';
export * from './metadata/MetadataStorage';
/**
 * Validates given object.
 */
export declare function validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]>;
/**
 * Validates given object by a given validation schema.
 */
export declare function validate(schemaName: string, object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]>;
/**
 * Validates given object and reject on error.
 */
export declare function validateOrReject(object: object, validatorOptions?: ValidatorOptions): Promise<void>;
/**
 * Validates given object by a given validation schema and reject on error.
 */
export declare function validateOrReject(schemaName: string, object: object, validatorOptions?: ValidatorOptions): Promise<void>;
/**
 * Performs sync validation of the given object.
 * Note that this method completely ignores async validations.
 * If you want to properly perform validation you need to call validate method instead.
 */
export declare function validateSync(object: object, validatorOptions?: ValidatorOptions): ValidationError[];
/**
 * Validates given object by a given validation schema.
 * Note that this method completely ignores async validations.
 * If you want to properly perform validation you need to call validate method instead.
 */
export declare function validateSync(schemaName: string, object: object, validatorOptions?: ValidatorOptions): ValidationError[];
/**
 * Registers a new validation schema.
 */
export declare function registerSchema(schema: ValidationSchema): void;
