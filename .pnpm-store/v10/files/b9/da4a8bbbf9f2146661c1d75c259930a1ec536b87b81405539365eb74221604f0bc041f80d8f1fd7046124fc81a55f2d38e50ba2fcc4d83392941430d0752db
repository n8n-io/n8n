import { ValidationOptions } from '../ValidationOptions';
import { ValidationArguments } from '../../validation/ValidationArguments';
import { ValidatorConstraintInterface } from '../../validation/ValidatorConstraintInterface';
export interface ValidateByOptions {
    name: string;
    constraints?: any[];
    validator: ValidatorConstraintInterface | Function;
    async?: boolean;
}
export declare function buildMessage(impl: (eachPrefix: string, args?: ValidationArguments) => string, validationOptions?: ValidationOptions): (validationArguments?: ValidationArguments) => string;
export declare function ValidateBy(options: ValidateByOptions, validationOptions?: ValidationOptions): PropertyDecorator;
