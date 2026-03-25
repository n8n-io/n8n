'use strict';

const util = require('util');
const { SPLAT } = require('triple-beam');

/**
 * Captures the number of format (i.e. %s strings) in a given string.
 * Based on `util.format`, see Node.js source:
 * https://github.com/nodejs/node/blob/b1c8f15c5f169e021f7c46eb7b219de95fe97603/lib/util.js#L201-L230
 * @type {RegExp}
 */
const formatRegExp = /%[scdjifoO%]/g;

/**
 * Captures the number of escaped % signs in a format string (i.e. %s strings).
 * @type {RegExp}
 */
const escapedPercent = /%%/g;

class Splatter {
  constructor(opts) {
    this.options = opts;
  }

  /**
     * Check to see if tokens <= splat.length, assign { splat, meta } into the
     * `info` accordingly, and write to this instance.
     *
     * @param  {Info} info Logform info message.
     * @param  {String[]} tokens Set of string interpolation tokens.
     * @returns {Info} Modified info message
     * @private
     */
  _splat(info, tokens) {
    const msg = info.message;
    const splat = info[SPLAT] || info.splat || [];
    const percents = msg.match(escapedPercent);
    const escapes = percents && percents.length || 0;

    // The expected splat is the number of tokens minus the number of escapes
    // e.g.
    // - { expectedSplat: 3 } '%d %s %j'
    // - { expectedSplat: 5 } '[%s] %d%% %d%% %s %j'
    //
    // Any "meta" will be arugments in addition to the expected splat size
    // regardless of type. e.g.
    //
    // logger.log('info', '%d%% %s %j', 100, 'wow', { such: 'js' }, { thisIsMeta: true });
    // would result in splat of four (4), but only three (3) are expected. Therefore:
    //
    // extraSplat = 3 - 4 = -1
    // metas = [100, 'wow', { such: 'js' }, { thisIsMeta: true }].splice(-1, -1 * -1);
    // splat = [100, 'wow', { such: 'js' }]
    const expectedSplat = tokens.length - escapes;
    const extraSplat = expectedSplat - splat.length;
    const metas = extraSplat < 0
      ? splat.splice(extraSplat, -1 * extraSplat)
      : [];

    // Now that { splat } has been separated from any potential { meta }. we
    // can assign this to the `info` object and write it to our format stream.
    // If the additional metas are **NOT** objects or **LACK** enumerable properties
    // you are going to have a bad time.
    const metalen = metas.length;
    if (metalen) {
      for (let i = 0; i < metalen; i++) {
        Object.assign(info, metas[i]);
      }
    }

    info.message = util.format(msg, ...splat);
    return info;
  }

  /**
    * Transforms the `info` message by using `util.format` to complete
    * any `info.message` provided it has string interpolation tokens.
    * If no tokens exist then `info` is immutable.
    *
    * @param  {Info} info Logform info message.
    * @param  {Object} opts Options for this instance.
    * @returns {Info} Modified info message
    */
  transform(info) {
    const msg = info.message;
    const splat = info[SPLAT] || info.splat;

    // No need to process anything if splat is undefined
    if (!splat || !splat.length) {
      return info;
    }

    // Extract tokens, if none available default to empty array to
    // ensure consistancy in expected results
    const tokens = msg && msg.match && msg.match(formatRegExp);

    // This condition will take care of inputs with info[SPLAT]
    // but no tokens present
    if (!tokens && (splat || splat.length)) {
      const metas = splat.length > 1
        ? splat.splice(0)
        : splat;

      // Now that { splat } has been separated from any potential { meta }. we
      // can assign this to the `info` object and write it to our format stream.
      // If the additional metas are **NOT** objects or **LACK** enumerable properties
      // you are going to have a bad time.
      const metalen = metas.length;
      if (metalen) {
        for (let i = 0; i < metalen; i++) {
          Object.assign(info, metas[i]);
        }
      }

      return info;
    }

    if (tokens) {
      return this._splat(info, tokens);
    }

    return info;
  }
}

/*
 * function splat (info)
 * Returns a new instance of the splat format TransformStream
 * which performs string interpolation from `info` objects. This was
 * previously exposed implicitly in `winston < 3.0.0`.
 */
module.exports = opts => new Splatter(opts);
