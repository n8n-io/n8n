import { Q as commonjsGlobal, P as getDefaultExportFromCjs } from './dep-D4NMHUTW.js';
import require$$0$2 from 'fs';
import require$$0 from 'postcss';
import require$$0$1 from 'path';
import require$$3 from 'crypto';
import require$$1 from 'util';
import { l as lib } from './dep-3RmXg9uo.js';

function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    var e = m[i];
    if (typeof e !== 'string' && !Array.isArray(e)) { for (var k in e) {
      if (k !== 'default' && !(k in n)) {
        n[k] = e[k];
      }
    } }
  }
  return n;
}

var build = {exports: {}};

var fs = {};

Object.defineProperty(fs, "__esModule", {
  value: true
});
fs.getFileSystem = getFileSystem;
fs.setFileSystem = setFileSystem;
let fileSystem = {
  readFile: () => {
    throw Error("readFile not implemented");
  },
  writeFile: () => {
    throw Error("writeFile not implemented");
  }
};

function setFileSystem(fs) {
  fileSystem.readFile = fs.readFile;
  fileSystem.writeFile = fs.writeFile;
}

function getFileSystem() {
  return fileSystem;
}

var pluginFactory = {};

var unquote$1 = {};

Object.defineProperty(unquote$1, "__esModule", {
  value: true
});
unquote$1.default = unquote;
// copied from https://github.com/lakenen/node-unquote
const reg = /['"]/;

function unquote(str) {
  if (!str) {
    return "";
  }

  if (reg.test(str.charAt(0))) {
    str = str.substr(1);
  }

  if (reg.test(str.charAt(str.length - 1))) {
    str = str.substr(0, str.length - 1);
  }

  return str;
}

var Parser$1 = {};

const matchValueName = /[$]?[\w-]+/g;

const replaceValueSymbols$2 = (value, replacements) => {
  let matches;

  while ((matches = matchValueName.exec(value))) {
    const replacement = replacements[matches[0]];

    if (replacement) {
      value =
        value.slice(0, matches.index) +
        replacement +
        value.slice(matchValueName.lastIndex);

      matchValueName.lastIndex -= matches[0].length - replacement.length;
    }
  }

  return value;
};

var replaceValueSymbols_1 = replaceValueSymbols$2;

const replaceValueSymbols$1 = replaceValueSymbols_1;

const replaceSymbols$1 = (css, replacements) => {
  css.walk((node) => {
    if (node.type === "decl" && node.value) {
      node.value = replaceValueSymbols$1(node.value.toString(), replacements);
    } else if (node.type === "rule" && node.selector) {
      node.selector = replaceValueSymbols$1(
        node.selector.toString(),
        replacements
      );
    } else if (node.type === "atrule" && node.params) {
      node.params = replaceValueSymbols$1(node.params.toString(), replacements);
    }
  });
};

var replaceSymbols_1 = replaceSymbols$1;

const importPattern = /^:import\(("[^"]*"|'[^']*'|[^"']+)\)$/;
const balancedQuotes = /^("[^"]*"|'[^']*'|[^"']+)$/;

const getDeclsObject = (rule) => {
  const object = {};

  rule.walkDecls((decl) => {
    const before = decl.raws.before ? decl.raws.before.trim() : "";

    object[before + decl.prop] = decl.value;
  });

  return object;
};
/**
 *
 * @param {string} css
 * @param {boolean} removeRules
 * @param {'auto' | 'rule' | 'at-rule'} mode
 */
const extractICSS$2 = (css, removeRules = true, mode = "auto") => {
  const icssImports = {};
  const icssExports = {};

  function addImports(node, path) {
    const unquoted = path.replace(/'|"/g, "");
    icssImports[unquoted] = Object.assign(
      icssImports[unquoted] || {},
      getDeclsObject(node)
    );

    if (removeRules) {
      node.remove();
    }
  }

  function addExports(node) {
    Object.assign(icssExports, getDeclsObject(node));
    if (removeRules) {
      node.remove();
    }
  }

  css.each((node) => {
    if (node.type === "rule" && mode !== "at-rule") {
      if (node.selector.slice(0, 7) === ":import") {
        const matches = importPattern.exec(node.selector);

        if (matches) {
          addImports(node, matches[1]);
        }
      }

      if (node.selector === ":export") {
        addExports(node);
      }
    }

    if (node.type === "atrule" && mode !== "rule") {
      if (node.name === "icss-import") {
        const matches = balancedQuotes.exec(node.params);

        if (matches) {
          addImports(node, matches[1]);
        }
      }
      if (node.name === "icss-export") {
        addExports(node);
      }
    }
  });

  return { icssImports, icssExports };
};

var extractICSS_1 = extractICSS$2;

const createImports = (imports, postcss, mode = "rule") => {
  return Object.keys(imports).map((path) => {
    const aliases = imports[path];
    const declarations = Object.keys(aliases).map((key) =>
      postcss.decl({
        prop: key,
        value: aliases[key],
        raws: { before: "\n  " },
      })
    );

    const hasDeclarations = declarations.length > 0;

    const rule =
      mode === "rule"
        ? postcss.rule({
            selector: `:import('${path}')`,
            raws: { after: hasDeclarations ? "\n" : "" },
          })
        : postcss.atRule({
            name: "icss-import",
            params: `'${path}'`,
            raws: { after: hasDeclarations ? "\n" : "" },
          });

    if (hasDeclarations) {
      rule.append(declarations);
    }

    return rule;
  });
};

const createExports = (exports, postcss, mode = "rule") => {
  const declarations = Object.keys(exports).map((key) =>
    postcss.decl({
      prop: key,
      value: exports[key],
      raws: { before: "\n  " },
    })
  );

  if (declarations.length === 0) {
    return [];
  }
  const rule =
    mode === "rule"
      ? postcss.rule({
          selector: `:export`,
          raws: { after: "\n" },
        })
      : postcss.atRule({
          name: "icss-export",
          raws: { after: "\n" },
        });

  rule.append(declarations);

  return [rule];
};

const createICSSRules$1 = (imports, exports, postcss, mode) => [
  ...createImports(imports, postcss, mode),
  ...createExports(exports, postcss, mode),
];

var createICSSRules_1 = createICSSRules$1;

const replaceValueSymbols = replaceValueSymbols_1;
const replaceSymbols = replaceSymbols_1;
const extractICSS$1 = extractICSS_1;
const createICSSRules = createICSSRules_1;

var src$4 = {
  replaceValueSymbols,
  replaceSymbols,
  extractICSS: extractICSS$1,
  createICSSRules,
};

Object.defineProperty(Parser$1, "__esModule", {
  value: true
});
Parser$1.default = void 0;

var _icssUtils = src$4;

// Initially copied from https://github.com/css-modules/css-modules-loader-core
const importRegexp = /^:import\((.+)\)$/;

class Parser {
  constructor(pathFetcher, trace) {
    this.pathFetcher = pathFetcher;
    this.plugin = this.plugin.bind(this);
    this.exportTokens = {};
    this.translations = {};
    this.trace = trace;
  }

  plugin() {
    const parser = this;
    return {
      postcssPlugin: "css-modules-parser",

      async OnceExit(css) {
        await Promise.all(parser.fetchAllImports(css));
        parser.linkImportedSymbols(css);
        return parser.extractExports(css);
      }

    };
  }

  fetchAllImports(css) {
    let imports = [];
    css.each(node => {
      if (node.type == "rule" && node.selector.match(importRegexp)) {
        imports.push(this.fetchImport(node, css.source.input.from, imports.length));
      }
    });
    return imports;
  }

  linkImportedSymbols(css) {
    (0, _icssUtils.replaceSymbols)(css, this.translations);
  }

  extractExports(css) {
    css.each(node => {
      if (node.type == "rule" && node.selector == ":export") this.handleExport(node);
    });
  }

  handleExport(exportNode) {
    exportNode.each(decl => {
      if (decl.type == "decl") {
        Object.keys(this.translations).forEach(translation => {
          decl.value = decl.value.replace(translation, this.translations[translation]);
        });
        this.exportTokens[decl.prop] = decl.value;
      }
    });
    exportNode.remove();
  }

  async fetchImport(importNode, relativeTo, depNr) {
    const file = importNode.selector.match(importRegexp)[1];
    const depTrace = this.trace + String.fromCharCode(depNr);
    const exports = await this.pathFetcher(file, relativeTo, depTrace);

    try {
      importNode.each(decl => {
        if (decl.type == "decl") {
          this.translations[decl.prop] = exports[decl.value];
        }
      });
      importNode.remove();
    } catch (err) {
      console.log(err);
    }
  }

}

Parser$1.default = Parser;

var saveJSON$1 = {};

Object.defineProperty(saveJSON$1, "__esModule", {
  value: true
});
saveJSON$1.default = saveJSON;

var _fs$2 = fs;

function saveJSON(cssFile, json) {
  return new Promise((resolve, reject) => {
    const {
      writeFile
    } = (0, _fs$2.getFileSystem)();
    writeFile(`${cssFile}.json`, JSON.stringify(json), e => e ? reject(e) : resolve(json));
  });
}

var localsConvention = {};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match words composed of alphanumeric characters. */
var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

/** Used to match Latin Unicode letters (excluding mathematical operators). */
var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0',
    rsDingbatRange = '\\u2700-\\u27bf',
    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
    rsPunctuationRange = '\\u2000-\\u206f',
    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
    rsVarRange = '\\ufe0e\\ufe0f',
    rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

/** Used to compose unicode capture groups. */
var rsApos = "['\u2019]",
    rsAstral = '[' + rsAstralRange + ']',
    rsBreak = '[' + rsBreakRange + ']',
    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
    rsDigits = '\\d+',
    rsDingbat = '[' + rsDingbatRange + ']',
    rsLower = '[' + rsLowerRange + ']',
    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsUpper = '[' + rsUpperRange + ']',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
    rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
    rsOptLowerContr = '(?:' + rsApos + '(?:d|ll|m|re|s|t|ve))?',
    rsOptUpperContr = '(?:' + rsApos + '(?:D|LL|M|RE|S|T|VE))?',
    reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
    rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

/** Used to match apostrophes. */
var reApos = RegExp(rsApos, 'g');

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
var reComboMark = RegExp(rsCombo, 'g');

/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

/** Used to match complex or compound words. */
var reUnicodeWord = RegExp([
  rsUpper + '?' + rsLower + '+' + rsOptLowerContr + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
  rsUpperMisc + '+' + rsOptUpperContr + '(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
  rsUpper + '?' + rsLowerMisc + '+' + rsOptLowerContr,
  rsUpper + '+' + rsOptUpperContr,
  rsDigits,
  rsEmoji
].join('|'), 'g');

/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + ']');

/** Used to detect strings that need a more robust regexp to match words. */
var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

/** Used to map Latin Unicode letters to basic Latin letters. */
var deburredLetters = {
  // Latin-1 Supplement block.
  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
  '\xc7': 'C',  '\xe7': 'c',
  '\xd0': 'D',  '\xf0': 'd',
  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
  '\xcc': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
  '\xec': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
  '\xd1': 'N',  '\xf1': 'n',
  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
  '\xc6': 'Ae', '\xe6': 'ae',
  '\xde': 'Th', '\xfe': 'th',
  '\xdf': 'ss',
  // Latin Extended-A block.
  '\u0100': 'A',  '\u0102': 'A', '\u0104': 'A',
  '\u0101': 'a',  '\u0103': 'a', '\u0105': 'a',
  '\u0106': 'C',  '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
  '\u0107': 'c',  '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
  '\u010e': 'D',  '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
  '\u0112': 'E',  '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
  '\u0113': 'e',  '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
  '\u011c': 'G',  '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
  '\u011d': 'g',  '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
  '\u0124': 'H',  '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
  '\u0128': 'I',  '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
  '\u0129': 'i',  '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
  '\u0134': 'J',  '\u0135': 'j',
  '\u0136': 'K',  '\u0137': 'k', '\u0138': 'k',
  '\u0139': 'L',  '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
  '\u013a': 'l',  '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
  '\u0143': 'N',  '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
  '\u0144': 'n',  '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
  '\u014c': 'O',  '\u014e': 'O', '\u0150': 'O',
  '\u014d': 'o',  '\u014f': 'o', '\u0151': 'o',
  '\u0154': 'R',  '\u0156': 'R', '\u0158': 'R',
  '\u0155': 'r',  '\u0157': 'r', '\u0159': 'r',
  '\u015a': 'S',  '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
  '\u015b': 's',  '\u015d': 's', '\u015f': 's', '\u0161': 's',
  '\u0162': 'T',  '\u0164': 'T', '\u0166': 'T',
  '\u0163': 't',  '\u0165': 't', '\u0167': 't',
  '\u0168': 'U',  '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
  '\u0169': 'u',  '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
  '\u0174': 'W',  '\u0175': 'w',
  '\u0176': 'Y',  '\u0177': 'y', '\u0178': 'Y',
  '\u0179': 'Z',  '\u017b': 'Z', '\u017d': 'Z',
  '\u017a': 'z',  '\u017c': 'z', '\u017e': 'z',
  '\u0132': 'IJ', '\u0133': 'ij',
  '\u0152': 'Oe', '\u0153': 'oe',
  '\u0149': "'n", '\u017f': 'ss'
};

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root$2 = freeGlobal || freeSelf || Function('return this')();

/**
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as
 *  the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array ? array.length : 0;
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}

/**
 * Converts an ASCII `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function asciiToArray(string) {
  return string.split('');
}

/**
 * Splits an ASCII `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
function asciiWords(string) {
  return string.match(reAsciiWord) || [];
}

/**
 * The base implementation of `_.propertyOf` without support for deep paths.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyOf(object) {
  return function(key) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
 * letters to basic Latin letters.
 *
 * @private
 * @param {string} letter The matched letter to deburr.
 * @returns {string} Returns the deburred letter.
 */
var deburrLetter = basePropertyOf(deburredLetters);

/**
 * Checks if `string` contains Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a symbol is found, else `false`.
 */
function hasUnicode(string) {
  return reHasUnicode.test(string);
}

/**
 * Checks if `string` contains a word composed of Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a word is found, else `false`.
 */
function hasUnicodeWord(string) {
  return reHasUnicodeWord.test(string);
}

/**
 * Converts `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function stringToArray(string) {
  return hasUnicode(string)
    ? unicodeToArray(string)
    : asciiToArray(string);
}

/**
 * Converts a Unicode `string` to an array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the converted array.
 */
function unicodeToArray(string) {
  return string.match(reUnicode) || [];
}

/**
 * Splits a Unicode `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
function unicodeWords(string) {
  return string.match(reUnicodeWord) || [];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol$1 = root$2.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -Infinity) ? '-0' : result;
}

/**
 * Casts `array` to a slice if it's needed.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {number} start The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the cast slice.
 */
function castSlice(array, start, end) {
  var length = array.length;
  end = end === undefined ? length : end;
  return (false && end >= length) ? array : baseSlice(array, start, end);
}

/**
 * Creates a function like `_.lowerFirst`.
 *
 * @private
 * @param {string} methodName The name of the `String` case method to use.
 * @returns {Function} Returns the new case function.
 */
function createCaseFirst(methodName) {
  return function(string) {
    string = toString(string);

    var strSymbols = hasUnicode(string)
      ? stringToArray(string)
      : undefined;

    var chr = strSymbols
      ? strSymbols[0]
      : string.charAt(0);

    var trailing = strSymbols
      ? castSlice(strSymbols, 1).join('')
      : string.slice(1);

    return chr[methodName]() + trailing;
  };
}

/**
 * Creates a function like `_.camelCase`.
 *
 * @private
 * @param {Function} callback The function to combine each word.
 * @returns {Function} Returns the new compounder function.
 */
function createCompounder(callback) {
  return function(string) {
    return arrayReduce(words(deburr(string).replace(reApos, '')), callback, '');
  };
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the camel cased string.
 * @example
 *
 * _.camelCase('Foo Bar');
 * // => 'fooBar'
 *
 * _.camelCase('--foo-bar--');
 * // => 'fooBar'
 *
 * _.camelCase('__FOO_BAR__');
 * // => 'fooBar'
 */
var camelCase = createCompounder(function(result, word, index) {
  word = word.toLowerCase();
  return result + (index ? capitalize(word) : word);
});

/**
 * Converts the first character of `string` to upper case and the remaining
 * to lower case.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to capitalize.
 * @returns {string} Returns the capitalized string.
 * @example
 *
 * _.capitalize('FRED');
 * // => 'Fred'
 */
function capitalize(string) {
  return upperFirst(toString(string).toLowerCase());
}

/**
 * Deburrs `string` by converting
 * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
 * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
 * letters to basic Latin letters and removing
 * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to deburr.
 * @returns {string} Returns the deburred string.
 * @example
 *
 * _.deburr('déjà vu');
 * // => 'deja vu'
 */
function deburr(string) {
  string = toString(string);
  return string && string.replace(reLatin, deburrLetter).replace(reComboMark, '');
}

/**
 * Converts the first character of `string` to upper case.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.upperFirst('fred');
 * // => 'Fred'
 *
 * _.upperFirst('FRED');
 * // => 'FRED'
 */
var upperFirst = createCaseFirst('toUpperCase');

/**
 * Splits `string` into an array of its words.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to inspect.
 * @param {RegExp|string} [pattern] The pattern to match words.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {Array} Returns the words of `string`.
 * @example
 *
 * _.words('fred, barney, & pebbles');
 * // => ['fred', 'barney', 'pebbles']
 *
 * _.words('fred, barney, & pebbles', /[^, ]+/g);
 * // => ['fred', 'barney', '&', 'pebbles']
 */
function words(string, pattern, guard) {
  string = toString(string);
  pattern = pattern;

  if (pattern === undefined) {
    return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
  }
  return string.match(pattern) || [];
}

var lodash_camelcase = camelCase;

Object.defineProperty(localsConvention, "__esModule", {
  value: true
});
localsConvention.makeLocalsConventionReducer = makeLocalsConventionReducer;

var _lodash = _interopRequireDefault$5(lodash_camelcase);

function _interopRequireDefault$5(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function dashesCamelCase(string) {
  return string.replace(/-+(\w)/g, (_, firstLetter) => firstLetter.toUpperCase());
}

function makeLocalsConventionReducer(localsConvention, inputFile) {
  const isFunc = typeof localsConvention === "function";
  return (tokens, [className, value]) => {
    if (isFunc) {
      const convention = localsConvention(className, value, inputFile);
      tokens[convention] = value;
      return tokens;
    }

    switch (localsConvention) {
      case "camelCase":
        tokens[className] = value;
        tokens[(0, _lodash.default)(className)] = value;
        break;

      case "camelCaseOnly":
        tokens[(0, _lodash.default)(className)] = value;
        break;

      case "dashes":
        tokens[className] = value;
        tokens[dashesCamelCase(className)] = value;
        break;

      case "dashesOnly":
        tokens[dashesCamelCase(className)] = value;
        break;
    }

    return tokens;
  };
}

var FileSystemLoader$1 = {};

Object.defineProperty(FileSystemLoader$1, "__esModule", {
  value: true
});
FileSystemLoader$1.default = void 0;

var _postcss$1 = _interopRequireDefault$4(require$$0);

var _path = _interopRequireDefault$4(require$$0$1);

var _Parser$1 = _interopRequireDefault$4(Parser$1);

var _fs$1 = fs;

function _interopRequireDefault$4(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Initially copied from https://github.com/css-modules/css-modules-loader-core
class Core {
  constructor(plugins) {
    this.plugins = plugins || Core.defaultPlugins;
  }

  async load(sourceString, sourcePath, trace, pathFetcher) {
    const parser = new _Parser$1.default(pathFetcher, trace);
    const plugins = this.plugins.concat([parser.plugin()]);
    const result = await (0, _postcss$1.default)(plugins).process(sourceString, {
      from: sourcePath
    });
    return {
      injectableSource: result.css,
      exportTokens: parser.exportTokens
    };
  }

} // Sorts dependencies in the following way:
// AAA comes before AA and A
// AB comes after AA and before A
// All Bs come after all As
// This ensures that the files are always returned in the following order:
// - In the order they were required, except
// - After all their dependencies


const traceKeySorter = (a, b) => {
  if (a.length < b.length) {
    return a < b.substring(0, a.length) ? -1 : 1;
  }

  if (a.length > b.length) {
    return a.substring(0, b.length) <= b ? -1 : 1;
  }

  return a < b ? -1 : 1;
};

class FileSystemLoader {
  constructor(root, plugins, fileResolve) {
    if (root === "/" && process.platform === "win32") {
      const cwdDrive = process.cwd().slice(0, 3);

      if (!/^[A-Za-z]:\\$/.test(cwdDrive)) {
        throw new Error(`Failed to obtain root from "${process.cwd()}".`);
      }

      root = cwdDrive;
    }

    this.root = root;
    this.fileResolve = fileResolve;
    this.sources = {};
    this.traces = {};
    this.importNr = 0;
    this.core = new Core(plugins);
    this.tokensByFile = {};
    this.fs = (0, _fs$1.getFileSystem)();
  }

  async fetch(_newPath, relativeTo, _trace) {
    const newPath = _newPath.replace(/^["']|["']$/g, "");

    const trace = _trace || String.fromCharCode(this.importNr++);

    const useFileResolve = typeof this.fileResolve === "function";
    const fileResolvedPath = useFileResolve ? await this.fileResolve(newPath, relativeTo) : await Promise.resolve();

    if (fileResolvedPath && !_path.default.isAbsolute(fileResolvedPath)) {
      throw new Error('The returned path from the "fileResolve" option must be absolute.');
    }

    const relativeDir = _path.default.dirname(relativeTo);

    const rootRelativePath = fileResolvedPath || _path.default.resolve(relativeDir, newPath);

    let fileRelativePath = fileResolvedPath || _path.default.resolve(_path.default.resolve(this.root, relativeDir), newPath); // if the path is not relative or absolute, try to resolve it in node_modules


    if (!useFileResolve && newPath[0] !== "." && !_path.default.isAbsolute(newPath)) {
      try {
        fileRelativePath = require.resolve(newPath);
      } catch (e) {// noop
      }
    }

    const tokens = this.tokensByFile[fileRelativePath];
    if (tokens) return tokens;
    return new Promise((resolve, reject) => {
      this.fs.readFile(fileRelativePath, "utf-8", async (err, source) => {
        if (err) reject(err);
        const {
          injectableSource,
          exportTokens
        } = await this.core.load(source, rootRelativePath, trace, this.fetch.bind(this));
        this.sources[fileRelativePath] = injectableSource;
        this.traces[trace] = fileRelativePath;
        this.tokensByFile[fileRelativePath] = exportTokens;
        resolve(exportTokens);
      });
    });
  }

  get finalSource() {
    const traces = this.traces;
    const sources = this.sources;
    let written = new Set();
    return Object.keys(traces).sort(traceKeySorter).map(key => {
      const filename = traces[key];

      if (written.has(filename)) {
        return null;
      }

      written.add(filename);
      return sources[filename];
    }).join("");
  }

}

FileSystemLoader$1.default = FileSystemLoader;

var scoping = {};

var src$3 = {exports: {}};

const PERMANENT_MARKER = 2;
const TEMPORARY_MARKER = 1;

function createError(node, graph) {
  const er = new Error("Nondeterministic import's order");

  const related = graph[node];
  const relatedNode = related.find(
    (relatedNode) => graph[relatedNode].indexOf(node) > -1
  );

  er.nodes = [node, relatedNode];

  return er;
}

function walkGraph(node, graph, state, result, strict) {
  if (state[node] === PERMANENT_MARKER) {
    return;
  }

  if (state[node] === TEMPORARY_MARKER) {
    if (strict) {
      return createError(node, graph);
    }

    return;
  }

  state[node] = TEMPORARY_MARKER;

  const children = graph[node];
  const length = children.length;

  for (let i = 0; i < length; ++i) {
    const error = walkGraph(children[i], graph, state, result, strict);

    if (error instanceof Error) {
      return error;
    }
  }

  state[node] = PERMANENT_MARKER;

  result.push(node);
}

function topologicalSort$1(graph, strict) {
  const result = [];
  const state = {};

  const nodes = Object.keys(graph);
  const length = nodes.length;

  for (let i = 0; i < length; ++i) {
    const er = walkGraph(nodes[i], graph, state, result, strict);

    if (er instanceof Error) {
      return er;
    }
  }

  return result;
}

var topologicalSort_1 = topologicalSort$1;

const topologicalSort = topologicalSort_1;

const matchImports$1 = /^(.+?)\s+from\s+(?:"([^"]+)"|'([^']+)'|(global))$/;
const icssImport = /^:import\((?:"([^"]+)"|'([^']+)')\)/;

const VISITED_MARKER = 1;

/**
 * :import('G') {}
 *
 * Rule
 *   composes: ... from 'A'
 *   composes: ... from 'B'

 * Rule
 *   composes: ... from 'A'
 *   composes: ... from 'A'
 *   composes: ... from 'C'
 *
 * Results in:
 *
 * graph: {
 *   G: [],
 *   A: [],
 *   B: ['A'],
 *   C: ['A'],
 * }
 */
function addImportToGraph(importId, parentId, graph, visited) {
  const siblingsId = parentId + "_" + "siblings";
  const visitedId = parentId + "_" + importId;

  if (visited[visitedId] !== VISITED_MARKER) {
    if (!Array.isArray(visited[siblingsId])) {
      visited[siblingsId] = [];
    }

    const siblings = visited[siblingsId];

    if (Array.isArray(graph[importId])) {
      graph[importId] = graph[importId].concat(siblings);
    } else {
      graph[importId] = siblings.slice();
    }

    visited[visitedId] = VISITED_MARKER;

    siblings.push(importId);
  }
}

src$3.exports = (options = {}) => {
  let importIndex = 0;
  const createImportedName =
    typeof options.createImportedName !== "function"
      ? (importName /*, path*/) =>
          `i__imported_${importName.replace(/\W/g, "_")}_${importIndex++}`
      : options.createImportedName;
  const failOnWrongOrder = options.failOnWrongOrder;

  return {
    postcssPlugin: "postcss-modules-extract-imports",
    prepare() {
      const graph = {};
      const visited = {};
      const existingImports = {};
      const importDecls = {};
      const imports = {};

      return {
        Once(root, postcss) {
          // Check the existing imports order and save refs
          root.walkRules((rule) => {
            const matches = icssImport.exec(rule.selector);

            if (matches) {
              const [, /*match*/ doubleQuotePath, singleQuotePath] = matches;
              const importPath = doubleQuotePath || singleQuotePath;

              addImportToGraph(importPath, "root", graph, visited);

              existingImports[importPath] = rule;
            }
          });

          root.walkDecls(/^composes$/, (declaration) => {
            const multiple = declaration.value.split(",");
            const values = [];

            multiple.forEach((value) => {
              const matches = value.trim().match(matchImports$1);

              if (!matches) {
                values.push(value);

                return;
              }

              let tmpSymbols;
              let [
                ,
                /*match*/ symbols,
                doubleQuotePath,
                singleQuotePath,
                global,
              ] = matches;

              if (global) {
                // Composing globals simply means changing these classes to wrap them in global(name)
                tmpSymbols = symbols.split(/\s+/).map((s) => `global(${s})`);
              } else {
                const importPath = doubleQuotePath || singleQuotePath;

                let parent = declaration.parent;
                let parentIndexes = "";

                while (parent.type !== "root") {
                  parentIndexes =
                    parent.parent.index(parent) + "_" + parentIndexes;
                  parent = parent.parent;
                }

                const { selector } = declaration.parent;
                const parentRule = `_${parentIndexes}${selector}`;

                addImportToGraph(importPath, parentRule, graph, visited);

                importDecls[importPath] = declaration;
                imports[importPath] = imports[importPath] || {};

                tmpSymbols = symbols.split(/\s+/).map((s) => {
                  if (!imports[importPath][s]) {
                    imports[importPath][s] = createImportedName(s, importPath);
                  }

                  return imports[importPath][s];
                });
              }

              values.push(tmpSymbols.join(" "));
            });

            declaration.value = values.join(", ");
          });

          const importsOrder = topologicalSort(graph, failOnWrongOrder);

          if (importsOrder instanceof Error) {
            const importPath = importsOrder.nodes.find((importPath) =>
              // eslint-disable-next-line no-prototype-builtins
              importDecls.hasOwnProperty(importPath)
            );
            const decl = importDecls[importPath];

            throw decl.error(
              "Failed to resolve order of composed modules " +
                importsOrder.nodes
                  .map((importPath) => "`" + importPath + "`")
                  .join(", ") +
                ".",
              {
                plugin: "postcss-modules-extract-imports",
                word: "composes",
              }
            );
          }

          let lastImportRule;

          importsOrder.forEach((path) => {
            const importedSymbols = imports[path];
            let rule = existingImports[path];

            if (!rule && importedSymbols) {
              rule = postcss.rule({
                selector: `:import("${path}")`,
                raws: { after: "\n" },
              });

              if (lastImportRule) {
                root.insertAfter(lastImportRule, rule);
              } else {
                root.prepend(rule);
              }
            }

            lastImportRule = rule;

            if (!importedSymbols) {
              return;
            }

            Object.keys(importedSymbols).forEach((importedSymbol) => {
              rule.append(
                postcss.decl({
                  value: importedSymbol,
                  prop: importedSymbols[importedSymbol],
                  raws: { before: "\n  " },
                })
              );
            });
          });
        },
      };
    },
  };
};

src$3.exports.postcss = true;

var srcExports$2 = src$3.exports;

var wasmHash = {exports: {}};

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var hasRequiredWasmHash;

function requireWasmHash () {
	if (hasRequiredWasmHash) return wasmHash.exports;
	hasRequiredWasmHash = 1;

	// 65536 is the size of a wasm memory page
	// 64 is the maximum chunk size for every possible wasm hash implementation
	// 4 is the maximum number of bytes per char for string encoding (max is utf-8)
	// ~3 makes sure that it's always a block of 4 chars, so avoid partially encoded bytes for base64
	const MAX_SHORT_STRING = Math.floor((65536 - 64) / 4) & -4;

	class WasmHash {
	  /**
	   * @param {WebAssembly.Instance} instance wasm instance
	   * @param {WebAssembly.Instance[]} instancesPool pool of instances
	   * @param {number} chunkSize size of data chunks passed to wasm
	   * @param {number} digestSize size of digest returned by wasm
	   */
	  constructor(instance, instancesPool, chunkSize, digestSize) {
	    const exports = /** @type {any} */ (instance.exports);

	    exports.init();

	    this.exports = exports;
	    this.mem = Buffer.from(exports.memory.buffer, 0, 65536);
	    this.buffered = 0;
	    this.instancesPool = instancesPool;
	    this.chunkSize = chunkSize;
	    this.digestSize = digestSize;
	  }

	  reset() {
	    this.buffered = 0;
	    this.exports.init();
	  }

	  /**
	   * @param {Buffer | string} data data
	   * @param {BufferEncoding=} encoding encoding
	   * @returns {this} itself
	   */
	  update(data, encoding) {
	    if (typeof data === "string") {
	      while (data.length > MAX_SHORT_STRING) {
	        this._updateWithShortString(data.slice(0, MAX_SHORT_STRING), encoding);
	        data = data.slice(MAX_SHORT_STRING);
	      }

	      this._updateWithShortString(data, encoding);

	      return this;
	    }

	    this._updateWithBuffer(data);

	    return this;
	  }

	  /**
	   * @param {string} data data
	   * @param {BufferEncoding=} encoding encoding
	   * @returns {void}
	   */
	  _updateWithShortString(data, encoding) {
	    const { exports, buffered, mem, chunkSize } = this;

	    let endPos;

	    if (data.length < 70) {
	      if (!encoding || encoding === "utf-8" || encoding === "utf8") {
	        endPos = buffered;
	        for (let i = 0; i < data.length; i++) {
	          const cc = data.charCodeAt(i);

	          if (cc < 0x80) {
	            mem[endPos++] = cc;
	          } else if (cc < 0x800) {
	            mem[endPos] = (cc >> 6) | 0xc0;
	            mem[endPos + 1] = (cc & 0x3f) | 0x80;
	            endPos += 2;
	          } else {
	            // bail-out for weird chars
	            endPos += mem.write(data.slice(i), endPos, encoding);
	            break;
	          }
	        }
	      } else if (encoding === "latin1") {
	        endPos = buffered;

	        for (let i = 0; i < data.length; i++) {
	          const cc = data.charCodeAt(i);

	          mem[endPos++] = cc;
	        }
	      } else {
	        endPos = buffered + mem.write(data, buffered, encoding);
	      }
	    } else {
	      endPos = buffered + mem.write(data, buffered, encoding);
	    }

	    if (endPos < chunkSize) {
	      this.buffered = endPos;
	    } else {
	      const l = endPos & ~(this.chunkSize - 1);

	      exports.update(l);

	      const newBuffered = endPos - l;

	      this.buffered = newBuffered;

	      if (newBuffered > 0) {
	        mem.copyWithin(0, l, endPos);
	      }
	    }
	  }

	  /**
	   * @param {Buffer} data data
	   * @returns {void}
	   */
	  _updateWithBuffer(data) {
	    const { exports, buffered, mem } = this;
	    const length = data.length;

	    if (buffered + length < this.chunkSize) {
	      data.copy(mem, buffered, 0, length);

	      this.buffered += length;
	    } else {
	      const l = (buffered + length) & ~(this.chunkSize - 1);

	      if (l > 65536) {
	        let i = 65536 - buffered;

	        data.copy(mem, buffered, 0, i);
	        exports.update(65536);

	        const stop = l - buffered - 65536;

	        while (i < stop) {
	          data.copy(mem, 0, i, i + 65536);
	          exports.update(65536);
	          i += 65536;
	        }

	        data.copy(mem, 0, i, l - buffered);

	        exports.update(l - buffered - i);
	      } else {
	        data.copy(mem, buffered, 0, l - buffered);

	        exports.update(l);
	      }

	      const newBuffered = length + buffered - l;

	      this.buffered = newBuffered;

	      if (newBuffered > 0) {
	        data.copy(mem, 0, length - newBuffered, length);
	      }
	    }
	  }

	  digest(type) {
	    const { exports, buffered, mem, digestSize } = this;

	    exports.final(buffered);

	    this.instancesPool.push(this);

	    const hex = mem.toString("latin1", 0, digestSize);

	    if (type === "hex") {
	      return hex;
	    }

	    if (type === "binary" || !type) {
	      return Buffer.from(hex, "hex");
	    }

	    return Buffer.from(hex, "hex").toString(type);
	  }
	}

	const create = (wasmModule, instancesPool, chunkSize, digestSize) => {
	  if (instancesPool.length > 0) {
	    const old = instancesPool.pop();

	    old.reset();

	    return old;
	  } else {
	    return new WasmHash(
	      new WebAssembly.Instance(wasmModule),
	      instancesPool,
	      chunkSize,
	      digestSize
	    );
	  }
	};

	wasmHash.exports = create;
	wasmHash.exports.MAX_SHORT_STRING = MAX_SHORT_STRING;
	return wasmHash.exports;
}

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var xxhash64_1;
var hasRequiredXxhash64;

function requireXxhash64 () {
	if (hasRequiredXxhash64) return xxhash64_1;
	hasRequiredXxhash64 = 1;

	const create = requireWasmHash();

	//#region wasm code: xxhash64 (../../../assembly/hash/xxhash64.asm.ts) --initialMemory 1
	const xxhash64 = new WebAssembly.Module(
	  Buffer.from(
	    // 1173 bytes
	    "AGFzbQEAAAABCAJgAX8AYAAAAwQDAQAABQMBAAEGGgV+AUIAC34BQgALfgFCAAt+AUIAC34BQgALByIEBGluaXQAAAZ1cGRhdGUAAQVmaW5hbAACBm1lbW9yeQIACrUIAzAAQtbrgu7q/Yn14AAkAELP1tO+0ser2UIkAUIAJAJC+erQ0OfJoeThACQDQgAkBAvUAQIBfwR+IABFBEAPCyMEIACtfCQEIwAhAiMBIQMjAiEEIwMhBQNAIAIgASkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiECIAMgASkDCELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEDIAQgASkDEELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEEIAUgASkDGELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEFIAAgAUEgaiIBSw0ACyACJAAgAyQBIAQkAiAFJAMLqwYCAX8EfiMEQgBSBH4jACICQgGJIwEiA0IHiXwjAiIEQgyJfCMDIgVCEol8IAJCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gA0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSAEQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IAVCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0FQsXP2bLx5brqJwsjBCAArXx8IQIDQCABQQhqIABNBEAgAiABKQMAQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQhuJQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IQIgAUEIaiEBDAELCyABQQRqIABNBEACfyACIAE1AgBCh5Wvr5i23puef36FQheJQs/W077Sx6vZQn5C+fPd8Zn2masWfCECIAFBBGoLIQELA0AgACABRwRAIAIgATEAAELFz9my8eW66id+hUILiUKHla+vmLbem55/fiECIAFBAWohAQwBCwtBACACIAJCIYiFQs/W077Sx6vZQn4iAiACQh2IhUL5893xmfaZqxZ+IgIgAkIgiIUiAkIgiCIDQv//A4NCIIYgA0KAgPz/D4NCEIiEIgNC/4GAgPAfg0IQhiADQoD+g4CA4D+DQgiIhCIDQo+AvIDwgcAHg0IIhiADQvCBwIeAnoD4AINCBIiEIgNChoyYsODAgYMGfEIEiEKBgoSIkKDAgAGDQid+IANCsODAgYOGjJgwhHw3AwBBCCACQv////8PgyICQv//A4NCIIYgAkKAgPz/D4NCEIiEIgJC/4GAgPAfg0IQhiACQoD+g4CA4D+DQgiIhCICQo+AvIDwgcAHg0IIhiACQvCBwIeAnoD4AINCBIiEIgJChoyYsODAgYMGfEIEiEKBgoSIkKDAgAGDQid+IAJCsODAgYOGjJgwhHw3AwAL",
	    "base64"
	  )
	);
	//#endregion

	xxhash64_1 = create.bind(null, xxhash64, [], 32, 16);
	return xxhash64_1;
}

var BatchedHash_1;
var hasRequiredBatchedHash;

function requireBatchedHash () {
	if (hasRequiredBatchedHash) return BatchedHash_1;
	hasRequiredBatchedHash = 1;
	const MAX_SHORT_STRING = requireWasmHash().MAX_SHORT_STRING;

	class BatchedHash {
	  constructor(hash) {
	    this.string = undefined;
	    this.encoding = undefined;
	    this.hash = hash;
	  }

	  /**
	   * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	   * @param {string|Buffer} data data
	   * @param {string=} inputEncoding data encoding
	   * @returns {this} updated hash
	   */
	  update(data, inputEncoding) {
	    if (this.string !== undefined) {
	      if (
	        typeof data === "string" &&
	        inputEncoding === this.encoding &&
	        this.string.length + data.length < MAX_SHORT_STRING
	      ) {
	        this.string += data;

	        return this;
	      }

	      this.hash.update(this.string, this.encoding);
	      this.string = undefined;
	    }

	    if (typeof data === "string") {
	      if (
	        data.length < MAX_SHORT_STRING &&
	        // base64 encoding is not valid since it may contain padding chars
	        (!inputEncoding || !inputEncoding.startsWith("ba"))
	      ) {
	        this.string = data;
	        this.encoding = inputEncoding;
	      } else {
	        this.hash.update(data, inputEncoding);
	      }
	    } else {
	      this.hash.update(data);
	    }

	    return this;
	  }

	  /**
	   * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	   * @param {string=} encoding encoding of the return value
	   * @returns {string|Buffer} digest
	   */
	  digest(encoding) {
	    if (this.string !== undefined) {
	      this.hash.update(this.string, this.encoding);
	    }

	    return this.hash.digest(encoding);
	  }
	}

	BatchedHash_1 = BatchedHash;
	return BatchedHash_1;
}

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var md4_1;
var hasRequiredMd4;

function requireMd4 () {
	if (hasRequiredMd4) return md4_1;
	hasRequiredMd4 = 1;

	const create = requireWasmHash();

	//#region wasm code: md4 (../../../assembly/hash/md4.asm.ts) --initialMemory 1
	const md4 = new WebAssembly.Module(
	  Buffer.from(
	    // 2150 bytes
	    "AGFzbQEAAAABCAJgAX8AYAAAAwUEAQAAAAUDAQABBhoFfwFBAAt/AUEAC38BQQALfwFBAAt/AUEACwciBARpbml0AAAGdXBkYXRlAAIFZmluYWwAAwZtZW1vcnkCAAqFEAQmAEGBxpS6BiQBQYnXtv5+JAJB/rnrxXkkA0H2qMmBASQEQQAkAAvMCgEYfyMBIQojAiEGIwMhByMEIQgDQCAAIAVLBEAgBSgCCCINIAcgBiAFKAIEIgsgCCAHIAUoAgAiDCAKIAggBiAHIAhzcXNqakEDdyIDIAYgB3Nxc2pqQQd3IgEgAyAGc3FzampBC3chAiAFKAIUIg8gASACIAUoAhAiCSADIAEgBSgCDCIOIAYgAyACIAEgA3Nxc2pqQRN3IgQgASACc3FzampBA3ciAyACIARzcXNqakEHdyEBIAUoAiAiEiADIAEgBSgCHCIRIAQgAyAFKAIYIhAgAiAEIAEgAyAEc3FzampBC3ciAiABIANzcXNqakETdyIEIAEgAnNxc2pqQQN3IQMgBSgCLCIVIAQgAyAFKAIoIhQgAiAEIAUoAiQiEyABIAIgAyACIARzcXNqakEHdyIBIAMgBHNxc2pqQQt3IgIgASADc3FzampBE3chBCAPIBAgCSAVIBQgEyAFKAI4IhYgAiAEIAUoAjQiFyABIAIgBSgCMCIYIAMgASAEIAEgAnNxc2pqQQN3IgEgAiAEc3FzampBB3ciAiABIARzcXNqakELdyIDIAkgAiAMIAEgBSgCPCIJIAQgASADIAEgAnNxc2pqQRN3IgEgAiADcnEgAiADcXJqakGZ84nUBWpBA3ciAiABIANycSABIANxcmpqQZnzidQFakEFdyIEIAEgAnJxIAEgAnFyaiASakGZ84nUBWpBCXciAyAPIAQgCyACIBggASADIAIgBHJxIAIgBHFyampBmfOJ1AVqQQ13IgEgAyAEcnEgAyAEcXJqakGZ84nUBWpBA3ciAiABIANycSABIANxcmpqQZnzidQFakEFdyIEIAEgAnJxIAEgAnFyampBmfOJ1AVqQQl3IgMgECAEIAIgFyABIAMgAiAEcnEgAiAEcXJqakGZ84nUBWpBDXciASADIARycSADIARxcmogDWpBmfOJ1AVqQQN3IgIgASADcnEgASADcXJqakGZ84nUBWpBBXciBCABIAJycSABIAJxcmpqQZnzidQFakEJdyIDIBEgBCAOIAIgFiABIAMgAiAEcnEgAiAEcXJqakGZ84nUBWpBDXciASADIARycSADIARxcmpqQZnzidQFakEDdyICIAEgA3JxIAEgA3FyampBmfOJ1AVqQQV3IgQgASACcnEgASACcXJqakGZ84nUBWpBCXciAyAMIAIgAyAJIAEgAyACIARycSACIARxcmpqQZnzidQFakENdyIBcyAEc2pqQaHX5/YGakEDdyICIAQgASACcyADc2ogEmpBodfn9gZqQQl3IgRzIAFzampBodfn9gZqQQt3IgMgAiADIBggASADIARzIAJzampBodfn9gZqQQ93IgFzIARzaiANakGh1+f2BmpBA3ciAiAUIAQgASACcyADc2pqQaHX5/YGakEJdyIEcyABc2pqQaHX5/YGakELdyIDIAsgAiADIBYgASADIARzIAJzampBodfn9gZqQQ93IgFzIARzampBodfn9gZqQQN3IgIgEyAEIAEgAnMgA3NqakGh1+f2BmpBCXciBHMgAXNqakGh1+f2BmpBC3chAyAKIA4gAiADIBcgASADIARzIAJzampBodfn9gZqQQ93IgFzIARzampBodfn9gZqQQN3IgJqIQogBiAJIAEgESADIAIgFSAEIAEgAnMgA3NqakGh1+f2BmpBCXciBHMgAXNqakGh1+f2BmpBC3ciAyAEcyACc2pqQaHX5/YGakEPd2ohBiADIAdqIQcgBCAIaiEIIAVBQGshBQwBCwsgCiQBIAYkAiAHJAMgCCQECw0AIAAQASMAIABqJAAL/wQCA38BfiMAIABqrUIDhiEEIABByABqQUBxIgJBCGshAyAAIgFBAWohACABQYABOgAAA0AgACACSUEAIABBB3EbBEAgAEEAOgAAIABBAWohAAwBCwsDQCAAIAJJBEAgAEIANwMAIABBCGohAAwBCwsgAyAENwMAIAIQAUEAIwGtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEIIwKtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEQIwOtIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAEEYIwStIgRC//8DgyAEQoCA/P8Pg0IQhoQiBEL/gYCA8B+DIARCgP6DgIDgP4NCCIaEIgRCj4C8gPCBwAeDQgiGIARC8IHAh4CegPgAg0IEiIQiBEKGjJiw4MCBgwZ8QgSIQoGChIiQoMCAAYNCJ34gBEKw4MCBg4aMmDCEfDcDAAs=",
	    "base64"
	  )
	);
	//#endregion

	md4_1 = create.bind(null, md4, [], 64, 32);
	return md4_1;
}

var BulkUpdateDecorator_1;
var hasRequiredBulkUpdateDecorator;

function requireBulkUpdateDecorator () {
	if (hasRequiredBulkUpdateDecorator) return BulkUpdateDecorator_1;
	hasRequiredBulkUpdateDecorator = 1;
	const BULK_SIZE = 2000;

	// We are using an object instead of a Map as this will stay static during the runtime
	// so access to it can be optimized by v8
	const digestCaches = {};

	class BulkUpdateDecorator {
	  /**
	   * @param {Hash | function(): Hash} hashOrFactory function to create a hash
	   * @param {string=} hashKey key for caching
	   */
	  constructor(hashOrFactory, hashKey) {
	    this.hashKey = hashKey;

	    if (typeof hashOrFactory === "function") {
	      this.hashFactory = hashOrFactory;
	      this.hash = undefined;
	    } else {
	      this.hashFactory = undefined;
	      this.hash = hashOrFactory;
	    }

	    this.buffer = "";
	  }

	  /**
	   * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	   * @param {string|Buffer} data data
	   * @param {string=} inputEncoding data encoding
	   * @returns {this} updated hash
	   */
	  update(data, inputEncoding) {
	    if (
	      inputEncoding !== undefined ||
	      typeof data !== "string" ||
	      data.length > BULK_SIZE
	    ) {
	      if (this.hash === undefined) {
	        this.hash = this.hashFactory();
	      }

	      if (this.buffer.length > 0) {
	        this.hash.update(this.buffer);
	        this.buffer = "";
	      }

	      this.hash.update(data, inputEncoding);
	    } else {
	      this.buffer += data;

	      if (this.buffer.length > BULK_SIZE) {
	        if (this.hash === undefined) {
	          this.hash = this.hashFactory();
	        }

	        this.hash.update(this.buffer);
	        this.buffer = "";
	      }
	    }

	    return this;
	  }

	  /**
	   * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	   * @param {string=} encoding encoding of the return value
	   * @returns {string|Buffer} digest
	   */
	  digest(encoding) {
	    let digestCache;

	    const buffer = this.buffer;

	    if (this.hash === undefined) {
	      // short data for hash, we can use caching
	      const cacheKey = `${this.hashKey}-${encoding}`;

	      digestCache = digestCaches[cacheKey];

	      if (digestCache === undefined) {
	        digestCache = digestCaches[cacheKey] = new Map();
	      }

	      const cacheEntry = digestCache.get(buffer);

	      if (cacheEntry !== undefined) {
	        return cacheEntry;
	      }

	      this.hash = this.hashFactory();
	    }

	    if (buffer.length > 0) {
	      this.hash.update(buffer);
	    }

	    const digestResult = this.hash.digest(encoding);

	    if (digestCache !== undefined) {
	      digestCache.set(buffer, digestResult);
	    }

	    return digestResult;
	  }
	}

	BulkUpdateDecorator_1 = BulkUpdateDecorator;
	return BulkUpdateDecorator_1;
}

const baseEncodeTables = {
  26: "abcdefghijklmnopqrstuvwxyz",
  32: "123456789abcdefghjkmnpqrstuvwxyz", // no 0lio
  36: "0123456789abcdefghijklmnopqrstuvwxyz",
  49: "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", // no lIO
  52: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  58: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", // no 0lIO
  62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  64: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
};

/**
 * @param {Uint32Array} uint32Array Treated as a long base-0x100000000 number, little endian
 * @param {number} divisor The divisor
 * @return {number} Modulo (remainder) of the division
 */
function divmod32(uint32Array, divisor) {
  let carry = 0;
  for (let i = uint32Array.length - 1; i >= 0; i--) {
    const value = carry * 0x100000000 + uint32Array[i];
    carry = value % divisor;
    uint32Array[i] = Math.floor(value / divisor);
  }
  return carry;
}

function encodeBufferToBase(buffer, base, length) {
  const encodeTable = baseEncodeTables[base];

  if (!encodeTable) {
    throw new Error("Unknown encoding base" + base);
  }

  // Input bits are only enough to generate this many characters
  const limit = Math.ceil((buffer.length * 8) / Math.log2(base));
  length = Math.min(length, limit);

  // Most of the crypto digests (if not all) has length a multiple of 4 bytes.
  // Fewer numbers in the array means faster math.
  const uint32Array = new Uint32Array(Math.ceil(buffer.length / 4));

  // Make sure the input buffer data is copied and is not mutated by reference.
  // divmod32() would corrupt the BulkUpdateDecorator cache otherwise.
  buffer.copy(Buffer.from(uint32Array.buffer));

  let output = "";

  for (let i = 0; i < length; i++) {
    output = encodeTable[divmod32(uint32Array, base)] + output;
  }

  return output;
}

let crypto = undefined;
let createXXHash64 = undefined;
let createMd4 = undefined;
let BatchedHash = undefined;
let BulkUpdateDecorator = undefined;

function getHashDigest$1(buffer, algorithm, digestType, maxLength) {
  algorithm = algorithm || "xxhash64";
  maxLength = maxLength || 9999;

  let hash;

  if (algorithm === "xxhash64") {
    if (createXXHash64 === undefined) {
      createXXHash64 = requireXxhash64();

      if (BatchedHash === undefined) {
        BatchedHash = requireBatchedHash();
      }
    }

    hash = new BatchedHash(createXXHash64());
  } else if (algorithm === "md4") {
    if (createMd4 === undefined) {
      createMd4 = requireMd4();

      if (BatchedHash === undefined) {
        BatchedHash = requireBatchedHash();
      }
    }

    hash = new BatchedHash(createMd4());
  } else if (algorithm === "native-md4") {
    if (typeof crypto === "undefined") {
      crypto = require$$3;

      if (BulkUpdateDecorator === undefined) {
        BulkUpdateDecorator = requireBulkUpdateDecorator();
      }
    }

    hash = new BulkUpdateDecorator(() => crypto.createHash("md4"), "md4");
  } else {
    if (typeof crypto === "undefined") {
      crypto = require$$3;

      if (BulkUpdateDecorator === undefined) {
        BulkUpdateDecorator = requireBulkUpdateDecorator();
      }
    }

    hash = new BulkUpdateDecorator(
      () => crypto.createHash(algorithm),
      algorithm
    );
  }

  hash.update(buffer);

  if (
    digestType === "base26" ||
    digestType === "base32" ||
    digestType === "base36" ||
    digestType === "base49" ||
    digestType === "base52" ||
    digestType === "base58" ||
    digestType === "base62" ||
    digestType === "base64safe"
  ) {
    return encodeBufferToBase(
      hash.digest(),
      digestType === "base64safe" ? 64 : digestType.substr(4),
      maxLength
    );
  }

  return hash.digest(digestType || "hex").substr(0, maxLength);
}

var getHashDigest_1 = getHashDigest$1;

const path$1 = require$$0$1;
const getHashDigest = getHashDigest_1;

function interpolateName$1(loaderContext, name, options = {}) {
  let filename;

  const hasQuery =
    loaderContext.resourceQuery && loaderContext.resourceQuery.length > 1;

  if (typeof name === "function") {
    filename = name(
      loaderContext.resourcePath,
      hasQuery ? loaderContext.resourceQuery : undefined
    );
  } else {
    filename = name || "[hash].[ext]";
  }

  const context = options.context;
  const content = options.content;
  const regExp = options.regExp;

  let ext = "bin";
  let basename = "file";
  let directory = "";
  let folder = "";
  let query = "";

  if (loaderContext.resourcePath) {
    const parsed = path$1.parse(loaderContext.resourcePath);
    let resourcePath = loaderContext.resourcePath;

    if (parsed.ext) {
      ext = parsed.ext.substr(1);
    }

    if (parsed.dir) {
      basename = parsed.name;
      resourcePath = parsed.dir + path$1.sep;
    }

    if (typeof context !== "undefined") {
      directory = path$1
        .relative(context, resourcePath + "_")
        .replace(/\\/g, "/")
        .replace(/\.\.(\/)?/g, "_$1");
      directory = directory.substr(0, directory.length - 1);
    } else {
      directory = resourcePath.replace(/\\/g, "/").replace(/\.\.(\/)?/g, "_$1");
    }

    if (directory.length <= 1) {
      directory = "";
    } else {
      // directory.length > 1
      folder = path$1.basename(directory);
    }
  }

  if (loaderContext.resourceQuery && loaderContext.resourceQuery.length > 1) {
    query = loaderContext.resourceQuery;

    const hashIdx = query.indexOf("#");

    if (hashIdx >= 0) {
      query = query.substr(0, hashIdx);
    }
  }

  let url = filename;

  if (content) {
    // Match hash template
    url = url
      // `hash` and `contenthash` are same in `loader-utils` context
      // let's keep `hash` for backward compatibility
      .replace(
        /\[(?:([^[:\]]+):)?(?:hash|contenthash)(?::([a-z]+\d*(?:safe)?))?(?::(\d+))?\]/gi,
        (all, hashType, digestType, maxLength) =>
          getHashDigest(content, hashType, digestType, parseInt(maxLength, 10))
      );
  }

  url = url
    .replace(/\[ext\]/gi, () => ext)
    .replace(/\[name\]/gi, () => basename)
    .replace(/\[path\]/gi, () => directory)
    .replace(/\[folder\]/gi, () => folder)
    .replace(/\[query\]/gi, () => query);

  if (regExp && loaderContext.resourcePath) {
    const match = loaderContext.resourcePath.match(new RegExp(regExp));

    match &&
      match.forEach((matched, i) => {
        url = url.replace(new RegExp("\\[" + i + "\\]", "ig"), matched);
      });
  }

  if (
    typeof loaderContext.options === "object" &&
    typeof loaderContext.options.customInterpolateName === "function"
  ) {
    url = loaderContext.options.customInterpolateName.call(
      loaderContext,
      url,
      name,
      options
    );
  }

  return url;
}

var interpolateName_1 = interpolateName$1;

var interpolateName = interpolateName_1;
var path = require$$0$1;

/**
 * @param  {string} pattern
 * @param  {object} options
 * @param  {string} options.context
 * @param  {string} options.hashPrefix
 * @return {function}
 */
var genericNames = function createGenerator(pattern, options) {
  options = options || {};
  var context =
    options && typeof options.context === "string"
      ? options.context
      : process.cwd();
  var hashPrefix =
    options && typeof options.hashPrefix === "string" ? options.hashPrefix : "";

  /**
   * @param  {string} localName Usually a class name
   * @param  {string} filepath  Absolute path
   * @return {string}
   */
  return function generate(localName, filepath) {
    var name = pattern.replace(/\[local\]/gi, localName);
    var loaderContext = {
      resourcePath: filepath,
    };

    var loaderOptions = {
      content:
        hashPrefix +
        path.relative(context, filepath).replace(/\\/g, "/") +
        "\x00" +
        localName,
      context: context,
    };

    var genericName = interpolateName(loaderContext, name, loaderOptions);
    return genericName
      .replace(new RegExp("[^a-zA-Z0-9\\-_\u00A0-\uFFFF]", "g"), "-")
      .replace(/^((-?[0-9])|--)/, "_$1");
  };
};

var src$2 = {exports: {}};

var dist = {exports: {}};

var processor = {exports: {}};

var parser = {exports: {}};

var root$1 = {exports: {}};

var container = {exports: {}};

var node$1 = {exports: {}};

var util = {};

var unesc = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = unesc;
	// Many thanks for this post which made this migration much easier.
	// https://mathiasbynens.be/notes/css-escapes

	/**
	 * 
	 * @param {string} str 
	 * @returns {[string, number]|undefined}
	 */
	function gobbleHex(str) {
	  var lower = str.toLowerCase();
	  var hex = '';
	  var spaceTerminated = false;
	  for (var i = 0; i < 6 && lower[i] !== undefined; i++) {
	    var code = lower.charCodeAt(i);
	    // check to see if we are dealing with a valid hex char [a-f|0-9]
	    var valid = code >= 97 && code <= 102 || code >= 48 && code <= 57;
	    // https://drafts.csswg.org/css-syntax/#consume-escaped-code-point
	    spaceTerminated = code === 32;
	    if (!valid) {
	      break;
	    }
	    hex += lower[i];
	  }
	  if (hex.length === 0) {
	    return undefined;
	  }
	  var codePoint = parseInt(hex, 16);
	  var isSurrogate = codePoint >= 0xD800 && codePoint <= 0xDFFF;
	  // Add special case for
	  // "If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point"
	  // https://drafts.csswg.org/css-syntax/#maximum-allowed-code-point
	  if (isSurrogate || codePoint === 0x0000 || codePoint > 0x10FFFF) {
	    return ["\uFFFD", hex.length + (spaceTerminated ? 1 : 0)];
	  }
	  return [String.fromCodePoint(codePoint), hex.length + (spaceTerminated ? 1 : 0)];
	}
	var CONTAINS_ESCAPE = /\\/;
	function unesc(str) {
	  var needToProcess = CONTAINS_ESCAPE.test(str);
	  if (!needToProcess) {
	    return str;
	  }
	  var ret = "";
	  for (var i = 0; i < str.length; i++) {
	    if (str[i] === "\\") {
	      var gobbled = gobbleHex(str.slice(i + 1, i + 7));
	      if (gobbled !== undefined) {
	        ret += gobbled[0];
	        i += gobbled[1];
	        continue;
	      }

	      // Retain a pair of \\ if double escaped `\\\\`
	      // https://github.com/postcss/postcss-selector-parser/commit/268c9a7656fb53f543dc620aa5b73a30ec3ff20e
	      if (str[i + 1] === "\\") {
	        ret += "\\";
	        i++;
	        continue;
	      }

	      // if \\ is at the end of the string retain it
	      // https://github.com/postcss/postcss-selector-parser/commit/01a6b346e3612ce1ab20219acc26abdc259ccefb
	      if (str.length === i + 1) {
	        ret += str[i];
	      }
	      continue;
	    }
	    ret += str[i];
	  }
	  return ret;
	}
	module.exports = exports.default; 
} (unesc, unesc.exports));

var unescExports = unesc.exports;

var getProp = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = getProp;
	function getProp(obj) {
	  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	    props[_key - 1] = arguments[_key];
	  }
	  while (props.length > 0) {
	    var prop = props.shift();
	    if (!obj[prop]) {
	      return undefined;
	    }
	    obj = obj[prop];
	  }
	  return obj;
	}
	module.exports = exports.default; 
} (getProp, getProp.exports));

var getPropExports = getProp.exports;

var ensureObject = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = ensureObject;
	function ensureObject(obj) {
	  for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	    props[_key - 1] = arguments[_key];
	  }
	  while (props.length > 0) {
	    var prop = props.shift();
	    if (!obj[prop]) {
	      obj[prop] = {};
	    }
	    obj = obj[prop];
	  }
	}
	module.exports = exports.default; 
} (ensureObject, ensureObject.exports));

