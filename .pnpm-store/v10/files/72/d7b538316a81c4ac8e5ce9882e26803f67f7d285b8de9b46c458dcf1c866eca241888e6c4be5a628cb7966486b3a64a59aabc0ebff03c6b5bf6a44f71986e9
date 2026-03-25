"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _types = require('../parser/tokenizer/types');

var _Transformer = require('./Transformer'); var _Transformer2 = _interopRequireDefault(_Transformer);

 class NumericSeparatorTransformer extends _Transformer2.default {
  constructor( tokens) {
    super();this.tokens = tokens;;
  }

  process() {
    if (this.tokens.matches1(_types.TokenType.num)) {
      const code = this.tokens.currentTokenCode();
      if (code.includes("_")) {
        this.tokens.replaceToken(code.replace(/_/g, ""));
        return true;
      }
    }
    return false;
  }
} exports.default = NumericSeparatorTransformer;
