import { ValidationMetadataArgs } from './ValidationMetadataArgs';
import { ValidationArguments } from '../validation/ValidationArguments';
/**
 * This metadata contains validation rules.
 */
export declare class ValidationMetadata {
    /**
     * Validation type.
     */
    type: string;
    /**
     * Validator name.
     */
    name?: string;
    /**
     * Target class to which this validation is applied.
     */
    target: Function | string;
    /**
     * Property of the object to be validated.
     */
    propertyName: string;
    /**
     * Constraint class that performs validation. Used only for custom validations.
     */
    constraintCls: Function;
    /**
     * Array of constraints of this validation.
     */
    constraints: any[];
    /**
     * Validation message to be shown in the case of error.
     */
    message: string | ((args: ValidationArguments) => string);
    /**
     * Validation groups used for this validation.
     */
    groups: string[];
    /**
     * Indicates if validation must be performed always, no matter of validation groups used.
     */
    always?: boolean;
    /**
     * Specifies if validated value is an array and each of its item must be validated.
     */
    each: boolean;
    context?: any;
    /**
     * Extra options specific to validation type.
     */
    validationTypeOptions: any;
    constructor(args: ValidationMetadataArgs);
}
