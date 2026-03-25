/**
 * Represents a credential defined by a static API name and key.
 */
export interface NamedKeyCredential {
    /**
     * The value of the API key represented as a string
     */
    readonly key: string;
    /**
     * The value of the API name represented as a string.
     */
    readonly name: string;
}
/**
 * A static name/key-based credential that supports updating
 * the underlying name and key values.
 */
export declare class AzureNamedKeyCredential implements NamedKeyCredential {
    private _key;
    private _name;
    /**
     * The value of the key to be used in authentication.
     */
    get key(): string;
    /**
     * The value of the name to be used in authentication.
     */
    get name(): string;
    /**
     * Create an instance of an AzureNamedKeyCredential for use
     * with a service client.
     *
     * @param name - The initial value of the name to use in authentication.
     * @param key - The initial value of the key to use in authentication.
     */
    constructor(name: string, key: string);
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newName - The new name value to be used.
     * @param newKey - The new key value to be used.
     */
    update(newName: string, newKey: string): void;
}
/**
 * Tests an object to determine whether it implements NamedKeyCredential.
 *
 * @param credential - The assumed NamedKeyCredential to be tested.
 */
export declare function isNamedKeyCredential(credential: unknown): credential is NamedKeyCredential;
//# sourceMappingURL=azureNamedKeyCredential.d.ts.map