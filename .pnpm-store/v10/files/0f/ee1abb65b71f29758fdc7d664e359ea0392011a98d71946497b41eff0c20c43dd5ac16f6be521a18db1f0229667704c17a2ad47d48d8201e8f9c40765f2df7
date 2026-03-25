/**
* @file SamlLib.js
* @author tngan
* @desc  A simple library including some common functions
*/
import { MetadataInterface } from './metadata';
export interface SignatureConstructor {
    rawSamlMessage: string;
    referenceTagXPath?: string;
    privateKey: string;
    privateKeyPass?: string;
    signatureAlgorithm: string;
    signingCert: string | Buffer;
    isBase64Output?: boolean;
    signatureConfig?: any;
    isMessageSigned?: boolean;
    transformationAlgorithms?: string[];
}
export interface SignatureVerifierOptions {
    metadata?: MetadataInterface;
    keyFile?: string;
    signatureAlgorithm?: string;
}
export interface ExtractorResult {
    [key: string]: any;
    signature?: string | string[];
    issuer?: string | string[];
    nameID?: string;
    notexist?: boolean;
}
export interface LoginResponseAttribute {
    name: string;
    nameFormat: string;
    valueXsiType: string;
    valueTag: string;
    valueXmlnsXs?: string;
    valueXmlnsXsi?: string;
}
export interface LoginResponseAdditionalTemplates {
    attributeStatementTemplate?: AttributeStatementTemplate;
    attributeTemplate?: AttributeTemplate;
}
export interface BaseSamlTemplate {
    context: string;
}
export interface LoginResponseTemplate extends BaseSamlTemplate {
    attributes?: LoginResponseAttribute[];
    additionalTemplates?: LoginResponseAdditionalTemplates;
}
export interface AttributeStatementTemplate extends BaseSamlTemplate {
}
export interface AttributeTemplate extends BaseSamlTemplate {
}
export interface LoginRequestTemplate extends BaseSamlTemplate {
}
export interface LogoutRequestTemplate extends BaseSamlTemplate {
}
export interface LogoutResponseTemplate extends BaseSamlTemplate {
}
export type KeyUse = 'signing' | 'encryption';
export interface KeyComponent {
    [key: string]: any;
}
export interface LibSamlInterface {
    getQueryParamByType: (type: string) => string;
    createXPath: (local: any, isExtractAll?: boolean) => string;
    replaceTagsByValue: (rawXML: string, tagValues: any) => string;
    attributeStatementBuilder: (attributes: LoginResponseAttribute[], attributeTemplate: AttributeTemplate, attributeStatementTemplate: AttributeStatementTemplate) => string;
    constructSAMLSignature: (opts: SignatureConstructor) => string;
    verifySignature: (xml: string, opts: SignatureVerifierOptions) => [boolean, any];
    createKeySection: (use: KeyUse, cert: string | Buffer) => {};
    constructMessageSignature: (octetString: string, key: string, passphrase?: string, isBase64?: boolean, signingAlgorithm?: string) => string;
    verifyMessageSignature: (metadata: any, octetString: string, signature: string | Buffer, verifyAlgorithm?: string) => boolean;
    getKeyInfo: (x509Certificate: string, signatureConfig?: any) => void;
    encryptAssertion: (sourceEntity: any, targetEntity: any, entireXML: string) => Promise<string>;
    decryptAssertion: (here: any, entireXML: string) => Promise<[string, any]>;
    getSigningScheme: (sigAlg: string) => string | null;
    getDigestMethod: (sigAlg: string) => string | null;
    nrsaAliasMapping: any;
    defaultLoginRequestTemplate: LoginRequestTemplate;
    defaultLoginResponseTemplate: LoginResponseTemplate;
    defaultAttributeStatementTemplate: AttributeStatementTemplate;
    defaultAttributeTemplate: AttributeTemplate;
    defaultLogoutRequestTemplate: LogoutRequestTemplate;
    defaultLogoutResponseTemplate: LogoutResponseTemplate;
}
declare const _default: {
    createXPath: (local: any, isExtractAll?: boolean) => string;
    getQueryParamByType: (type: string) => "SAMLRequest" | "SAMLResponse";
    defaultLoginRequestTemplate: {
        context: string;
    };
    defaultLoginResponseTemplate: {
        context: string;
        attributes: never[];
        additionalTemplates: {
            attributeStatementTemplate: {
                context: string;
            };
            attributeTemplate: {
                context: string;
            };
        };
    };
    defaultAttributeStatementTemplate: {
        context: string;
    };
    defaultAttributeTemplate: {
        context: string;
    };
    defaultLogoutRequestTemplate: {
        context: string;
    };
    defaultLogoutResponseTemplate: {
        context: string;
    };
    /**
    * @desc Replace the tag (e.g. {tag}) inside the raw XML
    * @param  {string} rawXML      raw XML string used to do keyword replacement
    * @param  {array} tagValues    tag values
    * @return {string}
    */
    replaceTagsByValue(rawXML: string, tagValues: Record<string, unknown>): string;
    /**
    * @desc Helper function to build the AttributeStatement tag
    * @param  {LoginResponseAttribute} attributes    an array of attribute configuration
    * @param  {AttributeTemplate} attributeTemplate    the attribute tag template to be used
    * @param  {AttributeStatementTemplate} attributeStatementTemplate    the attributeStatement tag template to be used
    * @return {string}
    */
    attributeStatementBuilder(attributes: LoginResponseAttribute[], attributeTemplate?: AttributeTemplate, attributeStatementTemplate?: AttributeStatementTemplate): string;
    /**
    * @desc Construct the XML signature for POST binding
    * @param  {string} rawSamlMessage      request/response xml string
    * @param  {string} referenceTagXPath    reference uri
    * @param  {string} privateKey           declares the private key
    * @param  {string} passphrase           passphrase of the private key [optional]
    * @param  {string|buffer} signingCert   signing certificate
    * @param  {string} signatureAlgorithm   signature algorithm
    * @param  {string[]} transformationAlgorithms   canonicalization and transformation Algorithms
    * @return {string} base64 encoded string
    */
    constructSAMLSignature(opts: SignatureConstructor): string;
    /**
    * @desc Verify the XML signature
    * @param  {string} xml xml
    * @param  {SignatureVerifierOptions} opts cert declares the X509 certificate
     * @return {[boolean, string | null]} - A tuple where:
     *   - The first element is `true` if the signature is valid, `false` otherwise.
     *   - The second element is the cryptographically authenticated assertion node as a string, or `null` if not found.
     */
    verifySignature(xml: string, opts: SignatureVerifierOptions): (string | boolean)[] | (boolean | null)[];
    /**
    * @desc Helper function to create the key section in metadata (abstraction for signing and encrypt use)
    * @param  {string} use          type of certificate (e.g. signing, encrypt)
    * @param  {string} certString    declares the certificate String
    * @return {object} object used in xml module
    */
    createKeySection(use: KeyUse, certString: string | Buffer): KeyComponent;
    /**
    * @desc Constructs SAML message
    * @param  {string} octetString               see "Bindings for the OASIS Security Assertion Markup Language (SAML V2.0)" P.17/46
    * @param  {string} key                       declares the pem-formatted private key
    * @param  {string} passphrase                passphrase of private key [optional]
    * @param  {string} signingAlgorithm          signing algorithm
    * @return {string} message signature
    */
    constructMessageSignature(octetString: string, key: string, passphrase?: string, isBase64?: boolean, signingAlgorithm?: string): string | Buffer;
    /**
    * @desc Verifies message signature
    * @param  {Metadata} metadata                 metadata object of identity provider or service provider
    * @param  {string} octetString                see "Bindings for the OASIS Security Assertion Markup Language (SAML V2.0)" P.17/46
    * @param  {string} signature                  context of XML signature
    * @param  {string} verifyAlgorithm            algorithm used to verify
    * @return {boolean} verification result
    */
    verifyMessageSignature(metadata: any, octetString: string, signature: string | Buffer, verifyAlgorithm?: string): boolean;
    /**
    * @desc Get the public key in string format
    * @param  {string} x509Certificate certificate
    * @return {string} public key
    */
    getKeyInfo(x509Certificate: string, signatureConfig?: any): {
        getKeyInfo: () => string;
        getKey: () => string;
    };
    /**
    * @desc Encrypt the assertion section in Response
    * @param  {Entity} sourceEntity             source entity
    * @param  {Entity} targetEntity             target entity
    * @param  {string} xml                      response in xml string format
    * @return {Promise} a promise to resolve the finalized xml
    */
    encryptAssertion(sourceEntity: any, targetEntity: any, xml?: string): Promise<string>;
    /**
    * @desc Decrypt the assertion section in Response
    * @param  {string} type             only accept SAMLResponse to proceed decryption
    * @param  {Entity} here             this entity
    * @param  {Entity} from             from the entity where the message is sent
    * @param {string} entireXML         response in xml string format
    * @return {function} a promise to get back the entire xml with decrypted assertion
    */
    decryptAssertion(here: any, entireXML: string): Promise<[string, any]>;
    /**
     * @desc Check if the xml string is valid and bounded
     */
    isValidXml(input: string): Promise<any>;
};
export default _default;
