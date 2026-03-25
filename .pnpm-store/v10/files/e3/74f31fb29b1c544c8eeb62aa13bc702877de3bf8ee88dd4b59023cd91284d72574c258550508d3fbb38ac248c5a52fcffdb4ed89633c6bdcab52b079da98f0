'use strict';

var acorn = require('acorn');
var objectAssign = require('object-assign');

module.exports = isExpression;

var DEFAULT_OPTIONS = {
  throw: false,
  strict: false,
  lineComment: false
};

function isExpression(src, options) {
  options = objectAssign({}, DEFAULT_OPTIONS, options);

  try {
    var parser = new acorn.Parser(options, src, 0);

    if (options.strict) {
      parser.strict = true;
    }

    if (!options.lineComment) {
      parser.skipLineComment = function (startSkip) {
        this.raise(this.pos, 'Line comments not allowed in an expression');
      };
    }

    parser.nextToken();
    parser.parseExpression();

    if (parser.type !== acorn.tokTypes.eof) {
      parser.unexpected();
    }
  } catch (ex) {
    if (!options.throw) {
      return false;
    }

    throw ex;
  }

  return true;
}
