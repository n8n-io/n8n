import { ExcludeOptions } from '..';
/**
 * This object represents metadata assigned to a property via the @Exclude decorator.
 */
export interface ExcludeMetadata {
    target: Function;
    /**
     * The property name this metadata belongs to on the target (class or property).
     *
     * Note: If the decorator is applied to a class the propertyName will be undefined.
     */
    propertyName: string | undefined;
    /**
     * Options passed to the @Exclude operator for this property.
     */
    options: ExcludeOptions;
}
