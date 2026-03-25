// Regexps involved with splitting words in various case formats.
const SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
const SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
// Used to iterate over the initial split result and separate numbers.
const SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u;
// Regexp involved with stripping non-word characters from the result.
const DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
// The replacement value for splits.
const SPLIT_REPLACE_VALUE = "$1\0$2";
// The default characters to keep after transforming case.
const DEFAULT_PREFIX_SUFFIX_CHARACTERS = "";
/**
 * Split any cased input strings into an array of words.
 */
export function split(value) {
    let result = value.trim();
    result = result
        .replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE)
        .replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
    result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
    let start = 0;
    let end = result.length;
    // Trim the delimiter from around the output string.
    while (result.charAt(start) === "\0")
        start++;
    if (start === end)
        return [];
    while (result.charAt(end - 1) === "\0")
        end--;
    return result.slice(start, end).split(/\0/g);
}
/**
 * Split the input string into an array of words, separating numbers.
 */
export function splitSeparateNumbers(value) {
    const words = split(value);
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const match = SPLIT_SEPARATE_NUMBER_RE.exec(word);
        if (match) {
            const offset = match.index + (match[1] ?? match[2]).length;
            words.splice(i, 1, word.slice(0, offset), word.slice(offset));
        }
    }
    return words;
}
/**
 * Convert a string to space separated lower case (`foo bar`).
 */
export function noCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    return (prefix +
        words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? " ") +
        suffix);
}
/**
 * Convert a string to camel case (`fooBar`).
 */
export function camelCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = options?.mergeAmbiguousCharacters
        ? capitalCaseTransformFactory(lower, upper)
        : pascalCaseTransformFactory(lower, upper);
    return (prefix +
        words
            .map((word, index) => {
            if (index === 0)
                return lower(word);
            return transform(word, index);
        })
            .join(options?.delimiter ?? "") +
        suffix);
}
/**
 * Convert a string to pascal case (`FooBar`).
 */
export function pascalCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = options?.mergeAmbiguousCharacters
        ? capitalCaseTransformFactory(lower, upper)
        : pascalCaseTransformFactory(lower, upper);
    return prefix + words.map(transform).join(options?.delimiter ?? "") + suffix;
}
/**
 * Convert a string to pascal snake case (`Foo_Bar`).
 */
export function pascalSnakeCase(input, options) {
    return capitalCase(input, { delimiter: "_", ...options });
}
/**
 * Convert a string to capital case (`Foo Bar`).
 */
export function capitalCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    return (prefix +
        words
            .map(capitalCaseTransformFactory(lower, upper))
            .join(options?.delimiter ?? " ") +
        suffix);
}
/**
 * Convert a string to constant case (`FOO_BAR`).
 */
export function constantCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    return (prefix +
        words.map(upperFactory(options?.locale)).join(options?.delimiter ?? "_") +
        suffix);
}
/**
 * Convert a string to dot case (`foo.bar`).
 */
export function dotCase(input, options) {
    return noCase(input, { delimiter: ".", ...options });
}
/**
 * Convert a string to kebab case (`foo-bar`).
 */
export function kebabCase(input, options) {
    return noCase(input, { delimiter: "-", ...options });
}
/**
 * Convert a string to path case (`foo/bar`).
 */
export function pathCase(input, options) {
    return noCase(input, { delimiter: "/", ...options });
}
/**
 * Convert a string to path case (`Foo bar`).
 */
export function sentenceCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    const lower = lowerFactory(options?.locale);
    const upper = upperFactory(options?.locale);
    const transform = capitalCaseTransformFactory(lower, upper);
    return (prefix +
        words
            .map((word, index) => {
            if (index === 0)
                return transform(word);
            return lower(word);
        })
            .join(options?.delimiter ?? " ") +
        suffix);
}
/**
 * Convert a string to snake case (`foo_bar`).
 */
export function snakeCase(input, options) {
    return noCase(input, { delimiter: "_", ...options });
}
/**
 * Convert a string to header case (`Foo-Bar`).
 */
export function trainCase(input, options) {
    return capitalCase(input, { delimiter: "-", ...options });
}
function lowerFactory(locale) {
    return locale === false
        ? (input) => input.toLowerCase()
        : (input) => input.toLocaleLowerCase(locale);
}
function upperFactory(locale) {
    return locale === false
        ? (input) => input.toUpperCase()
        : (input) => input.toLocaleUpperCase(locale);
}
function capitalCaseTransformFactory(lower, upper) {
    return (word) => `${upper(word[0])}${lower(word.slice(1))}`;
}
function pascalCaseTransformFactory(lower, upper) {
    return (word, index) => {
        const char0 = word[0];
        const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0);
        return initial + lower(word.slice(1));
    };
}
function splitPrefixSuffix(input, options = {}) {
    const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split);
    const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    let prefixIndex = 0;
    let suffixIndex = input.length;
    while (prefixIndex < input.length) {
        const char = input.charAt(prefixIndex);
        if (!prefixCharacters.includes(char))
            break;
        prefixIndex++;
    }
    while (suffixIndex > prefixIndex) {
        const index = suffixIndex - 1;
        const char = input.charAt(index);
        if (!suffixCharacters.includes(char))
            break;
        suffixIndex = index;
    }
    return [
        input.slice(0, prefixIndex),
        splitFn(input.slice(prefixIndex, suffixIndex)),
        input.slice(suffixIndex),
    ];
}
//# sourceMappingURL=index.js.map