var ensureObjectExports = ensureObject.exports;

var stripComments = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = stripComments;
	function stripComments(str) {
	  var s = "";
	  var commentStart = str.indexOf("/*");
	  var lastEnd = 0;
	  while (commentStart >= 0) {
	    s = s + str.slice(lastEnd, commentStart);
	    var commentEnd = str.indexOf("*/", commentStart + 2);
	    if (commentEnd < 0) {
	      return s;
	    }
	    lastEnd = commentEnd + 2;
	    commentStart = str.indexOf("/*", lastEnd);
	  }
	  s = s + str.slice(lastEnd);
	  return s;
	}
	module.exports = exports.default; 
} (stripComments, stripComments.exports));

var stripCommentsExports = stripComments.exports;

util.__esModule = true;
util.unesc = util.stripComments = util.getProp = util.ensureObject = void 0;
var _unesc = _interopRequireDefault$3(unescExports);
util.unesc = _unesc["default"];
var _getProp = _interopRequireDefault$3(getPropExports);
util.getProp = _getProp["default"];
var _ensureObject = _interopRequireDefault$3(ensureObjectExports);
util.ensureObject = _ensureObject["default"];
var _stripComments = _interopRequireDefault$3(stripCommentsExports);
util.stripComments = _stripComments["default"];
function _interopRequireDefault$3(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _util = util;
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	var cloneNode = function cloneNode(obj, parent) {
	  if (typeof obj !== 'object' || obj === null) {
	    return obj;
	  }
	  var cloned = new obj.constructor();
	  for (var i in obj) {
	    if (!obj.hasOwnProperty(i)) {
	      continue;
	    }
	    var value = obj[i];
	    var type = typeof value;
	    if (i === 'parent' && type === 'object') {
	      if (parent) {
	        cloned[i] = parent;
	      }
	    } else if (value instanceof Array) {
	      cloned[i] = value.map(function (j) {
	        return cloneNode(j, cloned);
	      });
	    } else {
	      cloned[i] = cloneNode(value, cloned);
	    }
	  }
	  return cloned;
	};
	var Node = /*#__PURE__*/function () {
	  function Node(opts) {
	    if (opts === void 0) {
	      opts = {};
	    }
	    Object.assign(this, opts);
	    this.spaces = this.spaces || {};
	    this.spaces.before = this.spaces.before || '';
	    this.spaces.after = this.spaces.after || '';
	  }
	  var _proto = Node.prototype;
	  _proto.remove = function remove() {
	    if (this.parent) {
	      this.parent.removeChild(this);
	    }
	    this.parent = undefined;
	    return this;
	  };
	  _proto.replaceWith = function replaceWith() {
	    if (this.parent) {
	      for (var index in arguments) {
	        this.parent.insertBefore(this, arguments[index]);
	      }
	      this.remove();
	    }
	    return this;
	  };
	  _proto.next = function next() {
	    return this.parent.at(this.parent.index(this) + 1);
	  };
	  _proto.prev = function prev() {
	    return this.parent.at(this.parent.index(this) - 1);
	  };
	  _proto.clone = function clone(overrides) {
	    if (overrides === void 0) {
	      overrides = {};
	    }
	    var cloned = cloneNode(this);
	    for (var name in overrides) {
	      cloned[name] = overrides[name];
	    }
	    return cloned;
	  }

	  /**
	   * Some non-standard syntax doesn't follow normal escaping rules for css.
	   * This allows non standard syntax to be appended to an existing property
	   * by specifying the escaped value. By specifying the escaped value,
	   * illegal characters are allowed to be directly inserted into css output.
	   * @param {string} name the property to set
	   * @param {any} value the unescaped value of the property
	   * @param {string} valueEscaped optional. the escaped value of the property.
	   */;
	  _proto.appendToPropertyAndEscape = function appendToPropertyAndEscape(name, value, valueEscaped) {
	    if (!this.raws) {
	      this.raws = {};
	    }
	    var originalValue = this[name];
	    var originalEscaped = this.raws[name];
	    this[name] = originalValue + value; // this may trigger a setter that updates raws, so it has to be set first.
	    if (originalEscaped || valueEscaped !== value) {
	      this.raws[name] = (originalEscaped || originalValue) + valueEscaped;
	    } else {
	      delete this.raws[name]; // delete any escaped value that was created by the setter.
	    }
	  }

	  /**
	   * Some non-standard syntax doesn't follow normal escaping rules for css.
	   * This allows the escaped value to be specified directly, allowing illegal
	   * characters to be directly inserted into css output.
	   * @param {string} name the property to set
	   * @param {any} value the unescaped value of the property
	   * @param {string} valueEscaped the escaped value of the property.
	   */;
	  _proto.setPropertyAndEscape = function setPropertyAndEscape(name, value, valueEscaped) {
	    if (!this.raws) {
	      this.raws = {};
	    }
	    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
	    this.raws[name] = valueEscaped;
	  }

	  /**
	   * When you want a value to passed through to CSS directly. This method
	   * deletes the corresponding raw value causing the stringifier to fallback
	   * to the unescaped value.
	   * @param {string} name the property to set.
	   * @param {any} value The value that is both escaped and unescaped.
	   */;
	  _proto.setPropertyWithoutEscape = function setPropertyWithoutEscape(name, value) {
	    this[name] = value; // this may trigger a setter that updates raws, so it has to be set first.
	    if (this.raws) {
	      delete this.raws[name];
	    }
	  }

	  /**
	   *
	   * @param {number} line The number (starting with 1)
	   * @param {number} column The column number (starting with 1)
	   */;
	  _proto.isAtPosition = function isAtPosition(line, column) {
	    if (this.source && this.source.start && this.source.end) {
	      if (this.source.start.line > line) {
	        return false;
	      }
	      if (this.source.end.line < line) {
	        return false;
	      }
	      if (this.source.start.line === line && this.source.start.column > column) {
	        return false;
	      }
	      if (this.source.end.line === line && this.source.end.column < column) {
	        return false;
	      }
	      return true;
	    }
	    return undefined;
	  };
	  _proto.stringifyProperty = function stringifyProperty(name) {
	    return this.raws && this.raws[name] || this[name];
	  };
	  _proto.valueToString = function valueToString() {
	    return String(this.stringifyProperty("value"));
	  };
	  _proto.toString = function toString() {
	    return [this.rawSpaceBefore, this.valueToString(), this.rawSpaceAfter].join('');
	  };
	  _createClass(Node, [{
	    key: "rawSpaceBefore",
	    get: function get() {
	      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.before;
	      if (rawSpace === undefined) {
	        rawSpace = this.spaces && this.spaces.before;
	      }
	      return rawSpace || "";
	    },
	    set: function set(raw) {
	      (0, _util.ensureObject)(this, "raws", "spaces");
	      this.raws.spaces.before = raw;
	    }
	  }, {
	    key: "rawSpaceAfter",
	    get: function get() {
	      var rawSpace = this.raws && this.raws.spaces && this.raws.spaces.after;
	      if (rawSpace === undefined) {
	        rawSpace = this.spaces.after;
	      }
	      return rawSpace || "";
	    },
	    set: function set(raw) {
	      (0, _util.ensureObject)(this, "raws", "spaces");
	      this.raws.spaces.after = raw;
	    }
	  }]);
	  return Node;
	}();
	exports["default"] = Node;
	module.exports = exports.default; 
} (node$1, node$1.exports));

