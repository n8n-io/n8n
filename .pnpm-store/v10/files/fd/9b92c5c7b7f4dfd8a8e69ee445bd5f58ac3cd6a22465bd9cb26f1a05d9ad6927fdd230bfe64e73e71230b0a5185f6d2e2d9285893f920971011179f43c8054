type QueryValue = string | number | undefined | null | boolean | Array<QueryValue> | Record<string, any>;
type QueryObject = Record<string, QueryValue | QueryValue[]>;
type ParsedQuery = Record<string, string | string[]>;
/**
 * Parses and decodes a query string into an object.
 *
 * The input can be a query string with or without the leading `?`.
 *
 * @note
 * The `__proto__` and `constructor` keys are ignored to prevent prototype pollution.
 *
 * @group Query_utils
 */
declare function parseQuery<T extends ParsedQuery = ParsedQuery>(parametersString?: string): T;
/**
 * Encodes a pair of key and value into a url query string value.
 *
 * If the value is an array, it will be encoded as multiple key-value pairs with the same key.
 *
 * @group Query_utils
 */
declare function encodeQueryItem(key: string, value: QueryValue | QueryValue[]): string;
/**
 * Stringfies and encodes a query object into a query string.
 *
 * @group Query_utils
 */
declare function stringifyQuery(query: QueryObject): string;

/**
 * Encodes characters that need to be encoded in the path, search and hash
 * sections of the URL.
 *
 * @group encoding_utils
 *
 * @param text - string to encode
 * @returns encoded string
 */
declare function encode(text: string | number): string;
/**
 * Encodes characters that need to be encoded in the hash section of the URL.
 *
 * @group encoding_utils
 *
 * @param text - string to encode
 * @returns encoded string
 */
declare function encodeHash(text: string): string;
/**
 * Encodes characters that need to be encoded for query values in the query
 * section of the URL.
 *
 * @group encoding_utils
 *
 * @param input - string to encode
 * @returns encoded string
 */
declare function encodeQueryValue(input: QueryValue): string;
/**
 * Encodes characters that need to be encoded for query values in the query
 * section of the URL and also encodes the `=` character.
 *
 * @group encoding_utils
 *
 * @param text - string to encode
 */
declare function encodeQueryKey(text: string | number): string;
/**
 * Encodes characters that need to be encoded in the path section of the URL.
 *
 * @group encoding_utils
 *
 * @param text - string to encode
 * @returns encoded string
 */
declare function encodePath(text: string | number): string;
/**
 * Encodes characters that need to be encoded in the path section of the URL as a
 * param. This function encodes everything `encodePath` does plus the
 * slash (`/`) character.
 *
 * @group encoding_utils
 *
 * @param text - string to encode
 * @returns encoded string
 */
declare function encodeParam(text: string | number): string;
/**
 * Decodes text using `decodeURIComponent`. Returns the original text if it
 * fails.
 *
 * @group encoding_utils
 *
 * @param text - string to decode
 * @returns decoded string
 */
declare function decode(text?: string | number): string;
/**
 * Decodes path section of URL (consistent with encodePath for slash encoding).
 *
 * @group encoding_utils
 *
 * @param text - string to decode
 * @returns decoded string
 */
declare function decodePath(text: string): string;
/**
 * Decodes query key (consistent with `encodeQueryKey` for plus encoding).
 *
 * @group encoding_utils
 *
 * @param text - string to decode
 * @returns decoded string
 */
declare function decodeQueryKey(text: string): string;
/**
 * Decodes query value (consistent with `encodeQueryValue` for plus encoding).
 *
 * @group encoding_utils
 *
 * @param text - string to decode
 * @returns decoded string
 */
declare function decodeQueryValue(text: string): string;
/**
 * Encodes hostname with punycode encoding.
 *
 * @group encoding_utils
 */
declare function encodeHost(name?: string): string;

declare const protocolRelative: unique symbol;
interface ParsedURL {
    protocol?: string;
    host?: string;
    auth?: string;
    href?: string;
    pathname: string;
    hash: string;
    search: string;
    [protocolRelative]?: boolean;
}
interface ParsedAuth {
    username: string;
    password: string;
}
interface ParsedHost {
    hostname: string;
    port: string;
}
/**
 * Takes a URL string and returns an object with the URL's `protocol`, `auth`, `host`, `pathname`, `search`, and `hash`.
 *
 * @example
 *
 * ```js
 * parseURL("http://foo.com/foo?test=123#token");
 * // { protocol: 'http:', auth: '', host: 'foo.com', pathname: '/foo', search: '?test=123', hash: '#token' }
 *
 * parseURL("foo.com/foo?test=123#token");
 * // { pathname: 'foo.com/foo', search: '?test=123', hash: '#token' }
 *
 * parseURL("foo.com/foo?test=123#token", "https://");
 * // { protocol: 'https:', auth: '', host: 'foo.com', pathname: '/foo', search: '?test=123', hash: '#token' }
 * ```
 *
 * @group parsing_utils
 *
 * @param [input] - The URL to parse.
 * @param [defaultProto] - The default protocol to use if the input doesn't have one.
 * @returns A parsed URL object.
 */
