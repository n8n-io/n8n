// @generated
// This code is automatically generated. Manual editing is not recommended.
/*
 * BSD-2-Clause License
 *
 * Original source code is copyright (c) 2025 Remy Rylan
 * <https://github.com/RemyRylan>
 *
 * Documentation and keyword descriptions are copyright (c) 2019 IETF Trust
 * <https://www.ietf.org/>, Austin Wright <aaa@bzfx.net>, Henry Andrews
 * <andrews_henry@yahoo.com>, Ben Hutton <bh7@sanger.ac.uk>, and Greg Dennis
 * <gregsdennis@yahoo.com>. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
export const draft = "2019-09";
export const $schema = "https://json-schema.org/draft/2019-09/schema";
// -----------------------------------------------------------------------------
/**
 * Content encoding strategy enum.
 *
 * - [Content-Transfer-Encoding Syntax](https://datatracker.ietf.org/doc/html/rfc2045#section-6.1)
 * - [7bit vs 8bit encoding](https://stackoverflow.com/questions/25710599/content-transfer-encoding-7bit-or-8-bit/28531705#28531705)
 */
export var ContentEncoding;
(function (ContentEncoding) {
    /**
     * Only US-ASCII characters, which use the lower 7 bits for each character.
     *
     * Each line must be less than 1,000 characters.
     */
    ContentEncoding["7bit"] = "7bit";
    /**
     * Allow extended ASCII characters which can use the 8th (highest) bit to
     * indicate special characters not available in 7bit.
     *
     * Each line must be less than 1,000 characters.
     */
    ContentEncoding["8bit"] = "8bit";
    /**
     * Useful for data that is mostly non-text.
     */
    ContentEncoding["Base64"] = "base64";
    /**
     * Same character set as 8bit, with no line length restriction.
     */
    ContentEncoding["Binary"] = "binary";
    /**
     * An extension token defined by a standards-track RFC and registered with
     * IANA.
     */
    ContentEncoding["IETFToken"] = "ietf-token";
    /**
     * Lines are limited to 76 characters, and line breaks are represented using
     * special characters that are escaped.
     */
    ContentEncoding["QuotedPrintable"] = "quoted-printable";
    /**
     * The two characters "X-" or "x-" followed, with no intervening white space,
     * by any token.
     */
    ContentEncoding["XToken"] = "x-token";
})(ContentEncoding || (ContentEncoding = {}));
/**
 * This enum provides well-known formats that apply to strings.
 */
