/// <reference types="node" />
import type { CanonicalizationAlgorithmType, CanonicalizationOrTransformAlgorithmType, CanonicalizationOrTransformationAlgorithm, CanonicalizationOrTransformationAlgorithmProcessOptions, ComputeSignatureOptions, ErrorFirstCallback, GetKeyInfoContentArgs, HashAlgorithm, HashAlgorithmType, Reference, SignatureAlgorithm, SignatureAlgorithmType, SignedXmlOptions } from "./types";
import * as crypto from "crypto";
export declare class SignedXml {
    idMode?: "wssecurity";
    idAttributes: string[];
    /**
     * A {@link Buffer} or pem encoded {@link String} containing your private key
     */
    privateKey?: crypto.KeyLike;
    publicCert?: crypto.KeyLike;
    /**
     * One of the supported signature algorithms.
     * @see {@link SignatureAlgorithmType}
     */
    signatureAlgorithm?: SignatureAlgorithmType;
    /**
     * Rules used to convert an XML document into its canonical form.
     */
    canonicalizationAlgorithm?: CanonicalizationAlgorithmType;
    /**
     * It specifies a list of namespace prefixes that should be considered "inclusive" during the canonicalization process.
     */
    inclusiveNamespacesPrefixList: string[];
    namespaceResolver: XPathNSResolver;
    implicitTransforms: ReadonlyArray<CanonicalizationOrTransformAlgorithmType>;
    keyInfoAttributes: {
        [attrName: string]: string;
    };
    getKeyInfoContent: typeof SignedXml.getKeyInfoContent;
    getCertFromKeyInfo: typeof SignedXml.getCertFromKeyInfo;
    private id;
    private signedXml;
    private signatureXml;
    private signatureNode;
    private signatureValue;
    private originalXmlWithIds;
    private keyInfo;
    /**
     * Contains the references that were signed.
     * @see {@link Reference}
     */
    private references;
    /**
     * Contains the canonicalized XML of the references that were validly signed.
     *
     * This populates with the canonical XML of the reference only after
     * verifying the signature is cryptographically authentic.
     */
    private signedReferences;
    /**
     *  To add a new transformation algorithm create a new class that implements the {@link TransformationAlgorithm} interface, and register it here. More info: {@link https://github.com/node-saml/xml-crypto#customizing-algorithms|Customizing Algorithms}
     */
    CanonicalizationAlgorithms: Record<CanonicalizationOrTransformAlgorithmType, new () => CanonicalizationOrTransformationAlgorithm>;
    /**
     * To add a new hash algorithm create a new class that implements the {@link HashAlgorithm} interface, and register it here. More info: {@link https://github.com/node-saml/xml-crypto#customizing-algorithms|Customizing Algorithms}
     */
    HashAlgorithms: Record<HashAlgorithmType, new () => HashAlgorithm>;
    /**
     * To add a new signature algorithm create a new class that implements the {@link SignatureAlgorithm} interface, and register it here. More info: {@link https://github.com/node-saml/xml-crypto#customizing-algorithms|Customizing Algorithms}
     */
    SignatureAlgorithms: Record<SignatureAlgorithmType, new () => SignatureAlgorithm>;
    static defaultNsForPrefix: {
        ds: string;
    };
    static noop: () => null;
    /**
     * The SignedXml constructor provides an abstraction for sign and verify xml documents. The object is constructed using
     * @param options {@link SignedXmlOptions}
     */
    constructor(options?: SignedXmlOptions);
    /**
     * Due to key-confusion issues, it's risky to have both hmac
     * and digital signature algorithms enabled at the same time.
     * This enables HMAC and disables other signing algorithms.
     */
    enableHMAC(): void;
    /**
     * Builds the contents of a KeyInfo element as an XML string.
     *
     * For example, if the value of the prefix argument is 'foo', then
     * the resultant XML string will be "<foo:X509Data></foo:X509Data>"
     *
     * @return an XML string representation of the contents of a KeyInfo element, or `null` if no `KeyInfo` element should be included
     */
    static getKeyInfoContent({ publicCert, prefix }: GetKeyInfoContentArgs): string | null;
    /**
     * Returns the value of the signing certificate based on the contents of the
     * specified KeyInfo.
     *
     * @param keyInfo KeyInfo element (@see https://www.w3.org/TR/2008/REC-xmldsig-core-20080610/#sec-X509Data)
     * @return the signing certificate as a string in PEM format
     */
    static getCertFromKeyInfo(keyInfo?: Node | null): string | null;
    /**
     * Validates the signature of the provided XML document synchronously using the configured key info provider.
     *
     * @param xml The XML document containing the signature to be validated.
     * @returns `true` if the signature is valid
     * @throws Error if no key info resolver is provided.
     */
    checkSignature(xml: string): boolean;
    /**
     * Validates the signature of the provided XML document synchronously using the configured key info provider.
     *
     * @param xml The XML document containing the signature to be validated.
     * @param callback Callback function to handle the validation result asynchronously.
     * @throws Error if the last parameter is provided and is not a function, or if no key info resolver is provided.
     */
    checkSignature(xml: string, callback: (error: Error | null, isValid?: boolean) => void): void;
    private getCanonSignedInfoXml;
    private getCanonReferenceXml;
    private calculateSignatureValue;
    private findSignatureAlgorithm;
    private findCanonicalizationAlgorithm;
    private findHashAlgorithm;
    validateElementAgainstReferences(elemOrXpath: Element | string, doc: Document): Reference;
    private validateReference;
    findSignatures(doc: Node): Node[];
    /**
     * Loads the signature information from the provided XML node or string.
     *
     * @param signatureNode The XML node or string representing the signature.
     */
    loadSignature(signatureNode: Node | string): void;
    /**
     * Load the reference xml node to a model
     *
     */
    private loadReference;
    /**
     * Adds a reference to the signature.
     *
     * @param xpath The XPath expression to select the XML nodes to be referenced.
     * @param transforms An array of transform algorithms to be applied to the selected nodes.
     * @param digestAlgorithm The digest algorithm to use for computing the digest value.
     * @param uri The URI identifier for the reference. If empty, an empty URI will be used.
     * @param digestValue The expected digest value for the reference.
     * @param inclusiveNamespacesPrefixList The prefix list for inclusive namespace canonicalization.
     * @param isEmptyUri Indicates whether the URI is empty. Defaults to `false`.
     */
    addReference({ xpath, transforms, digestAlgorithm, uri, digestValue, inclusiveNamespacesPrefixList, isEmptyUri, }: Partial<Reference> & Pick<Reference, "xpath">): void;
    /**
     * Returns the list of references.
     */
    getReferences(): Reference[];
    getSignedReferences(): string[];
    /**
     * Compute the signature of the given XML (using the already defined settings).
     *
     * @param xml The XML to compute the signature for.
     * @param callback A callback function to handle the signature computation asynchronously.
     * @returns void
     * @throws TypeError If the xml can not be parsed.
     */
    computeSignature(xml: string): void;
    /**
     * Compute the signature of the given XML (using the already defined settings).
     *
     * @param xml The XML to compute the signature for.
     * @param callback A callback function to handle the signature computation asynchronously.
     * @returns void
     * @throws TypeError If the xml can not be parsed.
     */
    computeSignature(xml: string, callback: ErrorFirstCallback<SignedXml>): void;
    /**
     * Compute the signature of the given XML (using the already defined settings).
     *
     * @param xml The XML to compute the signature for.
     * @param opts An object containing options for the signature computation.
     * @returns If no callback is provided, returns `this` (the instance of SignedXml).
     * @throws TypeError If the xml can not be parsed, or Error if there were invalid options passed.
     */
    computeSignature(xml: string, options: ComputeSignatureOptions): void;
    /**
     * Compute the signature of the given XML (using the already defined settings).
     *
     * @param xml The XML to compute the signature for.
     * @param opts An object containing options for the signature computation.
     * @param callback A callback function to handle the signature computation asynchronously.
     * @returns void
     * @throws TypeError If the xml can not be parsed, or Error if there were invalid options passed.
     */
    computeSignature(xml: string, options: ComputeSignatureOptions, callback: ErrorFirstCallback<SignedXml>): void;
    private getKeyInfo;
    /**
     * Generate the Reference nodes (as part of the signature process)
     *
     */
    private createReferences;
    getCanonXml(transforms: Reference["transforms"], node: Node, options?: CanonicalizationOrTransformationAlgorithmProcessOptions): string;
    /**
     * Ensure an element has Id attribute. If not create it with unique value.
     * Work with both normal and wssecurity Id flavour
     */
    private ensureHasId;
    /**
     * Create the SignedInfo element
     *
     */
    private createSignedInfo;
    /**
     * Create the Signature element
     *
     */
    private createSignature;
    /**
     * Returns just the signature part, must be called only after {@link computeSignature}
     *
     * @returns The signature XML.
     */
    getSignatureXml(): string;
    /**
     * Returns the original xml with Id attributes added on relevant elements (required for validation), must be called only after {@link computeSignature}
     *
     * @returns The original XML with IDs.
     */
    getOriginalXmlWithIds(): string;
    /**
     * Returns the original xml document with the signature in it, must be called only after {@link computeSignature}
     *
     * @returns The signed XML.
     */
    getSignedXml(): string;
}