declare function parseURL(input?: string, defaultProto?: string): ParsedURL;
/**
 * Splits the input string into three parts, and returns an object with those three parts.
 *
 * @group parsing_utils
 *
 * @param [input] - The URL to parse.
 * @returns An object with three properties: `pathname`, `search`, and `hash`.
 */
declare function parsePath(input?: string): ParsedURL;
/**
 * Takes a string of the form `username:password` and returns an object with the username and
 * password decoded.
 *
 * @group parsing_utils
 *
 * @param [input] - The URL to parse.
 * @returns An object with two properties: username and password.
 */
declare function parseAuth(input?: string): ParsedAuth;
/**
 * Takes a string, and returns an object with two properties: `hostname` and `port`.
 *
 * @group parsing_utils
 *
 * @param [input] - The URL to parse.
 * @returns A function that takes a string and returns an object with two properties: `hostname` and
 * `port`.
 */
declare function parseHost(input?: string): ParsedHost;
/**
 * Takes a `ParsedURL` object and returns the stringified URL.
 *
 * @group parsing_utils
 *
 * @example
 *
 * ```js
 * const obj = parseURL("http://foo.com/foo?test=123#token");
 * obj.host = "bar.com";
 *
 * stringifyParsedURL(obj); // "http://bar.com/foo?test=123#token"
 * ```
 *
 * @param [parsed] - The parsed URL
 * @returns A stringified URL.
 */
declare function stringifyParsedURL(parsed: Partial<ParsedURL>): string;
/**
 * Parses a URL and returns last segment in path as filename.
 *
 * If `{ strict: true }` is passed as the second argument, it will only return the last segment only if ending with an extension.
 *
 * @group parsing_utils
 *
 * @example
 *
 * ```js
 * // Result: filename.ext
 * parseFilename("http://example.com/path/to/filename.ext");
 *
 * // Result: undefined
 * parseFilename("/path/to/.hidden-file", { strict: true });
 * ```
 *
 * @param [input] - The URL to parse.
 * @param [opts]  - Options to use while parsing
 */
declare function parseFilename(input?: string, opts?: {
    strict?: boolean;
}): string | undefined;

/**
 * @deprecated use native URL with `new URL(input)` or `ufo.parseURL(input)`
 */
declare class $URL implements URL {
    protocol: string;
    host: string;
    auth: string;
    pathname: string;
    query: QueryObject;
    hash: string;
    constructor(input?: string);
    get hostname(): string;
    get port(): string;
    get username(): string;
    get password(): string;
    get hasProtocol(): number;
    get isAbsolute(): number | boolean;
    get search(): string;
    get searchParams(): URLSearchParams;
    get origin(): string;
    get fullpath(): string;
    get encodedAuth(): string;
    get href(): string;
    append(url: $URL): void;
    toJSON(): string;
    toString(): string;
}
/**
 * @deprecated use native URL with `new URL(input)` or `ufo.parseURL(input)`
 */
declare function createURL(input: string): $URL;

/**
 * Check if a path starts with `./` or `../`.
 *
 * @example
 * ```js
 * isRelative("./foo"); // true
 * ```
 *
 * @group utils
 */
declare function isRelative(inputString: string): boolean;
interface HasProtocolOptions {
    acceptRelative?: boolean;
    strict?: boolean;
}
/**
 * Checks if the input has a protocol.
 *
 * You can use `{ acceptRelative: true }` to accept relative URLs as valid protocol.
 *
 * @group utils
 */
declare function hasProtocol(inputString: string, opts?: HasProtocolOptions): boolean;
/** @deprecated Same as { hasProtocol(inputString, { acceptRelative: true }) */
declare function hasProtocol(inputString: string, acceptRelative: boolean): boolean;
/**
 * Checks if the input protocol is any of the dangerous `blob:`, `data:`, `javascript`: or `vbscript:` protocols.
 *
 * @group utils
 */
declare function isScriptProtocol(protocol?: string): boolean;
/**
 * Checks if the input has a trailing slash.
 *
 * @group utils
 */