var nodeExports = node$1.exports;

var types = {};

types.__esModule = true;
types.UNIVERSAL = types.TAG = types.STRING = types.SELECTOR = types.ROOT = types.PSEUDO = types.NESTING = types.ID = types.COMMENT = types.COMBINATOR = types.CLASS = types.ATTRIBUTE = void 0;
var TAG = 'tag';
types.TAG = TAG;
var STRING = 'string';
types.STRING = STRING;
var SELECTOR = 'selector';
types.SELECTOR = SELECTOR;
var ROOT = 'root';
types.ROOT = ROOT;
var PSEUDO = 'pseudo';
types.PSEUDO = PSEUDO;
var NESTING = 'nesting';
types.NESTING = NESTING;
var ID = 'id';
types.ID = ID;
var COMMENT = 'comment';
types.COMMENT = COMMENT;
var COMBINATOR = 'combinator';
types.COMBINATOR = COMBINATOR;
var CLASS = 'class';
types.CLASS = CLASS;
var ATTRIBUTE = 'attribute';
types.ATTRIBUTE = ATTRIBUTE;
var UNIVERSAL = 'universal';
types.UNIVERSAL = UNIVERSAL;

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var types$1 = _interopRequireWildcard(types);
	function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
	function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike) { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Container = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(Container, _Node);
	  function Container(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    if (!_this.nodes) {
	      _this.nodes = [];
	    }
	    return _this;
	  }
	  var _proto = Container.prototype;
	  _proto.append = function append(selector) {
	    selector.parent = this;
	    this.nodes.push(selector);
	    return this;
	  };
	  _proto.prepend = function prepend(selector) {
	    selector.parent = this;
	    this.nodes.unshift(selector);
	    for (var id in this.indexes) {
	      this.indexes[id]++;
	    }
	    return this;
	  };
	  _proto.at = function at(index) {
	    return this.nodes[index];
	  };
	  _proto.index = function index(child) {
	    if (typeof child === 'number') {
	      return child;
	    }
	    return this.nodes.indexOf(child);
	  };
	  _proto.removeChild = function removeChild(child) {
	    child = this.index(child);
	    this.at(child).parent = undefined;
	    this.nodes.splice(child, 1);
	    var index;
	    for (var id in this.indexes) {
	      index = this.indexes[id];
	      if (index >= child) {
	        this.indexes[id] = index - 1;
	      }
	    }
	    return this;
	  };
	  _proto.removeAll = function removeAll() {
	    for (var _iterator = _createForOfIteratorHelperLoose(this.nodes), _step; !(_step = _iterator()).done;) {
	      var node = _step.value;
	      node.parent = undefined;
	    }
	    this.nodes = [];
	    return this;
	  };
	  _proto.empty = function empty() {
	    return this.removeAll();
	  };
	  _proto.insertAfter = function insertAfter(oldNode, newNode) {
	    var _this$nodes;
	    newNode.parent = this;
	    var oldIndex = this.index(oldNode);
	    var resetNode = [];
	    for (var i = 2; i < arguments.length; i++) {
	      resetNode.push(arguments[i]);
	    }
	    (_this$nodes = this.nodes).splice.apply(_this$nodes, [oldIndex + 1, 0, newNode].concat(resetNode));
	    newNode.parent = this;
	    var index;
	    for (var id in this.indexes) {
	      index = this.indexes[id];
	      if (oldIndex < index) {
	        this.indexes[id] = index + arguments.length - 1;
	      }
	    }
	    return this;
	  };
	  _proto.insertBefore = function insertBefore(oldNode, newNode) {
	    var _this$nodes2;
	    newNode.parent = this;
	    var oldIndex = this.index(oldNode);
	    var resetNode = [];
	    for (var i = 2; i < arguments.length; i++) {
	      resetNode.push(arguments[i]);
	    }
	    (_this$nodes2 = this.nodes).splice.apply(_this$nodes2, [oldIndex, 0, newNode].concat(resetNode));
	    newNode.parent = this;
	    var index;
	    for (var id in this.indexes) {
	      index = this.indexes[id];
	      if (index >= oldIndex) {
	        this.indexes[id] = index + arguments.length - 1;
	      }
	    }
	    return this;
	  };
	  _proto._findChildAtPosition = function _findChildAtPosition(line, col) {
	    var found = undefined;
	    this.each(function (node) {
	      if (node.atPosition) {
	        var foundChild = node.atPosition(line, col);
	        if (foundChild) {
	          found = foundChild;
	          return false;
	        }
	      } else if (node.isAtPosition(line, col)) {
	        found = node;
	        return false;
	      }
	    });
	    return found;
	  }

	  /**
	   * Return the most specific node at the line and column number given.
	   * The source location is based on the original parsed location, locations aren't
	   * updated as selector nodes are mutated.
	   *
	   * Note that this location is relative to the location of the first character
	   * of the selector, and not the location of the selector in the overall document
	   * when used in conjunction with postcss.
	   *
	   * If not found, returns undefined.
	   * @param {number} line The line number of the node to find. (1-based index)
	   * @param {number} col  The column number of the node to find. (1-based index)
	   */;
	  _proto.atPosition = function atPosition(line, col) {
	    if (this.isAtPosition(line, col)) {
	      return this._findChildAtPosition(line, col) || this;
	    } else {
	      return undefined;
	    }
	  };
	  _proto._inferEndPosition = function _inferEndPosition() {
	    if (this.last && this.last.source && this.last.source.end) {
	      this.source = this.source || {};
	      this.source.end = this.source.end || {};
	      Object.assign(this.source.end, this.last.source.end);
	    }
	  };
	  _proto.each = function each(callback) {
	    if (!this.lastEach) {
	      this.lastEach = 0;
	    }
	    if (!this.indexes) {
	      this.indexes = {};
	    }
	    this.lastEach++;
	    var id = this.lastEach;
	    this.indexes[id] = 0;
	    if (!this.length) {
	      return undefined;
	    }
	    var index, result;
	    while (this.indexes[id] < this.length) {
	      index = this.indexes[id];
	      result = callback(this.at(index), index);
	      if (result === false) {
	        break;
	      }
	      this.indexes[id] += 1;
	    }
	    delete this.indexes[id];
	    if (result === false) {
	      return false;
	    }
	  };
	  _proto.walk = function walk(callback) {
	    return this.each(function (node, i) {
	      var result = callback(node, i);
	      if (result !== false && node.length) {
	        result = node.walk(callback);
	      }
	      if (result === false) {
	        return false;
	      }
	    });
	  };
	  _proto.walkAttributes = function walkAttributes(callback) {
	    var _this2 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.ATTRIBUTE) {
	        return callback.call(_this2, selector);
	      }
	    });
	  };
	  _proto.walkClasses = function walkClasses(callback) {
	    var _this3 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.CLASS) {
	        return callback.call(_this3, selector);
	      }
	    });
	  };
	  _proto.walkCombinators = function walkCombinators(callback) {
	    var _this4 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.COMBINATOR) {
	        return callback.call(_this4, selector);
	      }
	    });
	  };
	  _proto.walkComments = function walkComments(callback) {
	    var _this5 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.COMMENT) {
	        return callback.call(_this5, selector);
	      }
	    });
	  };
	  _proto.walkIds = function walkIds(callback) {
	    var _this6 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.ID) {
	        return callback.call(_this6, selector);
	      }
	    });
	  };
	  _proto.walkNesting = function walkNesting(callback) {
	    var _this7 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.NESTING) {
	        return callback.call(_this7, selector);
	      }
	    });
	  };
	  _proto.walkPseudos = function walkPseudos(callback) {
	    var _this8 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.PSEUDO) {
	        return callback.call(_this8, selector);
	      }
	    });
	  };
	  _proto.walkTags = function walkTags(callback) {
	    var _this9 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.TAG) {
	        return callback.call(_this9, selector);
	      }
	    });
	  };
	  _proto.walkUniversals = function walkUniversals(callback) {
	    var _this10 = this;
	    return this.walk(function (selector) {
	      if (selector.type === types$1.UNIVERSAL) {
	        return callback.call(_this10, selector);
	      }
	    });
	  };
	  _proto.split = function split(callback) {
	    var _this11 = this;
	    var current = [];
	    return this.reduce(function (memo, node, index) {
	      var split = callback.call(_this11, node);
	      current.push(node);
	      if (split) {
	        memo.push(current);
	        current = [];
	      } else if (index === _this11.length - 1) {
	        memo.push(current);
	      }
	      return memo;
	    }, []);
	  };
	  _proto.map = function map(callback) {
	    return this.nodes.map(callback);
	  };
	  _proto.reduce = function reduce(callback, memo) {
	    return this.nodes.reduce(callback, memo);
	  };
	  _proto.every = function every(callback) {
	    return this.nodes.every(callback);
	  };
	  _proto.some = function some(callback) {
	    return this.nodes.some(callback);
	  };
	  _proto.filter = function filter(callback) {
	    return this.nodes.filter(callback);
	  };
	  _proto.sort = function sort(callback) {
	    return this.nodes.sort(callback);
	  };
	  _proto.toString = function toString() {
	    return this.map(String).join('');
	  };
	  _createClass(Container, [{
	    key: "first",
	    get: function get() {
	      return this.at(0);
	    }
	  }, {
	    key: "last",
	    get: function get() {
	      return this.at(this.length - 1);
	    }
	  }, {
	    key: "length",
	    get: function get() {
	      return this.nodes.length;
	    }
	  }]);
	  return Container;
	}(_node["default"]);
	exports["default"] = Container;
	module.exports = exports.default; 
} (container, container.exports));

