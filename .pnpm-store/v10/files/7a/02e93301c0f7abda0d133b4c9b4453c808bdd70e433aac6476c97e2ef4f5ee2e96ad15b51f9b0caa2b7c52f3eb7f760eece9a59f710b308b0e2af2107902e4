import type { RequestSigner } from "@smithy/types";
/**
 * @public
 */
export type OptionalSigV4aSigner = {
    /**
     * This constructor is not typed so as not to require a type import
     * from the signature-v4a package.
     *
     * The true type is SignatureV4a from @smithy/signature-v4a.
     */
    new (options: any): RequestSigner;
};
/**
 * @public
 *
 * \@smithy/signature-v4a will install the constructor in this
 * container if it's installed.
 *
 * This avoids a runtime-require being interpreted statically by bundlers.
 */
export declare const signatureV4aContainer: {
    SignatureV4a: null | OptionalSigV4aSigner;
};
