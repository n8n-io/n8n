'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var map = require('./map-24d263c0.cjs');
var math = require('./math-96d5e8c4.cjs');
var array = require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');

/**
 * A very simple diff algorithm. Slightly adapted to support splitting at different stages (e.g.
 * first diff lines, then diff words)
 *
 * https://bramcohen.livejournal.com/73318.html
 *
 * @experiemantal This API will likely change.
 */

/**
 * Implementation of patience diff. Expects that content is pre-split (e.g. by newline).
 *
 * @param {Array<string>} as
 * @param {Array<string>} bs
 * @return {Array<{ index: number, remove: Array<string>, insert: Array<string>}>} changeset @todo should use delta instead
 */
const diff = (as, bs) => {
  const {
    middleAs,
    middleBs,
    commonPrefix
  } = removeCommonPrefixAndSuffix(as, bs);
  return lcs(middleAs, middleBs, commonPrefix)
};

/**
 * @param {string} a
 * @param {string} b
 * @param {RegExp|string} _regexp
 */
const diffSplitBy = (a, b, _regexp) => {
  const isStringSeparator = typeof _regexp === 'string';
  const separator = isStringSeparator ? _regexp : '';
  const regexp = isStringSeparator ? new RegExp(_regexp, 'g') : _regexp;
  const as = splitByRegexp(a, regexp, !isStringSeparator);
  const bs = splitByRegexp(b, regexp, !isStringSeparator);
  const changes = diff(as, bs);
  let prevSplitIndex = 0;
  let prevStringIndex = 0;
  return changes.map(change => {
    for (; prevSplitIndex < change.index; prevSplitIndex++) {
      prevStringIndex += as[prevSplitIndex].length;
    }
    return {
      index: prevStringIndex,
      remove: change.remove.join(separator),
      insert: change.insert.join(separator)
    }
  })
};

/**
 * Sensible default for diffing strings using patience (it's fast though).
 *
 * Perform different types of patience diff on the content. Diff first by newline, then paragraphs, then by word
 * (split by space, brackets, punctuation)
 *
 * @param {string} a
 * @param {string} b
 */
const diffAuto = (a, b) =>
  diffSplitBy(a, b, '\n').map(d =>
    diffSplitBy(d.remove, d.insert, /\. |[a-zA-Z0-9]+|[. ()[\],;{}]/g).map(dd => ({
      insert: dd.insert,
      remove: dd.remove,
      index: dd.index + d.index
    }))
  ).flat();

/**
 * @param {Array<string>} as
 * @param {Array<string>} bs
 */
const removeCommonPrefixAndSuffix = (as, bs) => {
  const commonLen = math.min(as.length, bs.length);
  let commonPrefix = 0;
  let commonSuffix = 0;
  // match start
  for (; commonPrefix < commonLen && as[commonPrefix] === bs[commonPrefix]; commonPrefix++) { /* nop */ }
  // match end
  for (; commonSuffix < commonLen - commonPrefix && as[as.length - 1 - commonSuffix] === bs[bs.length - 1 - commonSuffix]; commonSuffix++) { /* nop */ }
  const middleAs = as.slice(commonPrefix, as.length - commonSuffix);
  const middleBs = bs.slice(commonPrefix, bs.length - commonSuffix);
  return {
    middleAs, middleBs, commonPrefix, commonSuffix
  }
};

/**
 * Splits string by regex and returns all strings as an array. The matched parts are also returned.
 *
 * @param {string} str
 * @param {RegExp} regexp
 * @param {boolean} includeSeparator
 */
const splitByRegexp = (str, regexp, includeSeparator) => {
  const matches = [...str.matchAll(regexp)];
  let prevIndex = 0;
  /**
   * @type {Array<string>}
   */
  const res = [];
  matches.forEach(m => {
    prevIndex < (m.index || 0) && res.push(str.slice(prevIndex, m.index));
    includeSeparator && res.push(m[0]); // is always non-empty
    prevIndex = /** @type {number} */ (m.index) + m[0].length;
  });
  const end = str.slice(prevIndex);
  end.length > 0 && res.push(end);
  return res
};

