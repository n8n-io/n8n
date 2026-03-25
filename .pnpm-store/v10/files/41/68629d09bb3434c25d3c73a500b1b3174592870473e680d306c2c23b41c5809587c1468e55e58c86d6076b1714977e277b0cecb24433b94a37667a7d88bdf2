"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _state = require('../tokenizer/state'); var _state2 = _interopRequireDefault(_state);
var _charcodes = require('../util/charcodes');

 exports.isJSXEnabled;
 exports.isTypeScriptEnabled;
 exports.isFlowEnabled;
 exports.state;
 exports.input;
 exports.nextContextId;

 function getNextContextId() {
  return exports.nextContextId++;
} exports.getNextContextId = getNextContextId;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
 function augmentError(error) {
  if ("pos" in error) {
    const loc = locationForIndex(error.pos);
    error.message += ` (${loc.line}:${loc.column})`;
    error.loc = loc;
  }
  return error;
} exports.augmentError = augmentError;

 class Loc {
  
  
  constructor(line, column) {
    this.line = line;
    this.column = column;
  }
} exports.Loc = Loc;

 function locationForIndex(pos) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < pos; i++) {
    if (exports.input.charCodeAt(i) === _charcodes.charCodes.lineFeed) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return new Loc(line, column);
} exports.locationForIndex = locationForIndex;

 function initParser(
  inputCode,
  isJSXEnabledArg,
  isTypeScriptEnabledArg,
  isFlowEnabledArg,
) {
  exports.input = inputCode;
  exports.state = new (0, _state2.default)();
  exports.nextContextId = 1;
  exports.isJSXEnabled = isJSXEnabledArg;
  exports.isTypeScriptEnabled = isTypeScriptEnabledArg;
  exports.isFlowEnabled = isFlowEnabledArg;
} exports.initParser = initParser;
