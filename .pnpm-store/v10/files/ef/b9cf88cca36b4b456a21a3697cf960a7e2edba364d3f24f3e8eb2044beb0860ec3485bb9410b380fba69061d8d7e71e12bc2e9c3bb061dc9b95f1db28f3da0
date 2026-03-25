/**
 * Arguments being sent to message builders - user can create message either by simply returning a string,
 * either by returning a function that accepts MessageArguments and returns a message string built based on these arguments.
 */
export interface ValidationArguments {
    /**
     * Validating value.
     */
    value: any;
    /**
     * Constraints set by this validation type.
     */
    constraints: any[];
    /**
     * Name of the target that is being validated.
     */
    targetName: string;
    /**
     * Object that is being validated.
     */
    object: object;
    /**
     * Name of the object's property being validated.
     */
    property: string;
}
