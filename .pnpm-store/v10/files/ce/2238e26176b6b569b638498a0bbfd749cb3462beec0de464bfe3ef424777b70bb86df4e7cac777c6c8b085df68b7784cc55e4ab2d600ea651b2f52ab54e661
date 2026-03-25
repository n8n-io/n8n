"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _index = require('../tokenizer/index');
var _charcodes = require('../util/charcodes');
var _base = require('./base');
var _statement = require('./statement');

 function parseFile() {
  // If enabled, skip leading hashbang line.
  if (
    _base.state.pos === 0 &&
    _base.input.charCodeAt(0) === _charcodes.charCodes.numberSign &&
    _base.input.charCodeAt(1) === _charcodes.charCodes.exclamationMark
  ) {
    _index.skipLineComment.call(void 0, 2);
  }
  _index.nextToken.call(void 0, );
  return _statement.parseTopLevel.call(void 0, );
} exports.parseFile = parseFile;
