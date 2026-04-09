type TODO = any;

// In the absence of a WeakSet or WeakMap implementation, don't break, but don't cache either.
function noop(...args: Array<any>) {}
function createWeakMap<K extends object, V>(): MyWeakMap<K, V> {
  if (typeof WeakMap !== "undefined") {
    return new WeakMap<K, V>();
  } else {
    return fakeSetOrMap<K, V>();
  }
}

type MyWeakMap<K extends object, V> = Pick<
  WeakMap<K, V>,
  "delete" | "get" | "set" | "has"
>;
type MyWeakSetMap<K extends object, V> =
  & Pick<WeakMap<K, V>, "delete" | "get" | "set" | "has">
  & Pick<WeakSet<K>, "add">;

/**
 * Creates and returns a no-op implementation of a WeakMap / WeakSet that never stores anything.
 */
function fakeSetOrMap<K extends object, V = any>(): MyWeakSetMap<K, V> {
  return {
    add: noop as WeakSet<K>["add"],
    delete: noop as WeakMap<K, V>["delete"],
    get: noop as WeakMap<K, V>["get"],
    set: noop as WeakMap<K, V>["set"],
    has(k: K) {
      return false;
    },
  };
}

// Safe hasOwnProperty
const hop = Object.prototype.hasOwnProperty;
const has = function (obj: object, prop: string): boolean {
  return hop.call(obj, prop);
};

// Copy all own enumerable properties from source to target
function extend<T, S extends object>(target: T, source: S) {
  type Extended = T & S;
  for (const prop in source) {
    if (has(source, prop)) {
      (target as any)[prop] = source[prop];
    }
  }
  return target as Extended;
}

const reLeadingNewline = /^[ \t]*(?:\r\n|\r|\n)/;
const reTrailingNewline = /(?:\r\n|\r|\n)[ \t]*$/;
const reStartsWithNewlineOrIsEmpty = /^(?:[\r\n]|$)/;
const reDetectIndentation = /(?:\r\n|\r|\n)([ \t]*)(?:[^ \t\r\n]|$)/;
const reOnlyWhitespaceWithAtLeastOneNewline = /^[ \t]*[\r\n][ \t\r\n]*$/;

function _outdentArray(
  strings: ReadonlyArray<string>,
  firstInterpolatedValueSetsIndentationLevel: boolean,
  options: Options,
) {
  // If first interpolated value is a reference to outdent,
  // determine indentation level from the indentation of the interpolated value.
  let indentationLevel = 0;

  const match = strings[0].match(reDetectIndentation);
  if (match) {
    indentationLevel = match[1].length;
  }

  const reSource = `(\\r\\n|\\r|\\n).{0,${indentationLevel}}`;
  const reMatchIndent = new RegExp(reSource, "g");

  if (firstInterpolatedValueSetsIndentationLevel) {
    strings = strings.slice(1);
  }

  const { newline, trimLeadingNewline, trimTrailingNewline } = options;
  const normalizeNewlines = typeof newline === "string";
  const l = strings.length;
  const outdentedStrings = strings.map((v, i) => {
    // Remove leading indentation from all lines
    v = v.replace(reMatchIndent, "$1");
    // Trim a leading newline from the first string
    if (i === 0 && trimLeadingNewline) {
      v = v.replace(reLeadingNewline, "");
    }
    // Trim a trailing newline from the last string
    if (i === l - 1 && trimTrailingNewline) {
      v = v.replace(reTrailingNewline, "");
    }
    // Normalize newlines
    if (normalizeNewlines) {
      v = v.replace(/\r\n|\n|\r/g, (_) => newline as string);
    }
    return v;
  });
  return outdentedStrings;
}

function concatStringsAndValues(
  strings: ReadonlyArray<string>,
  values: ReadonlyArray<any>,
): string {
  let ret = "";
  for (let i = 0, l = strings.length; i < l; i++) {
    ret += strings[i];
    if (i < l - 1) {
      ret += values[i];
    }
  }
  return ret;
}

function isTemplateStringsArray(v: any): v is TemplateStringsArray {
  return has(v, "raw") && has(v, "length");
}

/**
 * It is assumed that opts will not change.  If this is a problem, clone your options object and pass the clone to
 * makeInstance
 * @param options
 * @return {outdent}
 */
