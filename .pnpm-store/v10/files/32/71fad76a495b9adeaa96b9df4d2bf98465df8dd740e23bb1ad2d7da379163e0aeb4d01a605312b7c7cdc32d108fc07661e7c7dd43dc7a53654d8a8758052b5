import { NonRefKeys } from '../types/internal.js';
import { Sorting } from './classes.js';
/**
 * Define how the query's sort operation should be performed using the available methods.
 */
export interface Sort<T> {
    /** Sort by an object property. */
    byProperty<K extends NonRefKeys<T>>(property: K, ascending?: boolean): Sorting<T>;
    /** Sort by the objects' ID. */
    byId(ascending?: boolean): Sorting<T>;
    /** Sort by the objects' creation time. */
    byCreationTime(ascending?: boolean): Sorting<T>;
    /** Sort by the objects' last update time. */
    byUpdateTime(ascending?: boolean): Sorting<T>;
}
