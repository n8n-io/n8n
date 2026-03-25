
import {TokenType as tt} from "../parser/tokenizer/types";

import Transformer from "./Transformer";

export default class OptionalCatchBindingTransformer extends Transformer {
  constructor( tokens,  nameManager) {
    super();this.tokens = tokens;this.nameManager = nameManager;;
  }

  process() {
    if (this.tokens.matches2(tt._catch, tt.braceL)) {
      this.tokens.copyToken();
      this.tokens.appendCode(` (${this.nameManager.claimFreeName("e")})`);
      return true;
    }
    return false;
  }
}
