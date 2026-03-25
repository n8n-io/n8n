"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _base = require('./traverser/base');
var _index = require('./traverser/index');

 class File {
  
  

  constructor(tokens, scopes) {
    this.tokens = tokens;
    this.scopes = scopes;
  }
} exports.File = File;

 function parse(
  input,
  isJSXEnabled,
  isTypeScriptEnabled,
  isFlowEnabled,
) {
  if (isFlowEnabled && isTypeScriptEnabled) {
    throw new Error("Cannot combine flow and typescript plugins.");
  }
  _base.initParser.call(void 0, input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
  const result = _index.parseFile.call(void 0, );
  if (_base.state.error) {
    throw _base.augmentError.call(void 0, _base.state.error);
  }
  return result;
} exports.parse = parse;
