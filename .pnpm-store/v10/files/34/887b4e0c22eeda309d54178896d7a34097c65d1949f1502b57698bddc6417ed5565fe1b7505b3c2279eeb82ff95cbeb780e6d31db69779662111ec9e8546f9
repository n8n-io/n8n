/**
 * OTP secret key.
 */
declare class Secret {
    /**
     * Converts a Latin-1 string to a Secret object.
     * @param {string} str Latin-1 string.
     * @returns {Secret} Secret object.
     */
    static fromLatin1(str: string): Secret;
    /**
     * Converts an UTF-8 string to a Secret object.
     * @param {string} str UTF-8 string.
     * @returns {Secret} Secret object.
     */
    static fromUTF8(str: string): Secret;
    /**
     * Converts a base32 string to a Secret object.
     * @param {string} str Base32 string.
     * @returns {Secret} Secret object.
     */
    static fromBase32(str: string): Secret;
    /**
     * Converts a hexadecimal string to a Secret object.
     * @param {string} str Hexadecimal string.
     * @returns {Secret} Secret object.
     */
    static fromHex(str: string): Secret;
    /**
     * Creates a secret key object.
     * @param {Object} [config] Configuration options.
     * @param {ArrayBuffer} [config.buffer=randomBytes] Secret key.
     * @param {number} [config.size=20] Number of random bytes to generate, ignored if 'buffer' is provided.
     */
    constructor({ buffer, size }?: {
        buffer?: ArrayBuffer | undefined;
        size?: number | undefined;
    } | undefined);
    /**
     * Secret key.
     * @type {ArrayBuffer}
     */
    buffer: ArrayBuffer;
    /**
     * Latin-1 string representation of secret key.
     * @type {string}
     */
    get latin1(): string;
    /**
     * UTF-8 string representation of secret key.
     * @type {string}
     */
    get utf8(): string;
    /**
     * Base32 string representation of secret key.
     * @type {string}
     */
    get base32(): string;
    /**
     * Hexadecimal string representation of secret key.
     * @type {string}
     */
    get hex(): string;
}

/**
 * HOTP: An HMAC-based One-time Password Algorithm.
 * @see [RFC 4226](https://tools.ietf.org/html/rfc4226)
 */
declare class HOTP {
    /**
     * Default configuration.
     * @type {{
     *   issuer: string,
     *   label: string,
     *   algorithm: string,
     *   digits: number,
     *   counter: number
     *   window: number
     * }}
     */
    static get defaults(): {
        issuer: string;
        label: string;
        algorithm: string;
        digits: number;
        counter: number;
        window: number;
    };
    /**
     * Generates an HOTP token.
     * @param {Object} config Configuration options.
     * @param {Secret} config.secret Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} [config.digits=6] Token length.
     * @param {number} [config.counter=0] Counter value.
     * @returns {string} Token.
     */
    static generate({ secret, algorithm, digits, counter, }: {
        secret: Secret;
        algorithm?: string | undefined;
        digits?: number | undefined;
        counter?: number | undefined;
    }): string;
    /**
     * Validates an HOTP token.
     * @param {Object} config Configuration options.
     * @param {string} config.token Token value.
     * @param {Secret} config.secret Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} config.digits Token length.
     * @param {number} [config.counter=0] Counter value.
     * @param {number} [config.window=1] Window of counter values to test.
     * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
     */
    static validate({ token, secret, algorithm, digits, counter, window, }: {
        token: string;
        secret: Secret;
        algorithm?: string | undefined;
        digits: number;
        counter?: number | undefined;
        window?: number | undefined;
    }): number | null;
    /**
     * Creates an HOTP object.
     * @param {Object} [config] Configuration options.
     * @param {string} [config.issuer=''] Account provider.
     * @param {string} [config.label='OTPAuth'] Account label.
     * @param {Secret|string} [config.secret=Secret] Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} [config.digits=6] Token length.
     * @param {number} [config.counter=0] Initial counter value.
     */
    constructor({ issuer, label, secret, algorithm, digits, counter, }?: {
        issuer?: string | undefined;
        label?: string | undefined;
        secret?: string | Secret | undefined;
        algorithm?: string | undefined;
        digits?: number | undefined;
        counter?: number | undefined;
    } | undefined);
    /**
     * Account provider.
     * @type {string}
     */
    issuer: string;
    /**
     * Account label.
     * @type {string}
     */
    label: string;
    /**
     * Secret key.
     * @type {Secret}
     */
    secret: Secret;
    /**
     * HMAC hashing algorithm.
     * @type {string}
     */
    algorithm: string;
    /**
     * Token length.
     * @type {number}
     */
    digits: number;
    /**
     * Initial counter value.
     * @type {number}
     */
    counter: number;
    /**
     * Generates an HOTP token.
     * @param {Object} [config] Configuration options.
     * @param {number} [config.counter=this.counter++] Counter value.
     * @returns {string} Token.
     */
    generate({ counter }?: {
        counter?: number | undefined;
    } | undefined): string;
    /**
     * Validates an HOTP token.
     * @param {Object} config Configuration options.
     * @param {string} config.token Token value.
     * @param {number} [config.counter=this.counter] Counter value.
     * @param {number} [config.window=1] Window of counter values to test.
     * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
     */
    validate({ token, counter, window }: {
        token: string;
        counter?: number | undefined;
        window?: number | undefined;
    }): number | null;
    /**
     * Returns a Google Authenticator key URI.
     * @returns {string} URI.
     */
    toString(): string;
}