var containerExports = container.exports;

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _container = _interopRequireDefault(containerExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Root = /*#__PURE__*/function (_Container) {
	  _inheritsLoose(Root, _Container);
	  function Root(opts) {
	    var _this;
	    _this = _Container.call(this, opts) || this;
	    _this.type = _types.ROOT;
	    return _this;
	  }
	  var _proto = Root.prototype;
	  _proto.toString = function toString() {
	    var str = this.reduce(function (memo, selector) {
	      memo.push(String(selector));
	      return memo;
	    }, []).join(',');
	    return this.trailingComma ? str + ',' : str;
	  };
	  _proto.error = function error(message, options) {
	    if (this._error) {
	      return this._error(message, options);
	    } else {
	      return new Error(message);
	    }
	  };
	  _createClass(Root, [{
	    key: "errorGenerator",
	    set: function set(handler) {
	      this._error = handler;
	    }
	  }]);
	  return Root;
	}(_container["default"]);
	exports["default"] = Root;
	module.exports = exports.default; 
} (root$1, root$1.exports));

var rootExports = root$1.exports;

var selector$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _container = _interopRequireDefault(containerExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Selector = /*#__PURE__*/function (_Container) {
	  _inheritsLoose(Selector, _Container);
	  function Selector(opts) {
	    var _this;
	    _this = _Container.call(this, opts) || this;
	    _this.type = _types.SELECTOR;
	    return _this;
	  }
	  return Selector;
	}(_container["default"]);
	exports["default"] = Selector;
	module.exports = exports.default; 
} (selector$1, selector$1.exports));

var selectorExports = selector$1.exports;

var className$1 = {exports: {}};

/*! https://mths.be/cssesc v3.0.0 by @mathias */

var object = {};
var hasOwnProperty$1 = object.hasOwnProperty;
var merge = function merge(options, defaults) {
	if (!options) {
		return defaults;
	}
	var result = {};
	for (var key in defaults) {
		// `if (defaults.hasOwnProperty(key) { … }` is not needed here, since
		// only recognized option names are used.
		result[key] = hasOwnProperty$1.call(options, key) ? options[key] : defaults[key];
	}
	return result;
};

var regexAnySingleEscape = /[ -,\.\/:-@\[-\^`\{-~]/;
var regexSingleEscape = /[ -,\.\/:-@\[\]\^`\{-~]/;
var regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g;

// https://mathiasbynens.be/notes/css-escapes#css
var cssesc = function cssesc(string, options) {
	options = merge(options, cssesc.options);
	if (options.quotes != 'single' && options.quotes != 'double') {
		options.quotes = 'single';
	}
	var quote = options.quotes == 'double' ? '"' : '\'';
	var isIdentifier = options.isIdentifier;

	var firstChar = string.charAt(0);
	var output = '';
	var counter = 0;
	var length = string.length;
	while (counter < length) {
		var character = string.charAt(counter++);
		var codePoint = character.charCodeAt();
		var value = void 0;
		// If it’s not a printable ASCII character…
		if (codePoint < 0x20 || codePoint > 0x7E) {
			if (codePoint >= 0xD800 && codePoint <= 0xDBFF && counter < length) {
				// It’s a high surrogate, and there is a next character.
				var extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) {
					// next character is low surrogate
					codePoint = ((codePoint & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
				} else {
					// It’s an unmatched surrogate; only append this code unit, in case
					// the next code unit is the high surrogate of a surrogate pair.
					counter--;
				}
			}
			value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
		} else {
			if (options.escapeEverything) {
				if (regexAnySingleEscape.test(character)) {
					value = '\\' + character;
				} else {
					value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
				}
			} else if (/[\t\n\f\r\x0B]/.test(character)) {
				value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
			} else if (character == '\\' || !isIdentifier && (character == '"' && quote == character || character == '\'' && quote == character) || isIdentifier && regexSingleEscape.test(character)) {
				value = '\\' + character;
			} else {
				value = character;
			}
		}
		output += value;
	}

	if (isIdentifier) {
		if (/^-[-\d]/.test(output)) {
			output = '\\-' + output.slice(1);
		} else if (/\d/.test(firstChar)) {
			output = '\\3' + firstChar + ' ' + output.slice(1);
		}
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, function ($0, $1, $2) {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}
		// Strip the space.
		return ($1 || '') + $2;
	});

	if (!isIdentifier && options.wrap) {
		return quote + output + quote;
	}
	return output;
};

// Expose default options (so they can be overridden globally).
cssesc.options = {
	'escapeEverything': false,
	'isIdentifier': false,
	'quotes': 'single',
	'wrap': false
};

cssesc.version = '3.0.0';

var cssesc_1 = cssesc;

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _cssesc = _interopRequireDefault(cssesc_1);
	var _util = util;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var ClassName = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(ClassName, _Node);
	  function ClassName(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.CLASS;
	    _this._constructed = true;
	    return _this;
	  }
	  var _proto = ClassName.prototype;
	  _proto.valueToString = function valueToString() {
	    return '.' + _Node.prototype.valueToString.call(this);
	  };
	  _createClass(ClassName, [{
	    key: "value",
	    get: function get() {
	      return this._value;
	    },
	    set: function set(v) {
	      if (this._constructed) {
	        var escaped = (0, _cssesc["default"])(v, {
	          isIdentifier: true
	        });
	        if (escaped !== v) {
	          (0, _util.ensureObject)(this, "raws");
	          this.raws.value = escaped;
	        } else if (this.raws) {
	          delete this.raws.value;
	        }
	      }
	      this._value = v;
	    }
	  }]);
	  return ClassName;
	}(_node["default"]);
	exports["default"] = ClassName;
	module.exports = exports.default; 
} (className$1, className$1.exports));

var classNameExports = className$1.exports;

var comment$2 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Comment = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(Comment, _Node);
	  function Comment(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.COMMENT;
	    return _this;
	  }
	  return Comment;
	}(_node["default"]);
	exports["default"] = Comment;
	module.exports = exports.default; 
} (comment$2, comment$2.exports));

var commentExports = comment$2.exports;

var id$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var ID = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(ID, _Node);
	  function ID(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.ID;
	    return _this;
	  }
	  var _proto = ID.prototype;
	  _proto.valueToString = function valueToString() {
	    return '#' + _Node.prototype.valueToString.call(this);
	  };
	  return ID;
	}(_node["default"]);
	exports["default"] = ID;
	module.exports = exports.default; 
} (id$1, id$1.exports));

var idExports = id$1.exports;

var tag$1 = {exports: {}};

var namespace = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _cssesc = _interopRequireDefault(cssesc_1);
	var _util = util;
	var _node = _interopRequireDefault(nodeExports);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Namespace = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(Namespace, _Node);
	  function Namespace() {
	    return _Node.apply(this, arguments) || this;
	  }
	  var _proto = Namespace.prototype;
	  _proto.qualifiedName = function qualifiedName(value) {
	    if (this.namespace) {
	      return this.namespaceString + "|" + value;
	    } else {
	      return value;
	    }
	  };
	  _proto.valueToString = function valueToString() {
	    return this.qualifiedName(_Node.prototype.valueToString.call(this));
	  };
	  _createClass(Namespace, [{
	    key: "namespace",
	    get: function get() {
	      return this._namespace;
	    },
	    set: function set(namespace) {
	      if (namespace === true || namespace === "*" || namespace === "&") {
	        this._namespace = namespace;
	        if (this.raws) {
	          delete this.raws.namespace;
	        }
	        return;
	      }
	      var escaped = (0, _cssesc["default"])(namespace, {
	        isIdentifier: true
	      });
	      this._namespace = namespace;
	      if (escaped !== namespace) {
	        (0, _util.ensureObject)(this, "raws");
	        this.raws.namespace = escaped;
	      } else if (this.raws) {
	        delete this.raws.namespace;
	      }
	    }
	  }, {
	    key: "ns",
	    get: function get() {
	      return this._namespace;
	    },
	    set: function set(namespace) {
	      this.namespace = namespace;
	    }
	  }, {
	    key: "namespaceString",
	    get: function get() {
	      if (this.namespace) {
	        var ns = this.stringifyProperty("namespace");
	        if (ns === true) {
	          return '';
	        } else {
	          return ns;
	        }
	      } else {
	        return '';
	      }
	    }
	  }]);
	  return Namespace;
	}(_node["default"]);
	exports["default"] = Namespace;
	module.exports = exports.default; 
} (namespace, namespace.exports));

var namespaceExports = namespace.exports;

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _namespace = _interopRequireDefault(namespaceExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Tag = /*#__PURE__*/function (_Namespace) {
	  _inheritsLoose(Tag, _Namespace);
	  function Tag(opts) {
	    var _this;
	    _this = _Namespace.call(this, opts) || this;
	    _this.type = _types.TAG;
	    return _this;
	  }
	  return Tag;
	}(_namespace["default"]);
	exports["default"] = Tag;
	module.exports = exports.default; 
} (tag$1, tag$1.exports));

var tagExports = tag$1.exports;

var string$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var String = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(String, _Node);
	  function String(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.STRING;
	    return _this;
	  }
	  return String;
	}(_node["default"]);
	exports["default"] = String;
	module.exports = exports.default; 
} (string$1, string$1.exports));

var stringExports = string$1.exports;

var pseudo$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _container = _interopRequireDefault(containerExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Pseudo = /*#__PURE__*/function (_Container) {
	  _inheritsLoose(Pseudo, _Container);
	  function Pseudo(opts) {
	    var _this;
	    _this = _Container.call(this, opts) || this;
	    _this.type = _types.PSEUDO;
	    return _this;
	  }
	  var _proto = Pseudo.prototype;
	  _proto.toString = function toString() {
	    var params = this.length ? '(' + this.map(String).join(',') + ')' : '';
	    return [this.rawSpaceBefore, this.stringifyProperty("value"), params, this.rawSpaceAfter].join('');
	  };
	  return Pseudo;
	}(_container["default"]);
	exports["default"] = Pseudo;
	module.exports = exports.default; 
} (pseudo$1, pseudo$1.exports));

var pseudoExports = pseudo$1.exports;

var attribute$1 = {};

/**
 * For Node.js, simply re-export the core `util.deprecate` function.
 */

var node = require$$1.deprecate;

(function (exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	exports.unescapeValue = unescapeValue;
	var _cssesc = _interopRequireDefault(cssesc_1);
	var _unesc = _interopRequireDefault(unescExports);
	var _namespace = _interopRequireDefault(namespaceExports);
	var _types = types;
	var _CSSESC_QUOTE_OPTIONS;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var deprecate = node;
	var WRAPPED_IN_QUOTES = /^('|")([^]*)\1$/;
	var warnOfDeprecatedValueAssignment = deprecate(function () {}, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. " + "Call attribute.setValue() instead.");
	var warnOfDeprecatedQuotedAssignment = deprecate(function () {}, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead.");
	var warnOfDeprecatedConstructor = deprecate(function () {}, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");
	function unescapeValue(value) {
	  var deprecatedUsage = false;
	  var quoteMark = null;
	  var unescaped = value;
	  var m = unescaped.match(WRAPPED_IN_QUOTES);
	  if (m) {
	    quoteMark = m[1];
	    unescaped = m[2];
	  }
	  unescaped = (0, _unesc["default"])(unescaped);
	  if (unescaped !== value) {
	    deprecatedUsage = true;
	  }
	  return {
	    deprecatedUsage: deprecatedUsage,
	    unescaped: unescaped,
	    quoteMark: quoteMark
	  };
	}
	function handleDeprecatedContructorOpts(opts) {
	  if (opts.quoteMark !== undefined) {
	    return opts;
	  }
	  if (opts.value === undefined) {
	    return opts;
	  }
	  warnOfDeprecatedConstructor();
	  var _unescapeValue = unescapeValue(opts.value),
	    quoteMark = _unescapeValue.quoteMark,
	    unescaped = _unescapeValue.unescaped;
	  if (!opts.raws) {
	    opts.raws = {};
	  }
	  if (opts.raws.value === undefined) {
	    opts.raws.value = opts.value;
	  }
	  opts.value = unescaped;
	  opts.quoteMark = quoteMark;
	  return opts;
	}
	var Attribute = /*#__PURE__*/function (_Namespace) {
	  _inheritsLoose(Attribute, _Namespace);
	  function Attribute(opts) {
	    var _this;
	    if (opts === void 0) {
	      opts = {};
	    }
	    _this = _Namespace.call(this, handleDeprecatedContructorOpts(opts)) || this;
	    _this.type = _types.ATTRIBUTE;
	    _this.raws = _this.raws || {};
	    Object.defineProperty(_this.raws, 'unquoted', {
	      get: deprecate(function () {
	        return _this.value;
	      }, "attr.raws.unquoted is deprecated. Call attr.value instead."),
	      set: deprecate(function () {
	        return _this.value;
	      }, "Setting attr.raws.unquoted is deprecated and has no effect. attr.value is unescaped by default now.")
	    });
	    _this._constructed = true;
	    return _this;
	  }

	  /**
	   * Returns the Attribute's value quoted such that it would be legal to use
	   * in the value of a css file. The original value's quotation setting
	   * used for stringification is left unchanged. See `setValue(value, options)`
	   * if you want to control the quote settings of a new value for the attribute.
	   *
	   * You can also change the quotation used for the current value by setting quoteMark.
	   *
	   * Options:
	   *   * quoteMark {'"' | "'" | null} - Use this value to quote the value. If this
	   *     option is not set, the original value for quoteMark will be used. If
	   *     indeterminate, a double quote is used. The legal values are:
	   *     * `null` - the value will be unquoted and characters will be escaped as necessary.
	   *     * `'` - the value will be quoted with a single quote and single quotes are escaped.
	   *     * `"` - the value will be quoted with a double quote and double quotes are escaped.
	   *   * preferCurrentQuoteMark {boolean} - if true, prefer the source quote mark
	   *     over the quoteMark option value.
	   *   * smart {boolean} - if true, will select a quote mark based on the value
	   *     and the other options specified here. See the `smartQuoteMark()`
	   *     method.
	   **/
	  var _proto = Attribute.prototype;
	  _proto.getQuotedValue = function getQuotedValue(options) {
	    if (options === void 0) {
	      options = {};
	    }
	    var quoteMark = this._determineQuoteMark(options);
	    var cssescopts = CSSESC_QUOTE_OPTIONS[quoteMark];
	    var escaped = (0, _cssesc["default"])(this._value, cssescopts);
	    return escaped;
	  };
	  _proto._determineQuoteMark = function _determineQuoteMark(options) {
	    return options.smart ? this.smartQuoteMark(options) : this.preferredQuoteMark(options);
	  }

	  /**
	   * Set the unescaped value with the specified quotation options. The value
	   * provided must not include any wrapping quote marks -- those quotes will
	   * be interpreted as part of the value and escaped accordingly.
	   */;
	  _proto.setValue = function setValue(value, options) {
	    if (options === void 0) {
	      options = {};
	    }
	    this._value = value;
	    this._quoteMark = this._determineQuoteMark(options);
	    this._syncRawValue();
	  }

	  /**
	   * Intelligently select a quoteMark value based on the value's contents. If
	   * the value is a legal CSS ident, it will not be quoted. Otherwise a quote
	   * mark will be picked that minimizes the number of escapes.
	   *
	   * If there's no clear winner, the quote mark from these options is used,
	   * then the source quote mark (this is inverted if `preferCurrentQuoteMark` is
	   * true). If the quoteMark is unspecified, a double quote is used.
	   *
	   * @param options This takes the quoteMark and preferCurrentQuoteMark options
	   * from the quoteValue method.
	   */;
	  _proto.smartQuoteMark = function smartQuoteMark(options) {
	    var v = this.value;
	    var numSingleQuotes = v.replace(/[^']/g, '').length;
	    var numDoubleQuotes = v.replace(/[^"]/g, '').length;
	    if (numSingleQuotes + numDoubleQuotes === 0) {
	      var escaped = (0, _cssesc["default"])(v, {
	        isIdentifier: true
	      });
	      if (escaped === v) {
	        return Attribute.NO_QUOTE;
	      } else {
	        var pref = this.preferredQuoteMark(options);
	        if (pref === Attribute.NO_QUOTE) {
	          // pick a quote mark that isn't none and see if it's smaller
	          var quote = this.quoteMark || options.quoteMark || Attribute.DOUBLE_QUOTE;
	          var opts = CSSESC_QUOTE_OPTIONS[quote];
	          var quoteValue = (0, _cssesc["default"])(v, opts);
	          if (quoteValue.length < escaped.length) {
	            return quote;
	          }
	        }
	        return pref;
	      }
	    } else if (numDoubleQuotes === numSingleQuotes) {
	      return this.preferredQuoteMark(options);
	    } else if (numDoubleQuotes < numSingleQuotes) {
	      return Attribute.DOUBLE_QUOTE;
	    } else {
	      return Attribute.SINGLE_QUOTE;
	    }
	  }

	  /**
	   * Selects the preferred quote mark based on the options and the current quote mark value.
	   * If you want the quote mark to depend on the attribute value, call `smartQuoteMark(opts)`
	   * instead.
	   */;
	  _proto.preferredQuoteMark = function preferredQuoteMark(options) {
	    var quoteMark = options.preferCurrentQuoteMark ? this.quoteMark : options.quoteMark;
	    if (quoteMark === undefined) {
	      quoteMark = options.preferCurrentQuoteMark ? options.quoteMark : this.quoteMark;
	    }
	    if (quoteMark === undefined) {
	      quoteMark = Attribute.DOUBLE_QUOTE;
	    }
	    return quoteMark;
	  };
	  _proto._syncRawValue = function _syncRawValue() {
	    var rawValue = (0, _cssesc["default"])(this._value, CSSESC_QUOTE_OPTIONS[this.quoteMark]);
	    if (rawValue === this._value) {
	      if (this.raws) {
	        delete this.raws.value;
	      }
	    } else {
	      this.raws.value = rawValue;
	    }
	  };
	  _proto._handleEscapes = function _handleEscapes(prop, value) {
	    if (this._constructed) {
	      var escaped = (0, _cssesc["default"])(value, {
	        isIdentifier: true
	      });
	      if (escaped !== value) {
	        this.raws[prop] = escaped;
	      } else {
	        delete this.raws[prop];
	      }
	    }
	  };
	  _proto._spacesFor = function _spacesFor(name) {
	    var attrSpaces = {
	      before: '',
	      after: ''
	    };
	    var spaces = this.spaces[name] || {};
	    var rawSpaces = this.raws.spaces && this.raws.spaces[name] || {};
	    return Object.assign(attrSpaces, spaces, rawSpaces);
	  };
	  _proto._stringFor = function _stringFor(name, spaceName, concat) {
	    if (spaceName === void 0) {
	      spaceName = name;
	    }
	    if (concat === void 0) {
	      concat = defaultAttrConcat;
	    }
	    var attrSpaces = this._spacesFor(spaceName);
	    return concat(this.stringifyProperty(name), attrSpaces);
	  }

	  /**
	   * returns the offset of the attribute part specified relative to the
	   * start of the node of the output string.
	   *
	   * * "ns" - alias for "namespace"
	   * * "namespace" - the namespace if it exists.
	   * * "attribute" - the attribute name
	   * * "attributeNS" - the start of the attribute or its namespace
	   * * "operator" - the match operator of the attribute
	   * * "value" - The value (string or identifier)
	   * * "insensitive" - the case insensitivity flag;
	   * @param part One of the possible values inside an attribute.
	   * @returns -1 if the name is invalid or the value doesn't exist in this attribute.
	   */;
	  _proto.offsetOf = function offsetOf(name) {
	    var count = 1;
	    var attributeSpaces = this._spacesFor("attribute");
	    count += attributeSpaces.before.length;
	    if (name === "namespace" || name === "ns") {
	      return this.namespace ? count : -1;
	    }
	    if (name === "attributeNS") {
	      return count;
	    }
	    count += this.namespaceString.length;
	    if (this.namespace) {
	      count += 1;
	    }
	    if (name === "attribute") {
	      return count;
	    }
	    count += this.stringifyProperty("attribute").length;
	    count += attributeSpaces.after.length;
	    var operatorSpaces = this._spacesFor("operator");
	    count += operatorSpaces.before.length;
	    var operator = this.stringifyProperty("operator");
	    if (name === "operator") {
	      return operator ? count : -1;
	    }
	    count += operator.length;
	    count += operatorSpaces.after.length;
	    var valueSpaces = this._spacesFor("value");
	    count += valueSpaces.before.length;
	    var value = this.stringifyProperty("value");
	    if (name === "value") {
	      return value ? count : -1;
	    }
	    count += value.length;
	    count += valueSpaces.after.length;
	    var insensitiveSpaces = this._spacesFor("insensitive");
	    count += insensitiveSpaces.before.length;
	    if (name === "insensitive") {
	      return this.insensitive ? count : -1;
	    }
	    return -1;
	  };
	  _proto.toString = function toString() {
	    var _this2 = this;
	    var selector = [this.rawSpaceBefore, '['];
	    selector.push(this._stringFor('qualifiedAttribute', 'attribute'));
	    if (this.operator && (this.value || this.value === '')) {
	      selector.push(this._stringFor('operator'));
	      selector.push(this._stringFor('value'));
	      selector.push(this._stringFor('insensitiveFlag', 'insensitive', function (attrValue, attrSpaces) {
	        if (attrValue.length > 0 && !_this2.quoted && attrSpaces.before.length === 0 && !(_this2.spaces.value && _this2.spaces.value.after)) {
	          attrSpaces.before = " ";
	        }
	        return defaultAttrConcat(attrValue, attrSpaces);
	      }));
	    }
	    selector.push(']');
	    selector.push(this.rawSpaceAfter);
	    return selector.join('');
	  };
	  _createClass(Attribute, [{
	    key: "quoted",
	    get: function get() {
	      var qm = this.quoteMark;
	      return qm === "'" || qm === '"';
	    },
	    set: function set(value) {
	      warnOfDeprecatedQuotedAssignment();
	    }

	    /**
	     * returns a single (`'`) or double (`"`) quote character if the value is quoted.
	     * returns `null` if the value is not quoted.
	     * returns `undefined` if the quotation state is unknown (this can happen when
	     * the attribute is constructed without specifying a quote mark.)
	     */
	  }, {
	    key: "quoteMark",
	    get: function get() {
	      return this._quoteMark;
	    }

	    /**
	     * Set the quote mark to be used by this attribute's value.
	     * If the quote mark changes, the raw (escaped) value at `attr.raws.value` of the attribute
	     * value is updated accordingly.
	     *
	     * @param {"'" | '"' | null} quoteMark The quote mark or `null` if the value should be unquoted.
	     */,
	    set: function set(quoteMark) {
	      if (!this._constructed) {
	        this._quoteMark = quoteMark;
	        return;
	      }
	      if (this._quoteMark !== quoteMark) {
	        this._quoteMark = quoteMark;
	        this._syncRawValue();
	      }
	    }
	  }, {
	    key: "qualifiedAttribute",
	    get: function get() {
	      return this.qualifiedName(this.raws.attribute || this.attribute);
	    }
	  }, {
	    key: "insensitiveFlag",
	    get: function get() {
	      return this.insensitive ? 'i' : '';
	    }
	  }, {
	    key: "value",
	    get: function get() {
	      return this._value;
	    },
	    set:
	    /**
	     * Before 3.0, the value had to be set to an escaped value including any wrapped
	     * quote marks. In 3.0, the semantics of `Attribute.value` changed so that the value
	     * is unescaped during parsing and any quote marks are removed.
	     *
	     * Because the ambiguity of this semantic change, if you set `attr.value = newValue`,
	     * a deprecation warning is raised when the new value contains any characters that would
	     * require escaping (including if it contains wrapped quotes).
	     *
	     * Instead, you should call `attr.setValue(newValue, opts)` and pass options that describe
	     * how the new value is quoted.
	     */
	    function set(v) {
	      if (this._constructed) {
	        var _unescapeValue2 = unescapeValue(v),
	          deprecatedUsage = _unescapeValue2.deprecatedUsage,
	          unescaped = _unescapeValue2.unescaped,
	          quoteMark = _unescapeValue2.quoteMark;
	        if (deprecatedUsage) {
	          warnOfDeprecatedValueAssignment();
	        }
	        if (unescaped === this._value && quoteMark === this._quoteMark) {
	          return;
	        }
	        this._value = unescaped;
	        this._quoteMark = quoteMark;
	        this._syncRawValue();
	      } else {
	        this._value = v;
	      }
	    }
	  }, {
	    key: "insensitive",
	    get: function get() {
	      return this._insensitive;
	    }

	    /**
	     * Set the case insensitive flag.
	     * If the case insensitive flag changes, the raw (escaped) value at `attr.raws.insensitiveFlag`
	     * of the attribute is updated accordingly.
	     *
	     * @param {true | false} insensitive true if the attribute should match case-insensitively.
	     */,
	    set: function set(insensitive) {
	      if (!insensitive) {
	        this._insensitive = false;

	        // "i" and "I" can be used in "this.raws.insensitiveFlag" to store the original notation.
	        // When setting `attr.insensitive = false` both should be erased to ensure correct serialization.
	        if (this.raws && (this.raws.insensitiveFlag === 'I' || this.raws.insensitiveFlag === 'i')) {
	          this.raws.insensitiveFlag = undefined;
	        }
	      }
	      this._insensitive = insensitive;
	    }
	  }, {
	    key: "attribute",
	    get: function get() {
	      return this._attribute;
	    },
	    set: function set(name) {
	      this._handleEscapes("attribute", name);
	      this._attribute = name;
	    }
	  }]);
	  return Attribute;
	}(_namespace["default"]);
	exports["default"] = Attribute;
	Attribute.NO_QUOTE = null;
	Attribute.SINGLE_QUOTE = "'";
	Attribute.DOUBLE_QUOTE = '"';
	var CSSESC_QUOTE_OPTIONS = (_CSSESC_QUOTE_OPTIONS = {
	  "'": {
	    quotes: 'single',
	    wrap: true
	  },
	  '"': {
	    quotes: 'double',
	    wrap: true
	  }
	}, _CSSESC_QUOTE_OPTIONS[null] = {
	  isIdentifier: true
	}, _CSSESC_QUOTE_OPTIONS);
	function defaultAttrConcat(attrValue, attrSpaces) {
	  return "" + attrSpaces.before + attrValue + attrSpaces.after;
	} 
} (attribute$1));

var universal$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _namespace = _interopRequireDefault(namespaceExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Universal = /*#__PURE__*/function (_Namespace) {
	  _inheritsLoose(Universal, _Namespace);
	  function Universal(opts) {
	    var _this;
	    _this = _Namespace.call(this, opts) || this;
	    _this.type = _types.UNIVERSAL;
	    _this.value = '*';
	    return _this;
	  }
	  return Universal;
	}(_namespace["default"]);
	exports["default"] = Universal;
	module.exports = exports.default; 
} (universal$1, universal$1.exports));

var universalExports = universal$1.exports;

var combinator$2 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Combinator = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(Combinator, _Node);
	  function Combinator(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.COMBINATOR;
	    return _this;
	  }
	  return Combinator;
	}(_node["default"]);
	exports["default"] = Combinator;
	module.exports = exports.default; 
} (combinator$2, combinator$2.exports));

var combinatorExports = combinator$2.exports;

var nesting$1 = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _node = _interopRequireDefault(nodeExports);
	var _types = types;
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	var Nesting = /*#__PURE__*/function (_Node) {
	  _inheritsLoose(Nesting, _Node);
	  function Nesting(opts) {
	    var _this;
	    _this = _Node.call(this, opts) || this;
	    _this.type = _types.NESTING;
	    _this.value = '&';
	    return _this;
	  }
	  return Nesting;
	}(_node["default"]);
	exports["default"] = Nesting;
	module.exports = exports.default; 
} (nesting$1, nesting$1.exports));

var nestingExports = nesting$1.exports;

var sortAscending = {exports: {}};

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = sortAscending;
	function sortAscending(list) {
	  return list.sort(function (a, b) {
	    return a - b;
	  });
	}
	module.exports = exports.default; 
} (sortAscending, sortAscending.exports));

