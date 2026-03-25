// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/**
 * Unique identifiers for messages reported by the TSDoc parser.
 *
 * @remarks
 *
 * These strings are possible values for the {@link ParserMessage.messageId} property.
 * These identifiers can be used to suppress or configure the reporting of individual messages.
 * They are also useful when searching for help about a particular error.
 *
 * @public
 */
export var TSDocMessageId;
(function (TSDocMessageId) {
    /**
     * File not found
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when it failed to find a `tsdoc.json` file.
     */
    TSDocMessageId["ConfigFileNotFound"] = "tsdoc-config-file-not-found";
    /**
     * Error parsing JSON input: ___
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when the `tsdoc.json` file has invalid JSON syntax.
     */
    TSDocMessageId["ConfigInvalidJson"] = "tsdoc-config-invalid-json";
    /**
     * Unsupported JSON "$schema" value
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when the file format is not supported.
     */
    TSDocMessageId["ConfigFileUnsupportedSchema"] = "tsdoc-config-unsupported-schema";
    /**
     * Error loading config file: ___
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when the config file doesn't conform to its schema.
     */
    TSDocMessageId["ConfigFileSchemaError"] = "tsdoc-config-schema-error";
    /**
     * Circular reference encountered for "extends" field of "___"
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when the "extends" field creates a chain of references
     * that causes a file to indirectly extend itself.
     */
    TSDocMessageId["ConfigFileCyclicExtends"] = "tsdoc-config-cyclic-extends";
    /**
     * Unable to resolve "extends" reference to "___"
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when module resolution fails for the "extends" field.
     */
    TSDocMessageId["ConfigFileUnresolvedExtends"] = "tsdoc-config-unresolved-extends";
    /**
     * The "supportForTags" field refers to an undefined tag "___".
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when loading the tsdoc.json config file.
     */
    TSDocMessageId["ConfigFileUndefinedTag"] = "tsdoc-config-undefined-tag";
    /**
     * The "tagDefinitions" field specifies more than one tag with the name "___".
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when loading the tsdoc.json config file.
     */
    TSDocMessageId["ConfigFileDuplicateTagName"] = "tsdoc-config-duplicate-tag-name";
    /**
     * A TSDoc tag name must start with a letter and contain only letters and numbers.
     * @remarks
     * Reported by the `@microsoft/tsdoc-config` package when loading the tsdoc.json config file.
     */
    TSDocMessageId["ConfigFileInvalidTagName"] = "tsdoc-config-invalid-tag-name";
    /**
     * Expecting a `/**` comment.
     * Unexpected end of input.
     */
    TSDocMessageId["CommentNotFound"] = "tsdoc-comment-not-found";
    /**
     * Expecting a leading `/**`
     */
    TSDocMessageId["CommentOpeningDelimiterSyntax"] = "tsdoc-comment-missing-opening-delimiter";
    /**
     * Unexpected end of input.
     */
    TSDocMessageId["CommentMissingClosingDelimiter"] = "tsdoc-comment-missing-closing-delimiter";
    /**
     * A doc comment cannot have more than one `@inheritDoc` tag
     */
    TSDocMessageId["ExtraInheritDocTag"] = "tsdoc-extra-inheritdoc-tag";
    /**
     * The `}` character should be escaped using a backslash to avoid confusion with a TSDoc inline tag.
     */
    TSDocMessageId["EscapeRightBrace"] = "tsdoc-escape-right-brace";
    /**
     * The `>` character should be escaped using a backslash to avoid confusion with an HTML tag.
     */
    TSDocMessageId["EscapeGreaterThan"] = "tsdoc-escape-greater-than";
    /**
     * The ___ block must include a deprecation message, e.g. describing the recommended alternative.
     */
    TSDocMessageId["MissingDeprecationMessage"] = "tsdoc-missing-deprecation-message";
    /**
     * A ___ block must not be used, because that content is provided by the `@inheritDoc` tag.
     */
    TSDocMessageId["InheritDocIncompatibleTag"] = "tsdoc-inheritdoc-incompatible-tag";
    /**
     * The summary section must not have any content, because that content is provided by the `@inheritDoc` tag.
     */
    TSDocMessageId["InheritDocIncompatibleSummary"] = "tsdoc-inheritdoc-incompatible-summary";
    /**
     * The TSDoc tag ___ is an inline tag; it must be enclosed in `{ }` braces.
     */
    TSDocMessageId["InlineTagMissingBraces"] = "tsdoc-inline-tag-missing-braces";
    /**
     * The TSDoc tag ___ is not an inline tag; it must not be enclosed in `{ }` braces.
     */
    TSDocMessageId["TagShouldNotHaveBraces"] = "tsdoc-tag-should-not-have-braces";
    /**
     * The TSDoc tag ___ is not supported by this tool.
     */
    TSDocMessageId["UnsupportedTag"] = "tsdoc-unsupported-tag";
    /**
     * The TSDoc tag ___ is not defined in this configuration.
     */
    TSDocMessageId["UndefinedTag"] = "tsdoc-undefined-tag";
    /**
     * The `@param` block should not include a JSDoc-style `{type}`.
     */
    TSDocMessageId["ParamTagWithInvalidType"] = "tsdoc-param-tag-with-invalid-type";
    /**
     * The `@param` block should not include a JSDoc-style optional name; it must not be enclosed in `[ ]` brackets.
     */
    TSDocMessageId["ParamTagWithInvalidOptionalName"] = "tsdoc-param-tag-with-invalid-optional-name";
    /**
     * The `@param` block should be followed by a parameter name.
     */
    TSDocMessageId["ParamTagWithInvalidName"] = "tsdoc-param-tag-with-invalid-name";
    /**
     * The `@param` block should be followed by a parameter name and then a hyphen.
     */
    TSDocMessageId["ParamTagMissingHyphen"] = "tsdoc-param-tag-missing-hyphen";
    /**
     * A backslash must precede another character that is being escaped.  OR
     * A backslash can only be used to escape a punctuation character.
     */
    TSDocMessageId["UnnecessaryBackslash"] = "tsdoc-unnecessary-backslash";
    /**
     * Expecting a TSDoc tag starting with `@`.  OR
     * Expecting a TSDoc tag starting with `{`.
     */
    TSDocMessageId["MissingTag"] = "tsdoc-missing-tag";
    /**
     * The `@` character looks like part of a TSDoc tag; use a backslash to escape it.
     */
    TSDocMessageId["AtSignInWord"] = "tsdoc-at-sign-in-word";
    /**
     * Expecting a TSDoc tag name after `@`; if it is not a tag, use a backslash to escape this character.
     */
    TSDocMessageId["AtSignWithoutTagName"] = "tsdoc-at-sign-without-tag-name";
    /**
     * Expecting a TSDoc tag starting with `{@`.  OR
     * Expecting a TSDoc inline tag name after the `{@` characters.
     */
    TSDocMessageId["MalformedInlineTag"] = "tsdoc-malformed-inline-tag";
    /**
     * The token ___ looks like a TSDoc tag but contains an invalid character ___; if it is not a tag,
     * use a backslash to escape the `@`.
     */
    TSDocMessageId["CharactersAfterBlockTag"] = "tsdoc-characters-after-block-tag";
    /**
     * A TSDoc tag name must start with a letter and contain only letters and numbers.
     */
    TSDocMessageId["MalformedTagName"] = "tsdoc-malformed-tag-name";
    /**
     * The character ___ cannot appear after the TSDoc tag name; expecting a space.
     */
    TSDocMessageId["CharactersAfterInlineTag"] = "tsdoc-characters-after-inline-tag";
    /**
     * The TSDoc inline tag name is missing its closing `}`.
     */
    TSDocMessageId["InlineTagMissingRightBrace"] = "tsdoc-inline-tag-missing-right-brace";
    /**
     * The `{` character must be escaped with a backslash when used inside a TSDoc inline tag.
     */
    TSDocMessageId["InlineTagUnescapedBrace"] = "tsdoc-inline-tag-unescaped-brace";
    /**
     * Unexpected character after declaration reference.
     */
    TSDocMessageId["InheritDocTagSyntax"] = "tsdoc-inheritdoc-tag-syntax";
    /**
     * The `@link` tag content is missing.
     */
    TSDocMessageId["LinkTagEmpty"] = "tsdoc-link-tag-empty";
    /**
     * The ___ character may not be used in the link text without escaping it.
     */
    TSDocMessageId["LinkTagUnescapedText"] = "tsdoc-link-tag-unescaped-text";
    /**
     * Unexpected character after link destination.
     */
    TSDocMessageId["LinkTagDestinationSyntax"] = "tsdoc-link-tag-destination-syntax";
    /**
     * The URL cannot be empty.  OR
     * An `@link` URL must begin with a scheme comprised only of letters and numbers followed by `://`.  OR
     * An `@link` URL must have at least one character after `://`.
     */
    TSDocMessageId["LinkTagInvalidUrl"] = "tsdoc-link-tag-invalid-url";
    /**
     * The declaration reference appears to contain a package name or import path, but it is missing the `#` delimiter.
     */
    TSDocMessageId["ReferenceMissingHash"] = "tsdoc-reference-missing-hash";
    /**
     * The hash character must be preceded by a package name or import path.
     */
    TSDocMessageId["ReferenceHashSyntax"] = "tsdoc-reference-hash-syntax";
    /**
     * The package name cannot be an empty string.  OR
     * The package name ___ is not a valid package name.
     */
    TSDocMessageId["ReferenceMalformedPackageName"] = "tsdoc-reference-malformed-package-name";
    /**
     * An import path must not contain `//`.  OR
     * An import path must not end with `/`.  OR
     * An import path must not start with `/` unless prefixed by a package name.
     */
    TSDocMessageId["ReferenceMalformedImportPath"] = "tsdoc-reference-malformed-import-path";
    /**
     * Expecting a declaration reference.
     */
    TSDocMessageId["MissingReference"] = "tsdoc-missing-reference";
    /**
     * Expecting a period before the next component of a declaration reference
     */
    TSDocMessageId["ReferenceMissingDot"] = "tsdoc-reference-missing-dot";
    /**
     * Syntax error in declaration reference: the member selector must be enclosed in parentheses.
     */
    TSDocMessageId["ReferenceSelectorMissingParens"] = "tsdoc-reference-selector-missing-parens";
    /**
     * Expecting a colon after the identifier because the expression is in parentheses.
     */
    TSDocMessageId["ReferenceMissingColon"] = "tsdoc-reference-missing-colon";
    /**
     * Expecting a matching right parenthesis.
     */
    TSDocMessageId["ReferenceMissingRightParen"] = "tsdoc-reference-missing-right-paren";
    /**
     * Missing declaration reference in symbol reference
     */
    TSDocMessageId["ReferenceSymbolSyntax"] = "tsdoc-reference-symbol-syntax";
    /**
     * Missing closing square bracket for symbol reference
     */
    TSDocMessageId["ReferenceMissingRightBracket"] = "tsdoc-reference-missing-right-bracket";
    /**
     * Unexpected end of input inside quoted member identifier.
     */
    TSDocMessageId["ReferenceMissingQuote"] = "tsdoc-reference-missing-quote";
    /**
     * The quoted identifier cannot be empty.
     */
    TSDocMessageId["ReferenceEmptyIdentifier"] = "tsdoc-reference-empty-identifier";
    /**
     * Syntax error in declaration reference: expecting a member identifier.
     */
    TSDocMessageId["ReferenceMissingIdentifier"] = "tsdoc-reference-missing-identifier";
    /**
     * The identifier cannot be an empty string. OR
     * The identifier cannot non-word characters. OR
     * The identifier must not start with a number. OR
     * The identifier ___ must be quoted because it is a TSDoc system selector name.
     */
    TSDocMessageId["ReferenceUnquotedIdentifier"] = "tsdoc-reference-unquoted-identifier";
    /**
     * Expecting a selector label after the colon.
     */
    TSDocMessageId["ReferenceMissingLabel"] = "tsdoc-reference-missing-label";
    /**
     * The selector cannot be an empty string.  OR
     * If the selector begins with a number, it must be a positive integer value.  OR
     * A label selector must be comprised of upper case letters, numbers, and underscores
     * and must not start with a number.  OR
     * The selector ___ is not a recognized TSDoc system selector name.
     */
    TSDocMessageId["ReferenceSelectorSyntax"] = "tsdoc-reference-selector-syntax";
    /**
     * Expecting an attribute or `>` or `/>`.
     */
    TSDocMessageId["HtmlTagMissingGreaterThan"] = "tsdoc-html-tag-missing-greater-than";
    /**
     * Expecting `=` after HTML attribute name.
     */
    TSDocMessageId["HtmlTagMissingEquals"] = "tsdoc-html-tag-missing-equals";
    /**
     * Expecting an HTML string starting with a single-quote or double-quote character.
     */
    TSDocMessageId["HtmlTagMissingString"] = "tsdoc-html-tag-missing-string";
    /**
     * The HTML string is missing its closing quote.
     */
    TSDocMessageId["HtmlStringMissingQuote"] = "tsdoc-html-string-missing-quote";
    /**
     * The next character after a closing quote must be spacing or punctuation.
     */
    TSDocMessageId["TextAfterHtmlString"] = "tsdoc-text-after-html-string";
    /**
     * Expecting an HTML tag starting with `</`.
     */
    TSDocMessageId["MissingHtmlEndTag"] = "tsdoc-missing-html-end-tag";
    /**
     * A space is not allowed here.  OR
     * Expecting an HTML name.  OR
     * An HTML name must be a sequence of letters separated by hyphens.
     */
    TSDocMessageId["MalformedHtmlName"] = "tsdoc-malformed-html-name";
    /**
     * This HTML element name is not defined by your TSDoc configuration.
     */
    TSDocMessageId["UnsupportedHtmlElementName"] = "tsdoc-unsupported-html-name";
    /**
     * The opening backtick for a code fence must appear at the start of the line.
     */
    TSDocMessageId["CodeFenceOpeningIndent"] = "tsdoc-code-fence-opening-indent";
    /**
     * The language specifier cannot contain backtick characters.
     */
    TSDocMessageId["CodeFenceSpecifierSyntax"] = "tsdoc-code-fence-specifier-syntax";
    /**
     * The closing delimiter for a code fence must not be indented.
     */
    TSDocMessageId["CodeFenceClosingIndent"] = "tsdoc-code-fence-closing-indent";
    /**
     * Missing closing delimiter.
     */
    TSDocMessageId["CodeFenceMissingDelimiter"] = "tsdoc-code-fence-missing-delimiter";
    /**
     * Unexpected characters after closing delimiter for code fence.
     */
    TSDocMessageId["CodeFenceClosingSyntax"] = "tsdoc-code-fence-closing-syntax";
    /**
     * A code span must contain at least one character between the backticks.
     */
    TSDocMessageId["CodeSpanEmpty"] = "tsdoc-code-span-empty";
    /**
     * The code span is missing its closing backtick.
     */
    TSDocMessageId["CodeSpanMissingDelimiter"] = "tsdoc-code-span-missing-delimiter";
})(TSDocMessageId || (TSDocMessageId = {}));
// Exposed via TSDocConfiguration.allTsdocMessageIds()
export var allTsdocMessageIds = [
    // To make comparisons easy, keep these in the same order as the enum above:
    'tsdoc-config-file-not-found',
    'tsdoc-config-invalid-json',
    'tsdoc-config-unsupported-schema',
    'tsdoc-config-schema-error',
    'tsdoc-config-cyclic-extends',
    'tsdoc-config-unresolved-extends',
    'tsdoc-config-undefined-tag',
    'tsdoc-config-duplicate-tag-name',
    'tsdoc-config-invalid-tag-name',
    'tsdoc-comment-not-found',
    'tsdoc-comment-missing-opening-delimiter',
    'tsdoc-comment-missing-closing-delimiter',
    'tsdoc-extra-inheritdoc-tag',
    'tsdoc-escape-right-brace',
    'tsdoc-escape-greater-than',
    'tsdoc-missing-deprecation-message',
    'tsdoc-inheritdoc-incompatible-tag',
    'tsdoc-inheritdoc-incompatible-summary',
    'tsdoc-inline-tag-missing-braces',
    'tsdoc-tag-should-not-have-braces',
    'tsdoc-unsupported-tag',
    'tsdoc-undefined-tag',
    'tsdoc-param-tag-with-invalid-type',
    'tsdoc-param-tag-with-invalid-optional-name',
    'tsdoc-param-tag-with-invalid-name',
    'tsdoc-param-tag-missing-hyphen',
    'tsdoc-unnecessary-backslash',
    'tsdoc-missing-tag',
    'tsdoc-at-sign-in-word',
    'tsdoc-at-sign-without-tag-name',
    'tsdoc-malformed-inline-tag',
    'tsdoc-characters-after-block-tag',
    'tsdoc-malformed-tag-name',
    'tsdoc-characters-after-inline-tag',
    'tsdoc-inline-tag-missing-right-brace',
    'tsdoc-inline-tag-unescaped-brace',
    'tsdoc-inheritdoc-tag-syntax',
    'tsdoc-link-tag-empty',
    'tsdoc-link-tag-unescaped-text',
    'tsdoc-link-tag-destination-syntax',
    'tsdoc-link-tag-invalid-url',
    'tsdoc-reference-missing-hash',
    'tsdoc-reference-hash-syntax',
    'tsdoc-reference-malformed-package-name',
    'tsdoc-reference-malformed-import-path',
    'tsdoc-missing-reference',
    'tsdoc-reference-missing-dot',
    'tsdoc-reference-selector-missing-parens',
    'tsdoc-reference-missing-colon',
    'tsdoc-reference-missing-right-paren',
    'tsdoc-reference-symbol-syntax',
    'tsdoc-reference-missing-right-bracket',
    'tsdoc-reference-missing-quote',
    'tsdoc-reference-empty-identifier',
    'tsdoc-reference-missing-identifier',
    'tsdoc-reference-unquoted-identifier',
    'tsdoc-reference-missing-label',
    'tsdoc-reference-selector-syntax',
    'tsdoc-html-tag-missing-greater-than',
    'tsdoc-html-tag-missing-equals',
    'tsdoc-html-tag-missing-string',
    'tsdoc-html-string-missing-quote',
    'tsdoc-text-after-html-string',
    'tsdoc-missing-html-end-tag',
    'tsdoc-malformed-html-name',
    'tsdoc-code-fence-opening-indent',
    'tsdoc-code-fence-specifier-syntax',
    'tsdoc-code-fence-closing-indent',
    'tsdoc-code-fence-missing-delimiter',
    'tsdoc-code-fence-closing-syntax',
    'tsdoc-code-span-empty',
    'tsdoc-code-span-missing-delimiter'
];
allTsdocMessageIds.sort();
export var allTsdocMessageIdsSet = new Set(allTsdocMessageIds);
//# sourceMappingURL=TSDocMessageId.js.map