/// <reference types="node" />
import type { NamespacePrefix } from "./types";
export declare function isArrayHasLength(array: unknown): array is unknown[];
export declare function findAttr(element: Element, localName: string, namespace?: string): Attr | null;
export declare function findChildren(node: Node | Document, localName: string, namespace?: string): Element[];
/** @deprecated */
export declare function findChilds(node: Node | Document, localName: string, namespace?: string): Element[];
export declare function encodeSpecialCharactersInAttribute(attributeValue: any): any;
export declare function encodeSpecialCharactersInText(text: string): string;
/**
 * PEM format has wide range of usages, but this library
 * is enforcing RFC7468 which focuses on PKIX, PKCS and CMS.
 *
 * https://www.rfc-editor.org/rfc/rfc7468
 *
 * PEM_FORMAT_REGEX is validating given PEM file against RFC7468 'stricttextualmsg' definition.
 *
 * With few exceptions;
 *  - 'posteb' MAY have 'eol', but it is not mandatory.
 *  - 'preeb' and 'posteb' lines are limited to 64 characters, but
 *     should not cause any issues in context of PKIX, PKCS and CMS.
 */
export declare const PEM_FORMAT_REGEX: RegExp;
export declare const EXTRACT_X509_CERTS: RegExp;
export declare const BASE64_REGEX: RegExp;
/**
 * -----BEGIN [LABEL]-----
 * base64([DATA])
 * -----END [LABEL]-----
 *
 * Above is shown what PEM file looks like. As can be seen, base64 data
 * can be in single line or multiple lines.
 *
 * This function normalizes PEM presentation to;
 *  - contain PEM header and footer as they are given
 *  - normalize line endings to '\n'
 *  - normalize line length to maximum of 64 characters
 *  - ensure that 'preeb' has line ending '\n'
 *
 * With a couple of notes:
 *  - 'eol' is normalized to '\n'
 *
 * @param pem The PEM string to normalize to RFC7468 'stricttextualmsg' definition
 */
export declare function normalizePem(pem: string): string;
/**
 * @param pem The PEM-encoded base64 certificate to strip headers from
 */
export declare function pemToDer(pem: string): Buffer;
/**
 * @param der The DER-encoded base64 certificate to add PEM headers too
 * @param pemLabel The label of the header and footer to add
 */
export declare function derToPem(der: string | Buffer, pemLabel?: "CERTIFICATE" | "PRIVATE KEY" | "RSA PUBLIC KEY"): string;
/**
 * Extract ancestor namespaces in order to import it to root of document subset
 * which is being canonicalized for non-exclusive c14n.
 *
 * @param doc - Usually a product from `new xmldom.DOMParser().parseFromString()`
 * @param docSubsetXpath - xpath query to get document subset being canonicalized
 * @param namespaceResolver - xpath namespace resolver
 * @returns i.e. [{prefix: "saml", namespaceURI: "urn:oasis:names:tc:SAML:2.0:assertion"}]
 */
export declare function findAncestorNs(doc: Document, docSubsetXpath?: string, namespaceResolver?: XPathNSResolver): NamespacePrefix[];
export declare function validateDigestValue(digest: any, expectedDigest: any): boolean;
