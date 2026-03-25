import { CreateHmacKey, KeyEncodings, SecretKey } from './utils';
import { HOTP, HOTPOptions } from './hotp';
/**
 * Interface for options used in TOTP.
 *
 * Contains additional options in addition to
 * those within HOTP.
 */
export interface TOTPOptions<T = string> extends HOTPOptions<T> {
    /**
     * The starting time since the JavasSript epoch (seconds) (UNIX epoch * 1000).
     */
    epoch: number;
    /**
     * Time step (seconds).
     */
    step: number;
    /**
     * How many windows (x * step) past and future do we consider as valid during check.
     */
    window: number | [number, number];
}
/**
 * Interface for available epoches derived from
 * the current epoch.
 */
export interface EpochAvailable {
    current: number;
    future: number[];
    past: number[];
}
/**
 * Validates the given [[TOTPOptions]].
 */
export declare function totpOptionsValidator<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(options: Readonly<Partial<T>>): void;
/**
 * Pads the secret to the expected minimum length
 * and returns a hex representation of the string.
 */
export declare const totpPadSecret: (secret: string, encoding: KeyEncodings, minLength: number) => string;
/**
 * Takes a TOTP secret and derives the HMAC key
 * for use in token generation.
 *
 * In RFC 6238, the secret / seed length for different algorithms
 * are predefined.
 *
 * - HMAC-SHA1 (20 bytes)
 * - HMAC-SHA256 (32 bytes)
 * - HMAC-SHA512 (64 bytes)
 *
 * @param algorithm - Reference: [[TOTPOptions.algorithm]]
 * @param secret
 * @param encoding - Reference: [[TOTPOptions.encoding]]
 */
export declare const totpCreateHmacKey: CreateHmacKey;
/**
 * Returns a set of default options for TOTP at the current epoch.
 */
export declare function totpDefaultOptions<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(): Partial<T>;
/**
 * Takes an TOTP Option object and provides presets for
 * some of the missing required TOTP option fields and validates
 * the resultant options.
 */
export declare function totpOptions<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(opt: Partial<T>): Readonly<T>;
/**
 * Generates the counter based on the current epoch and step.
 * This dynamic counter is used in the HOTP algorithm.
 *
 * @param epoch - Reference: [[TOTPOptions.epoch]]
 * @param step - Reference: [[TOTPOptions.step]]
 */
export declare function totpCounter(epoch: number, step: number): number;
/**
 * Generates a Time-based One-time Token (TOTP)
 *
 * tl;dr: TOTP = HOTP + counter based on current time.
 *
 * **References**
 *
 * -   http://tools.ietf.org/html/rfc6238
 * -   http://en.wikipedia.org/wiki/Time-based_One-time_Password_Algorithm
 *
 */
export declare function totpToken<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(secret: SecretKey, options: Readonly<T>): string;
/**
 * Gets a set of epoches derived from
 * the current epoch and the acceptable window.
 *
 * @param epoch - Reference: [[TOTPOptions.epoch]]
 * @param step - Reference: [[TOTPOptions.step]]
 * @param win - Reference: [[TOTPOptions.window]]
 */
export declare function totpEpochAvailable(epoch: number, step: number, win: number | [number, number]): EpochAvailable;
/**
 * Checks the given token against the system generated token.
 *
 * **Note**: Token is valid only if it is a number string.
 */
export declare function totpCheck<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(token: string, secret: SecretKey, options: Readonly<T>): boolean;
/**
 * Checks if there is a valid TOTP token in a given list of epoches.
 * Returns the (index + 1) of a valid epoch in the list.
 *
 * @param epochs - List of epochs to check token against
 * @param token - The token to check
 * @param secret - Your secret key.
 * @param options - A TOTPOptions object.
 */
export declare function totpCheckByEpoch<T extends TOTPOptions = TOTPOptions>(epochs: number[], token: string, secret: SecretKey, options: Readonly<T>): number | null;
/**
 * Checks the provided OTP token against system generated token
 * with support for checking past or future x * step windows.
 *
 * Return values:
 *
 * - null = check failed
 * - positive number = token at future x * step
 * - negative number = token at past x * step
 *
 * @param token - The token to check
 * @param secret - Your secret key.
 * @param options - A TOTPOptions object.
 */
export declare function totpCheckWithWindow<T extends TOTPOptions = TOTPOptions>(token: string, secret: SecretKey, options: Readonly<T>): number | null;
/**
 * Calculates the number of seconds used in the current tick for TOTP.
 *
 * The start of a new token: `timeUsed() === 0`
 *
 * @param epoch - Reference: [[TOTPOptions.epoch]]
 * @param step - Reference: [[TOTPOptions.step]]
 */
export declare function totpTimeUsed(epoch: number, step: number): number;
/**
 * Calculates the number of seconds till next tick for TOTP.
 *
 * The start of a new token: `timeRemaining() === step`
 *
 * @param epoch - Reference: [[TOTPOptions.epoch]]
 * @param step - Reference: [[TOTPOptions.step]]
 */
export declare function totpTimeRemaining(epoch: number, step: number): number;
/**
 * Generates a [keyuri](../#keyuri) from options provided
 * and it's type set to TOTP.
 */
export declare function totpKeyuri<T extends TOTPOptions<unknown> = TOTPOptions<unknown>>(accountName: string, issuer: string, secret: SecretKey, options: Readonly<T>): string;
/**
 * A class wrapper containing all TOTP methods.
 */
export declare class TOTP<T extends TOTPOptions = TOTPOptions> extends HOTP<T> {
    /**
     * Creates a new instance with all defaultOptions and options reset.
     */
    create(defaultOptions?: Partial<T>): TOTP<T>;
    /**
     * Returns class options polyfilled with some of
     * the missing required options.
     *
     * Reference: [[totpOptions]]
     */
    allOptions(): Readonly<T>;
    /**
     * Reference: [[totpToken]]
     */
    generate(secret: SecretKey): string;
    /**
     * Reference: [[totpCheckWithWindow]]
     */
    checkDelta(token: string, secret: SecretKey): number | null;
    /**
     * Checks if a given TOTP token matches the generated
     * token at the given epoch (default to current time).
     *
     * This method will return true as long as the token is
     * still within the acceptable time window defined.
     *
     * i.e when [[checkDelta]] returns a number.
     */
    check(token: string, secret: SecretKey): boolean;
    /**
     * Same as [[check]] but accepts a single object based argument.
     */
    verify(opts: {
        token: string;
        secret: SecretKey;
    }): boolean;
    /**
     * Reference: [[totpTimeRemaining]]
     */
    timeRemaining(): number;
    /**
     * Reference: [[totpTimeUsed]]
     */
    timeUsed(): number;
    /**
     * Reference: [[totpKeyuri]]
     */
    keyuri(accountName: string, issuer: string, secret: SecretKey): string;
}
