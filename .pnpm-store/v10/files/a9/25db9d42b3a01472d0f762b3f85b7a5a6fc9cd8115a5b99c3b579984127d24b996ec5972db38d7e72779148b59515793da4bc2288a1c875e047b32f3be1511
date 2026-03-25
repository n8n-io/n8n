import { TSDocTagDefinition } from '../configuration/TSDocTagDefinition';
/**
 * Tags whose meaning is defined by the TSDoc standard.
 */
export declare class StandardTags {
    /**
     * (Discretionary)
     *
     * Suggested meaning: Designates that an API item's release stage is "alpha".
     * It is intended to be used by third-party developers eventually, but has not
     * yet been released.  The tooling may trim the declaration from a public release.
     *
     * @remarks
     * Example implementations: API Extractor
     */
    static readonly alpha: TSDocTagDefinition;
    /**
     * (Discretionary)
     *
     * Suggested meaning: Designates that an API item's release stage is "beta".
     * It has been released to third-party developers experimentally for the purpose of
     * collecting feedback.  The API should not be used in production, because its contract may
     * change without notice.  The tooling may trim the declaration from a public release,
     * but may include it in a developer preview release.
     *
     * @remarks
     * Example implementations: API Extractor
     *
     * Synonyms: `@experimental`
     */
    static readonly beta: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * ECMAScript decorators are sometimes an important part of an API contract.
     * However, today the TypeScript compiler does not represent decorators in the
     * .d.ts output files used by API consumers.  The `@decorator` tag provides a workaround,
     * enabling a decorator expressions to be quoted in a doc comment.
     *
     * @example
     * ```ts
     * class Book {
     *   /**
     *    * The title of the book.
     *    * @decorator `@jsonSerialized`
     *    * @decorator `@jsonFormat(JsonFormats.Url)`
     *    *
     *+/
     *   @jsonSerialized
     *   @jsonFormat(JsonFormats.Url)
     *   public website: string;
     * }
     * ```
     */
    static readonly decorator: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This block tag is used to document the default value for a field or property,
     * if a value is not assigned explicitly.
     *
     * @remarks
     * This tag should only be used with fields or properties that are members of a class or interface.
     */
    static readonly defaultValue: TSDocTagDefinition;
    /**
     * (Core)
     *
     * This block tag communicates that an API item is no longer supported and may be removed
     * in a future release.  The `@deprecated` tag is followed by a sentence describing
     * the recommended alternative.  It recursively applies to members of the container.
     * For example, if a class is deprecated, then so are all of its members.
     */
    static readonly deprecated: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * When applied to a class or interface property, this indicates that the property
     * returns an event object that event handlers can be attached to.  The event-handling
     * API is implementation-defined, but typically the property return type would be a class
     * with members such as `addHandler()` and `removeHandler()`.  A documentation tool can
     * display such properties under an "Events" heading instead of the usual "Properties" heading.
     */
    static readonly eventProperty: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * Indicates a documentation section that should be presented as an example
     * illustrating how to use the API.  It may include a code sample.
     */
    static readonly example: TSDocTagDefinition;
    /**
     * (Discretionary)
     *
     * Suggested meaning:  Same semantics as `@beta`, but used by tools that don't support
     * an `@alpha` release stage.
     *
     * @remarks
     * Example implementations: Angular API documenter
     *
     * Synonyms: `@beta`
     */
    static readonly experimental: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This inline tag is used to automatically generate an API item's documentation by
     * copying it from another API item.  The inline tag parameter contains a reference
     * to the other item, which may be an unrelated class, or even an import from a
     * separate NPM package.
     *
     * @remarks
     * What gets copied
     *
     * The `@inheritDoc` tag does not copy the entire comment body. Only the following
     * components are copied:
     * - summary section
     * - `@remarks` block
     * - `@params` blocks
     * - `@typeParam` blocks
     * - `@returns` block
     * Other tags such as `@defaultValue` or `@example` are not copied, and need to be
     * explicitly included after the `@inheritDoc` tag.
     *
     * TODO: The notation for API item references is still being standardized.  See this issue:
     * https://github.com/microsoft/tsdoc/issues/9
     */
    static readonly inheritDoc: TSDocTagDefinition;
    /**
     * (Discretionary)
     *
     * Suggested meaning:  Designates that an API item is not planned to be used by
     * third-party developers.  The tooling may trim the declaration from a public release.
     * In some implementations, certain designated packages may be allowed to consume
     * internal API items, e.g. because the packages are components of the same product.
     *
     * @remarks
     * Example implementations: API Extractor
     */
    static readonly internal: TSDocTagDefinition;
    /**
     * (Core)
     *
     * The `{@label}` inline tag is used to label a declaration, so that it can be referenced
     * using a selector in the TSDoc declaration reference notation.
     *
     * @remarks
     * TODO: The `{@label}` notation is still being standardized.  See this issue:
     * https://github.com/microsoft/tsdoc/issues/9
     */
    static readonly label: TSDocTagDefinition;
    /**
     * (Core)
     *
     * The `{@link}` inline tag is used to create hyperlinks to other pages in a
     * documentation system or general internet URLs.  In particular, it supports
     * expressions for referencing API items.
     *
     * @remarks
     * TODO: The `{@link}` notation is still being standardized.  See this issue:
     * https://github.com/microsoft/tsdoc/issues/9
     */
    static readonly link: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This modifier has similar semantics to the `override` keyword in C# or Java.
     * For a member function or property, explicitly indicates that this definition
     * is overriding (i.e. redefining) the definition inherited from the base class.
     * The base class definition would normally be marked as `virtual`.
     *
     * @remarks
     * A documentation tool may enforce that the `@virtual`, `@override`, and/or `@sealed`
     * modifiers are consistently applied, but this is not required by the TSDoc standard.
     */
    static readonly override: TSDocTagDefinition;
    /**
     * (Core)
     *
     * Used to indicate a doc comment that describes an entire NPM package (as opposed
     * to an individual API item belonging to that package).  The `@packageDocumentation` comment
     * is found in the *.d.ts file that acts as the entry point for the package, and it
     * should be the first `/**` comment encountered in that file.  A comment containing a
     * `@packageDocumentation` tag should never be used to describe an individual API item.
     */
    static readonly packageDocumentation: TSDocTagDefinition;
    /**
     * (Core)
     *
     * Used to document a function parameter.  The `@param` tag is followed by a parameter
     * name, followed by a hyphen, followed by a description.  The TSDoc parser recognizes
     * this syntax and will extract it into a DocParamBlock node.
     */
    static readonly param: TSDocTagDefinition;
    /**
     * (Core)
     *
     * Starts a section of additional documentation content that is not intended for a
     * public audience.  A tool must omit this entire section from the API reference web site,
     * generated *.d.ts file, and any other outputs incorporating the content.
     */
    static readonly privateRemarks: TSDocTagDefinition;
    /**
     * (Discretionary)
     *
     * Suggested meaning: Designates that an API item's release stage is "public".
     * It has been officially released to third-party developers, and its signature is
     * guaranteed to be stable (e.g. following Semantic Versioning rules).
     *
     * @remarks
     * Example implementations: API Extractor
     */
    static readonly public: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This modifier tag indicates that an API item should be documented as being read-only,
     * even if the TypeScript type system may indicate otherwise.  For example, suppose a
     * class property has a setter function that always throws an exception explaining that
     * the property cannot be assigned; in this situation, the `@readonly` modifier can be
     * added so that the property is shown as read-only in the documentation.
     *
     * @remarks
     * Example implementations: API Extractor
     */
    static readonly readonly: TSDocTagDefinition;
    /**
     * (Core)
     *
     * The main documentation for an API item is separated into a brief "summary" section,
     * optionally followed by a more detailed "remarks" section.  On a documentation web site,
     * index pages (e.g. showing members of a class) will show only the brief summaries,
     * whereas a detail pages (e.g. describing a single member) will show the summary followed
     * by the remarks.  The `@remarks` block tag ends the summary section, and begins the
     * remarks section for a doc comment.
     */
    static readonly remarks: TSDocTagDefinition;
    /**
     * (Core)
     *
     * Used to document the return value for a function.
     */
    static readonly returns: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This modifier has similar semantics to the `sealed` keyword in C# or Java.
     * For a class, indicates that subclasses must not inherit from the class.
     * For a member function or property, indicates that subclasses must not override
     * (i.e. redefine) the member.
     *
     * @remarks
     * A documentation tool may enforce that the `@virtual`, `@override`, and/or `@sealed`
     * modifiers are consistently applied, but this is not required by the TSDoc standard.
     */
    static readonly sealed: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * Used to build a list of references to an API item or other resource that may be related to the
     * current item.
     *
     * @remarks
     *
     * For example:
     *
     * ```ts
     * /**
     *  * Parses a string containing a Uniform Resource Locator (URL).
     *  * @see {@link ParsedUrl} for the returned data structure
     *  * @see {@link https://tools.ietf.org/html/rfc1738|RFC 1738}
     *  * for syntax
     *  * @see your developer SDK for code samples
     *  * @param url - the string to be parsed
     *  * @returns the parsed result
     *  &#42;/
     * function parseURL(url: string): ParsedUrl;
     * ```
     *
     * `@see` is a block tag.  Each block becomes an item in the list of references.  For example, a documentation
     * system might render the above blocks as follows:
     *
     * ```markdown
     * `function parseURL(url: string): ParsedUrl;`
     *
     * Parses a string containing a Uniform Resource Locator (URL).
     *
     * ## See Also
     * - ParsedUrl for the returned data structure
     * - RFC 1738 for syntax
     * - your developer SDK for code samples
     * ```
     *
     * NOTE: JSDoc attempts to automatically hyperlink the text immediately after `@see`.  Because this is ambiguous
     * with plain text, TSDoc instead requires an explicit `{@link}` tag to make hyperlinks.
     */
    static readonly see: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * Used to document an exception type that may be thrown by a function or property.
     *
     * @remarks
     *
     * A separate `@throws` block should be used to document each exception type.  This tag is for informational
     * purposes only, and does not restrict other types from being thrown.  It is suggested, but not required,
     * for the `@throws` block to start with a line containing only the name of the exception.
     *
     * For example:
     *
     * ```ts
     * /**
     *  * Retrieves metadata about a book from the catalog.
     *  *
     *  * @param isbnCode - the ISBN number for the book
     *  * @returns the retrieved book object
     *  *
     *  * @throws {@link IsbnSyntaxError}
     *  * This exception is thrown if the input is not a valid ISBN number.
     *  *
     *  * @throws {@link book-lib#BookNotFoundError}
     *  * Thrown if the ISBN number is valid, but no such book exists in the catalog.
     *  *
     *  * @public
     *  &#42;/
     * function fetchBookByIsbn(isbnCode: string): Book;
     * ```
     */
    static readonly throws: TSDocTagDefinition;
    /**
     * (Core)
     *
     * Used to document a generic parameter.  The `@typeParam` tag is followed by a parameter
     * name, followed by a hyphen, followed by a description.  The TSDoc parser recognizes
     * this syntax and will extract it into a DocParamBlock node.
     */
    static readonly typeParam: TSDocTagDefinition;
    /**
     * (Extended)
     *
     * This modifier has similar semantics to the `virtual` keyword in C# or Java.
     * For a member function or property, explicitly indicates that subclasses may override
     * (i.e. redefine) the member.
     *
     * @remarks
     * A documentation tool may enforce that the `@virtual`, `@override`, and/or `@sealed`
     * modifiers are consistently applied, but this is not required by the TSDoc standard.
     */
    static readonly virtual: TSDocTagDefinition;
    /**
     * Returns the full list of all core tags.
     */
    static allDefinitions: ReadonlyArray<TSDocTagDefinition>;
    private static _defineTag;
}
//# sourceMappingURL=StandardTags.d.ts.map