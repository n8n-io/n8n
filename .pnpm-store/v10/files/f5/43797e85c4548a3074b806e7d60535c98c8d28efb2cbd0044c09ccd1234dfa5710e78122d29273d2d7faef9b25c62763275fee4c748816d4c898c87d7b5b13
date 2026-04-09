/**
 * Sets the pseudo random number generator to use as a fallback if neither node's crypto module nor the Web Crypto API is available.
 * Please note: It is highly important that the PRNG used is cryptographically secure and that it is seeded properly!
 * @param  random Function taking the number of bytes to generate as its sole argument, returning the corresponding array of cryptographically secure random byte values.
 */
export declare function setRandomFallback(random: (random: number) => number[]): void;

/**
 * Synchronously generates a salt.
 * @param  rounds Number of rounds to use, defaults to 10 if omitted
 * @return Resulting salt
 * @throws If a random fallback is required but not set
 */
export declare function genSaltSync(rounds?: number): string;

/**
 * Asynchronously generates a salt.
 * @param  rounds  Number of rounds to use, defaults to 10 if omitted
 * @return Promise with resulting salt, if callback has been omitted
 */
export declare function genSalt(rounds?: number): Promise<string>;

/**
 * Asynchronously generates a salt.
 * @param callback Callback receiving the error, if any, and the resulting salt
 */
export declare function genSalt(callback: (err: Error | null, salt: string) => void): void;

/**
 * Asynchronously generates a salt.
 * @param  rounds   Number of rounds to use, defaults to 10 if omitted
 * @param  callback Callback receiving the error, if any, and the resulting salt
 */
export declare function genSalt(rounds: number, callback: (err: Error | null, salt: string) => void): void;

/**
 * Synchronously generates a hash for the given string.
 * @param  s    String to hash
 * @param  salt Salt length to generate or salt to use, default to 10
 * @return Resulting hash
 */
export declare function hashSync(s: string, salt?: number | string): string;

/**
 * Asynchronously generates a hash for the given string.
 * @param s                String to hash
 * @param salt             Salt length to generate or salt to use
 * @return Promise with resulting hash, if callback has been omitted
 */
export declare function hash(s: string, salt: number | string): Promise<string>;

/**
 * Asynchronously generates a hash for the given string.
 * @param s                String to hash
 * @param salt             Salt length to generate or salt to use
 * @param callback         Callback receiving the error, if any, and the resulting hash
 * @param progressCallback Callback successively called with the percentage of rounds completed (0.0 - 1.0), maximally once per MAX_EXECUTION_TIME = 100 ms.
 */
export declare function hash(
    s: string,
    salt: number | string,
    callback?: (err: Error | null, hash: string) => void,
    progressCallback?: (percent: number) => void,
): void;

/**
 * Synchronously tests a string against a hash.
 * @param  s    String to compare
 * @param  hash Hash to test against
 * @return true if matching, otherwise false
 */
export declare function compareSync(s: string, hash: string): boolean;

/**
 * Asynchronously compares the given data against the given hash.
 * @param  s                Data to compare
 * @param  hash             Data to be compared to
 * @return Promise, if callback has been omitted
 */
export declare function compare(s: string, hash: string): Promise<boolean>;

/**
 * Asynchronously compares the given data against the given hash.
 * @param  s                Data to compare
 * @param  hash             Data to be compared to
 * @param  callback         Callback receiving the error, if any, otherwise the result
 * @param  progressCallback Callback successively called with the percentage of rounds completed (0.0 - 1.0), maximally once per MAX_EXECUTION_TIME = 100 ms.
 */
export declare function compare(
    s: string,
    hash: string,
    callback?: (err: Error | null, success: boolean) => void,
    progressCallback?: (percent: number) => void,
): void;

/**
 * Gets the number of rounds used to encrypt the specified hash.
 * @param  hash Hash to extract the used number of rounds from
 * @return Number of rounds used
 */
export declare function getRounds(hash: string): number;

/**
 * Gets the salt portion from a hash. Does not validate the hash.
 * @param  hash Hash to extract the salt from
 * @return Extracted salt part
 */
export declare function getSalt(hash: string): string;

/**
 * Encodes a byte array to base64 with up to len bytes of input, using the custom bcrypt alphabet.
 * @function
 * @param b Byte array
 * @param len Maximum input length
 */
export declare function encodeBase64(b: Readonly<ArrayLike<number>>, len: number): string;

/**
 * Decodes a base64 encoded string to up to len bytes of output, using the custom bcrypt alphabet.
 * @function
 * @param s String to decode
 * @param len Maximum output length
 */
export declare function decodeBase64(s: string, len: number): number[];