var sortAscendingExports = sortAscending.exports;

var tokenize = {};

var tokenTypes = {};

tokenTypes.__esModule = true;
tokenTypes.word = tokenTypes.tilde = tokenTypes.tab = tokenTypes.str = tokenTypes.space = tokenTypes.slash = tokenTypes.singleQuote = tokenTypes.semicolon = tokenTypes.plus = tokenTypes.pipe = tokenTypes.openSquare = tokenTypes.openParenthesis = tokenTypes.newline = tokenTypes.greaterThan = tokenTypes.feed = tokenTypes.equals = tokenTypes.doubleQuote = tokenTypes.dollar = tokenTypes.cr = tokenTypes.comment = tokenTypes.comma = tokenTypes.combinator = tokenTypes.colon = tokenTypes.closeSquare = tokenTypes.closeParenthesis = tokenTypes.caret = tokenTypes.bang = tokenTypes.backslash = tokenTypes.at = tokenTypes.asterisk = tokenTypes.ampersand = void 0;
var ampersand = 38; // `&`.charCodeAt(0);
tokenTypes.ampersand = ampersand;
var asterisk = 42; // `*`.charCodeAt(0);
tokenTypes.asterisk = asterisk;
var at = 64; // `@`.charCodeAt(0);
tokenTypes.at = at;
var comma = 44; // `,`.charCodeAt(0);
tokenTypes.comma = comma;
var colon = 58; // `:`.charCodeAt(0);
tokenTypes.colon = colon;
var semicolon = 59; // `;`.charCodeAt(0);
tokenTypes.semicolon = semicolon;
var openParenthesis = 40; // `(`.charCodeAt(0);
tokenTypes.openParenthesis = openParenthesis;
var closeParenthesis = 41; // `)`.charCodeAt(0);
tokenTypes.closeParenthesis = closeParenthesis;
var openSquare = 91; // `[`.charCodeAt(0);
tokenTypes.openSquare = openSquare;
var closeSquare = 93; // `]`.charCodeAt(0);
tokenTypes.closeSquare = closeSquare;
var dollar = 36; // `$`.charCodeAt(0);
tokenTypes.dollar = dollar;
var tilde = 126; // `~`.charCodeAt(0);
tokenTypes.tilde = tilde;
var caret = 94; // `^`.charCodeAt(0);
tokenTypes.caret = caret;
var plus = 43; // `+`.charCodeAt(0);
tokenTypes.plus = plus;
var equals = 61; // `=`.charCodeAt(0);
tokenTypes.equals = equals;
var pipe = 124; // `|`.charCodeAt(0);
tokenTypes.pipe = pipe;
var greaterThan = 62; // `>`.charCodeAt(0);
tokenTypes.greaterThan = greaterThan;
var space = 32; // ` `.charCodeAt(0);
tokenTypes.space = space;
var singleQuote = 39; // `'`.charCodeAt(0);
tokenTypes.singleQuote = singleQuote;
var doubleQuote = 34; // `"`.charCodeAt(0);
tokenTypes.doubleQuote = doubleQuote;
var slash = 47; // `/`.charCodeAt(0);
tokenTypes.slash = slash;
var bang = 33; // `!`.charCodeAt(0);
tokenTypes.bang = bang;
var backslash = 92; // '\\'.charCodeAt(0);
tokenTypes.backslash = backslash;
var cr = 13; // '\r'.charCodeAt(0);
tokenTypes.cr = cr;
var feed = 12; // '\f'.charCodeAt(0);
tokenTypes.feed = feed;
var newline = 10; // '\n'.charCodeAt(0);
tokenTypes.newline = newline;
var tab = 9; // '\t'.charCodeAt(0);

// Expose aliases primarily for readability.
tokenTypes.tab = tab;
var str = singleQuote;

// No good single character representation!
tokenTypes.str = str;
var comment$1 = -1;
tokenTypes.comment = comment$1;
var word = -2;
tokenTypes.word = word;
var combinator$1 = -3;
tokenTypes.combinator = combinator$1;

