// vendored from https://github.com/amasad/sane/blob/64ff3a870c42e84f744086884bf55a4f9c22d376/src/utils/recrawl-warning-dedupe.js

'use strict';

class RecrawlWarning {
  constructor(root, count) {
    this.root = root;
    this.count = count;
  }
  static findByRoot(root) {
    for (let i = 0; i < this.RECRAWL_WARNINGS.length; i++) {
      const warning = this.RECRAWL_WARNINGS[i];
      if (warning.root === root) {
        return warning;
      }
    }
    return undefined;
  }
  static isRecrawlWarningDupe(warningMessage) {
    if (typeof warningMessage !== 'string') {
      return false;
    }
    const match = warningMessage.match(this.REGEXP);
    if (!match) {
      return false;
    }
    const count = Number(match[1]);
    const root = match[2];
    const warning = this.findByRoot(root);
    if (warning) {
      // only keep the highest count, assume count to either stay the same or
      // increase.
      if (warning.count >= count) {
        return true;
      } else {
        // update the existing warning to the latest (highest) count
        warning.count = count;
        return false;
      }
    } else {
      this.RECRAWL_WARNINGS.push(new RecrawlWarning(root, count));
      return false;
    }
  }
}
RecrawlWarning.RECRAWL_WARNINGS = [];
RecrawlWarning.REGEXP =
  /Recrawled this watch (\d+) times, most recently because:\n([^:]+)/;
module.exports = RecrawlWarning;
