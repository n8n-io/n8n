import { bytes } from ".";

/**
 * Generate random bytes.
 * @param size - Number of bytes to generate.
 * @returns An ArrayBuffer with cryptographically random bytes.
 * @example
 * const bytes = crypto.randomBytes(42);
 * const view = new Uint8Array(bytes);
 * console.log(view); // 156,71,245,191,56,...
 */
export function randomBytes(size: number): ArrayBuffer;

/**
 * Produce HMAC.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/hmac/
 * @param algorithm - Hash algorithm.
 * @param secret - Shared secret.
 * @param input - Input data.
 * @param outputEncoding - Output encoding.
 * @returns Produced HMAC.
 * @example
 * crypto.hmac('sha256', 'mysecret', 'hello world!', 'hex')
 */
export function hmac<OE extends OutputEncoding>(
    algorithm: Algorithm,
    secret: string | ArrayBuffer,
    input: string | ArrayBuffer,
    outputEncoding: OE,
): Output<OE>;

/**
 * Hash with MD4.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/md4/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns MD4 digest.
 * @example
 * crypto.md4('hello world!', 'hex')
 */
export function md4<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with MD5.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/md5/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns MD5 digest.
 * @example
 * crypto.md5("hello world!", "hex")
 */
export function md5<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-1.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha1/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-1 digest.
 * @example
 * crypto.sha1('hello world!', 'hex')
 */
export function sha1<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-256.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha256/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-256 digest.
 * @example
 * crypto.sha256('hello world!', 'hex')
 */
export function sha256<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-384.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha384/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-384 digest.
 * @example
 * crypto.sha384('hello world!', 'hex')
 */
export function sha384<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-512.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-512 digest.
 * @example
 * crypto.sha512('hello world!', 'hex')
 */
export function sha512<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-512/224.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512_224/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-512/224 digest.
 * @example
 * crypto.sha512_224('hello world!', 'hex')
 */
export function sha512_224<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with SHA-512/256.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512_256/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns SHA-512/256 digest.
 * @example
 * crypto.sha512_256('hello world!', 'hex')
 */
export function sha512_256<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Hash with RIPEMD-160.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/ripemd160/
 * @param input - Data to hash.
 * @param outputEncoding - Output encoding.
 * @returns RIPEMD-160 digest.
 * @example
 * crypto.ripemd160('hello world!', 'hex')
 */
export function ripemd160<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

/**
 * Create a hashing object.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/createhash/
 * @param algorithm - Hash algorithm.
 * @returns Hashing object.
 * @example
 */
export function createHash(algorithm: Algorithm): Hasher;

/**
 * Create an HMAC hashing object.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/createhmac/
 * @param algorithm - Hash algorithm.
 * @param secret - Shared secret.
 * @returns HMAC hashing object.
 * @example
 */
export function createHMAC(algorithm: Algorithm, secret: string | ArrayBuffer): Hasher;

/**
 * Hash algorithm.
 */
export type Algorithm =
    | "md4"
    | "md5"
    | "sha1"
    | "sha256"
    | "sha384"
    | "sha512"
    | "sha512_224"
    | "sha512_256"
    | "ripemd160";

/**
 * String output encoding.
 */
export type StringEncoding = "hex" | "base64" | "base64url" | "base64rawurl";

/**
 * Binary output encoding.
 */
export type BinaryEncoding = "binary";

/**
 * Output encoding.
 */
export type OutputEncoding = StringEncoding | BinaryEncoding;

/**
 * Output type. Varies with output encoding.
 * @template OE - Output encoding.
 */
export type Output<OE extends OutputEncoding> = OE extends StringEncoding ? string
    : OE extends BinaryEncoding ? bytes
    : never;

/**
 * Hashing object.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/hasher/
 */
export abstract class Hasher {
    protected __brand: never;

    /**
     * Add more data to the string we want to create a hash of.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/hasher/
     * @param input - Data to add.
     * @example
     * let hasher = crypto.createHMAC('sha256', 'a secret');
     * hasher.update('hello ');
     * hasher.update('world!');
     * console.log(hasher.digest('hex'));
     */
    update(input: string | ArrayBuffer): void;

