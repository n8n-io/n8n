import type { KeyCredential } from "./keyCredential.js";
/**
 * A static-key-based credential that supports updating
 * the underlying key value.
 */
export declare class AzureKeyCredential implements KeyCredential {
    private _key;
    /**
     * The value of the key to be used in authentication
     */
    get key(): string;
    /**
     * Create an instance of an AzureKeyCredential for use
     * with a service client.
     *
     * @param key - The initial value of the key to use in authentication
     */
    constructor(key: string);
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newKey - The new key value to be used
     */
    update(newKey: string): void;
}
//# sourceMappingURL=azureKeyCredential.d.ts.map