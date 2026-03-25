import { SortBy } from '../types/index.js';
import { NonRefKeys } from '../types/internal.js';
export declare class Sorting<T> {
    sorts: SortBy[];
    constructor();
    /** Sort by the objects' property. */
    byProperty<K extends NonRefKeys<T>>(property: K, ascending?: boolean): this;
    /** Sort by the objects' ID. */
    byId(ascending?: boolean): this;
    /** Sort by the objects' creation time. */
    byCreationTime(ascending?: boolean): this;
    /** Sort by the objects' last update time. */
    byUpdateTime(ascending?: boolean): this;
}