(function (exports) {

	exports.__esModule = true;
	exports.FIELDS = void 0;
	exports["default"] = tokenize;
	var t = _interopRequireWildcard(tokenTypes);
	var _unescapable, _wordDelimiters;
	function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
	function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
	var unescapable = (_unescapable = {}, _unescapable[t.tab] = true, _unescapable[t.newline] = true, _unescapable[t.cr] = true, _unescapable[t.feed] = true, _unescapable);
	var wordDelimiters = (_wordDelimiters = {}, _wordDelimiters[t.space] = true, _wordDelimiters[t.tab] = true, _wordDelimiters[t.newline] = true, _wordDelimiters[t.cr] = true, _wordDelimiters[t.feed] = true, _wordDelimiters[t.ampersand] = true, _wordDelimiters[t.asterisk] = true, _wordDelimiters[t.bang] = true, _wordDelimiters[t.comma] = true, _wordDelimiters[t.colon] = true, _wordDelimiters[t.semicolon] = true, _wordDelimiters[t.openParenthesis] = true, _wordDelimiters[t.closeParenthesis] = true, _wordDelimiters[t.openSquare] = true, _wordDelimiters[t.closeSquare] = true, _wordDelimiters[t.singleQuote] = true, _wordDelimiters[t.doubleQuote] = true, _wordDelimiters[t.plus] = true, _wordDelimiters[t.pipe] = true, _wordDelimiters[t.tilde] = true, _wordDelimiters[t.greaterThan] = true, _wordDelimiters[t.equals] = true, _wordDelimiters[t.dollar] = true, _wordDelimiters[t.caret] = true, _wordDelimiters[t.slash] = true, _wordDelimiters);
	var hex = {};
	var hexChars = "0123456789abcdefABCDEF";
	for (var i = 0; i < hexChars.length; i++) {
	  hex[hexChars.charCodeAt(i)] = true;
	}

	/**
	 *  Returns the last index of the bar css word
	 * @param {string} css The string in which the word begins
	 * @param {number} start The index into the string where word's first letter occurs
	 */
	function consumeWord(css, start) {
	  var next = start;
	  var code;
	  do {
	    code = css.charCodeAt(next);
	    if (wordDelimiters[code]) {
	      return next - 1;
	    } else if (code === t.backslash) {
	      next = consumeEscape(css, next) + 1;
	    } else {
	      // All other characters are part of the word
	      next++;
	    }
	  } while (next < css.length);
	  return next - 1;
	}

	/**
	 *  Returns the last index of the escape sequence
	 * @param {string} css The string in which the sequence begins
	 * @param {number} start The index into the string where escape character (`\`) occurs.
	 */
	function consumeEscape(css, start) {
	  var next = start;
	  var code = css.charCodeAt(next + 1);
	  if (unescapable[code]) ; else if (hex[code]) {
	    var hexDigits = 0;
	    // consume up to 6 hex chars
	    do {
	      next++;
	      hexDigits++;
	      code = css.charCodeAt(next + 1);
	    } while (hex[code] && hexDigits < 6);
	    // if fewer than 6 hex chars, a trailing space ends the escape
	    if (hexDigits < 6 && code === t.space) {
	      next++;
	    }
	  } else {
	    // the next char is part of the current word
	    next++;
	  }
	  return next;
	}
	var FIELDS = {
	  TYPE: 0,
	  START_LINE: 1,
	  START_COL: 2,
	  END_LINE: 3,
	  END_COL: 4,
	  START_POS: 5,
	  END_POS: 6
	};
	exports.FIELDS = FIELDS;
	function tokenize(input) {
	  var tokens = [];
	  var css = input.css.valueOf();
	  var _css = css,
	    length = _css.length;
	  var offset = -1;
	  var line = 1;
	  var start = 0;
	  var end = 0;
	  var code, content, endColumn, endLine, escaped, escapePos, last, lines, next, nextLine, nextOffset, quote, tokenType;
	  function unclosed(what, fix) {
	    if (input.safe) {
	      // fyi: this is never set to true.
	      css += fix;
	      next = css.length - 1;
	    } else {
	      throw input.error('Unclosed ' + what, line, start - offset, start);
	    }
	  }
	  while (start < length) {
	    code = css.charCodeAt(start);
	    if (code === t.newline) {
	      offset = start;
	      line += 1;
	    }
	    switch (code) {
	      case t.space:
	      case t.tab:
	      case t.newline:
	      case t.cr:
	      case t.feed:
	        next = start;
	        do {
	          next += 1;
	          code = css.charCodeAt(next);
	          if (code === t.newline) {
	            offset = next;
	            line += 1;
	          }
	        } while (code === t.space || code === t.newline || code === t.tab || code === t.cr || code === t.feed);
	        tokenType = t.space;
	        endLine = line;
	        endColumn = next - offset - 1;
	        end = next;
	        break;
	      case t.plus:
	      case t.greaterThan:
	      case t.tilde:
	      case t.pipe:
	        next = start;
	        do {
	          next += 1;
	          code = css.charCodeAt(next);
	        } while (code === t.plus || code === t.greaterThan || code === t.tilde || code === t.pipe);
	        tokenType = t.combinator;
	        endLine = line;
	        endColumn = start - offset;
	        end = next;
	        break;

	      // Consume these characters as single tokens.
	      case t.asterisk:
	      case t.ampersand:
	      case t.bang:
	      case t.comma:
	      case t.equals:
	      case t.dollar:
	      case t.caret:
	      case t.openSquare:
	      case t.closeSquare:
	      case t.colon:
	      case t.semicolon:
	      case t.openParenthesis:
	      case t.closeParenthesis:
	        next = start;
	        tokenType = code;
	        endLine = line;
	        endColumn = start - offset;
	        end = next + 1;
	        break;
	      case t.singleQuote:
	      case t.doubleQuote:
	        quote = code === t.singleQuote ? "'" : '"';
	        next = start;
	        do {
	          escaped = false;
	          next = css.indexOf(quote, next + 1);
	          if (next === -1) {
	            unclosed('quote', quote);
	          }
	          escapePos = next;
	          while (css.charCodeAt(escapePos - 1) === t.backslash) {
	            escapePos -= 1;
	            escaped = !escaped;
	          }
	        } while (escaped);
	        tokenType = t.str;
	        endLine = line;
	        endColumn = start - offset;
	        end = next + 1;
	        break;
	      default:
	        if (code === t.slash && css.charCodeAt(start + 1) === t.asterisk) {
	          next = css.indexOf('*/', start + 2) + 1;
	          if (next === 0) {
	            unclosed('comment', '*/');
	          }
	          content = css.slice(start, next + 1);
	          lines = content.split('\n');
	          last = lines.length - 1;
	          if (last > 0) {
	            nextLine = line + last;
	            nextOffset = next - lines[last].length;
	          } else {
	            nextLine = line;
	            nextOffset = offset;
	          }
	          tokenType = t.comment;
	          line = nextLine;
	          endLine = nextLine;
	          endColumn = next - nextOffset;
	        } else if (code === t.slash) {
	          next = start;
	          tokenType = code;
	          endLine = line;
	          endColumn = start - offset;
	          end = next + 1;
	        } else {
	          next = consumeWord(css, start);
	          tokenType = t.word;
	          endLine = line;
	          endColumn = next - offset;
	        }
	        end = next + 1;
	        break;
	    }

	    // Ensure that the token structure remains consistent
	    tokens.push([tokenType,
	    // [0] Token type
	    line,
	    // [1] Starting line
	    start - offset,
	    // [2] Starting column
	    endLine,
	    // [3] Ending line
	    endColumn,
	    // [4] Ending column
	    start,
	    // [5] Start position / Source index
	    end // [6] End position
	    ]);

	    // Reset offset for the next token
	    if (nextOffset) {
	      offset = nextOffset;
	      nextOffset = null;
	    }
	    start = end;
	  }
	  return tokens;
	} 
} (tokenize));

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _root = _interopRequireDefault(rootExports);
	var _selector = _interopRequireDefault(selectorExports);
	var _className = _interopRequireDefault(classNameExports);
	var _comment = _interopRequireDefault(commentExports);
	var _id = _interopRequireDefault(idExports);
	var _tag = _interopRequireDefault(tagExports);
	var _string = _interopRequireDefault(stringExports);
	var _pseudo = _interopRequireDefault(pseudoExports);
	var _attribute = _interopRequireWildcard(attribute$1);
	var _universal = _interopRequireDefault(universalExports);
	var _combinator = _interopRequireDefault(combinatorExports);
	var _nesting = _interopRequireDefault(nestingExports);
	var _sortAscending = _interopRequireDefault(sortAscendingExports);
	var _tokenize = _interopRequireWildcard(tokenize);
	var tokens = _interopRequireWildcard(tokenTypes);
	var types$1 = _interopRequireWildcard(types);
	var _util = util;
	var _WHITESPACE_TOKENS, _Object$assign;
	function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
	function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	var WHITESPACE_TOKENS = (_WHITESPACE_TOKENS = {}, _WHITESPACE_TOKENS[tokens.space] = true, _WHITESPACE_TOKENS[tokens.cr] = true, _WHITESPACE_TOKENS[tokens.feed] = true, _WHITESPACE_TOKENS[tokens.newline] = true, _WHITESPACE_TOKENS[tokens.tab] = true, _WHITESPACE_TOKENS);
	var WHITESPACE_EQUIV_TOKENS = Object.assign({}, WHITESPACE_TOKENS, (_Object$assign = {}, _Object$assign[tokens.comment] = true, _Object$assign));
	function tokenStart(token) {
	  return {
	    line: token[_tokenize.FIELDS.START_LINE],
	    column: token[_tokenize.FIELDS.START_COL]
	  };
	}
	function tokenEnd(token) {
	  return {
	    line: token[_tokenize.FIELDS.END_LINE],
	    column: token[_tokenize.FIELDS.END_COL]
	  };
	}
	function getSource(startLine, startColumn, endLine, endColumn) {
	  return {
	    start: {
	      line: startLine,
	      column: startColumn
	    },
	    end: {
	      line: endLine,
	      column: endColumn
	    }
	  };
	}
	function getTokenSource(token) {
	  return getSource(token[_tokenize.FIELDS.START_LINE], token[_tokenize.FIELDS.START_COL], token[_tokenize.FIELDS.END_LINE], token[_tokenize.FIELDS.END_COL]);
	}
	function getTokenSourceSpan(startToken, endToken) {
	  if (!startToken) {
	    return undefined;
	  }
	  return getSource(startToken[_tokenize.FIELDS.START_LINE], startToken[_tokenize.FIELDS.START_COL], endToken[_tokenize.FIELDS.END_LINE], endToken[_tokenize.FIELDS.END_COL]);
	}
	function unescapeProp(node, prop) {
	  var value = node[prop];
	  if (typeof value !== "string") {
	    return;
	  }
	  if (value.indexOf("\\") !== -1) {
	    (0, _util.ensureObject)(node, 'raws');
	    node[prop] = (0, _util.unesc)(value);
	    if (node.raws[prop] === undefined) {
	      node.raws[prop] = value;
	    }
	  }
	  return node;
	}
	function indexesOf(array, item) {
	  var i = -1;
	  var indexes = [];
	  while ((i = array.indexOf(item, i + 1)) !== -1) {
	    indexes.push(i);
	  }
	  return indexes;
	}
	function uniqs() {
	  var list = Array.prototype.concat.apply([], arguments);
	  return list.filter(function (item, i) {
	    return i === list.indexOf(item);
	  });
	}
	var Parser = /*#__PURE__*/function () {
	  function Parser(rule, options) {
	    if (options === void 0) {
	      options = {};
	    }
	    this.rule = rule;
	    this.options = Object.assign({
	      lossy: false,
	      safe: false
	    }, options);
	    this.position = 0;
	    this.css = typeof this.rule === 'string' ? this.rule : this.rule.selector;
	    this.tokens = (0, _tokenize["default"])({
	      css: this.css,
	      error: this._errorGenerator(),
	      safe: this.options.safe
	    });
	    var rootSource = getTokenSourceSpan(this.tokens[0], this.tokens[this.tokens.length - 1]);
	    this.root = new _root["default"]({
	      source: rootSource
	    });
	    this.root.errorGenerator = this._errorGenerator();
	    var selector = new _selector["default"]({
	      source: {
	        start: {
	          line: 1,
	          column: 1
	        }
	      },
	      sourceIndex: 0
	    });
	    this.root.append(selector);
	    this.current = selector;
	    this.loop();
	  }
	  var _proto = Parser.prototype;
	  _proto._errorGenerator = function _errorGenerator() {
	    var _this = this;
	    return function (message, errorOptions) {
	      if (typeof _this.rule === 'string') {
	        return new Error(message);
	      }
	      return _this.rule.error(message, errorOptions);
	    };
	  };
	  _proto.attribute = function attribute() {
	    var attr = [];
	    var startingToken = this.currToken;
	    this.position++;
	    while (this.position < this.tokens.length && this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
	      attr.push(this.currToken);
	      this.position++;
	    }
	    if (this.currToken[_tokenize.FIELDS.TYPE] !== tokens.closeSquare) {
	      return this.expected('closing square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
	    }
	    var len = attr.length;
	    var node = {
	      source: getSource(startingToken[1], startingToken[2], this.currToken[3], this.currToken[4]),
	      sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
	    };
	    if (len === 1 && !~[tokens.word].indexOf(attr[0][_tokenize.FIELDS.TYPE])) {
	      return this.expected('attribute', attr[0][_tokenize.FIELDS.START_POS]);
	    }
	    var pos = 0;
	    var spaceBefore = '';
	    var commentBefore = '';
	    var lastAdded = null;
	    var spaceAfterMeaningfulToken = false;
	    while (pos < len) {
	      var token = attr[pos];
	      var content = this.content(token);
	      var next = attr[pos + 1];
	      switch (token[_tokenize.FIELDS.TYPE]) {
	        case tokens.space:
	          // if (
	          //     len === 1 ||
	          //     pos === 0 && this.content(next) === '|'
	          // ) {
	          //     return this.expected('attribute', token[TOKEN.START_POS], content);
	          // }
	          spaceAfterMeaningfulToken = true;
	          if (this.options.lossy) {
	            break;
	          }
	          if (lastAdded) {
	            (0, _util.ensureObject)(node, 'spaces', lastAdded);
	            var prevContent = node.spaces[lastAdded].after || '';
	            node.spaces[lastAdded].after = prevContent + content;
	            var existingComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || null;
	            if (existingComment) {
	              node.raws.spaces[lastAdded].after = existingComment + content;
	            }
	          } else {
	            spaceBefore = spaceBefore + content;
	            commentBefore = commentBefore + content;
	          }
	          break;
	        case tokens.asterisk:
	          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
	            node.operator = content;
	            lastAdded = 'operator';
	          } else if ((!node.namespace || lastAdded === "namespace" && !spaceAfterMeaningfulToken) && next) {
	            if (spaceBefore) {
	              (0, _util.ensureObject)(node, 'spaces', 'attribute');
	              node.spaces.attribute.before = spaceBefore;
	              spaceBefore = '';
	            }
	            if (commentBefore) {
	              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
	              node.raws.spaces.attribute.before = spaceBefore;
	              commentBefore = '';
	            }
	            node.namespace = (node.namespace || "") + content;
	            var rawValue = (0, _util.getProp)(node, 'raws', 'namespace') || null;
	            if (rawValue) {
	              node.raws.namespace += content;
	            }
	            lastAdded = 'namespace';
	          }
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.dollar:
	          if (lastAdded === "value") {
	            var oldRawValue = (0, _util.getProp)(node, 'raws', 'value');
	            node.value += "$";
	            if (oldRawValue) {
	              node.raws.value = oldRawValue + "$";
	            }
	            break;
	          }
	        // Falls through
	        case tokens.caret:
	          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
	            node.operator = content;
	            lastAdded = 'operator';
	          }
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.combinator:
	          if (content === '~' && next[_tokenize.FIELDS.TYPE] === tokens.equals) {
	            node.operator = content;
	            lastAdded = 'operator';
	          }
	          if (content !== '|') {
	            spaceAfterMeaningfulToken = false;
	            break;
	          }
	          if (next[_tokenize.FIELDS.TYPE] === tokens.equals) {
	            node.operator = content;
	            lastAdded = 'operator';
	          } else if (!node.namespace && !node.attribute) {
	            node.namespace = true;
	          }
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.word:
	          if (next && this.content(next) === '|' && attr[pos + 2] && attr[pos + 2][_tokenize.FIELDS.TYPE] !== tokens.equals &&
	          // this look-ahead probably fails with comment nodes involved.
	          !node.operator && !node.namespace) {
	            node.namespace = content;
	            lastAdded = 'namespace';
	          } else if (!node.attribute || lastAdded === "attribute" && !spaceAfterMeaningfulToken) {
	            if (spaceBefore) {
	              (0, _util.ensureObject)(node, 'spaces', 'attribute');
	              node.spaces.attribute.before = spaceBefore;
	              spaceBefore = '';
	            }
	            if (commentBefore) {
	              (0, _util.ensureObject)(node, 'raws', 'spaces', 'attribute');
	              node.raws.spaces.attribute.before = commentBefore;
	              commentBefore = '';
	            }
	            node.attribute = (node.attribute || "") + content;
	            var _rawValue = (0, _util.getProp)(node, 'raws', 'attribute') || null;
	            if (_rawValue) {
	              node.raws.attribute += content;
	            }
	            lastAdded = 'attribute';
	          } else if (!node.value && node.value !== "" || lastAdded === "value" && !(spaceAfterMeaningfulToken || node.quoteMark)) {
	            var _unescaped = (0, _util.unesc)(content);
	            var _oldRawValue = (0, _util.getProp)(node, 'raws', 'value') || '';
	            var oldValue = node.value || '';
	            node.value = oldValue + _unescaped;
	            node.quoteMark = null;
	            if (_unescaped !== content || _oldRawValue) {
	              (0, _util.ensureObject)(node, 'raws');
	              node.raws.value = (_oldRawValue || oldValue) + content;
	            }
	            lastAdded = 'value';
	          } else {
	            var insensitive = content === 'i' || content === "I";
	            if ((node.value || node.value === '') && (node.quoteMark || spaceAfterMeaningfulToken)) {
	              node.insensitive = insensitive;
	              if (!insensitive || content === "I") {
	                (0, _util.ensureObject)(node, 'raws');
	                node.raws.insensitiveFlag = content;
	              }
	              lastAdded = 'insensitive';
	              if (spaceBefore) {
	                (0, _util.ensureObject)(node, 'spaces', 'insensitive');
	                node.spaces.insensitive.before = spaceBefore;
	                spaceBefore = '';
	              }
	              if (commentBefore) {
	                (0, _util.ensureObject)(node, 'raws', 'spaces', 'insensitive');
	                node.raws.spaces.insensitive.before = commentBefore;
	                commentBefore = '';
	              }
	            } else if (node.value || node.value === '') {
	              lastAdded = 'value';
	              node.value += content;
	              if (node.raws.value) {
	                node.raws.value += content;
	              }
	            }
	          }
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.str:
	          if (!node.attribute || !node.operator) {
	            return this.error("Expected an attribute followed by an operator preceding the string.", {
	              index: token[_tokenize.FIELDS.START_POS]
	            });
	          }
	          var _unescapeValue = (0, _attribute.unescapeValue)(content),
	            unescaped = _unescapeValue.unescaped,
	            quoteMark = _unescapeValue.quoteMark;
	          node.value = unescaped;
	          node.quoteMark = quoteMark;
	          lastAdded = 'value';
	          (0, _util.ensureObject)(node, 'raws');
	          node.raws.value = content;
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.equals:
	          if (!node.attribute) {
	            return this.expected('attribute', token[_tokenize.FIELDS.START_POS], content);
	          }
	          if (node.value) {
	            return this.error('Unexpected "=" found; an operator was already defined.', {
	              index: token[_tokenize.FIELDS.START_POS]
	            });
	          }
	          node.operator = node.operator ? node.operator + content : content;
	          lastAdded = 'operator';
	          spaceAfterMeaningfulToken = false;
	          break;
	        case tokens.comment:
	          if (lastAdded) {
	            if (spaceAfterMeaningfulToken || next && next[_tokenize.FIELDS.TYPE] === tokens.space || lastAdded === 'insensitive') {
	              var lastComment = (0, _util.getProp)(node, 'spaces', lastAdded, 'after') || '';
	              var rawLastComment = (0, _util.getProp)(node, 'raws', 'spaces', lastAdded, 'after') || lastComment;
	              (0, _util.ensureObject)(node, 'raws', 'spaces', lastAdded);
	              node.raws.spaces[lastAdded].after = rawLastComment + content;
	            } else {
	              var lastValue = node[lastAdded] || '';
	              var rawLastValue = (0, _util.getProp)(node, 'raws', lastAdded) || lastValue;
	              (0, _util.ensureObject)(node, 'raws');
	              node.raws[lastAdded] = rawLastValue + content;
	            }
	          } else {
	            commentBefore = commentBefore + content;
	          }
	          break;
	        default:
	          return this.error("Unexpected \"" + content + "\" found.", {
	            index: token[_tokenize.FIELDS.START_POS]
	          });
	      }
	      pos++;
	    }
	    unescapeProp(node, "attribute");
	    unescapeProp(node, "namespace");
	    this.newNode(new _attribute["default"](node));
	    this.position++;
	  }

	  /**
	   * return a node containing meaningless garbage up to (but not including) the specified token position.
	   * if the token position is negative, all remaining tokens are consumed.
	   *
	   * This returns an array containing a single string node if all whitespace,
	   * otherwise an array of comment nodes with space before and after.
	   *
	   * These tokens are not added to the current selector, the caller can add them or use them to amend
	   * a previous node's space metadata.
	   *
	   * In lossy mode, this returns only comments.
	   */;
	  _proto.parseWhitespaceEquivalentTokens = function parseWhitespaceEquivalentTokens(stopPosition) {
	    if (stopPosition < 0) {
	      stopPosition = this.tokens.length;
	    }
	    var startPosition = this.position;
	    var nodes = [];
	    var space = "";
	    var lastComment = undefined;
	    do {
	      if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) {
	        if (!this.options.lossy) {
	          space += this.content();
	        }
	      } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.comment) {
	        var spaces = {};
	        if (space) {
	          spaces.before = space;
	          space = "";
	        }
	        lastComment = new _comment["default"]({
	          value: this.content(),
	          source: getTokenSource(this.currToken),
	          sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
	          spaces: spaces
	        });
	        nodes.push(lastComment);
	      }
	    } while (++this.position < stopPosition);
	    if (space) {
	      if (lastComment) {
	        lastComment.spaces.after = space;
	      } else if (!this.options.lossy) {
	        var firstToken = this.tokens[startPosition];
	        var lastToken = this.tokens[this.position - 1];
	        nodes.push(new _string["default"]({
	          value: '',
	          source: getSource(firstToken[_tokenize.FIELDS.START_LINE], firstToken[_tokenize.FIELDS.START_COL], lastToken[_tokenize.FIELDS.END_LINE], lastToken[_tokenize.FIELDS.END_COL]),
	          sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
	          spaces: {
	            before: space,
	            after: ''
	          }
	        }));
	      }
	    }
	    return nodes;
	  }

	  /**
	   *
	   * @param {*} nodes
	   */;
	  _proto.convertWhitespaceNodesToSpace = function convertWhitespaceNodesToSpace(nodes, requiredSpace) {
	    var _this2 = this;
	    if (requiredSpace === void 0) {
	      requiredSpace = false;
	    }
	    var space = "";
	    var rawSpace = "";
	    nodes.forEach(function (n) {
	      var spaceBefore = _this2.lossySpace(n.spaces.before, requiredSpace);
	      var rawSpaceBefore = _this2.lossySpace(n.rawSpaceBefore, requiredSpace);
	      space += spaceBefore + _this2.lossySpace(n.spaces.after, requiredSpace && spaceBefore.length === 0);
	      rawSpace += spaceBefore + n.value + _this2.lossySpace(n.rawSpaceAfter, requiredSpace && rawSpaceBefore.length === 0);
	    });
	    if (rawSpace === space) {
	      rawSpace = undefined;
	    }
	    var result = {
	      space: space,
	      rawSpace: rawSpace
	    };
	    return result;
	  };
	  _proto.isNamedCombinator = function isNamedCombinator(position) {
	    if (position === void 0) {
	      position = this.position;
	    }
	    return this.tokens[position + 0] && this.tokens[position + 0][_tokenize.FIELDS.TYPE] === tokens.slash && this.tokens[position + 1] && this.tokens[position + 1][_tokenize.FIELDS.TYPE] === tokens.word && this.tokens[position + 2] && this.tokens[position + 2][_tokenize.FIELDS.TYPE] === tokens.slash;
	  };
	  _proto.namedCombinator = function namedCombinator() {
	    if (this.isNamedCombinator()) {
	      var nameRaw = this.content(this.tokens[this.position + 1]);
	      var name = (0, _util.unesc)(nameRaw).toLowerCase();
	      var raws = {};
	      if (name !== nameRaw) {
	        raws.value = "/" + nameRaw + "/";
	      }
	      var node = new _combinator["default"]({
	        value: "/" + name + "/",
	        source: getSource(this.currToken[_tokenize.FIELDS.START_LINE], this.currToken[_tokenize.FIELDS.START_COL], this.tokens[this.position + 2][_tokenize.FIELDS.END_LINE], this.tokens[this.position + 2][_tokenize.FIELDS.END_COL]),
	        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS],
	        raws: raws
	      });
	      this.position = this.position + 3;
	      return node;
	    } else {
	      this.unexpected();
	    }
	  };
	  _proto.combinator = function combinator() {
	    var _this3 = this;
	    if (this.content() === '|') {
	      return this.namespace();
	    }
	    // We need to decide between a space that's a descendant combinator and meaningless whitespace at the end of a selector.
	    var nextSigTokenPos = this.locateNextMeaningfulToken(this.position);
	    if (nextSigTokenPos < 0 || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.comma || this.tokens[nextSigTokenPos][_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
	      var nodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
	      if (nodes.length > 0) {
	        var last = this.current.last;
	        if (last) {
	          var _this$convertWhitespa = this.convertWhitespaceNodesToSpace(nodes),
	            space = _this$convertWhitespa.space,
	            rawSpace = _this$convertWhitespa.rawSpace;
	          if (rawSpace !== undefined) {
	            last.rawSpaceAfter += rawSpace;
	          }
	          last.spaces.after += space;
	        } else {
	          nodes.forEach(function (n) {
	            return _this3.newNode(n);
	          });
	        }
	      }
	      return;
	    }
	    var firstToken = this.currToken;
	    var spaceOrDescendantSelectorNodes = undefined;
	    if (nextSigTokenPos > this.position) {
	      spaceOrDescendantSelectorNodes = this.parseWhitespaceEquivalentTokens(nextSigTokenPos);
	    }
	    var node;
	    if (this.isNamedCombinator()) {
	      node = this.namedCombinator();
	    } else if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.combinator) {
	      node = new _combinator["default"]({
	        value: this.content(),
	        source: getTokenSource(this.currToken),
	        sourceIndex: this.currToken[_tokenize.FIELDS.START_POS]
	      });
	      this.position++;
	    } else if (WHITESPACE_TOKENS[this.currToken[_tokenize.FIELDS.TYPE]]) ; else if (!spaceOrDescendantSelectorNodes) {
	      this.unexpected();
	    }
	    if (node) {
	      if (spaceOrDescendantSelectorNodes) {
	        var _this$convertWhitespa2 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes),
	          _space = _this$convertWhitespa2.space,
	          _rawSpace = _this$convertWhitespa2.rawSpace;
	        node.spaces.before = _space;
	        node.rawSpaceBefore = _rawSpace;
	      }
	    } else {
	      // descendant combinator
	      var _this$convertWhitespa3 = this.convertWhitespaceNodesToSpace(spaceOrDescendantSelectorNodes, true),
	        _space2 = _this$convertWhitespa3.space,
	        _rawSpace2 = _this$convertWhitespa3.rawSpace;
	      if (!_rawSpace2) {
	        _rawSpace2 = _space2;
	      }
	      var spaces = {};
	      var raws = {
	        spaces: {}
	      };
	      if (_space2.endsWith(' ') && _rawSpace2.endsWith(' ')) {
	        spaces.before = _space2.slice(0, _space2.length - 1);
	        raws.spaces.before = _rawSpace2.slice(0, _rawSpace2.length - 1);
	      } else if (_space2.startsWith(' ') && _rawSpace2.startsWith(' ')) {
	        spaces.after = _space2.slice(1);
	        raws.spaces.after = _rawSpace2.slice(1);
	      } else {
	        raws.value = _rawSpace2;
	      }
	      node = new _combinator["default"]({
	        value: ' ',
	        source: getTokenSourceSpan(firstToken, this.tokens[this.position - 1]),
	        sourceIndex: firstToken[_tokenize.FIELDS.START_POS],
	        spaces: spaces,
	        raws: raws
	      });
	    }
	    if (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.space) {
	      node.spaces.after = this.optionalSpace(this.content());
	      this.position++;
	    }
	    return this.newNode(node);
	  };
	  _proto.comma = function comma() {
	    if (this.position === this.tokens.length - 1) {
	      this.root.trailingComma = true;
	      this.position++;
	      return;
	    }
	    this.current._inferEndPosition();
	    var selector = new _selector["default"]({
	      source: {
	        start: tokenStart(this.tokens[this.position + 1])
	      },
	      sourceIndex: this.tokens[this.position + 1][_tokenize.FIELDS.START_POS]
	    });
	    this.current.parent.append(selector);
	    this.current = selector;
	    this.position++;
	  };
	  _proto.comment = function comment() {
	    var current = this.currToken;
	    this.newNode(new _comment["default"]({
	      value: this.content(),
	      source: getTokenSource(current),
	      sourceIndex: current[_tokenize.FIELDS.START_POS]
	    }));
	    this.position++;
	  };
	  _proto.error = function error(message, opts) {
	    throw this.root.error(message, opts);
	  };
	  _proto.missingBackslash = function missingBackslash() {
	    return this.error('Expected a backslash preceding the semicolon.', {
	      index: this.currToken[_tokenize.FIELDS.START_POS]
	    });
	  };
	  _proto.missingParenthesis = function missingParenthesis() {
	    return this.expected('opening parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
	  };
	  _proto.missingSquareBracket = function missingSquareBracket() {
	    return this.expected('opening square bracket', this.currToken[_tokenize.FIELDS.START_POS]);
	  };
	  _proto.unexpected = function unexpected() {
	    return this.error("Unexpected '" + this.content() + "'. Escaping special characters with \\ may help.", this.currToken[_tokenize.FIELDS.START_POS]);
	  };
	  _proto.unexpectedPipe = function unexpectedPipe() {
	    return this.error("Unexpected '|'.", this.currToken[_tokenize.FIELDS.START_POS]);
	  };
	  _proto.namespace = function namespace() {
	    var before = this.prevToken && this.content(this.prevToken) || true;
	    if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.word) {
	      this.position++;
	      return this.word(before);
	    } else if (this.nextToken[_tokenize.FIELDS.TYPE] === tokens.asterisk) {
	      this.position++;
	      return this.universal(before);
	    }
	    this.unexpectedPipe();
	  };
	  _proto.nesting = function nesting() {
	    if (this.nextToken) {
	      var nextContent = this.content(this.nextToken);
	      if (nextContent === "|") {
	        this.position++;
	        return;
	      }
	    }
	    var current = this.currToken;
	    this.newNode(new _nesting["default"]({
	      value: this.content(),
	      source: getTokenSource(current),
	      sourceIndex: current[_tokenize.FIELDS.START_POS]
	    }));
	    this.position++;
	  };
	  _proto.parentheses = function parentheses() {
	    var last = this.current.last;
	    var unbalanced = 1;
	    this.position++;
	    if (last && last.type === types$1.PSEUDO) {
	      var selector = new _selector["default"]({
	        source: {
	          start: tokenStart(this.tokens[this.position])
	        },
	        sourceIndex: this.tokens[this.position][_tokenize.FIELDS.START_POS]
	      });
	      var cache = this.current;
	      last.append(selector);
	      this.current = selector;
	      while (this.position < this.tokens.length && unbalanced) {
	        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
	          unbalanced++;
	        }
	        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
	          unbalanced--;
	        }
	        if (unbalanced) {
	          this.parse();
	        } else {
	          this.current.source.end = tokenEnd(this.currToken);
	          this.current.parent.source.end = tokenEnd(this.currToken);
	          this.position++;
	        }
	      }
	      this.current = cache;
	    } else {
	      // I think this case should be an error. It's used to implement a basic parse of media queries
	      // but I don't think it's a good idea.
	      var parenStart = this.currToken;
	      var parenValue = "(";
	      var parenEnd;
	      while (this.position < this.tokens.length && unbalanced) {
	        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
	          unbalanced++;
	        }
	        if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
	          unbalanced--;
	        }
	        parenEnd = this.currToken;
	        parenValue += this.parseParenthesisToken(this.currToken);
	        this.position++;
	      }
	      if (last) {
	        last.appendToPropertyAndEscape("value", parenValue, parenValue);
	      } else {
	        this.newNode(new _string["default"]({
	          value: parenValue,
	          source: getSource(parenStart[_tokenize.FIELDS.START_LINE], parenStart[_tokenize.FIELDS.START_COL], parenEnd[_tokenize.FIELDS.END_LINE], parenEnd[_tokenize.FIELDS.END_COL]),
	          sourceIndex: parenStart[_tokenize.FIELDS.START_POS]
	        }));
	      }
	    }
	    if (unbalanced) {
	      return this.expected('closing parenthesis', this.currToken[_tokenize.FIELDS.START_POS]);
	    }
	  };
	  _proto.pseudo = function pseudo() {
	    var _this4 = this;
	    var pseudoStr = '';
	    var startingToken = this.currToken;
	    while (this.currToken && this.currToken[_tokenize.FIELDS.TYPE] === tokens.colon) {
	      pseudoStr += this.content();
	      this.position++;
	    }
	    if (!this.currToken) {
	      return this.expected(['pseudo-class', 'pseudo-element'], this.position - 1);
	    }
	    if (this.currToken[_tokenize.FIELDS.TYPE] === tokens.word) {
	      this.splitWord(false, function (first, length) {
	        pseudoStr += first;
	        _this4.newNode(new _pseudo["default"]({
	          value: pseudoStr,
	          source: getTokenSourceSpan(startingToken, _this4.currToken),
	          sourceIndex: startingToken[_tokenize.FIELDS.START_POS]
	        }));
	        if (length > 1 && _this4.nextToken && _this4.nextToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis) {
	          _this4.error('Misplaced parenthesis.', {
	            index: _this4.nextToken[_tokenize.FIELDS.START_POS]
	          });
	        }
	      });
	    } else {
	      return this.expected(['pseudo-class', 'pseudo-element'], this.currToken[_tokenize.FIELDS.START_POS]);
	    }
	  };
	  _proto.space = function space() {
	    var content = this.content();
	    // Handle space before and after the selector
	    if (this.position === 0 || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.prevToken[_tokenize.FIELDS.TYPE] === tokens.openParenthesis || this.current.nodes.every(function (node) {
	      return node.type === 'comment';
	    })) {
	      this.spaces = this.optionalSpace(content);
	      this.position++;
	    } else if (this.position === this.tokens.length - 1 || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.comma || this.nextToken[_tokenize.FIELDS.TYPE] === tokens.closeParenthesis) {
	      this.current.last.spaces.after = this.optionalSpace(content);
	      this.position++;
	    } else {
	      this.combinator();
	    }
	  };
	  _proto.string = function string() {
	    var current = this.currToken;
	    this.newNode(new _string["default"]({
	      value: this.content(),
	      source: getTokenSource(current),
	      sourceIndex: current[_tokenize.FIELDS.START_POS]
	    }));
	    this.position++;
	  };
	  _proto.universal = function universal(namespace) {
	    var nextToken = this.nextToken;
	    if (nextToken && this.content(nextToken) === '|') {
	      this.position++;
	      return this.namespace();
	    }
	    var current = this.currToken;
	    this.newNode(new _universal["default"]({
	      value: this.content(),
	      source: getTokenSource(current),
	      sourceIndex: current[_tokenize.FIELDS.START_POS]
	    }), namespace);
	    this.position++;
	  };
	  _proto.splitWord = function splitWord(namespace, firstCallback) {
	    var _this5 = this;
	    var nextToken = this.nextToken;
	    var word = this.content();
	    while (nextToken && ~[tokens.dollar, tokens.caret, tokens.equals, tokens.word].indexOf(nextToken[_tokenize.FIELDS.TYPE])) {
	      this.position++;
	      var current = this.content();
	      word += current;
	      if (current.lastIndexOf('\\') === current.length - 1) {
	        var next = this.nextToken;
	        if (next && next[_tokenize.FIELDS.TYPE] === tokens.space) {
	          word += this.requiredSpace(this.content(next));
	          this.position++;
	        }
	      }
	      nextToken = this.nextToken;
	    }
	    var hasClass = indexesOf(word, '.').filter(function (i) {
	      // Allow escaped dot within class name
	      var escapedDot = word[i - 1] === '\\';
	      // Allow decimal numbers percent in @keyframes
	      var isKeyframesPercent = /^\d+\.\d+%$/.test(word);
	      return !escapedDot && !isKeyframesPercent;
	    });
	    var hasId = indexesOf(word, '#').filter(function (i) {
	      return word[i - 1] !== '\\';
	    });
	    // Eliminate Sass interpolations from the list of id indexes
	    var interpolations = indexesOf(word, '#{');
	    if (interpolations.length) {
	      hasId = hasId.filter(function (hashIndex) {
	        return !~interpolations.indexOf(hashIndex);
	      });
	    }
	    var indices = (0, _sortAscending["default"])(uniqs([0].concat(hasClass, hasId)));
	    indices.forEach(function (ind, i) {
	      var index = indices[i + 1] || word.length;
	      var value = word.slice(ind, index);
	      if (i === 0 && firstCallback) {
	        return firstCallback.call(_this5, value, indices.length);
	      }
	      var node;
	      var current = _this5.currToken;
	      var sourceIndex = current[_tokenize.FIELDS.START_POS] + indices[i];
	      var source = getSource(current[1], current[2] + ind, current[3], current[2] + (index - 1));
	      if (~hasClass.indexOf(ind)) {
	        var classNameOpts = {
	          value: value.slice(1),
	          source: source,
	          sourceIndex: sourceIndex
	        };
	        node = new _className["default"](unescapeProp(classNameOpts, "value"));
	      } else if (~hasId.indexOf(ind)) {
	        var idOpts = {
	          value: value.slice(1),
	          source: source,
	          sourceIndex: sourceIndex
	        };
	        node = new _id["default"](unescapeProp(idOpts, "value"));
	      } else {
	        var tagOpts = {
	          value: value,
	          source: source,
	          sourceIndex: sourceIndex
	        };
	        unescapeProp(tagOpts, "value");
	        node = new _tag["default"](tagOpts);
	      }
	      _this5.newNode(node, namespace);
	      // Ensure that the namespace is used only once
	      namespace = null;
	    });
	    this.position++;
	  };
	  _proto.word = function word(namespace) {
	    var nextToken = this.nextToken;
	    if (nextToken && this.content(nextToken) === '|') {
	      this.position++;
	      return this.namespace();
	    }
	    return this.splitWord(namespace);
	  };
	  _proto.loop = function loop() {
	    while (this.position < this.tokens.length) {
	      this.parse(true);
	    }
	    this.current._inferEndPosition();
	    return this.root;
	  };
	  _proto.parse = function parse(throwOnParenthesis) {
	    switch (this.currToken[_tokenize.FIELDS.TYPE]) {
	      case tokens.space:
	        this.space();
	        break;
	      case tokens.comment:
	        this.comment();
	        break;
	      case tokens.openParenthesis:
	        this.parentheses();
	        break;
	      case tokens.closeParenthesis:
	        if (throwOnParenthesis) {
	          this.missingParenthesis();
	        }
	        break;
	      case tokens.openSquare:
	        this.attribute();
	        break;
	      case tokens.dollar:
	      case tokens.caret:
	      case tokens.equals:
	      case tokens.word:
	        this.word();
	        break;
	      case tokens.colon:
	        this.pseudo();
	        break;
	      case tokens.comma:
	        this.comma();
	        break;
	      case tokens.asterisk:
	        this.universal();
	        break;
	      case tokens.ampersand:
	        this.nesting();
	        break;
	      case tokens.slash:
	      case tokens.combinator:
	        this.combinator();
	        break;
	      case tokens.str:
	        this.string();
	        break;
	      // These cases throw; no break needed.
	      case tokens.closeSquare:
	        this.missingSquareBracket();
	      case tokens.semicolon:
	        this.missingBackslash();
	      default:
	        this.unexpected();
	    }
	  }

	  /**
	   * Helpers
	   */;
	  _proto.expected = function expected(description, index, found) {
	    if (Array.isArray(description)) {
	      var last = description.pop();
	      description = description.join(', ') + " or " + last;
	    }
	    var an = /^[aeiou]/.test(description[0]) ? 'an' : 'a';
	    if (!found) {
	      return this.error("Expected " + an + " " + description + ".", {
	        index: index
	      });
	    }
	    return this.error("Expected " + an + " " + description + ", found \"" + found + "\" instead.", {
	      index: index
	    });
	  };
	  _proto.requiredSpace = function requiredSpace(space) {
	    return this.options.lossy ? ' ' : space;
	  };
	  _proto.optionalSpace = function optionalSpace(space) {
	    return this.options.lossy ? '' : space;
	  };
	  _proto.lossySpace = function lossySpace(space, required) {
	    if (this.options.lossy) {
	      return required ? ' ' : '';
	    } else {
	      return space;
	    }
	  };
	  _proto.parseParenthesisToken = function parseParenthesisToken(token) {
	    var content = this.content(token);
	    if (token[_tokenize.FIELDS.TYPE] === tokens.space) {
	      return this.requiredSpace(content);
	    } else {
	      return content;
	    }
	  };
	  _proto.newNode = function newNode(node, namespace) {
	    if (namespace) {
	      if (/^ +$/.test(namespace)) {
	        if (!this.options.lossy) {
	          this.spaces = (this.spaces || '') + namespace;
	        }
	        namespace = true;
	      }
	      node.namespace = namespace;
	      unescapeProp(node, "namespace");
	    }
	    if (this.spaces) {
	      node.spaces.before = this.spaces;
	      this.spaces = '';
	    }
	    return this.current.append(node);
	  };
	  _proto.content = function content(token) {
	    if (token === void 0) {
	      token = this.currToken;
	    }
	    return this.css.slice(token[_tokenize.FIELDS.START_POS], token[_tokenize.FIELDS.END_POS]);
	  };
	  /**
	   * returns the index of the next non-whitespace, non-comment token.
	   * returns -1 if no meaningful token is found.
	   */
	  _proto.locateNextMeaningfulToken = function locateNextMeaningfulToken(startPosition) {
	    if (startPosition === void 0) {
	      startPosition = this.position + 1;
	    }
	    var searchPosition = startPosition;
	    while (searchPosition < this.tokens.length) {
	      if (WHITESPACE_EQUIV_TOKENS[this.tokens[searchPosition][_tokenize.FIELDS.TYPE]]) {
	        searchPosition++;
	        continue;
	      } else {
	        return searchPosition;
	      }
	    }
	    return -1;
	  };
	  _createClass(Parser, [{
	    key: "currToken",
	    get: function get() {
	      return this.tokens[this.position];
	    }
	  }, {
	    key: "nextToken",
	    get: function get() {
	      return this.tokens[this.position + 1];
	    }
	  }, {
	    key: "prevToken",
	    get: function get() {
	      return this.tokens[this.position - 1];
	    }
	  }]);
	  return Parser;
	}();
	exports["default"] = Parser;
	module.exports = exports.default; 
} (parser, parser.exports));

