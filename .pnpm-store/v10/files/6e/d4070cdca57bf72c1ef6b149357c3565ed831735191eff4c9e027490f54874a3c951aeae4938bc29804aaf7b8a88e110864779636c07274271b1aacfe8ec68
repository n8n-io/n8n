import { CreateDigest, CreateHmacKey, HashAlgorithms, HexString, KeyEncodings, OTP, OTPOptions, SecretKey } from './utils';
/**
 * Interface for options used in HOTP.
 */
export interface HOTPOptions<T = string> extends OTPOptions {
    /**
     * Creates the digest which token is derived from.
     */
    createDigest: CreateDigest<T>;
    /**
     * Formats the secret into a HMAC key, applying transformations (like padding) where needed
     */
    createHmacKey: CreateHmacKey<T>;
    /**
     * The algorithm used for calculating the HMAC.
     */
    algorithm: HashAlgorithms;
    /**
     * **USE WITH CAUTION:** Given the same digest, the same token will be received.
     *
     * This is provided for unique use cases. For example, digest generation might
     * depend on an async API.
     */
    digest?: HexString;
    /**
     * The number of digits a token will have. Usually 6 or 8.
     */
    digits: number;
    /**
     * The encoding that was used on the secret.
     */
    encoding: KeyEncodings;
}
/**
 * Validates the given [[HOTPOptions]]
 */
export declare function hotpOptionsValidator<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(options: Readonly<Partial<T>>): void;
/**
 * Takes a HOTP secret and derives the HMAC key
 * for use in token generation.
 *
 * @param algorithm - Reference: [[HOTPOptions.algorithm]]
 * @param secret
 * @param encoding - Reference: [[HOTPOptions.encoding]]
 */
export declare const hotpCreateHmacKey: CreateHmacKey;
/**
 * Returns the default options for HOTP
 */
export declare function hotpDefaultOptions<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(): Partial<T>;
/**
 * Takes an HOTP Option object and provides presets for
 * some of the missing required HOTP option fields and validates
 * the resultant options.
 */
export declare function hotpOptions<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(opt: Readonly<Partial<T>>): Readonly<T>;
/**
 * Formats a given counter into a string counter.
 */
export declare function hotpCounter(counter: number): HexString;
/**
 * Converts a digest to a token of a specified length.
 */
export declare function hotpDigestToToken(hexDigest: HexString, digits: number): string;
/**
 * Generates a HMAC-based One-time Token (HOTP)
 *
 * **References**
 *
 * -   http://en.wikipedia.org/wiki/HMAC-based_One-time_Password_Algorithm
 * -   http://tools.ietf.org/html/rfc4226
 *
 * **Note**: If options.digest is provided, it will skip digest generation.
 * Use options.digest with caution. Same digest = Same token.
 *
 * @param secret - Your secret key.
 * @param counter - the OTP counter (usually it's an incremental count)
 * @param options - A HOTPOptions object.
 */
export declare function hotpToken<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(secret: SecretKey, counter: number, options: Readonly<T>): string;
/**
 * Checks the given token against the system generated token.
 *
 * **Note**: Token is valid only if it is a number string
 */
export declare function hotpCheck<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(token: string, secret: SecretKey, counter: number, options: Readonly<T>): boolean;
/**
 * Generates a [keyuri](../#keyuri) from options provided
 * and it's type set to HOTP.
 */
export declare function hotpKeyuri<T extends HOTPOptions<unknown> = HOTPOptions<unknown>>(accountName: string, issuer: string, secret: SecretKey, counter: number, options: Readonly<T>): string;
/**
 * A class wrapper containing all HOTP methods.
 */
export declare class HOTP<T extends HOTPOptions = HOTPOptions> extends OTP<T> {
    /**
     * Creates a new instance with all defaultOptions and options reset.
     */
    create(defaultOptions?: Partial<T>): HOTP<T>;
    /**
     * Returns class options polyfilled with some of
     * the missing required options.
     *
     * Reference: [[hotpOptions]]
     */
    allOptions(): Readonly<T>;
    /**
     * Reference: [[hotpToken]]
     */
    generate(secret: SecretKey, counter: number): string;
    /**
     * Reference: [[hotpCheck]]
     */
    check(token: string, secret: SecretKey, counter: number): boolean;
    /**
     * Same as [[check]] but accepts a single object based argument.
     */
    verify(opts: {
        token: string;
        secret: SecretKey;
        counter: number;
    }): boolean;
    /**
     * Calls [keyuri](../#keyuri) with class options and type
     * set to HOTP.
     */
    keyuri(accountName: string, issuer: string, secret: SecretKey, counter: number): string;
}
