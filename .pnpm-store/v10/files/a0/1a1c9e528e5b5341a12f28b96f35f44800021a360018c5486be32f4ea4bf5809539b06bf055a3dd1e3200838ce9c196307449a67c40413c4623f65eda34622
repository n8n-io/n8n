import { Properties, ReferenceInput, ReferenceToMultiTarget, Vectors, WeaviateObject } from '../types/index.js';
import { Beacon } from './types.js';
export declare class ReferenceManager<T> {
    objects: WeaviateObject<T, Vectors>[];
    targetCollection: string;
    uuids?: string[];
    constructor(targetCollection: string, objects?: WeaviateObject<T, Vectors>[], uuids?: string[]);
    toBeaconObjs(): Beacon[];
    toBeaconStrings(): string[];
    isMultiTarget(): boolean;
}
/**
 * A factory class to create references from objects to other objects.
 */
export declare class Reference {
    /**
     * Create a single-target reference with given UUID(s).
     *
     * @param {string | string[]} uuids The UUID(s) of the target object(s).
     * @returns {ReferenceManager} The reference manager object.
     */
    static to<TProperties extends Properties = Properties>(uuids: string | string[]): ReferenceManager<TProperties>;
    /**
     * Create a multi-target reference with given UUID(s) pointing to a specific target collection.
     *
     * @param {string | string[]} uuids The UUID(s) of the target object(s).
     * @param {string} targetCollection The target collection name.
     * @returns {ReferenceManager} The reference manager object.
     */
    static toMultiTarget<TProperties extends Properties = Properties>(uuids: string | string[], targetCollection: string): ReferenceManager<TProperties>;
}
export declare class ReferenceGuards {
    static isReferenceManager<T>(arg: ReferenceInput<T>): arg is ReferenceManager<T>;
    static isUuid<T>(arg: ReferenceInput<T>): arg is string;
    static isUuids<T>(arg: ReferenceInput<T>): arg is string[];
    static isMultiTarget<T>(arg: ReferenceInput<T>): arg is ReferenceToMultiTarget;
}