var parserExports = parser.exports;

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _parser = _interopRequireDefault(parserExports);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	var Processor = /*#__PURE__*/function () {
	  function Processor(func, options) {
	    this.func = func || function noop() {};
	    this.funcRes = null;
	    this.options = options;
	  }
	  var _proto = Processor.prototype;
	  _proto._shouldUpdateSelector = function _shouldUpdateSelector(rule, options) {
	    if (options === void 0) {
	      options = {};
	    }
	    var merged = Object.assign({}, this.options, options);
	    if (merged.updateSelector === false) {
	      return false;
	    } else {
	      return typeof rule !== "string";
	    }
	  };
	  _proto._isLossy = function _isLossy(options) {
	    if (options === void 0) {
	      options = {};
	    }
	    var merged = Object.assign({}, this.options, options);
	    if (merged.lossless === false) {
	      return true;
	    } else {
	      return false;
	    }
	  };
	  _proto._root = function _root(rule, options) {
	    if (options === void 0) {
	      options = {};
	    }
	    var parser = new _parser["default"](rule, this._parseOptions(options));
	    return parser.root;
	  };
	  _proto._parseOptions = function _parseOptions(options) {
	    return {
	      lossy: this._isLossy(options)
	    };
	  };
	  _proto._run = function _run(rule, options) {
	    var _this = this;
	    if (options === void 0) {
	      options = {};
	    }
	    return new Promise(function (resolve, reject) {
	      try {
	        var root = _this._root(rule, options);
	        Promise.resolve(_this.func(root)).then(function (transform) {
	          var string = undefined;
	          if (_this._shouldUpdateSelector(rule, options)) {
	            string = root.toString();
	            rule.selector = string;
	          }
	          return {
	            transform: transform,
	            root: root,
	            string: string
	          };
	        }).then(resolve, reject);
	      } catch (e) {
	        reject(e);
	        return;
	      }
	    });
	  };
	  _proto._runSync = function _runSync(rule, options) {
	    if (options === void 0) {
	      options = {};
	    }
	    var root = this._root(rule, options);
	    var transform = this.func(root);
	    if (transform && typeof transform.then === "function") {
	      throw new Error("Selector processor returned a promise to a synchronous call.");
	    }
	    var string = undefined;
	    if (options.updateSelector && typeof rule !== "string") {
	      string = root.toString();
	      rule.selector = string;
	    }
	    return {
	      transform: transform,
	      root: root,
	      string: string
	    };
	  }

	  /**
	   * Process rule into a selector AST.
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {Promise<parser.Root>} The AST of the selector after processing it.
	   */;
	  _proto.ast = function ast(rule, options) {
	    return this._run(rule, options).then(function (result) {
	      return result.root;
	    });
	  }

	  /**
	   * Process rule into a selector AST synchronously.
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {parser.Root} The AST of the selector after processing it.
	   */;
	  _proto.astSync = function astSync(rule, options) {
	    return this._runSync(rule, options).root;
	  }

	  /**
	   * Process a selector into a transformed value asynchronously
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {Promise<any>} The value returned by the processor.
	   */;
	  _proto.transform = function transform(rule, options) {
	    return this._run(rule, options).then(function (result) {
	      return result.transform;
	    });
	  }

	  /**
	   * Process a selector into a transformed value synchronously.
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {any} The value returned by the processor.
	   */;
	  _proto.transformSync = function transformSync(rule, options) {
	    return this._runSync(rule, options).transform;
	  }

	  /**
	   * Process a selector into a new selector string asynchronously.
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {string} the selector after processing.
	   */;
	  _proto.process = function process(rule, options) {
	    return this._run(rule, options).then(function (result) {
	      return result.string || result.root.toString();
	    });
	  }

	  /**
	   * Process a selector into a new selector string synchronously.
	   *
	   * @param rule {postcss.Rule | string} The css selector to be processed
	   * @param options The options for processing
	   * @returns {string} the selector after processing.
	   */;
	  _proto.processSync = function processSync(rule, options) {
	    var result = this._runSync(rule, options);
	    return result.string || result.root.toString();
	  };
	  return Processor;
	}();
	exports["default"] = Processor;
	module.exports = exports.default; 
} (processor, processor.exports));

var processorExports = processor.exports;

var selectors = {};

var constructors = {};

