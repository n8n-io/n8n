import { TypeHelpOptions, TypeOptions } from '..';
/**
 * This object represents metadata assigned to a property via the @Type decorator.
 */
export interface TypeMetadata {
    target: Function;
    /**
     * The property name this metadata belongs to on the target (property only).
     */
    propertyName: string;
    /**
     * The type guessed from assigned Reflect metadata ('design:type')
     */
    reflectedType: any;
    /**
     * The custom function provided by the user in the @Type decorator which
     * returns the target type for the transformation.
     */
    typeFunction: (options?: TypeHelpOptions) => Function;
    /**
     * Options passed to the @Type operator for this property.
     */
    options: TypeOptions;
}
