'use strict';

const Replace = require('./Replace');
const withParser = require('../utils/withParser');

class Ignore extends Replace {
  static make(options) {
    return new Ignore(options);
  }

  static withParser(options) {
    return withParser(Ignore.make, options);
  }

  constructor(options) {
    super(options);
    this._replacement = Replace.arrayReplacement([]);
    this._allowEmptyReplacement = true;
  }
}
Ignore.ignore = Ignore.make;
Ignore.make.Constructor = Ignore;

module.exports = Ignore;
