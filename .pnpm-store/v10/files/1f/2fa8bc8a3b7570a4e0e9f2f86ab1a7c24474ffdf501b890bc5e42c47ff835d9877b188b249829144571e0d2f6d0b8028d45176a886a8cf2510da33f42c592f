import {TokenType as tt} from "../parser/tokenizer/types";

import Transformer from "./Transformer";

export default class NumericSeparatorTransformer extends Transformer {
  constructor( tokens) {
    super();this.tokens = tokens;;
  }

  process() {
    if (this.tokens.matches1(tt.num)) {
      const code = this.tokens.currentTokenCode();
      if (code.includes("_")) {
        this.tokens.replaceToken(code.replace(/_/g, ""));
        return true;
      }
    }
    return false;
  }
}
