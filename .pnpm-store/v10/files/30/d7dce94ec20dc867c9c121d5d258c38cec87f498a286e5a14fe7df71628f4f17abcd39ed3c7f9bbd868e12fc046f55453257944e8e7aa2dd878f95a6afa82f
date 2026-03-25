"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _base = require('../traverser/base');
var _charcodes = require('../util/charcodes');
var _identifier = require('../util/identifier');
var _index = require('./index');
var _readWordTree = require('./readWordTree');
var _types = require('./types');

/**
 * Read an identifier, producing either a name token or matching on one of the existing keywords.
 * For performance, we pre-generate big decision tree that we traverse. Each node represents a
 * prefix and has 27 values, where the first value is the token or contextual token, if any (-1 if
 * not), and the other 26 values are the transitions to other nodes, or -1 to stop.
 */
 function readWord() {
  let treePos = 0;
  let code = 0;
  let pos = _base.state.pos;
  while (pos < _base.input.length) {
    code = _base.input.charCodeAt(pos);
    if (code < _charcodes.charCodes.lowercaseA || code > _charcodes.charCodes.lowercaseZ) {
      break;
    }
    const next = _readWordTree.READ_WORD_TREE[treePos + (code - _charcodes.charCodes.lowercaseA) + 1];
    if (next === -1) {
      break;
    } else {
      treePos = next;
      pos++;
    }
  }

  const keywordValue = _readWordTree.READ_WORD_TREE[treePos];
  if (keywordValue > -1 && !_identifier.IS_IDENTIFIER_CHAR[code]) {
    _base.state.pos = pos;
    if (keywordValue & 1) {
      _index.finishToken.call(void 0, keywordValue >>> 1);
    } else {
      _index.finishToken.call(void 0, _types.TokenType.name, keywordValue >>> 1);
    }
    return;
  }

  while (pos < _base.input.length) {
    const ch = _base.input.charCodeAt(pos);
    if (_identifier.IS_IDENTIFIER_CHAR[ch]) {
      pos++;
    } else if (ch === _charcodes.charCodes.backslash) {
      // \u
      pos += 2;
      if (_base.input.charCodeAt(pos) === _charcodes.charCodes.leftCurlyBrace) {
        while (pos < _base.input.length && _base.input.charCodeAt(pos) !== _charcodes.charCodes.rightCurlyBrace) {
          pos++;
        }
        pos++;
      }
    } else if (ch === _charcodes.charCodes.atSign && _base.input.charCodeAt(pos + 1) === _charcodes.charCodes.atSign) {
      pos += 2;
    } else {
      break;
    }
  }
  _base.state.pos = pos;
  _index.finishToken.call(void 0, _types.TokenType.name);
} exports.default = readWord;
