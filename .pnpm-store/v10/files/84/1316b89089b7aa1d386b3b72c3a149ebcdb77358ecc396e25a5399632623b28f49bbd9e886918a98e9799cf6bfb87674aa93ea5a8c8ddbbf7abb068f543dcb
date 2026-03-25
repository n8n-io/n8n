import DOMIterator from './domiterator';

/**
 * Marks search terms in DOM elements
 * @example
 * new Mark(document.querySelector(".context")).mark("lorem ipsum");
 * @example
 * new Mark(document.querySelector(".context")).markRegExp(/lorem/gmi);
 */
export default class Mark { // eslint-disable-line no-unused-vars

  /**
   * @param {HTMLElement|HTMLElement[]|NodeList|string} ctx - The context DOM
   * element, an array of DOM elements, a NodeList or a selector
   */
  constructor(ctx) {
    /**
     * The context of the instance. Either a DOM element, an array of DOM
     * elements, a NodeList or a selector
     * @type {HTMLElement|HTMLElement[]|NodeList|string}
     * @access protected
     */
    this.ctx = ctx;
    /**
     * Specifies if the current browser is a IE (necessary for the node
     * normalization bug workaround). See {@link Mark#unwrapMatches}
     * @type {boolean}
     * @access protected
     */
    this.ie = false;
    const ua = window.navigator.userAgent;
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
      this.ie = true;
    }
  }

  /**
   * Options defined by the user. They will be initialized from one of the
   * public methods. See {@link Mark#mark}, {@link Mark#markRegExp},
   * {@link Mark#markRanges} and {@link Mark#unmark} for option properties.
   * @type {object}
   * @param {object} [val] - An object that will be merged with defaults
   * @access protected
   */
  set opt(val) {
    this._opt = Object.assign({}, {
      'element': '',
      'className': '',
      'exclude': [],
      'iframes': false,
      'iframesTimeout': 5000,
      'separateWordSearch': true,
      'diacritics': true,
      'synonyms': {},
      'accuracy': 'partially',
      'acrossElements': false,
      'caseSensitive': false,
      'ignoreJoiners': false,
      'ignoreGroups': 0,
      'ignorePunctuation': [],
      'wildcards': 'disabled',
      'each': () => {},
      'noMatch': () => {},
      'filter': () => true,
      'done': () => {},
      'debug': false,
      'log': window.console
    }, val);
  }

  get opt() {
    return this._opt;
  }

  /**
   * An instance of DOMIterator
   * @type {DOMIterator}
   * @access protected
   */
  get iterator() {
    // always return new instance in case there were option changes
    return new DOMIterator(
      this.ctx,
      this.opt.iframes,
      this.opt.exclude,
      this.opt.iframesTimeout
    );
  }

  /**
   * Logs a message if log is enabled
   * @param {string} msg - The message to log
   * @param {string} [level="debug"] - The log level, e.g. <code>warn</code>
   * <code>error</code>, <code>debug</code>
   * @access protected
   */
  log(msg, level = 'debug') {
    const log = this.opt.log;
    if (!this.opt.debug) {
      return;
    }
    if (typeof log === 'object' && typeof log[level] === 'function') {
      log[level](`mark.js: ${msg}`);
    }
  }

  /**
   * Escapes a string for usage within a regular expression
   * @param {string} str - The string to escape
   * @return {string}
   * @access protected
   */
  escapeStr(str) {
    // eslint-disable-next-line no-useless-escape
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  /**
   * Creates a regular expression string to match the specified search
   * term including synonyms, diacritics and accuracy if defined
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createRegExp(str) {
    if (this.opt.wildcards !== 'disabled') {
      str = this.setupWildcardsRegExp(str);
    }
    str = this.escapeStr(str);
    if (Object.keys(this.opt.synonyms).length) {
      str = this.createSynonymsRegExp(str);
    }
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.setupIgnoreJoinersRegExp(str);
    }
    if (this.opt.diacritics) {
      str = this.createDiacriticsRegExp(str);
    }
    str = this.createMergedBlanksRegExp(str);
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.createJoinersRegExp(str);
    }
    if (this.opt.wildcards !== 'disabled') {
      str = this.createWildcardsRegExp(str);
    }
    str = this.createAccuracyRegExp(str);
    return str;
  }

  /**
   * Creates a regular expression string to match the defined synonyms
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createSynonymsRegExp(str) {
    const syn = this.opt.synonyms,
      sens = this.opt.caseSensitive ? '' : 'i',
      // add replacement character placeholder before and after the
      // synonym group
      joinerPlaceholder = this.opt.ignoreJoiners ||
                this.opt.ignorePunctuation.length ? '\u0000' : '';
    for (let index in syn) {
      if (syn.hasOwnProperty(index)) {
        const value = syn[index],
          k1 = this.opt.wildcards !== 'disabled' ?
            this.setupWildcardsRegExp(index) :
            this.escapeStr(index),
          k2 = this.opt.wildcards !== 'disabled' ?
            this.setupWildcardsRegExp(value) :
            this.escapeStr(value);
        if (k1 !== '' && k2 !== '') {
          str = str.replace(
            new RegExp(
              `(${this.escapeStr(k1)}|${this.escapeStr(k2)})`,
              `gm${sens}`
            ),
            joinerPlaceholder +
            `(${this.processSynomyms(k1)}|` +
            `${this.processSynomyms(k2)})` +
            joinerPlaceholder
          );
        }
      }
    }
    return str;
  }

  /**
   * Setup synonyms to work with ignoreJoiners and or ignorePunctuation
   * @param {string} str - synonym key or value to process
   * @return {string} - processed synonym string
   */
  processSynomyms(str) {
    if (this.opt.ignoreJoiners || this.opt.ignorePunctuation.length) {
      str = this.setupIgnoreJoinersRegExp(str);
    }
    return str;
  }

  /**
   * Sets up the regular expression string to allow later insertion of
   * wildcard regular expression matches
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  setupWildcardsRegExp(str) {
    // replace single character wildcard with unicode 0001
    str = str.replace(/(?:\\)*\?/g, val => {
      return val.charAt(0) === '\\' ? '?' : '\u0001';
    });
    // replace multiple character wildcard with unicode 0002
    return str.replace(/(?:\\)*\*/g, val => {
      return val.charAt(0) === '\\' ? '*' : '\u0002';
    });
  }

  /**
   * Sets up the regular expression string to allow later insertion of
   * wildcard regular expression matches
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createWildcardsRegExp(str) {
    // default to "enable" (i.e. to not include spaces)
    // "withSpaces" uses `[\\S\\s]` instead of `.` because the latter
    // does not match new line characters
    let spaces = this.opt.wildcards === 'withSpaces';
    return str
    // replace unicode 0001 with a RegExp class to match any single
    // character, or any single non-whitespace character depending
    // on the setting
      .replace(/\u0001/g, spaces ? '[\\S\\s]?' : '\\S?')
    // replace unicode 0002 with a RegExp class to match zero or
    // more characters, or zero or more non-whitespace characters
    // depending on the setting
      .replace(/\u0002/g, spaces ? '[\\S\\s]*?' : '\\S*');
  }

  /**
   * Sets up the regular expression string to allow later insertion of
   * designated characters (soft hyphens & zero width characters)
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  setupIgnoreJoinersRegExp(str) {
    // adding a "null" unicode character as it will not be modified by the
    // other "create" regular expression functions
    return str.replace(/[^(|)\\]/g, (val, indx, original) => {
      // don't add a null after an opening "(", around a "|" or before
      // a closing "(", or between an escapement (e.g. \+)
      let nextChar = original.charAt(indx + 1);
      if (/[(|)\\]/.test(nextChar) || nextChar === '') {
        return val;
      } else {
        return val + '\u0000';
      }
    });
  }

  /**
   * Creates a regular expression string to allow ignoring of designated
   * characters (soft hyphens, zero width characters & punctuation) based on
   * the specified option values of <code>ignorePunctuation</code> and
   * <code>ignoreJoiners</code>
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createJoinersRegExp(str) {
    let joiner = [];
    const ignorePunctuation = this.opt.ignorePunctuation;
    if (Array.isArray(ignorePunctuation) && ignorePunctuation.length) {
      joiner.push(this.escapeStr(ignorePunctuation.join('')));
    }
    if (this.opt.ignoreJoiners) {
      // u+00ad = soft hyphen
      // u+200b = zero-width space
      // u+200c = zero-width non-joiner
      // u+200d = zero-width joiner
      joiner.push('\\u00ad\\u200b\\u200c\\u200d');
    }
    return joiner.length ?
      str.split(/\u0000+/).join(`[${joiner.join('')}]*`) :
      str;
  }

  /**
   * Creates a regular expression string to match diacritics
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createDiacriticsRegExp(str) {
    const sens = this.opt.caseSensitive ? '' : 'i',
      dct = this.opt.caseSensitive ? [
        'aàáảãạăằắẳẵặâầấẩẫậäåāą', 'AÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ',
        'cçćč', 'CÇĆČ', 'dđď', 'DĐĎ',
        'eèéẻẽẹêềếểễệëěēę', 'EÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ',
        'iìíỉĩịîïī', 'IÌÍỈĨỊÎÏĪ', 'lł', 'LŁ', 'nñňń',
        'NÑŇŃ', 'oòóỏõọôồốổỗộơởỡớờợöøō', 'OÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ',
        'rř', 'RŘ', 'sšśșş', 'SŠŚȘŞ',
        'tťțţ', 'TŤȚŢ', 'uùúủũụưừứửữựûüůū', 'UÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ',
        'yýỳỷỹỵÿ', 'YÝỲỶỸỴŸ', 'zžżź', 'ZŽŻŹ'
      ] : [
        'aàáảãạăằắẳẵặâầấẩẫậäåāąAÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ', 'cçćčCÇĆČ',
        'dđďDĐĎ', 'eèéẻẽẹêềếểễệëěēęEÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ',
        'iìíỉĩịîïīIÌÍỈĨỊÎÏĪ', 'lłLŁ', 'nñňńNÑŇŃ',
        'oòóỏõọôồốổỗộơởỡớờợöøōOÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ', 'rřRŘ',
        'sšśșşSŠŚȘŞ', 'tťțţTŤȚŢ',
        'uùúủũụưừứửữựûüůūUÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ', 'yýỳỷỹỵÿYÝỲỶỸỴŸ', 'zžżźZŽŻŹ'
      ];
    let handled = [];
    str.split('').forEach(ch => {
      dct.every(dct => {
        // Check if the character is inside a diacritics list
        if (dct.indexOf(ch) !== -1) {
          // Check if the related diacritics list was not
          // handled yet
          if (handled.indexOf(dct) > -1) {
            return false;
          }
          // Make sure that the character OR any other
          // character in the diacritics list will be matched
          str = str.replace(
            new RegExp(`[${dct}]`, `gm${sens}`), `[${dct}]`
          );
          handled.push(dct);
        }
        return true;
      });
    });
    return str;
  }

  /**
   * Creates a regular expression string that merges whitespace characters
   * including subsequent ones into a single pattern, one or multiple
   * whitespaces
   * @param  {string} str - The search term to be used
   * @return {string}
   * @access protected
   */
  createMergedBlanksRegExp(str) {
    return str.replace(/[\s]+/gmi, '[\\s]+');
  }

  /**
   * Creates a regular expression string to match the specified string with
   * the defined accuracy. As in the regular expression of "exactly" can be
   * a group containing a blank at the beginning, all regular expressions will
   * be created with two groups. The first group can be ignored (may contain
   * the said blank), the second contains the actual match
   * @param  {string} str - The searm term to be used
   * @return {str}
   * @access protected
   */
  createAccuracyRegExp(str) {
    const chars = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¡¿';
    let acc = this.opt.accuracy,
      val = typeof acc === 'string' ? acc : acc.value,
      ls = typeof acc === 'string' ? [] : acc.limiters,
      lsJoin = '';
    ls.forEach(limiter => {
      lsJoin += `|${this.escapeStr(limiter)}`;
    });
    switch (val) {
    case 'partially':
    default:
      return `()(${str})`;
    case 'complementary':
      lsJoin = '\\s' + (lsJoin ? lsJoin : this.escapeStr(chars));
      return `()([^${lsJoin}]*${str}[^${lsJoin}]*)`;
    case 'exactly':
      return `(^|\\s${lsJoin})(${str})(?=$|\\s${lsJoin})`;
    }
  }

  /**
   * @typedef Mark~separatedKeywords
   * @type {object.<string>}
   * @property {array.<string>} keywords - The list of keywords
   * @property {number} length - The length
   */
  /**
   * Returns a list of keywords dependent on whether separate word search
   * was defined. Also it filters empty keywords
   * @param {array} sv - The array of keywords
   * @return {Mark~separatedKeywords}
   * @access protected
   */
  getSeparatedKeywords(sv) {
    let stack = [];
    sv.forEach(kw => {
      if (!this.opt.separateWordSearch) {
        if (kw.trim() && stack.indexOf(kw) === -1) {
          stack.push(kw);
        }
      } else {
        kw.split(' ').forEach(kwSplitted => {
          if (kwSplitted.trim() && stack.indexOf(kwSplitted) === -1) {
            stack.push(kwSplitted);
          }
        });
      }
    });
    return {
      // sort because of https://git.io/v6USg
      'keywords': stack.sort((a, b) => {
        return b.length - a.length;
      }),
      'length': stack.length
    };
  }

  /**
   * Check if a value is a number
   * @param {number|string} value - the value to check;
   * numeric strings allowed
   * @return {boolean}
   * @access protected
   */
  isNumeric(value) {
    // http://stackoverflow.com/a/16655847/145346
    // eslint-disable-next-line eqeqeq
    return Number(parseFloat(value)) == value;
  }

  /**
   * @typedef Mark~rangeObject
   * @type {object}
   * @property {number} start - The start position within the composite value
   * @property {number} length - The length of the string to mark within the
   * composite value.
   */
  /**
   * @typedef Mark~setOfRanges
   * @type {object[]}
   * @property {Mark~rangeObject}
   */
  /**
   * Returns a processed list of integer offset indexes that do not overlap
   * each other, and remove any string values or additional elements
   * @param {Mark~setOfRanges} array - unprocessed raw array
   * @return {Mark~setOfRanges} - processed array with any invalid entries
   * removed
   * @throws Will throw an error if an array of objects is not passed
   * @access protected
   */
  checkRanges(array) {
    // start and length indexes are included in an array of objects
    // [{start: 0, length: 1}, {start: 4, length: 5}]
    // quick validity check of the first entry only
    if (
      !Array.isArray(array) ||
      Object.prototype.toString.call( array[0] ) !== '[object Object]'
    ) {
      this.log('markRanges() will only accept an array of objects');
      this.opt.noMatch(array);
      return [];
    }
    const stack = [];
    let last = 0;
    array
    // acending sort to ensure there is no overlap in start & end
    // offsets
      .sort((a, b) => {
        return a.start - b.start;
      })
      .forEach(item => {
        let {start, end, valid} = this.callNoMatchOnInvalidRanges(item, last);
        if (valid) {
          // preserve item in case there are extra key:values within
          item.start = start;
          item.length = end - start;
          stack.push(item);
          last = end;
        }
      });
    return stack;
  }

  /**
   * @typedef Mark~validObject
   * @type {object}
   * @property {number} start - The start position within the composite value
   * @property {number} end - The calculated end position within the composite
   * value.
   * @property {boolean} valid - boolean value indicating that the start and
   * calculated end range is valid
   */
  /**
    * Initial validation of ranges for markRanges. Preliminary checks are done
    * to ensure the start and length values exist and are not zero or non-
    * numeric
    * @param {Mark~rangeObject} range - the current range object
    * @param {number} last - last index of range
    * @return {Mark~validObject}
    * @access protected
    */
  callNoMatchOnInvalidRanges(range, last) {
    let start, end,
      valid = false;
    if (range && typeof range.start !== 'undefined') {
      start = parseInt(range.start, 10);
      end = start + parseInt(range.length, 10);
      // ignore overlapping values & non-numeric entries
      if (
        this.isNumeric(range.start) &&
        this.isNumeric(range.length) &&
        end - last > 0 &&
        end - start > 0
      ) {
        valid = true;
      } else {
        this.log(
          'Ignoring invalid or overlapping range: ' +
                    `${JSON.stringify(range)}`
        );
        this.opt.noMatch(range);
      }
    } else {
      this.log(`Ignoring invalid range: ${JSON.stringify(range)}`);
      this.opt.noMatch(range);
    }
    return {
      start: start,
      end: end,
      valid: valid
    };
  }

  /**
   * Check valid range for markRanges. Check ranges with access to the context
   * string. Range values are double checked, lengths that extend the mark
   * beyond the string length are limitied and ranges containing only
   * whitespace are ignored
   * @param {Mark~rangeObject} range - the current range object
   * @param {number} originalLength - original length of the context string
   * @param {string} string - current content string
   * @return {Mark~validObject}
   * @access protected
   */
  checkWhitespaceRanges(range, originalLength, string) {
    let end,
      valid = true,
      // the max value changes after the DOM is manipulated
      max = string.length,
      // adjust offset to account for wrapped text node
      offset = originalLength - max,
      start = parseInt(range.start, 10) - offset;
    // make sure to stop at max
    start = start > max ? max : start;
    end = start + parseInt(range.length, 10);
    if (end > max) {
      end = max;
      this.log(`End range automatically set to the max value of ${max}`);
    }
    if (start < 0 || end - start < 0 || start > max || end > max) {
      valid = false;
      this.log(`Invalid range: ${JSON.stringify(range)}`);
      this.opt.noMatch(range);
    } else if (string.substring(start, end).replace(/\s+/g, '') === '') {
      valid = false;
      // whitespace only; even if wrapped it is not visible
      this.log('Skipping whitespace only range: ' +JSON.stringify(range));
      this.opt.noMatch(range);
    }
    return {
      start: start,
      end: end,
      valid: valid
    };
  }

  /**
   * @typedef Mark~getTextNodesDict
   * @type {object.<string>}
   * @property {string} value - The composite value of all text nodes
   * @property {object[]} nodes - An array of objects
   * @property {number} nodes.start - The start position within the composite
   * value
   * @property {number} nodes.end - The end position within the composite
   * value
   * @property {HTMLElement} nodes.node - The DOM text node element
   */
  /**
   * Callback
   * @callback Mark~getTextNodesCallback
   * @param {Mark~getTextNodesDict}
   */
  /**
   * Calls the callback with an object containing all text nodes (including
   * iframe text nodes) with start and end positions and the composite value
   * of them (string)
   * @param {Mark~getTextNodesCallback} cb - Callback
   * @access protected
   */
  getTextNodes(cb) {
    let val = '',
      nodes = [];
    this.iterator.forEachNode(NodeFilter.SHOW_TEXT, node => {
      nodes.push({
        start: val.length,
        end: (val += node.textContent).length,
        node
      });
    }, node => {
      if (this.matchesExclude(node.parentNode)) {
        return NodeFilter.FILTER_REJECT;
      } else {
        return NodeFilter.FILTER_ACCEPT;
      }
    }, () => {
      cb({
        value: val,
        nodes: nodes
      });
    });
  }

  /**
   * Checks if an element matches any of the specified exclude selectors. Also
   * it checks for elements in which no marks should be performed (e.g.
   * script and style tags) and optionally already marked elements
   * @param  {HTMLElement} el - The element to check
   * @return {boolean}
   * @access protected
   */
  matchesExclude(el) {
    return DOMIterator.matches(el, this.opt.exclude.concat([
      // ignores the elements itself, not their childrens (selector *)
      'script', 'style', 'title', 'head', 'html'
    ]));
  }

  /**
   * Wraps the instance element and class around matches that fit the start
   * and end positions within the node
   * @param  {HTMLElement} node - The DOM text node
   * @param  {number} start - The position where to start wrapping
   * @param  {number} end - The position where to end wrapping
   * @return {HTMLElement} Returns the splitted text node that will appear
   * after the wrapped text node
   * @access protected
   */
  wrapRangeInTextNode(node, start, end) {
    const hEl = !this.opt.element ? 'mark' : this.opt.element,
      startNode = node.splitText(start),
      ret = startNode.splitText(end - start);
    let repl = document.createElement(hEl);
    repl.setAttribute('data-markjs', 'true');
    if (this.opt.className) {
      repl.setAttribute('class', this.opt.className);
    }
    repl.textContent = startNode.textContent;
    startNode.parentNode.replaceChild(repl, startNode);
    return ret;
  }

  /**
   * @typedef Mark~wrapRangeInMappedTextNodeDict
   * @type {object.<string>}
   * @property {string} value - The composite value of all text nodes
   * @property {object[]} nodes - An array of objects
   * @property {number} nodes.start - The start position within the composite
   * value
   * @property {number} nodes.end - The end position within the composite
   * value
   * @property {HTMLElement} nodes.node - The DOM text node element
   */
  /**
   * Each callback
   * @callback Mark~wrapMatchesEachCallback
   * @param {HTMLElement} node - The wrapped DOM element
   * @param {number} lastIndex - The last matching position within the
   * composite value of text nodes
   */
  /**
   * Filter callback
   * @callback Mark~wrapMatchesFilterCallback
   * @param {HTMLElement} node - The matching text node DOM element
   */
  /**
   * Determines matches by start and end positions using the text node
   * dictionary even across text nodes and calls
   * {@link Mark#wrapRangeInTextNode} to wrap them
   * @param  {Mark~wrapRangeInMappedTextNodeDict} dict - The dictionary
   * @param  {number} start - The start position of the match
   * @param  {number} end - The end position of the match
   * @param  {Mark~wrapMatchesFilterCallback} filterCb - Filter callback
   * @param  {Mark~wrapMatchesEachCallback} eachCb - Each callback
   * @access protected
   */
  wrapRangeInMappedTextNode(dict, start, end, filterCb, eachCb) {
    // iterate over all text nodes to find the one matching the positions
    dict.nodes.every((n, i) => {
      const sibl = dict.nodes[i + 1];
      if (typeof sibl === 'undefined' || sibl.start > start) {
        if (!filterCb(n.node)) {
          return false;
        }
        // map range from dict.value to text node
        const s = start - n.start,
          e = (end > n.end ? n.end : end) - n.start,
          startStr = dict.value.substr(0, n.start),
          endStr = dict.value.substr(e + n.start);
        n.node = this.wrapRangeInTextNode(n.node, s, e);
        // recalculate positions to also find subsequent matches in the
        // same text node. Necessary as the text node in dict now only
        // contains the splitted part after the wrapped one
        dict.value = startStr + endStr;
        dict.nodes.forEach((k, j) => {
          if (j >= i) {
            if (dict.nodes[j].start > 0 && j !== i) {
              dict.nodes[j].start -= e;
            }
            dict.nodes[j].end -= e;
          }
        });
        end -= e;
        eachCb(n.node.previousSibling, n.start);
        if (end > n.end) {
          start = n.end;
        } else {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Filter callback before each wrapping
   * @callback Mark~wrapMatchesFilterCallback
   * @param {string} match - The matching string
   * @param {HTMLElement} node - The text node where the match occurs
   */
  /**
   * Callback for each wrapped element
   * @callback Mark~wrapMatchesEachCallback
   * @param {HTMLElement} element - The marked DOM element
   */
  /**
   * Callback on end
   * @callback Mark~wrapMatchesEndCallback
   */
  /**
   * Wraps the instance element and class around matches within single HTML
   * elements in all contexts
   * @param {RegExp} regex - The regular expression to be searched for
   * @param {number} ignoreGroups - A number indicating the amount of RegExp
   * matching groups to ignore
   * @param {Mark~wrapMatchesFilterCallback} filterCb
   * @param {Mark~wrapMatchesEachCallback} eachCb
   * @param {Mark~wrapMatchesEndCallback} endCb
   * @access protected
   */
  wrapMatches(regex, ignoreGroups, filterCb, eachCb, endCb) {
    const matchIdx = ignoreGroups === 0 ? 0 : ignoreGroups + 1;
    this.getTextNodes(dict => {
      dict.nodes.forEach(node => {
        node = node.node;
        let match;
        while (
          (match = regex.exec(node.textContent)) !== null &&
          match[matchIdx] !== ''
        ) {
          if (!filterCb(match[matchIdx], node)) {
            continue;
          }
          let pos = match.index;
          if (matchIdx !== 0) {
            for (let i = 1; i < matchIdx; i++) {
              pos += match[i].length;
            }
          }
          node = this.wrapRangeInTextNode(
            node,
            pos,
            pos + match[matchIdx].length
          );
          eachCb(node.previousSibling);
          // reset index of last match as the node changed and the
          // index isn't valid anymore http://tinyurl.com/htsudjd
          regex.lastIndex = 0;
        }
      });
      endCb();
    });
  }

  /**
   * Callback for each wrapped element
   * @callback Mark~wrapMatchesAcrossElementsEachCallback
   * @param {HTMLElement} element - The marked DOM element
   */
  /**
   * Filter callback before each wrapping
   * @callback Mark~wrapMatchesAcrossElementsFilterCallback
   * @param {string} match - The matching string
   * @param {HTMLElement} node - The text node where the match occurs
   */
  /**
   * Callback on end
   * @callback Mark~wrapMatchesAcrossElementsEndCallback
   */
  /**
   * Wraps the instance element and class around matches across all HTML
   * elements in all contexts
   * @param {RegExp} regex - The regular expression to be searched for
   * @param {number} ignoreGroups - A number indicating the amount of RegExp
   * matching groups to ignore
   * @param {Mark~wrapMatchesAcrossElementsFilterCallback} filterCb
   * @param {Mark~wrapMatchesAcrossElementsEachCallback} eachCb
   * @param {Mark~wrapMatchesAcrossElementsEndCallback} endCb
   * @access protected
   */
  wrapMatchesAcrossElements(regex, ignoreGroups, filterCb, eachCb, endCb) {
    const matchIdx = ignoreGroups === 0 ? 0 : ignoreGroups + 1;
    this.getTextNodes(dict => {
      let match;
      while (
        (match = regex.exec(dict.value)) !== null &&
        match[matchIdx] !== ''
      ) {
        // calculate range inside dict.value
        let start = match.index;
        if (matchIdx !== 0) {
          for (let i = 1; i < matchIdx; i++) {
            start += match[i].length;
          }
        }
        const end = start + match[matchIdx].length;
        // note that dict will be updated automatically, as it'll change
        // in the wrapping process, due to the fact that text
        // nodes will be splitted
        this.wrapRangeInMappedTextNode(dict, start, end, node => {
          return filterCb(match[matchIdx], node);
        }, (node, lastIndex) => {
          regex.lastIndex = lastIndex;
          eachCb(node);
        });
      }
      endCb();
    });
  }

  /**
   * Callback for each wrapped element
   * @callback Mark~wrapRangeFromIndexEachCallback
   * @param {HTMLElement} element - The marked DOM element
   * @param {Mark~rangeObject} range - the current range object; provided
   * start and length values will be numeric integers modified from the
   * provided original ranges.
   */
  /**
   * Filter callback before each wrapping
   * @callback Mark~wrapRangeFromIndexFilterCallback
   * @param {HTMLElement} node - The text node which includes the range
   * @param {Mark~rangeObject} range - the current range object
   * @param {string} match - string extracted from the matching range
   * @param {number} counter - A counter indicating the number of all marks
   */
  /**
   * Callback on end
   * @callback Mark~wrapRangeFromIndexEndCallback
   */
  /**
   * Wraps the indicated ranges across all HTML elements in all contexts
   * @param {Mark~setOfRanges} ranges
   * @param {Mark~wrapRangeFromIndexFilterCallback} filterCb
   * @param {Mark~wrapRangeFromIndexEachCallback} eachCb
   * @param {Mark~wrapRangeFromIndexEndCallback} endCb
   * @access protected
   */
  wrapRangeFromIndex(ranges, filterCb, eachCb, endCb) {
    this.getTextNodes(dict => {
      const originalLength = dict.value.length;
      ranges.forEach((range, counter) => {
        let {start, end, valid} = this.checkWhitespaceRanges(
          range,
          originalLength,
          dict.value
        );
        if (valid) {
          this.wrapRangeInMappedTextNode(dict, start, end, node => {
            return filterCb(
              node,
              range,
              dict.value.substring(start, end),
              counter
            );
          }, node => {
            eachCb(node, range);
          });
        }
      });
      endCb();
    });
  }

  /**
   * Unwraps the specified DOM node with its content (text nodes or HTML)
   * without destroying possibly present events (using innerHTML) and
   * normalizes the parent at the end (merge splitted text nodes)
   * @param  {HTMLElement} node - The DOM node to unwrap
   * @access protected
   */
  unwrapMatches(node) {
    const parent = node.parentNode;
    let docFrag = document.createDocumentFragment();
    while (node.firstChild) {
      docFrag.appendChild(node.removeChild(node.firstChild));
    }
    parent.replaceChild(docFrag, node);
    if (!this.ie) { // use browser's normalize method
      parent.normalize();
    } else { // custom method (needs more time)
      this.normalizeTextNode(parent);
    }
  }

  /**
   * Normalizes text nodes. It's a workaround for the native normalize method
   * that has a bug in IE (see attached link). Should only be used in IE
   * browsers as it's slower than the native method.
   * @see {@link http://tinyurl.com/z5asa8c}
   * @param {HTMLElement} node - The DOM node to normalize
   * @access protected
   */
  normalizeTextNode(node) {
    if (!node) {
      return;
    }
    if (node.nodeType === 3) {
      while (node.nextSibling && node.nextSibling.nodeType === 3) {
        node.nodeValue += node.nextSibling.nodeValue;
        node.parentNode.removeChild(node.nextSibling);
      }
    } else {
      this.normalizeTextNode(node.firstChild);
    }
    this.normalizeTextNode(node.nextSibling);
  }

  /**
   * Callback when finished
   * @callback Mark~commonDoneCallback
   * @param {number} totalMatches - The number of marked elements
   */
  /**
   * @typedef Mark~commonOptions
   * @type {object.<string>}
   * @property {string} [element="mark"] - HTML element tag name
   * @property {string} [className] - An optional class name
   * @property {string[]} [exclude] - An array with exclusion selectors.
   * Elements matching those selectors will be ignored
   * @property {boolean} [iframes=false] - Whether to search inside iframes
   * @property {Mark~commonDoneCallback} [done]
   * @property {boolean} [debug=false] - Wheter to log messages
   * @property {object} [log=window.console] - Where to log messages (only if
   * debug is true)
   */
  /**
   * Callback for each marked element
   * @callback Mark~markRegExpEachCallback
   * @param {HTMLElement} element - The marked DOM element
   */
  /**
   * Callback if there were no matches
   * @callback Mark~markRegExpNoMatchCallback
   * @param {RegExp} regexp - The regular expression
   */
  /**
   * Callback to filter matches
   * @callback Mark~markRegExpFilterCallback
   * @param {HTMLElement} textNode - The text node which includes the match
   * @param {string} match - The matching string for the RegExp
   * @param {number} counter - A counter indicating the number of all marks
   */
  /**
   * These options also include the common options from
   * {@link Mark~commonOptions}
   * @typedef Mark~markRegExpOptions
   * @type {object.<string>}
   * @property {Mark~markRegExpEachCallback} [each]
   * @property {Mark~markRegExpNoMatchCallback} [noMatch]
   * @property {Mark~markRegExpFilterCallback} [filter]
   */
  /**
   * Marks a custom regular expression
   * @param  {RegExp} regexp - The regular expression
   * @param  {Mark~markRegExpOptions} [opt] - Optional options object
   * @access public
   */
  markRegExp(regexp, opt) {
    this.opt = opt;
    this.log(`Searching with expression "${regexp}"`);
    let totalMatches = 0,
      fn = 'wrapMatches';
    const eachCb = element => {
      totalMatches++;
      this.opt.each(element);
    };
    if (this.opt.acrossElements) {
      fn = 'wrapMatchesAcrossElements';
    }
    this[fn](regexp, this.opt.ignoreGroups, (match, node) => {
      return this.opt.filter(node, match, totalMatches);
    }, eachCb, () => {
      if (totalMatches === 0) {
        this.opt.noMatch(regexp);
      }
      this.opt.done(totalMatches);
    });
  }

  /**
   * Callback for each marked element
   * @callback Mark~markEachCallback
   * @param {HTMLElement} element - The marked DOM element
   */
  /**
   * Callback if there were no matches
   * @callback Mark~markNoMatchCallback
   * @param {RegExp} term - The search term that was not found
   */
  /**
   * Callback to filter matches
   * @callback Mark~markFilterCallback
   * @param {HTMLElement} textNode - The text node which includes the match
   * @param {string} match - The matching term
   * @param {number} totalCounter - A counter indicating the number of all
   * marks
   * @param {number} termCounter - A counter indicating the number of marks
   * for the specific match
   */
  /**
   * @typedef Mark~markAccuracyObject
   * @type {object.<string>}
   * @property {string} value - A accuracy string value
   * @property {string[]} limiters - A custom array of limiters. For example
   * <code>["-", ","]</code>
   */
  /**
   * @typedef Mark~markAccuracySetting
   * @type {string}
   * @property {"partially"|"complementary"|"exactly"|Mark~markAccuracyObject}
   * [accuracy="partially"] - Either one of the following string values:
   * <ul>
   *   <li><i>partially</i>: When searching for "lor" only "lor" inside
   *   "lorem" will be marked</li>
   *   <li><i>complementary</i>: When searching for "lor" the whole word
   *   "lorem" will be marked</li>
   *   <li><i>exactly</i>: When searching for "lor" only those exact words
   *   will be marked. In this example nothing inside "lorem". This value
   *   is equivalent to the previous option <i>wordBoundary</i></li>
   * </ul>
   * Or an object containing two properties:
   * <ul>
   *   <li><i>value</i>: One of the above named string values</li>
   *   <li><i>limiters</i>: A custom array of string limiters for accuracy
   *   "exactly" or "complementary"</li>
   * </ul>
   */
  /**
   * @typedef Mark~markWildcardsSetting
   * @type {string}
   * @property {"disabled"|"enabled"|"withSpaces"}
   * [wildcards="disabled"] - Set to any of the following string values:
   * <ul>
   *   <li><i>disabled</i>: Disable wildcard usage</li>
   *   <li><i>enabled</i>: When searching for "lor?m", the "?" will match zero
   *   or one non-space character (e.g. "lorm", "loram", "lor3m", etc). When
   *   searching for "lor*m", the "*" will match zero or more non-space
   *   characters (e.g. "lorm", "loram", "lor123m", etc).</li>
   *   <li><i>withSpaces</i>: When searching for "lor?m", the "?" will
   *   match zero or one space or non-space character (e.g. "lor m", "loram",
   *   etc). When searching for "lor*m", the "*" will match zero or more space
   *   or non-space characters (e.g. "lorm", "lore et dolor ipsum", "lor: m",
   *   etc).</li>
   * </ul>
   */
  /**
   * @typedef Mark~markIgnorePunctuationSetting
   * @type {string[]}
   * @property {string} The strings in this setting will contain punctuation
   * marks that will be ignored:
   * <ul>
   *   <li>These punctuation marks can be between any characters, e.g. setting
   *   this option to <code>["'"]</code> would match "Worlds", "World's" and
   *   "Wo'rlds"</li>
   *   <li>One or more apostrophes between the letters would still produce a
   *   match (e.g. "W'o''r'l'd's").</li>
   *   <li>A typical setting for this option could be as follows:
   *   <pre>ignorePunctuation: ":;.,-–—‒_(){}[]!'\"+=".split(""),</pre> This
   *   setting includes common punctuation as well as a minus, en-dash,
   *   em-dash and figure-dash
   *   ({@link https://en.wikipedia.org/wiki/Dash#Figure_dash ref}), as well
   *   as an underscore.</li>
   * </ul>
   */
  /**
   * These options also include the common options from
   * {@link Mark~commonOptions}
   * @typedef Mark~markOptions
   * @type {object.<string>}
   * @property {boolean} [separateWordSearch=true] - Whether to search for
   * each word separated by a blank instead of the complete term
   * @property {boolean} [diacritics=true] - If diacritic characters should be
   * matched. ({@link https://en.wikipedia.org/wiki/Diacritic Diacritics})
   * @property {object} [synonyms] - An object with synonyms. The key will be
   * a synonym for the value and the value for the key
   * @property {Mark~markAccuracySetting} [accuracy]
   * @property {Mark~markWildcardsSetting} [wildcards]
   * @property {boolean} [acrossElements=false] - Whether to find matches
   * across HTML elements. By default, only matches within single HTML
   * elements will be found
   * @property {boolean} [ignoreJoiners=false] - Whether to ignore word
   * joiners inside of key words. These include soft-hyphens, zero-width
   * space, zero-width non-joiners and zero-width joiners.
   * @property {Mark~markIgnorePunctuationSetting} [ignorePunctuation]
   * @property {Mark~markEachCallback} [each]
   * @property {Mark~markNoMatchCallback} [noMatch]
   * @property {Mark~markFilterCallback} [filter]
   */
  /**
   * Marks the specified search terms
   * @param {string|string[]} [sv] - Search value, either a search string or
   * an array containing multiple search strings
   * @param  {Mark~markOptions} [opt] - Optional options object
   * @access public
   */
  mark(sv, opt) {
    this.opt = opt;
    let totalMatches = 0,
      fn = 'wrapMatches';

    const {
        keywords: kwArr,
        length: kwArrLen
      } = this.getSeparatedKeywords(typeof sv === 'string' ? [sv] : sv),
      sens = this.opt.caseSensitive ? '' : 'i',
      handler = kw => { // async function calls as iframes are async too
        let regex = new RegExp(this.createRegExp(kw), `gm${sens}`),
          matches = 0;
        this.log(`Searching with expression "${regex}"`);
        this[fn](regex, 1, (term, node) => {
          return this.opt.filter(node, kw, totalMatches, matches);
        }, element => {
          matches++;
          totalMatches++;
          this.opt.each(element);
        }, () => {
          if (matches === 0) {
            this.opt.noMatch(kw);
          }
          if (kwArr[kwArrLen - 1] === kw) {
            this.opt.done(totalMatches);
          } else {
            handler(kwArr[kwArr.indexOf(kw) + 1]);
          }
        });
      };
    if (this.opt.acrossElements) {
      fn = 'wrapMatchesAcrossElements';
    }
    if (kwArrLen === 0) {
      this.opt.done(totalMatches);
    } else {
      handler(kwArr[0]);
    }
  }

  /**
   * Callback for each marked element
   * @callback Mark~markRangesEachCallback
   * @param {HTMLElement} element - The marked DOM element
   * @param {array} range - array of range start and end points
   */
  /**
   * Callback if a processed range is invalid, out-of-bounds, overlaps another
   * range, or only matches whitespace
   * @callback Mark~markRangesNoMatchCallback
   * @param {Mark~rangeObject} range - a range object
   */
  /**
   * Callback to filter matches
   * @callback Mark~markRangesFilterCallback
   * @param {HTMLElement} node - The text node which includes the range
   * @param {array} range - array of range start and end points
   * @param {string} match - string extracted from the matching range
   * @param {number} counter - A counter indicating the number of all marks
   */
  /**
   * These options also include the common options from
   * {@link Mark~commonOptions}
   * @typedef Mark~markRangesOptions
   * @type {object.<string>}
   * @property {Mark~markRangesEachCallback} [each]
   * @property {Mark~markRangesNoMatchCallback} [noMatch]
   * @property {Mark~markRangesFilterCallback} [filter]
   */
  /**
   * Marks an array of objects containing a start with an end or length of the
   * string to mark
   * @param  {Mark~setOfRanges} rawRanges - The original (preprocessed)
   * array of objects
   * @param  {Mark~markRangesOptions} [opt] - Optional options object
   * @access public
   */
  markRanges(rawRanges, opt) {
    this.opt = opt;
    let totalMatches = 0,
      ranges = this.checkRanges(rawRanges);
    if (ranges && ranges.length) {
      this.log(
        'Starting to mark with the following ranges: ' +
        JSON.stringify(ranges)
      );
      this.wrapRangeFromIndex(
        ranges, (node, range, match, counter) => {
          return this.opt.filter(node, range, match, counter);
        }, (element, range) => {
          totalMatches++;
          this.opt.each(element, range);
        }, () => {
          this.opt.done(totalMatches);
        }
      );
    } else {
      this.opt.done(totalMatches);
    }
  }

  /**
   * Removes all marked elements inside the context with their HTML and
   * normalizes the parent at the end
   * @param  {Mark~commonOptions} [opt] - Optional options object
   * @access public
   */
  unmark(opt) {
    this.opt = opt;
    let sel = this.opt.element ? this.opt.element : '*';
    sel += '[data-markjs]';
    if (this.opt.className) {
      sel += `.${this.opt.className}`;
    }
    this.log(`Removal selector "${sel}"`);
    this.iterator.forEachNode(NodeFilter.SHOW_ELEMENT, node => {
      this.unwrapMatches(node);
    }, node => {
      const matchesSel = DOMIterator.matches(node, sel),
        matchesExclude = this.matchesExclude(node);
      if (!matchesSel || matchesExclude) {
        return NodeFilter.FILTER_REJECT;
      } else {
        return NodeFilter.FILTER_ACCEPT;
      }
    }, this.opt.done);
  }
}
