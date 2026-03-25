/**
 * Represents a credential defined by a static shared access signature.
 */
export interface SASCredential {
    /**
     * The value of the shared access signature represented as a string
     */
    readonly signature: string;
}
/**
 * A static-signature-based credential that supports updating
 * the underlying signature value.
 */
export declare class AzureSASCredential implements SASCredential {
    private _signature;
    /**
     * The value of the shared access signature to be used in authentication
     */
    get signature(): string;
    /**
     * Create an instance of an AzureSASCredential for use
     * with a service client.
     *
     * @param signature - The initial value of the shared access signature to use in authentication
     */
    constructor(signature: string);
    /**
     * Change the value of the signature.
     *
     * Updates will take effect upon the next request after
     * updating the signature value.
     *
     * @param newSignature - The new shared access signature value to be used
     */
    update(newSignature: string): void;
}
/**
 * Tests an object to determine whether it implements SASCredential.
 *
 * @param credential - The assumed SASCredential to be tested.
 */
export declare function isSASCredential(credential: unknown): credential is SASCredential;
//# sourceMappingURL=azureSASCredential.d.ts.map