function createInstance(options: Options): Outdent {
  /** Cache of pre-processed template literal arrays */
  const arrayAutoIndentCache = createWeakMap<
    TemplateStringsArray,
    Array<string>
  >();
  /**
     * Cache of pre-processed template literal arrays, where first interpolated value is a reference to outdent,
     * before interpolated values are injected.
     */
  const arrayFirstInterpSetsIndentCache = createWeakMap<
    TemplateStringsArray,
    Array<string>
  >();

  /* tslint:disable:no-shadowed-variable */
  function outdent(
    stringsOrOptions: TemplateStringsArray,
    ...values: Array<any>
  ): string;
  function outdent(stringsOrOptions: Options): Outdent;
  function outdent(
    stringsOrOptions: TemplateStringsArray | Options,
    ...values: Array<any>
  ): string | Outdent {
    /* tslint:enable:no-shadowed-variable */
    if (isTemplateStringsArray(stringsOrOptions)) {
      const strings = stringsOrOptions;

      // Is first interpolated value a reference to outdent, alone on its own line, without any preceding non-whitespace?
      const firstInterpolatedValueSetsIndentationLevel =
        (values[0] === outdent || values[0] === defaultOutdent) &&
        reOnlyWhitespaceWithAtLeastOneNewline.test(strings[0]) &&
        reStartsWithNewlineOrIsEmpty.test(strings[1]);

      // Perform outdentation
      const cache = firstInterpolatedValueSetsIndentationLevel
        ? arrayFirstInterpSetsIndentCache
        : arrayAutoIndentCache;
      let renderedArray = cache.get(strings);
      if (!renderedArray) {
        renderedArray = _outdentArray(
          strings,
          firstInterpolatedValueSetsIndentationLevel,
          options,
        );
        cache.set(strings, renderedArray);
      }
      /** If no interpolated values, skip concatenation step */
      if (values.length === 0) {
        return renderedArray[0];
      }
      /** Concatenate string literals with interpolated values */
      const rendered = concatStringsAndValues(
        renderedArray,
        firstInterpolatedValueSetsIndentationLevel ? values.slice(1) : values,
      );

      return rendered;
    } else {
      // Create and return a new instance of outdent with the given options
      return createInstance(
        extend(extend({}, options), stringsOrOptions || {}),
      );
    }
  }

  const fullOutdent = extend(outdent, {
    string(str: string): string {
      return _outdentArray([str], false, options)[0];
    },
  });

  return fullOutdent;
}

const defaultOutdent = createInstance({
  trimLeadingNewline: true,
  trimTrailingNewline: true,
});

export interface Outdent {
  /**
     * Remove indentation from a template literal.
     */
  (strings: TemplateStringsArray, ...values: Array<any>): string;
  /**
     * Create and return a new Outdent instance with the given options.
     */
  (options: Options): Outdent;

  /**
     * Remove indentation from a string
     */
  string(str: string): string;

  // /**
  //  * Remove indentation from a template literal, but return a tuple of the
  //  * outdented TemplateStringsArray and
  //  */
  // pass(strings: TemplateStringsArray, ...values: Array<any>): [TemplateStringsArray, ...Array<any>];
}
export interface Options {
  trimLeadingNewline?: boolean;
  trimTrailingNewline?: boolean;
  /**
     * Normalize all newlines in the template literal to this value.
     * 
     * If `null`, newlines are left untouched.
     * 
     * Newlines that get normalized are '\r\n', '\r', and '\n'.
     * 
     * Newlines within interpolated values are *never* normalized.
     * 
     * Although intended for normalizing to '\n' or '\r\n',
     * you can also set to any string; for example ' '.
     */
  newline?: string | null;
}

// Named exports.  Simple and preferred.
// import outdent from 'outdent';
export default defaultOutdent;
// import {outdent} from 'outdent';
export { defaultOutdent as outdent };

// In CommonJS environments, enable `var outdent = require('outdent');` by
// replacing the exports object.
// Make sure that our replacement includes the named exports from above.
declare var module: any;
if (typeof module !== "undefined") {
  // In webpack harmony-modules environments, module.exports is read-only,
  // so we fail gracefully.
  try {
    module.exports = defaultOutdent;
    Object.defineProperty(defaultOutdent, "__esModule", { value: true });
    (defaultOutdent as any).default = defaultOutdent;
    (defaultOutdent as any).outdent = defaultOutdent;
  } catch (e) {}
}