/**
 * An item may have multiple occurances (not when matching unique entries). It also may have a
 * reference to the stack of other items (from as to bs).
 */
class Item {
  constructor () {
    /**
     * @type {Array<number>}
     */
    this.indexes = [];
    /**
     * The matching item from the other side
     * @type {Item?}
     */
    this.match = null;
    /**
     * For patience sort. Reference (index of the stack) to the previous pile.
     *
     * @type {Item?}
     */
    this.ref = null;
  }
}

/**
 * @param {Array<string>} xs
 */
const partition = xs => {
  /**
   * @type {Map<string,Item>}
   */
  const refs = map.create();
  xs.forEach((x, index) => {
    map.setIfUndefined(refs, x, () => new Item()).indexes.push(index);
  });
  return refs
};

/**
 * Find the longest common subsequence of items using patience sort.
 *
 * @param {Array<string>} as
 * @param {Array<string>} bs
 * @param {number} indexAdjust
 */
const lcs = (as, bs, indexAdjust) => {
  if (as.length === 0 && bs.length === 0) return []
  const aParts = partition(as);
  const bParts = partition(bs);
  /**
   * @type {Array<Array<Item>>} I.e. Array<Pile<Item>>
   */
  const piles = [];
  aParts.forEach((aItem, aKey) => {
    // skip if no match or if either item is not unique
    if (aItem.indexes.length > 1 || (aItem.match = bParts.get(aKey) || null) == null || aItem.match.indexes.length > 1) return
    for (let i = 0; i < piles.length; i++) {
      const pile = piles[i];
      if (aItem.match.indexes[0] < /** @type {Item} */ (pile[pile.length - 1].match).indexes[0]) {
        pile.push(aItem);
        if (i > 0) aItem.ref = array.last(piles[i - 1]);
        return
      }
    }
    piles.length > 0 && (aItem.ref = array.last(piles[piles.length - 1]));
    piles.push([aItem]);
  });
  /**
   * References to all matched items
   *
   * @type {Array<Item>}
   */
  const matches = [];
  /**
   * @type {Item?}
   */
  let currPileItem = piles[piles.length - 1]?.[0];
  while (currPileItem != null) {
    matches.push(currPileItem);
    currPileItem = currPileItem.ref;
  }
  matches.reverse();
  // add pseude match (assume the string terminal always matches)
  const pseudoA = new Item();
  const pseudoB = new Item();
  pseudoA.match = pseudoB;
  pseudoA.indexes.push(as.length);
  pseudoB.indexes.push(bs.length);
  matches.push(pseudoA);
  /**
   * @type {Array<{ index: number, remove: Array<string>, insert: Array<string>}>}
   */
  const changeset = [];
  let diffAStart = 0;
  let diffBStart = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const delLength = m.indexes[0] - diffAStart;
    const insLength = /** @type {Item} */ (m.match).indexes[0] - diffBStart;
    if (delLength !== 0 || insLength !== 0) {
      const stripped = removeCommonPrefixAndSuffix(as.slice(diffAStart, diffAStart + delLength), bs.slice(diffBStart, diffBStart + insLength));
      if (stripped.middleAs.length !== 0 || stripped.middleBs.length !== 0) {
        changeset.push({ index: diffAStart + indexAdjust + stripped.commonPrefix, remove: stripped.middleAs, insert: stripped.middleBs });
      }
    }
    diffAStart = m.indexes[0] + 1;
    diffBStart = /** @type {Item} */ (m.match).indexes[0] + 1;
  }
  return changeset
};

exports.diff = diff;
exports.diffAuto = diffAuto;
exports.diffSplitBy = diffSplitBy;
//# sourceMappingURL=patience.cjs.map
