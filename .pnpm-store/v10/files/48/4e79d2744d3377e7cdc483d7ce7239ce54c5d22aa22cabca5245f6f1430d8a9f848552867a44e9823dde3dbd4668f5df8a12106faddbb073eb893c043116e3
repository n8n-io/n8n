/**
 * Secret Key used for OTP generation.
 */
export declare type SecretKey = string;
/**
 * A hex encoded string.
 */
export declare type HexString = string;
/**
 * Base interface for all option interfaces.
 * eg: [[HOTPOptions]].
 */
export interface OTPOptions {
    [key: string]: unknown;
}
/**
 * Returns an array of values of the enumerable properties of an object.
 * This is used in place of Object.values for wider platform support.
 *
 * @ignore
 *
 * @param value Object that contains the properties and methods.
 */
export declare function objectValues<T>(value: T): string[];
/**
 * Algorithms that are available to be used for
 * calculating the HMAC value
 */
export declare enum HashAlgorithms {
    'SHA1' = "sha1",
    'SHA256' = "sha256",
    'SHA512' = "sha512"
}
/**
 * Array of [[HashAlgorithms]] enum values
 *
 * @ignore
 */
export declare const HASH_ALGORITHMS: string[];
/**
 * The encoding format for the [[SecretKey]].
 * This is mostly used for converting the
 * provided secret into a Buffer.
 */
export declare enum KeyEncodings {
    'ASCII' = "ascii",
    'BASE64' = "base64",
    'HEX' = "hex",
    'LATIN1' = "latin1",
    'UTF8' = "utf8"
}
/**
 * Array of [[KeyEncodings]] enum values
 *
 * @ignore
 */
export declare const KEY_ENCODINGS: string[];
/**
 * The OTP generation strategies.
 * Either HMAC or Time based.
 */
export declare enum Strategy {
    'HOTP' = "hotp",
    'TOTP' = "totp"
}
/**
 * Array of [[Strategy]] enum values
 *
 * @ignore
 */
export declare const STRATEGY: string[];
/**
 * Interface method for formatting the [[SecretKey]] with
 * the algorithm constraints before it is given to [[CreateDigest]].
 */
export interface CreateHmacKey<T = HexString> {
    (algorithm: HashAlgorithms, secret: SecretKey, encoding: KeyEncodings): T;
}
/**
 * Interface method for generating a HMAC digest
 * which is then used to generate the token.
 */
export interface CreateDigest<T = HexString> {
    (algorithm: HashAlgorithms, hmacKey: HexString, counter: HexString): T;
}
/**
 * Inteface for options accepted by keyuri
 */
export interface KeyURIOptions {
    accountName: string;
    algorithm?: HashAlgorithms;
    counter?: number;
    digits?: number;
    issuer?: string;
    label?: string;
    secret: SecretKey;
    step?: number;
    type: Strategy;
}
/**
 * createDigest placholder function which throws an error
 * when it is not replaced with an actual implementation.
 *
 * @ignore
 */
export declare const createDigestPlaceholder: CreateDigest;
/**
 * Checks if a string contains a valid token format.
 *
 * @param value - a number string.
 */
export declare function isTokenValid(value: string): boolean;
/**
 * Left pad the current string with a given string to a given length.
 *
 * This behaves similarly to String.prototype.padStart
 *
 * @ignore
 *
 * @param value The string to pad.
 * @param maxLength The length of the resulting string once the current string has been padded.
 *  If this parameter is smaller than the current string's length, the current
 *  string will be returned as it is.
 * @param fillString The string to pad the current string with.
 */
export declare function padStart(value: string, maxLength: number, fillString: string): string;
/**
 * Generates an otpauth uri which can be used in a QR Code.
 *
 * Reference: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 *
 * Sample Output: otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example
 *
 * **Example**
 *
 * ```js
 * import qrcode from 'qrcode';
 *
 * const otpauth = keyuri({ ... })
 *
 * qrcode.toDataURL(otpauth, (err, imageUrl) => {
 *   if (err) {
 *     console.log('Error with QR');
 *     return;
 *   }
 *   console.log(imageUrl);
 * });
 * ```
 */
export declare function keyuri(options: KeyURIOptions): string;
/**
 * Base OTP class which provides options management
 * All OTP classes should be extended from this class.
 */
export declare class OTP<T extends OTPOptions = OTPOptions> {
    /**
     * Default options for an instance.
     *
     * These options **WILL PERSIST** even when [[resetOptions]] is called.
     */
    protected _defaultOptions: Readonly<Partial<T>>;
    /**
     * Transient options for an instance.
     *
     * Values set here will take precedence over the same options that
     * are set in [[_defaultOptions]].
     *
     * These options **WILL NOT PERSIST** upon calling [[resetOptions]].
     */
    protected _options: Readonly<Partial<T>>;
    /**
     * Constructs the class with defaultOptions set.
     *
     * @param defaultOptions used to override or add existing defaultOptions.
     */
    constructor(defaultOptions?: Partial<T>);
    /**
     * Creates a new instance with all defaultOptions and options reset.
     */
    create(defaultOptions?: Partial<T>): OTP<T>;
    /**
     * Copies the defaultOptions and options from the current
     * instance and applies the provided defaultOptions.
     */
    clone(defaultOptions?: Partial<T>): ReturnType<this['create']>;
    /**
     * - The options **getter** will return all [[_options]],
     * including those set into [[_defaultOptions]].
     */
    get options(): Partial<T>;
    /**
     * - The options **setter** sets values into [[_options]].
     */
    set options(options: Partial<T>);
    /**
     * Returns class options polyfilled with some of
     * the missing required options.
     *
     * Reference: [[hotpOptions]]
     */
    allOptions(): Readonly<T>;
    /**
     * Resets the current options. Does not reset default options.
     *
     * Default options are those that are specified during class
     * inititialisation, when calling [[clone]] or when calling [[create]]
     */
    resetOptions(): void;
}