export var Format;
(function (Format) {
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "full-date" production in
     * [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    Format["Date"] = "date";
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "date-time" production in
     * [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    Format["DateTime"] = "date-time";
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "duration" production.
     */
    Format["Duration"] = "duration";
    /**
     * A string instance is valid against this attribute if it is a valid Internet
     * email address as defined by [RFC 5322, section 3.4.1][RFC5322].
     *
     * [RFC5322]: https://datatracker.ietf.org/doc/html/rfc5322
     */
    Format["Email"] = "email";
    /**
     * As defined by [RFC 1123, section 2.1][RFC1123], including host names
     * produced using the Punycode algorithm specified in
     * [RFC 5891, section 4.4][RFC5891].
     *
     * [RFC1123]: https://datatracker.ietf.org/doc/html/rfc1123
     * [RFC5891]: https://datatracker.ietf.org/doc/html/rfc5891
     */
    Format["Hostname"] = "hostname";
    /**
     * A string instance is valid against this attribute if it is a valid Internet
     * email address as defined by [RFC 6531][RFC6531].
     *
     * [RFC6531]: https://datatracker.ietf.org/doc/html/rfc6531
     */
    Format["IDNEmail"] = "idn-email";
    /**
     * As defined by either [RFC 1123, section 2.1][RFC1123] as for hostname, or
     * an internationalized hostname as defined by
     * [RFC 5890, section 2.3.2.3][RFC5890].
     *
     * [RFC1123]: https://datatracker.ietf.org/doc/html/rfc1123
     * [RFC5890]: https://datatracker.ietf.org/doc/html/rfc5890
     */
    Format["IDNHostname"] = "idn-hostname";
    /**
     * An IPv4 address according to the "dotted-quad" ABNF syntax as defined in
     * [RFC 2673, section 3.2][RFC2673].
     *
     * [RFC2673]: https://datatracker.ietf.org/doc/html/rfc2673
     */
    Format["IPv4"] = "ipv4";
    /**
     * An IPv6 address as defined in [RFC 4291, section 2.2][RFC4291].
     *
     * [RFC4291]: https://datatracker.ietf.org/doc/html/rfc4291
     */
    Format["IPv6"] = "ipv6";
    /**
     * A string instance is valid against this attribute if it is a valid IRI,
     * according to [RFC 3987][RFC3987].
     *
     * [RFC3987]: https://datatracker.ietf.org/doc/html/rfc3987
     */
    Format["IRI"] = "iri";
    /**
     * A string instance is valid against this attribute if it is a valid IRI
     * Reference (either an IRI or a relative-reference), according to
     * [RFC 3987][RFC3987].
     *
     * [RFC3987]: https://datatracker.ietf.org/doc/html/rfc3987
     */
    Format["IRIReference"] = "iri-reference";
    /**
     * A string instance is valid against this attribute if it is a valid JSON
     * string representation of a JSON Pointer, according to
     * [RFC 6901, section 5][RFC6901].
     *
     * [RFC6901]: https://datatracker.ietf.org/doc/html/rfc6901
     */
    Format["JSONPointer"] = "json-pointer";
    /**
     * A string instance is valid against this attribute if it is a valid JSON
     * string representation of a JSON Pointer fragment, according to
     * [RFC 6901, section 5][RFC6901].
     *
     * [RFC6901]: https://datatracker.ietf.org/doc/html/rfc6901
     */
    Format["JSONPointerURIFragment"] = "json-pointer-uri-fragment";
    /**
     * This attribute applies to string instances.
     *
     * A regular expression, which SHOULD be valid according to the
     * [ECMA-262][ecma262] regular expression dialect.
     *
     * Implementations that validate formats MUST accept at least the subset of
     * [ECMA-262][ecma262] defined in the [Regular Expressions][regexInterop]
     * section of this specification, and SHOULD accept all valid
     * [ECMA-262][ecma262] expressions.
     *
     * [ecma262]: https://www.ecma-international.org/publications-and-standards/standards/ecma-262/
     * [regexInterop]: https://json-schema.org/draft/2019-09/json-schema-validation.html#regexInterop
     */
    Format["RegEx"] = "regex";
    /**
     * A string instance is valid against this attribute if it is a valid
     * [Relative JSON Pointer][relative-json-pointer].
     *
     * [relative-json-pointer]: https://datatracker.ietf.org/doc/html/draft-handrews-relative-json-pointer-01
     */
    Format["RelativeJSONPointer"] = "relative-json-pointer";
    /**
     * A string instance is valid against this attribute if it is a valid
     * representation according to the "time" production in [RFC 3339][RFC3339].
     *
     * [RFC3339]: https://datatracker.ietf.org/doc/html/rfc3339
     */
    Format["Time"] = "time";
    /**
     * A string instance is valid against this attribute if it is a valid URI,
     * according to [RFC3986][RFC3986].
     *
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     */
    Format["URI"] = "uri";
    /**
     * A string instance is valid against this attribute if it is a valid URI
     * Reference (either a URI or a relative-reference), according to
     * [RFC3986][RFC3986].
     *
     * [RFC3986]: https://datatracker.ietf.org/doc/html/rfc3986
     */
    Format["URIReference"] = "uri-reference";
    /**
     * A string instance is valid against this attribute if it is a valid URI
     * Template (of any level), according to [RFC 6570][RFC6570].
     *
     * Note that URI Templates may be used for IRIs; there is no separate IRI
     * Template specification.
     *
     * [RFC6570]: https://datatracker.ietf.org/doc/html/rfc6570
     */
    Format["URITemplate"] = "uri-template";
    /**
     * A string instance is valid against this attribute if it is a valid string
     * representation of a UUID, according to [RFC 4122][RFC4122].
     *
     * [RFC4122]: https://datatracker.ietf.org/doc/html/rfc4122
     */
    Format["UUID"] = "uuid";
})(Format || (Format = {}));
/**
 * Enum consisting of simple type names for the `type` keyword
 */
export var TypeName;
(function (TypeName) {
    /**
     * Value MUST be an array.
     */
    TypeName["Array"] = "array";
    /**
     * Value MUST be a boolean.
     */
    TypeName["Boolean"] = "boolean";
    /**
     * Value MUST be an integer, no floating point numbers are allowed. This is a
     * subset of the number type.
     */
    TypeName["Integer"] = "integer";
    /**
     * Value MUST be null. Note this is mainly for purpose of being able use union
     * types to define nullability. If this type is not included in a union, null
     * values are not allowed (the primitives listed above do not allow nulls on
     * their own).
     */
    TypeName["Null"] = "null";
    /**
     * Value MUST be a number, floating point numbers are allowed.
     */
    TypeName["Number"] = "number";
    /**
     * Value MUST be an object.
     */
    TypeName["Object"] = "object";
    /**
     * Value MUST be a string.
     */
    TypeName["String"] = "string";
})(TypeName || (TypeName = {}));
// -----------------------------------------------------------------------------
// Keywords
// -----------------------------------------------------------------------------
export const keywords = [
    "$anchor",
    "$comment",
    "$defs",
    "$id",
    "$recursiveAnchor",
    "$recursiveRef",
    "$ref",
    "$schema",
    "$vocabulary",
    "additionalItems",
    "additionalProperties",
    "allOf",
    "anyOf",
    "const",
    "contains",
    "contentEncoding",
    "contentMediaType",
    "contentSchema",
    "default",
    "definitions",
    "dependencies",
    "dependentRequired",
    "dependentSchemas",
    "deprecated",
    "description",
    "else",
    "enum",
    "examples",
    "exclusiveMaximum",
    "exclusiveMinimum",
    "format",
    "if",
    "items",
    "maxContains",
    "maximum",
    "maxItems",
    "maxLength",
    "maxProperties",
    "minContains",
    "minimum",
    "minItems",
    "minLength",
    "minProperties",
    "multipleOf",
    "not",
    "oneOf",
    "pattern",
    "patternProperties",
    "properties",
    "propertyNames",
    "readOnly",
    "required",
    "then",
    "title",
    "type",
    "unevaluatedItems",
    "unevaluatedProperties",
    "uniqueItems",
    "writeOnly",
];
