/**
 * Validate [semver](https://semver.org/) version strings.
 *
 * @param version Version number to validate
 * @returns `true` if the version number is a valid semver version number, `false` otherwise.
 *
 * @example
 * ```
 * validate('1.0.0-rc.1'); // return true
 * validate('1.0-rc.1'); // return false
 * validate('foo'); // return false
 * ```
 */
export declare const validate: (version: string) => boolean;
/**
 * Validate [semver](https://semver.org/) version strings strictly. Will not accept wildcards and version ranges.
 *
 * @param version Version number to validate
 * @returns `true` if the version number is a valid semver version number `false` otherwise
 *
 * @example
 * ```
 * validate('1.0.0-rc.1'); // return true
 * validate('1.0-rc.1'); // return false
 * validate('foo'); // return false
 * ```
 */
export declare const validateStrict: (version: string) => boolean;
