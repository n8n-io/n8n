import { Transform } from 'stream';
import { CRC32CValidatorGenerator, CRC32CValidator } from './crc32c.js';
interface HashStreamValidatorOptions {
    /** Enables CRC32C calculation. To validate a provided value use `crc32cExpected`. */
    crc32c: boolean;
    /** Enables MD5 calculation. To validate a provided value use `md5Expected`. */
    md5: boolean;
    /** A CRC32C instance for validation. To validate a provided value use `crc32cExpected`. */
    crc32cInstance: CRC32CValidator;
    /** Set a custom CRC32C generator. Used if `crc32cInstance` has not been provided. */
    crc32cGenerator: CRC32CValidatorGenerator;
    /** Sets the expected CRC32C value to verify once all data has been consumed. Also sets the `crc32c` option to `true` */
    crc32cExpected?: string;
    /** Sets the expected MD5 value to verify once all data has been consumed. Also sets the `md5` option to `true` */
    md5Expected?: string;
    /** Indicates whether or not to run a validation check or only update the hash values */
    updateHashesOnly?: boolean;
}
declare class HashStreamValidator extends Transform {
    #private;
    readonly crc32cEnabled: boolean;
    readonly md5Enabled: boolean;
    readonly crc32cExpected: string | undefined;
    readonly md5Expected: string | undefined;
    readonly updateHashesOnly: boolean;
    constructor(options?: Partial<HashStreamValidatorOptions>);
    /**
     * Return the current CRC32C value, if available.
     */
    get crc32c(): string | undefined;
    _flush(callback: (error?: Error | null | undefined) => void): void;
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: (e?: Error) => void): void;
    test(hash: 'crc32c' | 'md5', sum: Buffer | string): boolean;
}
export { HashStreamValidator, HashStreamValidatorOptions };
