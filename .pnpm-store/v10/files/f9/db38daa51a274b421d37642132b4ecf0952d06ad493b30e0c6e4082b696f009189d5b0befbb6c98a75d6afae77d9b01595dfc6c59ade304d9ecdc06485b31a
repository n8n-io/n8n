import { KeyEncodings, SecretKey } from './utils';
import { TOTP, TOTPOptions } from './totp';
/**
 * RFC4648 / RFC3548 Base32 String.
 *
 * Other Base32 encoding methods like Crockford's Base32
 * will not be compatible with Google Authenticator.
 */
export declare type Base32SecretKey = SecretKey;
/**
 * Interface method for [[AuthenticatorOptions.keyEncoder]].
 */
export interface KeyEncoder<T = Base32SecretKey> {
    (secret: SecretKey, encoding: KeyEncodings): T;
}
/**
 * Interface method for [[AuthenticatorOptions.keyDecoder]].
 */
export interface KeyDecoder<T = SecretKey> {
    (encodedSecret: Base32SecretKey, encoding: KeyEncodings): T;
}
/**
 * Interface method for [[AuthenticatorOptions.createRandomBytes]].
 */
export interface CreateRandomBytes<T = string> {
    (size: number, encoding: KeyEncodings): T;
}
/**
 * Interface for options used in Authenticator.
 *
 * Contains additional options in addition to
 * those within TOTP.
 */
export interface AuthenticatorOptions<T = string> extends TOTPOptions<T> {
    /**
     * Encodes a secret key into a Base32 string before it is
     * sent to the user (in QR Code etc).
     */
    keyEncoder: KeyEncoder<T>;
    /**
     * Decodes the Base32 string given by the user into a secret.
     * */
    keyDecoder: KeyDecoder<T>;
    /**
     * Creates a random string containing the defined number of
     * bytes to be used in generating a secret key.
     */
    createRandomBytes: CreateRandomBytes<T>;
}
/**
 * Validates the given [[AuthenticatorOptions]].
 */
export declare function authenticatorOptionValidator<T extends AuthenticatorOptions<unknown> = AuthenticatorOptions<unknown>>(options: Partial<T>): void;
/**
 * Returns a set of default options for authenticator at the current epoch.
 */
export declare function authenticatorDefaultOptions<T extends AuthenticatorOptions<unknown> = AuthenticatorOptions<unknown>>(): Partial<T>;
/**
 * Takes an Authenticator Option object and provides presets for
 * some of the missing required Authenticator option fields and validates
 * the resultant options.
 */
export declare function authenticatorOptions<T extends AuthenticatorOptions<unknown> = AuthenticatorOptions<unknown>>(opt: Partial<T>): Readonly<T>;
/**
 * Encodes a given secret key into a Base32 secret
 * using a [[KeyEncoder]] method set in the options.
 *
 * @param secret - The [[SecretKey]] to encode into a [[Base32SecretKey]]
 * @param options - An [[AuthenticatorOptions]] object
 */
export declare function authenticatorEncoder<T extends AuthenticatorOptions<unknown> = AuthenticatorOptions<unknown>>(secret: SecretKey, options: Pick<T, 'keyEncoder' | 'encoding'>): ReturnType<T['keyEncoder']>;
/**
 * Decodes a given Base32 secret to a secret key
 * using a [[KeyDecoder]] method set in the options.
 *
 * @param secret - The [[Base32SecretKey]] to decode
 * @param options - An [[AuthenticatorOptions]] object
 */
export declare function authenticatorDecoder<T extends AuthenticatorOptions<unknown> = AuthenticatorOptions<unknown>>(secret: Base32SecretKey, options: Pick<T, 'keyDecoder' | 'encoding'>): ReturnType<T['keyDecoder']>;
/**
 * Generates a random Base32 Secret Key.
 *
 * @param numberOfBytes - Number of bytes per secret key
 * @param options.createRandomBytes
 * @param options.encoding
 * @param options.keyEncoder
 */
export declare function authenticatorGenerateSecret<T extends AuthenticatorOptions = AuthenticatorOptions>(numberOfBytes: number, options: Pick<T, 'keyEncoder' | 'encoding' | 'createRandomBytes'>): Base32SecretKey;
/**
 * Generates the Authenticator based token.
 *
 * tl;dr: Authenticator = TOTP + Base32 Secret
 *
 * **References**
 *
 * -   https://en.wikipedia.org/wiki/Google_Authenticator
 *
 * @param secret - [[Base32SecretKey]]
 * @param options - An [[AuthenticatorOptions]] object.
 */
export declare function authenticatorToken<T extends AuthenticatorOptions = AuthenticatorOptions>(secret: Base32SecretKey, options: Readonly<T>): string;
/**
 * Decodes the encodedSecret and passes it to [[totpCheckWithWindow]]
 *
 * @param token - The token to check
 * @param secret - The [[Base32SecretKey]]
 * @param options - An [[AuthenticatorOptions]] object.
 */
export declare function authenticatorCheckWithWindow<T extends AuthenticatorOptions = AuthenticatorOptions>(token: string, secret: Base32SecretKey, options: Readonly<T>): number | null;
/**
 * A class wrapper containing all Authenticator methods.
 */
export declare class Authenticator<T extends AuthenticatorOptions<string> = AuthenticatorOptions<string>> extends TOTP<T> {
    /**
     * Creates a new instance with all defaultOptions and options reset.
     */
    create(defaultOptions?: Partial<T>): Authenticator<T>;
    /**
     * Returns a set of options at the current moment,
     * polyfilled with some of the missing required options.
     *
     * Refer to [[authenticatorOptions]]
     */
    allOptions(): Readonly<T>;
    /**
     * Reference: [[authenticatorToken]]
     */
    generate(secret: Base32SecretKey): string;
    /**
     * Reference: [[authenticatorCheckWithWindow]]
     */
    checkDelta(token: string, secret: Base32SecretKey): number | null;
    /**
     * Reference: [[authenticatorEncoder]]
     */
    encode(secret: SecretKey): Base32SecretKey;
    /**
     * Reference: [[authenticatorDecoder]]
     */
    decode(secret: Base32SecretKey): SecretKey;
    /**
     * Reference: [[authenticatorGenerateSecret]]
     */
    generateSecret(numberOfBytes?: number): Base32SecretKey;
}
