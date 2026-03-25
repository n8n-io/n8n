import { ExposeOptions } from '..';
/**
 * This object represents metadata assigned to a property via the @Expose decorator.
 */
export interface ExposeMetadata {
    target: Function;
    /**
     * The property name this metadata belongs to on the target (class or property).
     *
     * Note: If the decorator is applied to a class the propertyName will be undefined.
     */
    propertyName: string | undefined;
    /**
     * Options passed to the @Expose operator for this property.
     */
    options: ExposeOptions;
}
