import { ValidationOptions } from '../ValidationOptions';
/**
 * Registers custom validator class.
 */
export declare function ValidatorConstraint(options?: {
    name?: string;
    async?: boolean;
}): (target: Function) => void;
/**
 * Performs validation based on the given custom validation class.
 * Validation class must be decorated with ValidatorConstraint decorator.
 */
export declare function Validate(constraintClass: Function, validationOptions?: ValidationOptions): PropertyDecorator;
export declare function Validate(constraintClass: Function, constraints?: any[], validationOptions?: ValidationOptions): PropertyDecorator;
