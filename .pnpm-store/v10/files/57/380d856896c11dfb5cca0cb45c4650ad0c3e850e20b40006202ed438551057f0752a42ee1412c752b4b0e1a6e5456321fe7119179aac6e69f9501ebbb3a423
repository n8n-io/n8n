/**
 * Validation error description.
 */
export declare class ValidationError {
    /**
     * Object that was validated.
     *
     * OPTIONAL - configurable via the ValidatorOptions.validationError.target option
     */
    target?: object;
    /**
     * Object's property that haven't pass validation.
     */
    property: string;
    /**
     * Value that haven't pass a validation.
     *
     * OPTIONAL - configurable via the ValidatorOptions.validationError.value option
     */
    value?: any;
    /**
     * Constraints that failed validation with error messages.
     */
    constraints?: {
        [type: string]: string;
    };
    /**
     * Contains all nested validation errors of the property.
     */
    children?: ValidationError[];
    contexts?: {
        [type: string]: any;
    };
    /**
     *
     * @param shouldDecorate decorate the message with ANSI formatter escape codes for better readability
     * @param hasParent true when the error is a child of an another one
     * @param parentPath path as string to the parent of this property
     * @param showConstraintMessages show constraint messages instead of constraint names
     */
    toString(shouldDecorate?: boolean, hasParent?: boolean, parentPath?: string, showConstraintMessages?: boolean): string;
}
