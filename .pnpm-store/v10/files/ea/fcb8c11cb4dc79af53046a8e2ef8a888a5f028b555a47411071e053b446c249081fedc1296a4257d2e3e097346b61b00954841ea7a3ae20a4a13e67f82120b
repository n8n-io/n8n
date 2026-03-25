/**
 * Key/value storage for annotation data in forms.
 */
export class AnnotationStorage {
    onSetModified: any;
    onResetModified: any;
    onAnnotationEditor: any;
    /**
     * Get the value for a given key if it exists, or return the default value.
     * @param {string} key
     * @param {Object} defaultValue
     * @returns {Object}
     */
    getValue(key: string, defaultValue: Object): Object;
    /**
     * Get the value for a given key.
     * @param {string} key
     * @returns {Object}
     */
    getRawValue(key: string): Object;
    /**
     * Remove a value from the storage.
     * @param {string} key
     */
    remove(key: string): void;
    /**
     * Set the value for a given key
     * @param {string} key
     * @param {Object} value
     */
    setValue(key: string, value: Object): void;
    /**
     * Check if the storage contains the given key.
     * @param {string} key
     * @returns {boolean}
     */
    has(key: string): boolean;
    get size(): number;
    resetModified(): void;
    /**
     * @returns {PrintAnnotationStorage}
     */
    get print(): PrintAnnotationStorage;
    /**
     * PLEASE NOTE: Only intended for usage within the API itself.
     * @ignore
     */
    get serializable(): Readonly<{
        map: null;
        hash: "";
        transfer: undefined;
    }> | {
        map: Map<any, any>;
        hash: string;
        transfer: any[];
    };
    get editorStats(): any;
    resetModifiedIds(): void;
    /**
     * @returns {{ids: Set<string>, hash: string}}
     */
    get modifiedIds(): {
        ids: Set<string>;
        hash: string;
    };
    [Symbol.iterator](): MapIterator<[any, any]>;
    #private;
}
/**
 * A special `AnnotationStorage` for use during printing, where the serializable
 * data is *frozen* upon initialization, to prevent scripting from modifying its
 * contents. (Necessary since printing is triggered synchronously in browsers.)
 */
export class PrintAnnotationStorage extends AnnotationStorage {
    constructor(parent: any);
    /**
     * PLEASE NOTE: Only intended for usage within the API itself.
     * @ignore
     */
    get serializable(): {
        map: any;
        hash: any;
        transfer: any;
    };
    get modifiedIds(): any;
    #private;
}
export const SerializableEmpty: Readonly<{
    map: null;
    hash: "";
    transfer: undefined;
}>;
