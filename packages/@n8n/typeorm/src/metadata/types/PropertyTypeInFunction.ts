/**
 * Contains the name of the property of the object, or the function that returns this name.
 */
export type PropertyTypeFactory<T> = string | ((t: T) => string | any);
