/* eslint no-unused-vars: 0 */
'use strict';

const { configs, LEVEL, MESSAGE } = require('triple-beam');

class Padder {
  constructor(opts = { levels: configs.npm.levels }) {
    this.paddings = Padder.paddingForLevels(opts.levels, opts.filler);
    this.options = opts;
  }

  /**
   * Returns the maximum length of keys in the specified `levels` Object.
   * @param  {Object} levels Set of all levels to calculate longest level against.
   * @returns {Number} Maximum length of the longest level string.
   */
  static getLongestLevel(levels) {
    const lvls = Object.keys(levels).map(level => level.length);
    return Math.max(...lvls);
  }

  /**
   * Returns the padding for the specified `level` assuming that the
   * maximum length of all levels it's associated with is `maxLength`.
   * @param  {String} level Level to calculate padding for.
   * @param  {String} filler Repeatable text to use for padding.
   * @param  {Number} maxLength Length of the longest level
   * @returns {String} Padding string for the `level`
   */
  static paddingForLevel(level, filler, maxLength) {
    const targetLen = maxLength + 1 - level.length;
    const rep = Math.floor(targetLen / filler.length);
    const padding = `${filler}${filler.repeat(rep)}`;
    return padding.slice(0, targetLen);
  }

  /**
   * Returns an object with the string paddings for the given `levels`
   * using the specified `filler`.
   * @param  {Object} levels Set of all levels to calculate padding for.
   * @param  {String} filler Repeatable text to use for padding.
   * @returns {Object} Mapping of level to desired padding.
   */
  static paddingForLevels(levels, filler = ' ') {
    const maxLength = Padder.getLongestLevel(levels);
    return Object.keys(levels).reduce((acc, level) => {
      acc[level] = Padder.paddingForLevel(level, filler, maxLength);
      return acc;
    }, {});
  }

  /**
   * Prepends the padding onto the `message` based on the `LEVEL` of
   * the `info`. This is based on the behavior of `winston@2` which also
   * prepended the level onto the message.
   *
   * See: https://github.com/winstonjs/winston/blob/2.x/lib/winston/logger.js#L198-L201
   *
   * @param  {Info} info Logform info object
   * @param  {Object} opts Options passed along to this instance.
   * @returns {Info} Modified logform info object.
   */
  transform(info, opts) {
    info.message = `${this.paddings[info[LEVEL]]}${info.message}`;
    if (info[MESSAGE]) {
      info[MESSAGE] = `${this.paddings[info[LEVEL]]}${info[MESSAGE]}`;
    }

    return info;
  }
}

/*
 * function padLevels (info)
 * Returns a new instance of the padLevels Format which pads
 * levels to be the same length. This was previously exposed as
 * { padLevels: true } to transports in `winston < 3.0.0`.
 */
module.exports = opts => new Padder(opts);

module.exports.Padder
  = module.exports.Format
  = Padder;
