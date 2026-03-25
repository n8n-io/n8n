import { ValidatorConstraintInterface } from '../validation/ValidatorConstraintInterface';
/**
 * This metadata interface contains information for custom validators.
 */
export declare class ConstraintMetadata {
    /**
     * Target class which performs validation.
     */
    target: Function;
    /**
     * Custom validation's name, that will be used as validation error type.
     */
    name: string;
    /**
     * Indicates if this validation is asynchronous or not.
     */
    async: boolean;
    constructor(target: Function, name?: string, async?: boolean);
    /**
     * Instance of the target custom validation class which performs validation.
     */
    get instance(): ValidatorConstraintInterface;
}