/**
 * TOTP: Time-Based One-Time Password Algorithm.
 * @see [RFC 6238](https://tools.ietf.org/html/rfc6238)
 */
declare class TOTP {
    /**
     * Default configuration.
     * @type {{
     *   issuer: string,
     *   label: string,
     *   algorithm: string,
     *   digits: number,
     *   period: number
     *   window: number
     * }}
     */
    static get defaults(): {
        issuer: string;
        label: string;
        algorithm: string;
        digits: number;
        period: number;
        window: number;
    };
    /**
     * Generates a TOTP token.
     * @param {Object} config Configuration options.
     * @param {Secret} config.secret Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} [config.digits=6] Token length.
     * @param {number} [config.period=30] Token time-step duration.
     * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
     * @returns {string} Token.
     */
    static generate({ secret, algorithm, digits, period, timestamp, }: {
        secret: Secret;
        algorithm?: string | undefined;
        digits?: number | undefined;
        period?: number | undefined;
        timestamp?: number | undefined;
    }): string;
    /**
     * Validates a TOTP token.
     * @param {Object} config Configuration options.
     * @param {string} config.token Token value.
     * @param {Secret} config.secret Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} config.digits Token length.
     * @param {number} [config.period=30] Token time-step duration.
     * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
     * @param {number} [config.window=1] Window of counter values to test.
     * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
     */
    static validate({ token, secret, algorithm, digits, period, timestamp, window, }: {
        token: string;
        secret: Secret;
        algorithm?: string | undefined;
        digits: number;
        period?: number | undefined;
        timestamp?: number | undefined;
        window?: number | undefined;
    }): number | null;
    /**
     * Creates a TOTP object.
     * @param {Object} [config] Configuration options.
     * @param {string} [config.issuer=''] Account provider.
     * @param {string} [config.label='OTPAuth'] Account label.
     * @param {Secret|string} [config.secret=Secret] Secret key.
     * @param {string} [config.algorithm='SHA1'] HMAC hashing algorithm.
     * @param {number} [config.digits=6] Token length.
     * @param {number} [config.period=30] Token time-step duration.
     */
    constructor({ issuer, label, secret, algorithm, digits, period, }?: {
        issuer?: string | undefined;
        label?: string | undefined;
        secret?: string | Secret | undefined;
        algorithm?: string | undefined;
        digits?: number | undefined;
        period?: number | undefined;
    } | undefined);
    /**
     * Account provider.
     * @type {string}
     */
    issuer: string;
    /**
     * Account label.
     * @type {string}
     */
    label: string;
    /**
     * Secret key.
     * @type {Secret}
     */
    secret: Secret;
    /**
     * HMAC hashing algorithm.
     * @type {string}
     */
    algorithm: string;
    /**
     * Token length.
     * @type {number}
     */
    digits: number;
    /**
     * Token time-step duration.
     * @type {number}
     */
    period: number;
    /**
     * Generates a TOTP token.
     * @param {Object} [config] Configuration options.
     * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
     * @returns {string} Token.
     */
    generate({ timestamp }?: {
        timestamp?: number | undefined;
    } | undefined): string;
    /**
     * Validates a TOTP token.
     * @param {Object} config Configuration options.
     * @param {string} config.token Token value.
     * @param {number} [config.timestamp=Date.now] Timestamp value in milliseconds.
     * @param {number} [config.window=1] Window of counter values to test.
     * @returns {number|null} Token delta or null if it is not found in the search window, in which case it should be considered invalid.
     */
    validate({ token, timestamp, window }: {
        token: string;
        timestamp?: number | undefined;
        window?: number | undefined;
    }): number | null;
    /**
     * Returns a Google Authenticator key URI.
     * @returns {string} URI.
     */
    toString(): string;
}

/**
 * HOTP/TOTP object/string conversion.
 * @see [Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
 */
declare class URI {
    /**
     * Parses a Google Authenticator key URI and returns an HOTP/TOTP object.
     * @param {string} uri Google Authenticator Key URI.
     * @returns {HOTP|TOTP} HOTP/TOTP object.
     */
    static parse(uri: string): HOTP | TOTP;
    /**
     * Converts an HOTP/TOTP object to a Google Authenticator key URI.
     * @param {HOTP|TOTP} otp HOTP/TOTP object.
     * @returns {string} Google Authenticator Key URI.
     */
    static stringify(otp: HOTP | TOTP): string;
}

/**
 * Library version.
 * @type {string}
 */
declare const version: string;

export { HOTP, Secret, TOTP, URI, version };