    /**
     * Return a digest from the data added so far.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/hasher/
     * @param outputEncoding - Output encoding.
     * @returns Digest of data added so far.
     * @example
     * let hasher = crypto.createHMAC('sha256', 'a secret');
     * hasher.update('hello ');
     * hasher.update('world!');
     * console.log(hasher.digest('hex'));
     */
    digest<OE extends OutputEncoding>(outputEncoding: OE): Output<OE>;
}

/**
 * This module provides common hashing functionality available in the GoLang crypto package.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/
 */
declare namespace crypto {
    /**
     * Generate random bytes.
     * @param size - Number of bytes to generate.
     * @returns An ArrayBuffer with cryptographically random bytes.
     * @example
     * const bytes = crypto.randomBytes(42);
     * const view = new Uint8Array(bytes);
     * console.log(view); // 156,71,245,191,56,...
     */
    function randomBytes(size: number): ArrayBuffer;

    /**
     * Produce HMAC.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/hmac/
     * @param algorithm - Hash algorithm.
     * @param secret - Shared secret.
     * @param input - Input data.
     * @param outputEncoding - Output encoding.
     * @returns Produced HMAC.
     * @example
     * crypto.hmac('sha256', 'mysecret', 'hello world!', 'hex')
     */
    function hmac<OE extends OutputEncoding>(
        algorithm: Algorithm,
        secret: string | ArrayBuffer,
        input: string | ArrayBuffer,
        outputEncoding: OE,
    ): Output<OE>;

    /**
     * Hash with MD4.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/md4/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns MD4 digest.
     * @example
     * crypto.md4('hello world!', 'hex')
     */
    function md4<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with MD5.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/md5/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns MD5 digest.
     * @example
     * crypto.md5("hello world!", "hex")
     */
    function md5<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-1.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha1/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-1 digest.
     * @example
     * crypto.sha1('hello world!', 'hex')
     */
    function sha1<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-256.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha256/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-256 digest.
     * @example
     * crypto.sha256('hello world!', 'hex')
     */
    function sha256<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-384.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha384/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-384 digest.
     * @example
     * crypto.sha384('hello world!', 'hex')
     */
    function sha384<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-512.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-512 digest.
     * @example
     * crypto.sha512('hello world!', 'hex')
     */
    function sha512<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-512/224.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512_224/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-512/224 digest.
     * @example
     * crypto.sha512_224('hello world!', 'hex')
     */
    function sha512_224<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with SHA-512/256.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/sha512_256/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns SHA-512/256 digest.
     * @example
     * crypto.sha512_256('hello world!', 'hex')
     */
    function sha512_256<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Hash with RIPEMD-160.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/ripemd160/
     * @param input - Data to hash.
     * @param outputEncoding - Output encoding.
     * @returns RIPEMD-160 digest.
     * @example
     * crypto.ripemd160('hello world!', 'hex')
     */
    function ripemd160<OE extends OutputEncoding>(input: string | ArrayBuffer, outputEncoding: OE): Output<OE>;

    /**
     * Create a hashing object.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/createhash/
     * @param algorithm - Hash algorithm.
     * @returns Hashing object.
     * @example
     * let hasher = crypto.createHash('sha256');
     * hasher.update('hello ');
     * hasher.update('world!');
     * console.log(hasher.digest('hex'));
     */
    function createHash(algorithm: Algorithm): Hasher;

    /**
     * Create an HMAC hashing object.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-crypto/createhmac/
     * @param algorithm - Hash algorithm.
     * @param secret - Shared secret.
     * @returns HMAC hashing object.
     * @example
     * let hasher = crypto.createHMAC('sha256', 'a secret');
     * hasher.update('hello ');
     * hasher.update('world!');
     * console.log(hasher.digest('hex'));
     */
    function createHMAC(algorithm: Algorithm, secret: string | ArrayBuffer): Hasher;
}

export default crypto;
