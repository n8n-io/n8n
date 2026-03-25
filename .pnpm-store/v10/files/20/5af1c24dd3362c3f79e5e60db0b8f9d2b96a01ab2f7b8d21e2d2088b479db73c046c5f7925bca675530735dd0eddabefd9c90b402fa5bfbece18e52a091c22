/// <reference types="node" />
import * as crypto from "crypto";
export type ErrorFirstCallback<T> = (err: Error | null, result?: T) => void;
export type CanonicalizationAlgorithmType = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" | "http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments" | "http://www.w3.org/2001/10/xml-exc-c14n#" | "http://www.w3.org/2001/10/xml-exc-c14n#WithComments" | string;
export type CanonicalizationOrTransformAlgorithmType = CanonicalizationAlgorithmType | "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
export type HashAlgorithmType = "http://www.w3.org/2000/09/xmldsig#sha1" | "http://www.w3.org/2001/04/xmlenc#sha256" | "http://www.w3.org/2001/04/xmlenc#sha512" | string;
export type SignatureAlgorithmType = "http://www.w3.org/2000/09/xmldsig#rsa-sha1" | "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" | "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512" | "http://www.w3.org/2000/09/xmldsig#hmac-sha1" | string;
/**
 * @param cert the certificate as a string or array of strings (@see https://www.w3.org/TR/2008/REC-xmldsig-core-20080610/#sec-X509Data)
 * @param prefix an optional namespace alias to be used for the generated XML
 */
export interface GetKeyInfoContentArgs {
    publicCert?: crypto.KeyLike;
    prefix?: string | null;
}
/**
 * Options for the SignedXml constructor.
 */
export interface SignedXmlOptions {
    idMode?: "wssecurity";
    idAttribute?: string;
    privateKey?: crypto.KeyLike;
    publicCert?: crypto.KeyLike;
    signatureAlgorithm?: SignatureAlgorithmType;
    canonicalizationAlgorithm?: CanonicalizationAlgorithmType;
    inclusiveNamespacesPrefixList?: string | string[];
    implicitTransforms?: ReadonlyArray<CanonicalizationOrTransformAlgorithmType>;
    keyInfoAttributes?: Record<string, string>;
    getKeyInfoContent?(args?: GetKeyInfoContentArgs): string | null;
    getCertFromKeyInfo?(keyInfo?: Node | null): string | null;
}
export interface NamespacePrefix {
    prefix: string;
    namespaceURI: string;
}
export interface RenderedNamespace {
    rendered: string;
    newDefaultNs: string;
}
export interface CanonicalizationOrTransformationAlgorithmProcessOptions {
    defaultNs?: string;
    defaultNsForPrefix?: Record<string, string>;
    ancestorNamespaces?: NamespacePrefix[];
    signatureNode?: Node | null;
    inclusiveNamespacesPrefixList?: string[];
}
export interface ComputeSignatureOptionsLocation {
    reference?: string;
    action?: "append" | "prepend" | "before" | "after";
}
/**
 * Options for the computeSignature method.
 *
 * - `prefix` {String} Adds a prefix for the generated signature tags
 * - `attrs` {Object} A hash of attributes and values `attrName: value` to add to the signature root node
 * - `location` {{ reference: String, action: String }}
 * - `existingPrefixes` {Object} A hash of prefixes and namespaces `prefix: namespace` already in the xml
 *   An object with a `reference` key which should
 *   contain a XPath expression, an `action` key which
 *   should contain one of the following values:
 *   `append`, `prepend`, `before`, `after`
 */
export interface ComputeSignatureOptions {
    prefix?: string;
    attrs?: Record<string, string>;
    location?: ComputeSignatureOptionsLocation;
    existingPrefixes?: Record<string, string>;
}
/**
 * Represents a reference node for XML digital signature.
 */
export interface Reference {
    xpath?: string;
    transforms: ReadonlyArray<CanonicalizationOrTransformAlgorithmType>;
    digestAlgorithm: HashAlgorithmType;
    uri: string;
    digestValue?: unknown;
    inclusiveNamespacesPrefixList: string[];
    isEmptyUri: boolean;
    ancestorNamespaces?: NamespacePrefix[];
    validationError?: Error;
    getValidatedNode(xpathSelector?: string): Node | null;
    signedReference?: string;
}
/** Implement this to create a new CanonicalizationOrTransformationAlgorithm */
export interface CanonicalizationOrTransformationAlgorithm {
    process(node: Node, options: CanonicalizationOrTransformationAlgorithmProcessOptions): Node | string;
    getAlgorithmName(): CanonicalizationOrTransformAlgorithmType;
}
/** Implement this to create a new HashAlgorithm */
export interface HashAlgorithm {
    getAlgorithmName(): HashAlgorithmType;
    getHash(xml: string): string;
}
/** Extend this to create a new SignatureAlgorithm */
export interface SignatureAlgorithm {
    /**
     * Sign the given string using the given key
     */
    getSignature(signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike): string;
    getSignature(signedInfo: crypto.BinaryLike, privateKey: crypto.KeyLike, callback?: ErrorFirstCallback<string>): void;
    /**
     * Verify the given signature of the given string using key
     *
     * @param key a public cert, public key, or private key can be passed here
     */
    verifySignature(material: string, key: crypto.KeyLike, signatureValue: string): boolean;
    verifySignature(material: string, key: crypto.KeyLike, signatureValue: string, callback?: ErrorFirstCallback<boolean>): void;
    getAlgorithmName(): SignatureAlgorithmType;
}
/** Implement this to create a new TransformAlgorithm */
export interface TransformAlgorithm {
    getAlgorithmName(): CanonicalizationOrTransformAlgorithmType;
    process(node: Node): string;
}
/**
 * This function will add a callback version of a sync function.
 *
 * This follows the factory pattern.
 * Just call this function, passing the function that you'd like to add a callback version of.
 */
export declare function createOptionalCallbackFunction<T, A extends unknown[]>(syncVersion: (...args: A) => T): {
    (...args: A): T;
    (...args: [...A, ErrorFirstCallback<T>]): void;
};
