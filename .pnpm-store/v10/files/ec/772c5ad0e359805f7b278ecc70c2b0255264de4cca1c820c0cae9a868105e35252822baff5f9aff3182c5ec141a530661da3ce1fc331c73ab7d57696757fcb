import { semver } from './utils.js';

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
export const validate = (version: string) =>
  typeof version === 'string' && /^[v\d]/.test(version) && semver.test(version);

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
export const validateStrict = (version: string) =>
  typeof version === 'string' &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(
    version
  );