declare function hasTrailingSlash(input?: string, respectQueryAndFragment?: boolean): boolean;
/**
 * Removes the trailing slash from the URL or pathname.
 *
 * If second argument is `true`, it will only remove the trailing slash if it's not part of the query or fragment with cost of more expensive operations.
 *
 * @example
 *
 * ```js
 * withoutTrailingSlash("/foo/"); // "/foo"
 *
 * withoutTrailingSlash("/path/?query=true", true); // "/path?query=true"
 * ```
 *
 * @group utils
 */
declare function withoutTrailingSlash(input?: string, respectQueryAndFragment?: boolean): string;
/**
 * Ensures the URL ends with a trailing slash.
 *
 * If second argument is `true`, it will only add the trailing slash if it's not part of the query or fragment with cost of more expensive operation.
 *
 * @example
 *
 * ```js
 * withTrailingSlash("/foo"); // "/foo/"
 *
 * withTrailingSlash("/path?query=true", true); // "/path/?query=true"
 * ```
 *
 * @group utils
 */
declare function withTrailingSlash(input?: string, respectQueryAndFragment?: boolean): string;
/**
 * Checks if the input has a leading slash (e.g. `/foo`).
 *
 * @group utils
 */
declare function hasLeadingSlash(input?: string): boolean;
/**
 * Removes leading slash from the URL or pathname.
 *
 * @group utils
 */
declare function withoutLeadingSlash(input?: string): string;
/**
 * Ensures the URL or pathname has a leading slash.
 *
 * @group utils
 */
declare function withLeadingSlash(input?: string): string;
/**
 * Removes double slashes from the URL.
 *
 * @example
 *
 * ```js
 * cleanDoubleSlashes("//foo//bar//"); // "/foo/bar/"
 *
 * cleanDoubleSlashes("http://example.com/analyze//http://localhost:3000//");
 * // Returns "http://example.com/analyze/http://localhost:3000/"
 * ```
 *
 * @group utils
 */
declare function cleanDoubleSlashes(input?: string): string;
/**
 * Ensures the URL or pathname starts with base.
 *
 * If input already starts with base, it will not be added again.
 *
 * @group utils
 */
declare function withBase(input: string, base: string): string;
/**
 * Removes the base from the URL or pathname.
 *
 * If input does not start with base, it will not be removed.
 *
 * @group utils
 */
declare function withoutBase(input: string, base: string): string;
/**
 * Add/Replace the query section of the URL.
 *
 * @example
 *
 * ```js
 * withQuery("/foo?page=a", { token: "secret" }); // "/foo?page=a&token=secret"
 * ```
 *
 * @group utils
 */
declare function withQuery(input: string, query: QueryObject): string;
/**
 * Removes the query section of the URL.
 *
 * @example
 *
 * ```js
 * filterQuery("/foo?bar=1&baz=2", (key) => key !== "bar"); // "/foo?baz=2"
 * ```
 *
 * @group utils
 */
declare function filterQuery(input: string, predicate: (key: string, value: string | string[]) => boolean): string;
/**
 * Parses and decodes the query object of an input URL into an object.
 *
 * @example
 *
 * ```js
 * getQuery("http://foo.com/foo?test=123&unicode=%E5%A5%BD");
 * // { test: "123", unicode: "好" }
 * ```
 * @group utils
 */
declare function getQuery<T extends ParsedQuery = ParsedQuery>(input: string): T;
/**
 * Checks if the input URL is empty or `/`.
 *
 * @group utils
 */
declare function isEmptyURL(url: string): boolean;
/**
 * Checks if the input URL is neither empty nor `/`.
 *
 * @group utils
 */
declare function isNonEmptyURL(url: string): boolean;
/**
 * Joins multiple URL segments into a single URL.
 *
 * @example
 *
 * ```js
 * joinURL("a", "/b", "/c"); // "a/b/c"
 * ```
 *
 * @group utils
 */
declare function joinURL(base: string, ...input: string[]): string;
/**
 * Joins multiple URL segments into a single URL and also handles relative paths with `./` and `../`.
 *
 * @example
 *
 * ```js
 * joinRelativeURL("/a", "../b", "./c"); // "/b/c"
 * ```
 *
 * @group utils
 */
declare function joinRelativeURL(..._input: string[]): string;
/**
 * Adds or replaces the URL protocol to `http://`.
 *
 * @example
 *
 * ```js
 * withHttp("https://example.com"); // http://example.com
 * ```
 *
 * @group utils
 */
declare function withHttp(input: string): string;
/**
 * Adds or replaces the URL protocol to `https://`.
 *
 * @example
 *
 * ```js
 * withHttps("http://example.com"); // https://example.com
 * ```
 *
 * @group utils
 */
