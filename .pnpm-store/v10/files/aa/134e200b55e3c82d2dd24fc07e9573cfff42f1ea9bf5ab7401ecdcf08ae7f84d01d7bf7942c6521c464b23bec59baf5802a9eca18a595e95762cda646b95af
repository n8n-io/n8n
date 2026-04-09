"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardTags = void 0;
const TSDocTagDefinition_1 = require("../configuration/TSDocTagDefinition");
const Standardization_1 = require("./Standardization");
/**
 * Tags whose meaning is defined by the TSDoc standard.
 */
class StandardTags {
    static _defineTag(parameters) {
        return new TSDocTagDefinition_1.TSDocTagDefinition(parameters);
    }
}
exports.StandardTags = StandardTags;
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
StandardTags.alpha = StandardTags._defineTag({
    tagName: '@alpha',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Discretionary
});
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
StandardTags.beta = StandardTags._defineTag({
    tagName: '@beta',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Discretionary
});
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
StandardTags.decorator = StandardTags._defineTag({
    tagName: '@decorator',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * This block tag is used to document the default value for a field or property,
 * if a value is not assigned explicitly.
 *
 * @remarks
 * This tag should only be used with fields or properties that are members of a class or interface.
 */
StandardTags.defaultValue = StandardTags._defineTag({
    tagName: '@defaultValue',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Core)
 *
 * This block tag communicates that an API item is no longer supported and may be removed
 * in a future release.  The `@deprecated` tag is followed by a sentence describing
 * the recommended alternative.  It recursively applies to members of the container.
 * For example, if a class is deprecated, then so are all of its members.
 */
StandardTags.deprecated = StandardTags._defineTag({
    tagName: '@deprecated',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Core
});
/**
 * (Extended)
 *
 * When applied to a class or interface property, this indicates that the property
 * returns an event object that event handlers can be attached to.  The event-handling
 * API is implementation-defined, but typically the property return type would be a class
 * with members such as `addHandler()` and `removeHandler()`.  A documentation tool can
 * display such properties under an "Events" heading instead of the usual "Properties" heading.
 */
StandardTags.eventProperty = StandardTags._defineTag({
    tagName: '@eventProperty',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * Indicates a documentation section that should be presented as an example
 * illustrating how to use the API.  It may include a code sample.
 */
StandardTags.example = StandardTags._defineTag({
    tagName: '@example',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Extended
});
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
StandardTags.experimental = StandardTags._defineTag({
    tagName: '@experimental',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Discretionary
});
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
StandardTags.inheritDoc = StandardTags._defineTag({
    tagName: '@inheritDoc',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.InlineTag,
    standardization: Standardization_1.Standardization.Extended
});
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
StandardTags.internal = StandardTags._defineTag({
    tagName: '@internal',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Discretionary
});
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
StandardTags.label = StandardTags._defineTag({
    tagName: '@label',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.InlineTag,
    standardization: Standardization_1.Standardization.Core
});
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
StandardTags.link = StandardTags._defineTag({
    tagName: '@link',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.InlineTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Core
});
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
StandardTags.override = StandardTags._defineTag({
    tagName: '@override',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Core)
 *
 * Used to indicate a doc comment that describes an entire NPM package (as opposed
 * to an individual API item belonging to that package).  The `@packageDocumentation` comment
 * is found in the *.d.ts file that acts as the entry point for the package, and it
 * should be the first `/**` comment encountered in that file.  A comment containing a
 * `@packageDocumentation` tag should never be used to describe an individual API item.
 */
StandardTags.packageDocumentation = StandardTags._defineTag({
    tagName: '@packageDocumentation',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Core
});
/**
 * (Core)
 *
 * Used to document a function parameter.  The `@param` tag is followed by a parameter
 * name, followed by a hyphen, followed by a description.  The TSDoc parser recognizes
 * this syntax and will extract it into a DocParamBlock node.
 */
StandardTags.param = StandardTags._defineTag({
    tagName: '@param',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Core
});
/**
 * (Core)
 *
 * Starts a section of additional documentation content that is not intended for a
 * public audience.  A tool must omit this entire section from the API reference web site,
 * generated *.d.ts file, and any other outputs incorporating the content.
 */
StandardTags.privateRemarks = StandardTags._defineTag({
    tagName: '@privateRemarks',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Core
});
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
StandardTags.public = StandardTags._defineTag({
    tagName: '@public',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Discretionary
});
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
StandardTags.readonly = StandardTags._defineTag({
    tagName: '@readonly',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Extended
});
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
StandardTags.remarks = StandardTags._defineTag({
    tagName: '@remarks',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Core
});
/**
 * (Core)
 *
 * Used to document the return value for a function.
 */
StandardTags.returns = StandardTags._defineTag({
    tagName: '@returns',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Core
});
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
StandardTags.sealed = StandardTags._defineTag({
    tagName: '@sealed',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Extended
});
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
StandardTags.see = StandardTags._defineTag({
    tagName: '@see',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
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
StandardTags.throws = StandardTags._defineTag({
    tagName: '@throws',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Core)
 *
 * Used to document a generic parameter.  The `@typeParam` tag is followed by a parameter
 * name, followed by a hyphen, followed by a description.  The TSDoc parser recognizes
 * this syntax and will extract it into a DocParamBlock node.
 */
StandardTags.typeParam = StandardTags._defineTag({
    tagName: '@typeParam',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,
    standardization: Standardization_1.Standardization.Core
});
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
StandardTags.virtual = StandardTags._defineTag({
    tagName: '@virtual',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * Used to specify the JSX factory function to use when compiling JSX syntax.
 *
 * @remarks
 * The TypeScript compiler recognizes this tag and specifies its behavior:
 *
 * @see {@link https://www.typescriptlang.org/tsconfig/#jsx}
 */
StandardTags.jsx = StandardTags._defineTag({
    tagName: '@jsx',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * Used to specify the JSX runtime to use when compiling JSX syntax.
 *
 * @remarks
 * The TypeScript compiler recognizes this tag and specifies its behavior:
 *
 * @see {@link https://www.typescriptlang.org/tsconfig/#jsx}
 */
StandardTags.jsxRuntime = StandardTags._defineTag({
    tagName: '@jsxRuntime',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * Used to specify the JSX fragment factory to use when compiling JSX syntax.
 *
 * @remarks
 * The TypeScript compiler recognizes this tag and specifies its behavior:
 *
 * @see {@link https://www.typescriptlang.org/tsconfig/#jsx}
 */
StandardTags.jsxFrag = StandardTags._defineTag({
    tagName: '@jsxFrag',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * (Extended)
 *
 * Used to specify the JSX import source when compiling JSX syntax.
 *
 * @remarks
 * The TypeScript compiler recognizes this tag and specifies its behavior:
 *
 * @see {@link https://www.typescriptlang.org/tsconfig/#jsx}
 */
StandardTags.jsxImportSource = StandardTags._defineTag({
    tagName: '@jsxImportSource',
    syntaxKind: TSDocTagDefinition_1.TSDocTagSyntaxKind.BlockTag,
    standardization: Standardization_1.Standardization.Extended
});
/**
 * Returns the full list of all core tags.
 */
StandardTags.allDefinitions = [
    StandardTags.alpha,
    StandardTags.beta,
    StandardTags.defaultValue,
    StandardTags.decorator,
    StandardTags.deprecated,
    StandardTags.eventProperty,
    StandardTags.example,
    StandardTags.experimental,
    StandardTags.inheritDoc,
    StandardTags.internal,
    StandardTags.label,
    StandardTags.link,
    StandardTags.override,
    StandardTags.packageDocumentation,
    StandardTags.param,
    StandardTags.privateRemarks,
    StandardTags.public,
    StandardTags.readonly,
    StandardTags.remarks,
    StandardTags.returns,
    StandardTags.sealed,
    StandardTags.see,
    StandardTags.throws,
    StandardTags.typeParam,
    StandardTags.virtual,
    StandardTags.jsx,
    StandardTags.jsxRuntime,
    StandardTags.jsxFrag,
    StandardTags.jsxImportSource
];
//# sourceMappingURL=StandardTags.js.map