constructors.__esModule = true;
constructors.universal = constructors.tag = constructors.string = constructors.selector = constructors.root = constructors.pseudo = constructors.nesting = constructors.id = constructors.comment = constructors.combinator = constructors.className = constructors.attribute = void 0;
var _attribute = _interopRequireDefault$2(attribute$1);
var _className = _interopRequireDefault$2(classNameExports);
var _combinator = _interopRequireDefault$2(combinatorExports);
var _comment = _interopRequireDefault$2(commentExports);
var _id = _interopRequireDefault$2(idExports);
var _nesting = _interopRequireDefault$2(nestingExports);
var _pseudo = _interopRequireDefault$2(pseudoExports);
var _root = _interopRequireDefault$2(rootExports);
var _selector = _interopRequireDefault$2(selectorExports);
var _string = _interopRequireDefault$2(stringExports);
var _tag = _interopRequireDefault$2(tagExports);
var _universal = _interopRequireDefault$2(universalExports);
function _interopRequireDefault$2(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
var attribute = function attribute(opts) {
  return new _attribute["default"](opts);
};
constructors.attribute = attribute;
var className = function className(opts) {
  return new _className["default"](opts);
};
constructors.className = className;
var combinator = function combinator(opts) {
  return new _combinator["default"](opts);
};
constructors.combinator = combinator;
var comment = function comment(opts) {
  return new _comment["default"](opts);
};
constructors.comment = comment;
var id = function id(opts) {
  return new _id["default"](opts);
};
constructors.id = id;
var nesting = function nesting(opts) {
  return new _nesting["default"](opts);
};
constructors.nesting = nesting;
var pseudo = function pseudo(opts) {
  return new _pseudo["default"](opts);
};
constructors.pseudo = pseudo;
var root = function root(opts) {
  return new _root["default"](opts);
};
constructors.root = root;
var selector = function selector(opts) {
  return new _selector["default"](opts);
};
constructors.selector = selector;
var string = function string(opts) {
  return new _string["default"](opts);
};
constructors.string = string;
var tag = function tag(opts) {
  return new _tag["default"](opts);
};
constructors.tag = tag;
var universal = function universal(opts) {
  return new _universal["default"](opts);
};
constructors.universal = universal;

var guards = {};

guards.__esModule = true;
guards.isComment = guards.isCombinator = guards.isClassName = guards.isAttribute = void 0;
guards.isContainer = isContainer;
guards.isIdentifier = void 0;
guards.isNamespace = isNamespace;
guards.isNesting = void 0;
guards.isNode = isNode;
guards.isPseudo = void 0;
guards.isPseudoClass = isPseudoClass;
guards.isPseudoElement = isPseudoElement;
guards.isUniversal = guards.isTag = guards.isString = guards.isSelector = guards.isRoot = void 0;
var _types = types;
var _IS_TYPE;
var IS_TYPE = (_IS_TYPE = {}, _IS_TYPE[_types.ATTRIBUTE] = true, _IS_TYPE[_types.CLASS] = true, _IS_TYPE[_types.COMBINATOR] = true, _IS_TYPE[_types.COMMENT] = true, _IS_TYPE[_types.ID] = true, _IS_TYPE[_types.NESTING] = true, _IS_TYPE[_types.PSEUDO] = true, _IS_TYPE[_types.ROOT] = true, _IS_TYPE[_types.SELECTOR] = true, _IS_TYPE[_types.STRING] = true, _IS_TYPE[_types.TAG] = true, _IS_TYPE[_types.UNIVERSAL] = true, _IS_TYPE);
function isNode(node) {
  return typeof node === "object" && IS_TYPE[node.type];
}
function isNodeType(type, node) {
  return isNode(node) && node.type === type;
}
var isAttribute = isNodeType.bind(null, _types.ATTRIBUTE);
guards.isAttribute = isAttribute;
var isClassName = isNodeType.bind(null, _types.CLASS);
guards.isClassName = isClassName;
var isCombinator = isNodeType.bind(null, _types.COMBINATOR);
guards.isCombinator = isCombinator;
var isComment = isNodeType.bind(null, _types.COMMENT);
guards.isComment = isComment;
var isIdentifier = isNodeType.bind(null, _types.ID);
guards.isIdentifier = isIdentifier;
var isNesting = isNodeType.bind(null, _types.NESTING);
guards.isNesting = isNesting;
var isPseudo = isNodeType.bind(null, _types.PSEUDO);
guards.isPseudo = isPseudo;
var isRoot = isNodeType.bind(null, _types.ROOT);
guards.isRoot = isRoot;
var isSelector = isNodeType.bind(null, _types.SELECTOR);
guards.isSelector = isSelector;
var isString = isNodeType.bind(null, _types.STRING);
guards.isString = isString;
var isTag = isNodeType.bind(null, _types.TAG);
guards.isTag = isTag;
var isUniversal = isNodeType.bind(null, _types.UNIVERSAL);
guards.isUniversal = isUniversal;
function isPseudoElement(node) {
  return isPseudo(node) && node.value && (node.value.startsWith("::") || node.value.toLowerCase() === ":before" || node.value.toLowerCase() === ":after" || node.value.toLowerCase() === ":first-letter" || node.value.toLowerCase() === ":first-line");
}
function isPseudoClass(node) {
  return isPseudo(node) && !isPseudoElement(node);
}
function isContainer(node) {
  return !!(isNode(node) && node.walk);
}
function isNamespace(node) {
  return isAttribute(node) || isTag(node);
}

(function (exports) {

	exports.__esModule = true;
	var _types = types;
	Object.keys(_types).forEach(function (key) {
	  if (key === "default" || key === "__esModule") return;
	  if (key in exports && exports[key] === _types[key]) return;
	  exports[key] = _types[key];
	});
	var _constructors = constructors;
	Object.keys(_constructors).forEach(function (key) {
	  if (key === "default" || key === "__esModule") return;
	  if (key in exports && exports[key] === _constructors[key]) return;
	  exports[key] = _constructors[key];
	});
	var _guards = guards;
	Object.keys(_guards).forEach(function (key) {
	  if (key === "default" || key === "__esModule") return;
	  if (key in exports && exports[key] === _guards[key]) return;
	  exports[key] = _guards[key];
	}); 
} (selectors));

(function (module, exports) {

	exports.__esModule = true;
	exports["default"] = void 0;
	var _processor = _interopRequireDefault(processorExports);
	var selectors$1 = _interopRequireWildcard(selectors);
	function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
	function _interopRequireWildcard(obj, nodeInterop) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
	var parser = function parser(processor) {
	  return new _processor["default"](processor);
	};
	Object.assign(parser, selectors$1);
	delete parser.__esModule;
	var _default = parser;
	exports["default"] = _default;
	module.exports = exports.default; 
} (dist, dist.exports));

var distExports = dist.exports;

const selectorParser$1 = distExports;
const valueParser = lib;
const { extractICSS } = src$4;

const IGNORE_FILE_MARKER = "cssmodules-pure-no-check";
const IGNORE_NEXT_LINE_MARKER = "cssmodules-pure-ignore";

const isSpacing = (node) => node.type === "combinator" && node.value === " ";

const isPureCheckDisabled = (root) => {
  for (const node of root.nodes) {
    if (node.type !== "comment") {
      return false;
    }
    if (node.text.trim().startsWith(IGNORE_FILE_MARKER)) {
      return true;
    }
  }
  return false;
};

function getIgnoreComment(node) {
  if (!node.parent) {
    return;
  }
  const indexInParent = node.parent.index(node);
  for (let i = indexInParent - 1; i >= 0; i--) {
    const prevNode = node.parent.nodes[i];
    if (prevNode.type === "comment") {
      if (prevNode.text.trimStart().startsWith(IGNORE_NEXT_LINE_MARKER)) {
        return prevNode;
      }
    } else {
      break;
    }
  }
}

function normalizeNodeArray(nodes) {
  const array = [];

  nodes.forEach((x) => {
    if (Array.isArray(x)) {
      normalizeNodeArray(x).forEach((item) => {
        array.push(item);
      });
    } else if (x) {
      array.push(x);
    }
  });

  if (array.length > 0 && isSpacing(array[array.length - 1])) {
    array.pop();
  }
  return array;
}

const isPureSelectorSymbol = Symbol("is-pure-selector");

function localizeNode(rule, mode, localAliasMap) {
  const transform = (node, context) => {
    if (context.ignoreNextSpacing && !isSpacing(node)) {
      throw new Error("Missing whitespace after " + context.ignoreNextSpacing);
    }

    if (context.enforceNoSpacing && isSpacing(node)) {
      throw new Error("Missing whitespace before " + context.enforceNoSpacing);
    }

    let newNodes;

    switch (node.type) {
      case "root": {
        let resultingGlobal;

        context.hasPureGlobals = false;

        newNodes = node.nodes.map((n) => {
          const nContext = {
            global: context.global,
            lastWasSpacing: true,
            hasLocals: false,
            explicit: false,
          };

          n = transform(n, nContext);

          if (typeof resultingGlobal === "undefined") {
            resultingGlobal = nContext.global;
          } else if (resultingGlobal !== nContext.global) {
            throw new Error(
              'Inconsistent rule global/local result in rule "' +
                node +
                '" (multiple selectors must result in the same mode for the rule)'
            );
          }

          if (!nContext.hasLocals) {
            context.hasPureGlobals = true;
          }

          return n;
        });

        context.global = resultingGlobal;

        node.nodes = normalizeNodeArray(newNodes);
        break;
      }
      case "selector": {
        newNodes = node.map((childNode) => transform(childNode, context));

        node = node.clone();
        node.nodes = normalizeNodeArray(newNodes);
        break;
      }
      case "combinator": {
        if (isSpacing(node)) {
          if (context.ignoreNextSpacing) {
            context.ignoreNextSpacing = false;
            context.lastWasSpacing = false;
            context.enforceNoSpacing = false;
            return null;
          }
          context.lastWasSpacing = true;
          return node;
        }
        break;
      }
      case "pseudo": {
        let childContext;
        const isNested = !!node.length;
        const isScoped = node.value === ":local" || node.value === ":global";
        const isImportExport =
          node.value === ":import" || node.value === ":export";

        if (isImportExport) {
          context.hasLocals = true;
          // :local(.foo)
        } else if (isNested) {
          if (isScoped) {
            if (node.nodes.length === 0) {
              throw new Error(`${node.value}() can't be empty`);
            }

            if (context.inside) {
              throw new Error(
                `A ${node.value} is not allowed inside of a ${context.inside}(...)`
              );
            }

            childContext = {
              global: node.value === ":global",
              inside: node.value,
              hasLocals: false,
              explicit: true,
            };

            newNodes = node
              .map((childNode) => transform(childNode, childContext))
              .reduce((acc, next) => acc.concat(next.nodes), []);

            if (newNodes.length) {
              const { before, after } = node.spaces;

              const first = newNodes[0];
              const last = newNodes[newNodes.length - 1];

              first.spaces = { before, after: first.spaces.after };
              last.spaces = { before: last.spaces.before, after };
            }

            node = newNodes;

            break;
          } else {
            childContext = {
              global: context.global,
              inside: context.inside,
              lastWasSpacing: true,
              hasLocals: false,
              explicit: context.explicit,
            };
            newNodes = node.map((childNode) => {
              const newContext = {
                ...childContext,
                enforceNoSpacing: false,
              };

              const result = transform(childNode, newContext);

              childContext.global = newContext.global;
              childContext.hasLocals = newContext.hasLocals;

              return result;
            });

            node = node.clone();
            node.nodes = normalizeNodeArray(newNodes);

            if (childContext.hasLocals) {
              context.hasLocals = true;
            }
          }
          break;

          //:local .foo .bar
        } else if (isScoped) {
          if (context.inside) {
            throw new Error(
              `A ${node.value} is not allowed inside of a ${context.inside}(...)`
            );
          }

          const addBackSpacing = !!node.spaces.before;

          context.ignoreNextSpacing = context.lastWasSpacing
            ? node.value
            : false;

          context.enforceNoSpacing = context.lastWasSpacing
            ? false
            : node.value;

          context.global = node.value === ":global";
          context.explicit = true;

          // because this node has spacing that is lost when we remove it
          // we make up for it by adding an extra combinator in since adding
          // spacing on the parent selector doesn't work
          return addBackSpacing
            ? selectorParser$1.combinator({ value: " " })
            : null;
        }
        break;
      }
      case "id":
      case "class": {
        if (!node.value) {
          throw new Error("Invalid class or id selector syntax");
        }

        if (context.global) {
          break;
        }

        const isImportedValue = localAliasMap.has(node.value);
        const isImportedWithExplicitScope = isImportedValue && context.explicit;

        if (!isImportedValue || isImportedWithExplicitScope) {
          const innerNode = node.clone();
          innerNode.spaces = { before: "", after: "" };

          node = selectorParser$1.pseudo({
            value: ":local",
            nodes: [innerNode],
            spaces: node.spaces,
          });

          context.hasLocals = true;
        }

        break;
      }
      case "nesting": {
        if (node.value === "&") {
          context.hasLocals = rule.parent[isPureSelectorSymbol];
        }
      }
    }

    context.lastWasSpacing = false;
    context.ignoreNextSpacing = false;
    context.enforceNoSpacing = false;

    return node;
  };

  const rootContext = {
    global: mode === "global",
    hasPureGlobals: false,
  };

  rootContext.selector = selectorParser$1((root) => {
    transform(root, rootContext);
  }).processSync(rule, { updateSelector: false, lossless: true });

  return rootContext;
}

function localizeDeclNode(node, context) {
  switch (node.type) {
    case "word":
      if (context.localizeNextItem) {
        if (!context.localAliasMap.has(node.value)) {
          node.value = ":local(" + node.value + ")";
          context.localizeNextItem = false;
        }
      }
      break;

    case "function":
      if (
        context.options &&
        context.options.rewriteUrl &&
        node.value.toLowerCase() === "url"
      ) {
        node.nodes.map((nestedNode) => {
          if (nestedNode.type !== "string" && nestedNode.type !== "word") {
            return;
          }

          let newUrl = context.options.rewriteUrl(
            context.global,
            nestedNode.value
          );

          switch (nestedNode.type) {
            case "string":
              if (nestedNode.quote === "'") {
                newUrl = newUrl.replace(/(\\)/g, "\\$1").replace(/'/g, "\\'");
              }

              if (nestedNode.quote === '"') {
                newUrl = newUrl.replace(/(\\)/g, "\\$1").replace(/"/g, '\\"');
              }

              break;
            case "word":
              newUrl = newUrl.replace(/("|'|\)|\\)/g, "\\$1");
              break;
          }

          nestedNode.value = newUrl;
        });
      }
      break;
  }
  return node;
}

// `none` is special value, other is global values
const specialKeywords = [
  "none",
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset",
];

function localizeDeclarationValues(localize, declaration, context) {
  const valueNodes = valueParser(declaration.value);

  valueNodes.walk((node, index, nodes) => {
    if (
      node.type === "function" &&
      (node.value.toLowerCase() === "var" || node.value.toLowerCase() === "env")
    ) {
      return false;
    }

    if (
      node.type === "word" &&
      specialKeywords.includes(node.value.toLowerCase())
    ) {
      return;
    }

    const subContext = {
      options: context.options,
      global: context.global,
      localizeNextItem: localize,
      localAliasMap: context.localAliasMap,
    };
    nodes[index] = localizeDeclNode(node, subContext);
  });

  declaration.value = valueNodes.toString();
}

// letter
// An uppercase letter or a lowercase letter.
//
// ident-start code point
// A letter, a non-ASCII code point, or U+005F LOW LINE (_).
//
// ident code point
// An ident-start code point, a digit, or U+002D HYPHEN-MINUS (-).

// We don't validate `hex digits`, because we don't need it, it is work of linters.
const validIdent =
  /^-?([a-z\u0080-\uFFFF_]|(\\[^\r\n\f])|-(?![0-9]))((\\[^\r\n\f])|[a-z\u0080-\uFFFF_0-9-])*$/i;

/*
    The spec defines some keywords that you can use to describe properties such as the timing
    function. These are still valid animation names, so as long as there is a property that accepts
    a keyword, it is given priority. Only when all the properties that can take a keyword are
    exhausted can the animation name be set to the keyword. I.e.

    animation: infinite infinite;

    The animation will repeat an infinite number of times from the first argument, and will have an
    animation name of infinite from the second.
    */
const animationKeywords = {
  // animation-direction
  $normal: 1,
  $reverse: 1,
  $alternate: 1,
  "$alternate-reverse": 1,
  // animation-fill-mode
  $forwards: 1,
  $backwards: 1,
  $both: 1,
  // animation-iteration-count
  $infinite: 1,
  // animation-play-state
  $paused: 1,
  $running: 1,
  // animation-timing-function
  $ease: 1,
  "$ease-in": 1,
  "$ease-out": 1,
  "$ease-in-out": 1,
  $linear: 1,
  "$step-end": 1,
  "$step-start": 1,
  // Special
  $none: Infinity, // No matter how many times you write none, it will never be an animation name
  // Global values
  $initial: Infinity,
  $inherit: Infinity,
  $unset: Infinity,
  $revert: Infinity,
  "$revert-layer": Infinity,
};

function localizeDeclaration(declaration, context) {
  const isAnimation = /animation(-name)?$/i.test(declaration.prop);

  if (isAnimation) {
    let parsedAnimationKeywords = {};
    const valueNodes = valueParser(declaration.value).walk((node) => {
      // If div-token appeared (represents as comma ','), a possibility of an animation-keywords should be reflesh.
      if (node.type === "div") {
        parsedAnimationKeywords = {};

        return;
      } else if (
        node.type === "function" &&
        node.value.toLowerCase() === "local" &&
        node.nodes.length === 1
      ) {
        node.type = "word";
        node.value = node.nodes[0].value;

        return localizeDeclNode(node, {
          options: context.options,
          global: context.global,
          localizeNextItem: true,
          localAliasMap: context.localAliasMap,
        });
      } else if (node.type === "function") {
        // replace `animation: global(example)` with `animation-name: example`
        if (node.value.toLowerCase() === "global" && node.nodes.length === 1) {
          node.type = "word";
          node.value = node.nodes[0].value;
        }

        // Do not handle nested functions
        return false;
      }
      // Ignore all except word
      else if (node.type !== "word") {
        return;
      }

      const value = node.type === "word" ? node.value.toLowerCase() : null;

      let shouldParseAnimationName = false;

      if (value && validIdent.test(value)) {
        if ("$" + value in animationKeywords) {
          parsedAnimationKeywords["$" + value] =
            "$" + value in parsedAnimationKeywords
              ? parsedAnimationKeywords["$" + value] + 1
              : 0;

          shouldParseAnimationName =
            parsedAnimationKeywords["$" + value] >=
            animationKeywords["$" + value];
        } else {
          shouldParseAnimationName = true;
        }
      }

      return localizeDeclNode(node, {
        options: context.options,
        global: context.global,
        localizeNextItem: shouldParseAnimationName && !context.global,
        localAliasMap: context.localAliasMap,
      });
    });

    declaration.value = valueNodes.toString();

    return;
  }

  if (/url\(/i.test(declaration.value)) {
    return localizeDeclarationValues(false, declaration, context);
  }
}

const isPureSelector = (context, rule) => {
  if (!rule.parent || rule.type === "root") {
    return !context.hasPureGlobals;
  }

  if (rule.type === "rule" && rule[isPureSelectorSymbol]) {
    return rule[isPureSelectorSymbol] || isPureSelector(context, rule.parent);
  }

  return !context.hasPureGlobals || isPureSelector(context, rule.parent);
};

const isNodeWithoutDeclarations = (rule) => {
  if (rule.nodes.length > 0) {
    return !rule.nodes.every(
      (item) =>
        item.type === "rule" ||
        (item.type === "atrule" && !isNodeWithoutDeclarations(item))
    );
  }

  return true;
};

src$2.exports = (options = {}) => {
  if (
    options &&
    options.mode &&
    options.mode !== "global" &&
    options.mode !== "local" &&
    options.mode !== "pure"
  ) {
    throw new Error(
      'options.mode must be either "global", "local" or "pure" (default "local")'
    );
  }

  const pureMode = options && options.mode === "pure";
  const globalMode = options && options.mode === "global";

  return {
    postcssPlugin: "postcss-modules-local-by-default",
    prepare() {
      const localAliasMap = new Map();

      return {
        Once(root) {
          const { icssImports } = extractICSS(root, false);
          const enforcePureMode = pureMode && !isPureCheckDisabled(root);

          Object.keys(icssImports).forEach((key) => {
            Object.keys(icssImports[key]).forEach((prop) => {
              localAliasMap.set(prop, icssImports[key][prop]);
            });
          });

          root.walkAtRules((atRule) => {
            if (/keyframes$/i.test(atRule.name)) {
              const globalMatch = /^\s*:global\s*\((.+)\)\s*$/.exec(
                atRule.params
              );
              const localMatch = /^\s*:local\s*\((.+)\)\s*$/.exec(
                atRule.params
              );

              let globalKeyframes = globalMode;

              if (globalMatch) {
                if (enforcePureMode) {
                  const ignoreComment = getIgnoreComment(atRule);
                  if (!ignoreComment) {
                    throw atRule.error(
                      "@keyframes :global(...) is not allowed in pure mode"
                    );
                  } else {
                    ignoreComment.remove();
                  }
                }
                atRule.params = globalMatch[1];
                globalKeyframes = true;
              } else if (localMatch) {
                atRule.params = localMatch[0];
                globalKeyframes = false;
              } else if (
                atRule.params &&
                !globalMode &&
                !localAliasMap.has(atRule.params)
              ) {
                atRule.params = ":local(" + atRule.params + ")";
              }

              atRule.walkDecls((declaration) => {
                localizeDeclaration(declaration, {
                  localAliasMap,
                  options: options,
                  global: globalKeyframes,
                });
              });
            } else if (/scope$/i.test(atRule.name)) {
              if (atRule.params) {
                const ignoreComment = pureMode
                  ? getIgnoreComment(atRule)
                  : undefined;

                if (ignoreComment) {
                  ignoreComment.remove();
                }

                atRule.params = atRule.params
                  .split("to")
                  .map((item) => {
                    const selector = item.trim().slice(1, -1).trim();
                    const context = localizeNode(
                      selector,
                      options.mode,
                      localAliasMap
                    );

                    context.options = options;
                    context.localAliasMap = localAliasMap;

                    if (
                      enforcePureMode &&
                      context.hasPureGlobals &&
                      !ignoreComment
                    ) {
                      throw atRule.error(
                        'Selector in at-rule"' +
                          selector +
                          '" is not pure ' +
                          "(pure selectors must contain at least one local class or id)"
                      );
                    }

                    return `(${context.selector})`;
                  })
                  .join(" to ");
              }

              atRule.nodes.forEach((declaration) => {
                if (declaration.type === "decl") {
                  localizeDeclaration(declaration, {
                    localAliasMap,
                    options: options,
                    global: globalMode,
                  });
                }
              });
            } else if (atRule.nodes) {
              atRule.nodes.forEach((declaration) => {
                if (declaration.type === "decl") {
                  localizeDeclaration(declaration, {
                    localAliasMap,
                    options: options,
                    global: globalMode,
                  });
                }
              });
            }
          });

          root.walkRules((rule) => {
            if (
              rule.parent &&
              rule.parent.type === "atrule" &&
              /keyframes$/i.test(rule.parent.name)
            ) {
              // ignore keyframe rules
              return;
            }

            const context = localizeNode(rule, options.mode, localAliasMap);

            context.options = options;
            context.localAliasMap = localAliasMap;

            const ignoreComment = enforcePureMode
              ? getIgnoreComment(rule)
              : undefined;
            const isNotPure = enforcePureMode && !isPureSelector(context, rule);

            if (
              isNotPure &&
              isNodeWithoutDeclarations(rule) &&
              !ignoreComment
            ) {
              throw rule.error(
                'Selector "' +
                  rule.selector +
                  '" is not pure ' +
                  "(pure selectors must contain at least one local class or id)"
              );
            } else if (ignoreComment) {
              ignoreComment.remove();
            }

            if (pureMode) {
              rule[isPureSelectorSymbol] = !isNotPure;
            }

            rule.selector = context.selector;

            // Less-syntax mixins parse as rules with no nodes
            if (rule.nodes) {
              rule.nodes.forEach((declaration) =>
                localizeDeclaration(declaration, context)
              );
            }
          });
        },
      };
    },
  };
};
src$2.exports.postcss = true;

var srcExports$1 = src$2.exports;

const selectorParser = distExports;

const hasOwnProperty = Object.prototype.hasOwnProperty;

function isNestedRule(rule) {
  if (!rule.parent || rule.parent.type === "root") {
    return false;
  }

  if (rule.parent.type === "rule") {
    return true;
  }

  return isNestedRule(rule.parent);
}

function getSingleLocalNamesForComposes(root, rule) {
  if (isNestedRule(rule)) {
    throw new Error(`composition is not allowed in nested rule \n\n${rule}`);
  }

  return root.nodes.map((node) => {
    if (node.type !== "selector" || node.nodes.length !== 1) {
      throw new Error(
        `composition is only allowed when selector is single :local class name not in "${root}"`
      );
    }

    node = node.nodes[0];

    if (
      node.type !== "pseudo" ||
      node.value !== ":local" ||
      node.nodes.length !== 1
    ) {
      throw new Error(
        'composition is only allowed when selector is single :local class name not in "' +
          root +
          '", "' +
          node +
          '" is weird'
      );
    }

    node = node.first;

    if (node.type !== "selector" || node.length !== 1) {
      throw new Error(
        'composition is only allowed when selector is single :local class name not in "' +
          root +
          '", "' +
          node +
          '" is weird'
      );
    }

    node = node.first;

    if (node.type !== "class") {
      // 'id' is not possible, because you can't compose ids
      throw new Error(
        'composition is only allowed when selector is single :local class name not in "' +
          root +
          '", "' +
          node +
          '" is weird'
      );
    }

    return node.value;
  });
}

const whitespace = "[\\x20\\t\\r\\n\\f]";
const unescapeRegExp = new RegExp(
  "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)",
  "ig"
);

function unescape(str) {
  return str.replace(unescapeRegExp, (_, escaped, escapedWhitespace) => {
    const high = "0x" + escaped - 0x10000;

    // NaN means non-codepoint
    // Workaround erroneous numeric interpretation of +"0x"
    return high !== high || escapedWhitespace
      ? escaped
      : high < 0
      ? // BMP codepoint
        String.fromCharCode(high + 0x10000)
      : // Supplemental Plane codepoint (surrogate pair)
        String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
  });
}

const plugin = (options = {}) => {
  const generateScopedName =
    (options && options.generateScopedName) || plugin.generateScopedName;
  const generateExportEntry =
    (options && options.generateExportEntry) || plugin.generateExportEntry;
  const exportGlobals = options && options.exportGlobals;

  return {
    postcssPlugin: "postcss-modules-scope",
    Once(root, { rule }) {
      const exports = Object.create(null);

      function exportScopedName(name, rawName, node) {
        const scopedName = generateScopedName(
          rawName ? rawName : name,
          root.source.input.from,
          root.source.input.css,
          node
        );
        const exportEntry = generateExportEntry(
          rawName ? rawName : name,
          scopedName,
          root.source.input.from,
          root.source.input.css,
          node
        );
        const { key, value } = exportEntry;

        exports[key] = exports[key] || [];

        if (exports[key].indexOf(value) < 0) {
          exports[key].push(value);
        }

        return scopedName;
      }

      function localizeNode(node) {
        switch (node.type) {
          case "selector":
            node.nodes = node.map((item) => localizeNode(item));
            return node;
          case "class":
            return selectorParser.className({
              value: exportScopedName(
                node.value,
                node.raws && node.raws.value ? node.raws.value : null,
                node
              ),
            });
          case "id": {
            return selectorParser.id({
              value: exportScopedName(
                node.value,
                node.raws && node.raws.value ? node.raws.value : null,
                node
              ),
            });
          }
          case "attribute": {
            if (node.attribute === "class" && node.operator === "=") {
              return selectorParser.attribute({
                attribute: node.attribute,
                operator: node.operator,
                quoteMark: "'",
                value: exportScopedName(node.value, null, null),
              });
            }
          }
        }

        throw new Error(
          `${node.type} ("${node}") is not allowed in a :local block`
        );
      }

      function traverseNode(node) {
        switch (node.type) {
          case "pseudo":
            if (node.value === ":local") {
              if (node.nodes.length !== 1) {
                throw new Error('Unexpected comma (",") in :local block');
              }

              const selector = localizeNode(node.first);
              // move the spaces that were around the pseudo selector to the first
              // non-container node
              selector.first.spaces = node.spaces;

              const nextNode = node.next();

              if (
                nextNode &&
                nextNode.type === "combinator" &&
                nextNode.value === " " &&
                /\\[A-F0-9]{1,6}$/.test(selector.last.value)
              ) {
                selector.last.spaces.after = " ";
              }

              node.replaceWith(selector);

              return;
            }
          /* falls through */
          case "root":
          case "selector": {
            node.each((item) => traverseNode(item));
            break;
          }
          case "id":
          case "class":
            if (exportGlobals) {
              exports[node.value] = [node.value];
            }
            break;
        }
        return node;
      }

      // Find any :import and remember imported names
      const importedNames = {};

      root.walkRules(/^:import\(.+\)$/, (rule) => {
        rule.walkDecls((decl) => {
          importedNames[decl.prop] = true;
        });
      });

      // Find any :local selectors
      root.walkRules((rule) => {
        let parsedSelector = selectorParser().astSync(rule);

        rule.selector = traverseNode(parsedSelector.clone()).toString();

        rule.walkDecls(/^(composes|compose-with)$/i, (decl) => {
          const localNames = getSingleLocalNamesForComposes(
            parsedSelector,
            decl.parent
          );
          const multiple = decl.value.split(",");

          multiple.forEach((value) => {
            const classes = value.trim().split(/\s+/);

            classes.forEach((className) => {
              const global = /^global\(([^)]+)\)$/.exec(className);

              if (global) {
                localNames.forEach((exportedName) => {
                  exports[exportedName].push(global[1]);
                });
              } else if (hasOwnProperty.call(importedNames, className)) {
                localNames.forEach((exportedName) => {
                  exports[exportedName].push(className);
                });
              } else if (hasOwnProperty.call(exports, className)) {
                localNames.forEach((exportedName) => {
                  exports[className].forEach((item) => {
                    exports[exportedName].push(item);
                  });
                });
              } else {
                throw decl.error(
                  `referenced class name "${className}" in ${decl.prop} not found`
                );
              }
            });
          });

          decl.remove();
        });

        // Find any :local values
        rule.walkDecls((decl) => {
          if (!/:local\s*\((.+?)\)/.test(decl.value)) {
            return;
          }

          let tokens = decl.value.split(/(,|'[^']*'|"[^"]*")/);

          tokens = tokens.map((token, idx) => {
            if (idx === 0 || tokens[idx - 1] === ",") {
              let result = token;

              const localMatch = /:local\s*\((.+?)\)/.exec(token);

              if (localMatch) {
                const input = localMatch.input;
                const matchPattern = localMatch[0];
                const matchVal = localMatch[1];
                const newVal = exportScopedName(matchVal);

                result = input.replace(matchPattern, newVal);
              } else {
                return token;
              }

              return result;
            } else {
              return token;
            }
          });

          decl.value = tokens.join("");
        });
      });

      // Find any :local keyframes
      root.walkAtRules(/keyframes$/i, (atRule) => {
        const localMatch = /^\s*:local\s*\((.+?)\)\s*$/.exec(atRule.params);

        if (!localMatch) {
          return;
        }

        atRule.params = exportScopedName(localMatch[1]);
      });

      root.walkAtRules(/scope$/i, (atRule) => {
        if (atRule.params) {
          atRule.params = atRule.params
            .split("to")
            .map((item) => {
              const selector = item.trim().slice(1, -1).trim();

              const localMatch = /^\s*:local\s*\((.+?)\)\s*$/.exec(selector);

              if (!localMatch) {
                return `(${selector})`;
              }

              let parsedSelector = selectorParser().astSync(selector);

              return `(${traverseNode(parsedSelector).toString()})`;
            })
            .join(" to ");
        }
      });

      // If we found any :locals, insert an :export rule
      const exportedNames = Object.keys(exports);

      if (exportedNames.length > 0) {
        const exportRule = rule({ selector: ":export" });

        exportedNames.forEach((exportedName) =>
          exportRule.append({
            prop: exportedName,
            value: exports[exportedName].join(" "),
            raws: { before: "\n  " },
          })
        );

        root.append(exportRule);
      }
    },
  };
};

plugin.postcss = true;

plugin.generateScopedName = function (name, path) {
  const sanitisedPath = path
    .replace(/\.[^./\\]+$/, "")
    .replace(/[\W_]+/g, "_")
    .replace(/^_|_$/g, "");

  return `_${sanitisedPath}__${name}`.trim();
};

plugin.generateExportEntry = function (name, scopedName) {
  return {
    key: unescape(name),
    value: unescape(scopedName),
  };
};

var src$1 = plugin;

function hash(str) {
  var hash = 5381,
      i    = str.length;

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
}

var stringHash = hash;

var src = {exports: {}};

const ICSSUtils = src$4;

const matchImports = /^(.+?|\([\s\S]+?\))\s+from\s+("[^"]*"|'[^']*'|[\w-]+)$/;
const matchValueDefinition = /(?:\s+|^)([\w-]+):?(.*?)$/;
const matchImport = /^([\w-]+)(?:\s+as\s+([\w-]+))?/;

src.exports = (options) => {
  let importIndex = 0;
  const createImportedName =
    (options && options.createImportedName) ||
    ((importName /*, path*/) =>
      `i__const_${importName.replace(/\W/g, "_")}_${importIndex++}`);

  return {
    postcssPlugin: "postcss-modules-values",
    prepare(result) {
      const importAliases = [];
      const definitions = {};

      return {
        Once(root, postcss) {
          root.walkAtRules(/value/i, (atRule) => {
            const matches = atRule.params.match(matchImports);

            if (matches) {
              let [, /*match*/ aliases, path] = matches;

              // We can use constants for path names
              if (definitions[path]) {
                path = definitions[path];
              }

              const imports = aliases
                .replace(/^\(\s*([\s\S]+)\s*\)$/, "$1")
                .split(/\s*,\s*/)
                .map((alias) => {
                  const tokens = matchImport.exec(alias);

                  if (tokens) {
                    const [, /*match*/ theirName, myName = theirName] = tokens;
                    const importedName = createImportedName(myName);
                    definitions[myName] = importedName;
                    return { theirName, importedName };
                  } else {
                    throw new Error(`@import statement "${alias}" is invalid!`);
                  }
                });

              importAliases.push({ path, imports });

              atRule.remove();

              return;
            }

            if (atRule.params.indexOf("@value") !== -1) {
              result.warn("Invalid value definition: " + atRule.params);
            }

            let [, key, value] = `${atRule.params}${atRule.raws.between}`.match(
              matchValueDefinition
            );

            const normalizedValue = value.replace(/\/\*((?!\*\/).*?)\*\//g, "");

            if (normalizedValue.length === 0) {
              result.warn("Invalid value definition: " + atRule.params);
              atRule.remove();

              return;
            }

            let isOnlySpace = /^\s+$/.test(normalizedValue);

            if (!isOnlySpace) {
              value = value.trim();
            }

            // Add to the definitions, knowing that values can refer to each other
            definitions[key] = ICSSUtils.replaceValueSymbols(
              value,
              definitions
            );

            atRule.remove();
          });

          /* If we have no definitions, don't continue */
          if (!Object.keys(definitions).length) {
            return;
          }

          /* Perform replacements */
          ICSSUtils.replaceSymbols(root, definitions);

          /* We want to export anything defined by now, but don't add it to the CSS yet or it well get picked up by the replacement stuff */
          const exportDeclarations = Object.keys(definitions).map((key) =>
            postcss.decl({
              value: definitions[key],
              prop: key,
              raws: { before: "\n  " },
            })
          );

          /* Add export rules if any */
          if (exportDeclarations.length > 0) {
            const exportRule = postcss.rule({
              selector: ":export",
              raws: { after: "\n" },
            });

            exportRule.append(exportDeclarations);

            root.prepend(exportRule);
          }

          /* Add import rules */
          importAliases.reverse().forEach(({ path, imports }) => {
            const importRule = postcss.rule({
              selector: `:import(${path})`,
              raws: { after: "\n" },
            });

            imports.forEach(({ theirName, importedName }) => {
              importRule.append({
                value: theirName,
                prop: importedName,
                raws: { before: "\n  " },
              });
            });

            root.prepend(importRule);
          });
        },
      };
    },
  };
};

src.exports.postcss = true;

var srcExports = src.exports;

Object.defineProperty(scoping, "__esModule", {
  value: true
});
scoping.behaviours = void 0;
scoping.getDefaultPlugins = getDefaultPlugins;
scoping.getDefaultScopeBehaviour = getDefaultScopeBehaviour;
scoping.getScopedNameGenerator = getScopedNameGenerator;

var _postcssModulesExtractImports = _interopRequireDefault$1(srcExports$2);

var _genericNames = _interopRequireDefault$1(genericNames);

var _postcssModulesLocalByDefault = _interopRequireDefault$1(srcExports$1);

var _postcssModulesScope = _interopRequireDefault$1(src$1);

var _stringHash = _interopRequireDefault$1(stringHash);

var _postcssModulesValues = _interopRequireDefault$1(srcExports);

function _interopRequireDefault$1(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const behaviours = {
  LOCAL: "local",
  GLOBAL: "global"
};
scoping.behaviours = behaviours;

function getDefaultPlugins({
  behaviour,
  generateScopedName,
  exportGlobals
}) {
  const scope = (0, _postcssModulesScope.default)({
    generateScopedName,
    exportGlobals
  });
  const plugins = {
    [behaviours.LOCAL]: [_postcssModulesValues.default, (0, _postcssModulesLocalByDefault.default)({
      mode: "local"
    }), _postcssModulesExtractImports.default, scope],
    [behaviours.GLOBAL]: [_postcssModulesValues.default, (0, _postcssModulesLocalByDefault.default)({
      mode: "global"
    }), _postcssModulesExtractImports.default, scope]
  };
  return plugins[behaviour];
}

function isValidBehaviour(behaviour) {
  return Object.keys(behaviours).map(key => behaviours[key]).indexOf(behaviour) > -1;
}

function getDefaultScopeBehaviour(scopeBehaviour) {
  return scopeBehaviour && isValidBehaviour(scopeBehaviour) ? scopeBehaviour : behaviours.LOCAL;
}

function generateScopedNameDefault(name, filename, css) {
  const i = css.indexOf(`.${name}`);
  const lineNumber = css.substr(0, i).split(/[\r\n]/).length;
  const hash = (0, _stringHash.default)(css).toString(36).substr(0, 5);
  return `_${name}_${hash}_${lineNumber}`;
}

function getScopedNameGenerator(generateScopedName, hashPrefix) {
  const scopedNameGenerator = generateScopedName || generateScopedNameDefault;

  if (typeof scopedNameGenerator === "function") {
    return scopedNameGenerator;
  }

  return (0, _genericNames.default)(scopedNameGenerator, {
    context: process.cwd(),
    hashPrefix: hashPrefix
  });
}

Object.defineProperty(pluginFactory, "__esModule", {
  value: true
});
pluginFactory.makePlugin = makePlugin;

var _postcss = _interopRequireDefault(require$$0);

var _unquote = _interopRequireDefault(unquote$1);

var _Parser = _interopRequireDefault(Parser$1);

var _saveJSON = _interopRequireDefault(saveJSON$1);

var _localsConvention = localsConvention;

var _FileSystemLoader = _interopRequireDefault(FileSystemLoader$1);

var _scoping = scoping;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PLUGIN_NAME = "postcss-modules";

function isGlobalModule(globalModules, inputFile) {
  return globalModules.some(regex => inputFile.match(regex));
}

function getDefaultPluginsList(opts, inputFile) {
  const globalModulesList = opts.globalModulePaths || null;
  const exportGlobals = opts.exportGlobals || false;
  const defaultBehaviour = (0, _scoping.getDefaultScopeBehaviour)(opts.scopeBehaviour);
  const generateScopedName = (0, _scoping.getScopedNameGenerator)(opts.generateScopedName, opts.hashPrefix);

  if (globalModulesList && isGlobalModule(globalModulesList, inputFile)) {
    return (0, _scoping.getDefaultPlugins)({
      behaviour: _scoping.behaviours.GLOBAL,
      generateScopedName,
      exportGlobals
    });
  }

  return (0, _scoping.getDefaultPlugins)({
    behaviour: defaultBehaviour,
    generateScopedName,
    exportGlobals
  });
}

function getLoader(opts, plugins) {
  const root = typeof opts.root === "undefined" ? "/" : opts.root;
  return typeof opts.Loader === "function" ? new opts.Loader(root, plugins, opts.resolve) : new _FileSystemLoader.default(root, plugins, opts.resolve);
}

function isOurPlugin(plugin) {
  return plugin.postcssPlugin === PLUGIN_NAME;
}

function makePlugin(opts) {
  return {
    postcssPlugin: PLUGIN_NAME,

    async OnceExit(css, {
      result
    }) {
      const getJSON = opts.getJSON || _saveJSON.default;
      const inputFile = css.source.input.file;
      const pluginList = getDefaultPluginsList(opts, inputFile);
      const resultPluginIndex = result.processor.plugins.findIndex(plugin => isOurPlugin(plugin));

      if (resultPluginIndex === -1) {
        throw new Error("Plugin missing from options.");
      }

      const earlierPlugins = result.processor.plugins.slice(0, resultPluginIndex);
      const loaderPlugins = [...earlierPlugins, ...pluginList];
      const loader = getLoader(opts, loaderPlugins);

      const fetcher = async (file, relativeTo, depTrace) => {
        const unquoteFile = (0, _unquote.default)(file);
        return loader.fetch.call(loader, unquoteFile, relativeTo, depTrace);
      };

      const parser = new _Parser.default(fetcher);
      await (0, _postcss.default)([...pluginList, parser.plugin()]).process(css, {
        from: inputFile
      });
      const out = loader.finalSource;
      if (out) css.prepend(out);

      if (opts.localsConvention) {
        const reducer = (0, _localsConvention.makeLocalsConventionReducer)(opts.localsConvention, inputFile);
        parser.exportTokens = Object.entries(parser.exportTokens).reduce(reducer, {});
      }

      result.messages.push({
        type: "export",
        plugin: "postcss-modules",
        exportTokens: parser.exportTokens
      }); // getJSON may return a promise

      return getJSON(css.source.input.file, parser.exportTokens, result.opts.to);
    }

  };
}

var _fs = require$$0$2;

var _fs2 = fs;

var _pluginFactory = pluginFactory;

(0, _fs2.setFileSystem)({
  readFile: _fs.readFile,
  writeFile: _fs.writeFile
});

build.exports = (opts = {}) => (0, _pluginFactory.makePlugin)(opts);

var postcss = build.exports.postcss = true;

var buildExports = build.exports;
var index = /*@__PURE__*/getDefaultExportFromCjs(buildExports);

var index$1 = /*#__PURE__*/_mergeNamespaces({
  __proto__: null,
  default: index,
  postcss: postcss
}, [buildExports]);

export { index$1 as i };