declare function withHttps(input: string): string;
/**
 * Removes the protocol from the input.
 *
 * @example
 * ```js
 * withoutProtocol("http://example.com"); // "example.com"
 * ```
 */
declare function withoutProtocol(input: string): string;
/**
 * Adds or replaces protocol of the input URL.
 *
 * @example
 * ```js
 * withProtocol("http://example.com", "ftp://"); // "ftp://example.com"
 * ```
 *
 * @group utils
 */
declare function withProtocol(input: string, protocol: string): string;
/**
 * Normalizes the input URL:
 *
 * - Ensures the URL is properly encoded
 * - Ensures pathname starts with a slash
 * - Preserves protocol/host if provided
 *
 * @example
 *
 * ```js
 * normalizeURL("test?query=123 123#hash, test");
 * // Returns "test?query=123%20123#hash,%20test"
 *
 * normalizeURL("http://localhost:3000");
 * // Returns "http://localhost:3000"
 * ```
 *
 * @group utils
 */
declare function normalizeURL(input: string): string;
/**
 * Resolves multiple URL segments into a single URL.
 *
 * @example
 *
 * ```js
 * resolveURL("http://foo.com/foo?test=123#token", "bar", "baz");
 * // Returns "http://foo.com/foo/bar/baz?test=123#token"
 * ```
 *
 * @group utils
 */
declare function resolveURL(base?: string, ...inputs: string[]): string;
/**
 * Check if two paths are equal or not. Trailing slash and encoding are normalized before comparison.
 *
 * @example
 * ```js
 * isSamePath("/foo", "/foo/"); // true
 * ```
 *
 * @group utils
 */
declare function isSamePath(p1: string, p2: string): boolean;
interface CompareURLOptions {
    trailingSlash?: boolean;
    leadingSlash?: boolean;
    encoding?: boolean;
}
/**
 *  Checks if two paths are equal regardless of encoding, trailing slash, and leading slash differences.
 *
 * You can make slash check strict by setting `{ trailingSlash: true, leadingSlash: true }` as options.
 *
 * You can make encoding check strict by setting `{ encoding: true }` as options.
 *
 * @example
 *
 * ```js
 * isEqual("/foo", "foo"); // true
 * isEqual("foo/", "foo"); // true
 * isEqual("/foo bar", "/foo%20bar"); // true
 *
 * // Strict compare
 * isEqual("/foo", "foo", { leadingSlash: true }); // false
 * isEqual("foo/", "foo", { trailingSlash: true }); // false
 * isEqual("/foo bar", "/foo%20bar", { encoding: true }); // false
 * ```
 *
 * @group utils
 */
declare function isEqual(a: string, b: string, options?: CompareURLOptions): boolean;
/**
 * Adds or replaces the fragment section of the URL.
 *
 * @example
 *
 * ```js
 * withFragment("/foo", "bar"); // "/foo#bar"
 * withFragment("/foo#bar", "baz"); // "/foo#baz"
 * withFragment("/foo#bar", ""); // "/foo"
 * ```
 *
 * @group utils
 */
declare function withFragment(input: string, hash: string): string;
/**
 * Removes the fragment section from the URL.
 *
 * @example
 *
 * ```js
 * withoutFragment("http://example.com/foo?q=123#bar")
 * // Returns "http://example.com/foo?q=123"
 * ```
 *
 * @group utils
 */
declare function withoutFragment(input: string): string;
/**
 * Removes the host from the URL while preserving everything else.
 *
 * @example
 * ```js
 * withoutHost("http://example.com/foo?q=123#bar")
 * // Returns "/foo?q=123#bar"
 * ```
 *
 * @group utils
 */
declare function withoutHost(input: string): string;

export { $URL, cleanDoubleSlashes, createURL, decode, decodePath, decodeQueryKey, decodeQueryValue, encode, encodeHash, encodeHost, encodeParam, encodePath, encodeQueryItem, encodeQueryKey, encodeQueryValue, filterQuery, getQuery, hasLeadingSlash, hasProtocol, hasTrailingSlash, isEmptyURL, isEqual, isNonEmptyURL, isRelative, isSamePath, isScriptProtocol, joinRelativeURL, joinURL, normalizeURL, parseAuth, parseFilename, parseHost, parsePath, parseQuery, parseURL, resolveURL, stringifyParsedURL, stringifyQuery, withBase, withFragment, withHttp, withHttps, withLeadingSlash, withProtocol, withQuery, withTrailingSlash, withoutBase, withoutFragment, withoutHost, withoutLeadingSlash, withoutProtocol, withoutTrailingSlash };
export type { HasProtocolOptions, ParsedAuth, ParsedHost, ParsedQuery, ParsedURL, QueryObject, QueryValue };
