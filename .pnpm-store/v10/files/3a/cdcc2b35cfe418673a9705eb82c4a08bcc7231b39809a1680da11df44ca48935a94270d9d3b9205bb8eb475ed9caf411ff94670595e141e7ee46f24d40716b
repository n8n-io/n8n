/**
 * A package name that has been separated into its scope and unscoped name.
 *
 * @public
 */
export interface IParsedPackageName {
    /**
     * The parsed NPM scope, or an empty string if there was no scope.  The scope value will
     * always include the at-sign.
     * @remarks
     * For example, if the parsed input was "\@scope/example", then scope would be "\@scope".
     */
    scope: string;
    /**
     * The parsed NPM package name without the scope.
     * @remarks
     * For example, if the parsed input was "\@scope/example", then the name would be "example".
     */
    unscopedName: string;
}
/**
 * Result object returned by {@link PackageName.tryParse}
 *
 * @public
 */
export interface IParsedPackageNameOrError extends IParsedPackageName {
    /**
     * If the input string could not be parsed, then this string will contain a nonempty
     * error message.  Otherwise it will be an empty string.
     */
    error: string;
}
/**
 * Options that configure the validation rules used by a {@link PackageNameParser} instance.
 *
 * @remarks
 * The default validation is based on the npmjs.com registry's policy for published packages, and includes these
 * restrictions:
 *
 * - The package name cannot be longer than 214 characters.
 *
 * - The package name must not be empty.
 *
 * - Other than the `@` and `/` delimiters used for scopes, the only allowed characters
 *   are letters, numbers, `-`, `_`, and `.`.
 *
 * - The name must not start with a `.` or `_`.
 *
 * @public
 */
export interface IPackageNameParserOptions {
    /**
     * If true, allows upper-case letters in package names.
     * This improves compatibility with some legacy private registries that still allow that.
     */
    allowUpperCase?: boolean;
}
/**
 * A configurable parser for validating and manipulating NPM package names such as `my-package` or `@scope/my-package`.
 *
 * @remarks
 * If you do not need to customize the parser configuration, it is recommended to use {@link PackageName}
 * which exposes these operations as a simple static class.
 *
 * @public
 */
export declare class PackageNameParser {
    private static readonly _invalidNameCharactersRegExp;
    private readonly _options;
    constructor(options?: IPackageNameParserOptions);
    /**
     * This attempts to parse a package name that may include a scope component.
     * The packageName must not be an empty string.
     * @remarks
     * This function will not throw an exception.
     *
     * @returns an {@link IParsedPackageNameOrError} structure whose `error` property will be
     * nonempty if the string could not be parsed.
     */
    tryParse(packageName: string): IParsedPackageNameOrError;
    /**
     * Same as {@link PackageName.tryParse}, except this throws an exception if the input
     * cannot be parsed.
     * @remarks
     * The packageName must not be an empty string.
     */
    parse(packageName: string): IParsedPackageName;
    /**
     * {@inheritDoc IParsedPackageName.scope}
     */
    getScope(packageName: string): string;
    /**
     * {@inheritDoc IParsedPackageName.unscopedName}
     */
    getUnscopedName(packageName: string): string;
    /**
     * Returns true if the specified package name is valid, or false otherwise.
     * @remarks
     * This function will not throw an exception.
     */
    isValidName(packageName: string): boolean;
    /**
     * Throws an exception if the specified name is not a valid package name.
     * The packageName must not be an empty string.
     */
    validate(packageName: string): void;
    /**
     * Combines an optional package scope with an unscoped root name.
     * @param scope - Must be either an empty string, or a scope name such as "\@example"
     * @param unscopedName - Must be a nonempty package name that does not contain a scope
     * @returns A full package name such as "\@example/some-library".
     */
    combineParts(scope: string, unscopedName: string): string;
}
/**
 * Provides basic operations for validating and manipulating NPM package names such as `my-package`
 * or `@scope/my-package`.
 *
 * @remarks
 * This is the default implementation of {@link PackageNameParser}, exposed as a convenient static class.
 * If you need to configure the parsing rules, use `PackageNameParser` instead.
 *
 * @public
 */
export declare class PackageName {
    private static readonly _parser;
    /** {@inheritDoc PackageNameParser.tryParse} */
    static tryParse(packageName: string): IParsedPackageNameOrError;
    /** {@inheritDoc PackageNameParser.parse} */
    static parse(packageName: string): IParsedPackageName;
    /** {@inheritDoc PackageNameParser.getScope} */
    static getScope(packageName: string): string;
    /** {@inheritDoc PackageNameParser.getUnscopedName} */
    static getUnscopedName(packageName: string): string;
    /** {@inheritDoc PackageNameParser.isValidName} */
    static isValidName(packageName: string): boolean;
    /** {@inheritDoc PackageNameParser.validate} */
    static validate(packageName: string): void;
    /** {@inheritDoc PackageNameParser.combineParts} */
    static combineParts(scope: string, unscopedName: string): string;
}
//# sourceMappingURL=PackageName.d.ts.map