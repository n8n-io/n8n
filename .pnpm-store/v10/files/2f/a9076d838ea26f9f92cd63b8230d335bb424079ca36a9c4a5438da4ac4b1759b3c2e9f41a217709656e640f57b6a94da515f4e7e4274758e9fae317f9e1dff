/**
 * Validation schema is a decorator-free way of validation of your objects.
 * Also using validation schemas makes this library to be easily used with es6/es5.
 */
export interface ValidationSchema {
    /**
     * Schema name. This is required, because we tell validator to validate by this schema using its name.
     */
    name: string;
    /**
     * Validated properties.
     */
    properties: {
        /**
         * Name of the object's property to be validated which holds an array of validation constraints.
         */
        [propertyName: string]: {
            /**
             * Validation type. Should be one of the ValidationTypes value.
             */
            type: string;
            /**
             * Validator name.
             */
            name?: string;
            /**
             * Constraints set by validation type.
             */
            constraints?: any[];
            /**
             * Error message used to be used on validation fail.
             * You can use "$value" to use value that was failed by validation.
             * You can use "$constraint1" and "$constraint2" keys in the message string,
             * and they will be replaced with constraint values if they exist.
             * Message can be either string, either a function that returns a string.
             * Second option allows to use values and custom messages depend of them.
             */
            message?: string | ((value?: any, constraint1?: any, constraint2?: any) => string);
            /**
             * Specifies if validated value is an array and each of its item must be validated.
             */
            each?: boolean;
            /**
             * Indicates if validation must be performed always, no matter of validation groups used.
             */
            always?: boolean;
            /**
             * Validation groups used for this validation.
             */
            groups?: string[];
            /**
             * Specific validation type options.
             */
            options?: any;
        }[];
    };
}
