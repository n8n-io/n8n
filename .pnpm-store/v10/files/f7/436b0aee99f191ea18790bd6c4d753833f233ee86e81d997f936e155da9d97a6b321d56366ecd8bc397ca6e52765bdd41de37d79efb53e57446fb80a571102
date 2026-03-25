import { ValidationArguments } from './ValidationArguments';
/**
 * Custom validators must implement this interface to provide custom validation logic.
 */
export interface ValidatorConstraintInterface {
    /**
     * Method to be called to perform custom validation over given value.
     */
    validate(value: any, validationArguments?: ValidationArguments): Promise<boolean> | boolean;
    /**
     * Gets default message when validation for this constraint fail.
     */
    defaultMessage?(validationArguments?: ValidationArguments): string;
}
