'use strict';

const ValueDetector = require('./ValueDetector');

class UrlValueParser {
  constructor(opts) {
    opts = opts || {};
    this.valueDetector = opts.valueDetector || new ValueDetector(opts);
  }

  getPathChunks(path) {
    return path
      .split('/')
      .filter(chunk => chunk !== '');
  }

  /**
   * @param {string} path
   * @return {chunks, valueIndexes}
   */
  parsePathValues(path) {
    const chunks = this.getPathChunks(path);
    const valueIndexes = [];
    for (let i = 0; i < chunks.length; i++) {
      if (this.valueDetector.isValue(chunks[i])) {
        valueIndexes.push(i);
      }
    }
    return {chunks, valueIndexes};
  }

  /**
   * @param {string} path
   * @param {string|Function(chunks, index)} replacement
   * @return {string}
   */
  replacePathValues(path, replacement) {
    replacement = replacement || '#val';
    const parseResult = this.parsePathValues(path);
    return '/' + parseResult.chunks
      .map((chunk, i) => parseResult.valueIndexes.indexOf(i) >= 0
        ? (
            typeof replacement === 'function'
              ? replacement(parseResult.chunks, i)
              : replacement
        )
        : chunk)
      .join('/');
  }
}

module.exports = UrlValueParser;
module.exports.ValueDetector = ValueDetector;
