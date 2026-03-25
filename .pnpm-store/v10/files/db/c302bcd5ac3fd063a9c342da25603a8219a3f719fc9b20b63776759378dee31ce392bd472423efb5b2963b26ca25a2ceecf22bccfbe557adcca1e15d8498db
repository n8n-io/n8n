import {input, state} from "../traverser/base";
import {charCodes} from "../util/charcodes";
import {IS_IDENTIFIER_CHAR} from "../util/identifier";
import {finishToken} from "./index";
import {READ_WORD_TREE} from "./readWordTree";
import {TokenType as tt} from "./types";

/**
 * Read an identifier, producing either a name token or matching on one of the existing keywords.
 * For performance, we pre-generate big decision tree that we traverse. Each node represents a
 * prefix and has 27 values, where the first value is the token or contextual token, if any (-1 if
 * not), and the other 26 values are the transitions to other nodes, or -1 to stop.
 */
export default function readWord() {
  let treePos = 0;
  let code = 0;
  let pos = state.pos;
  while (pos < input.length) {
    code = input.charCodeAt(pos);
    if (code < charCodes.lowercaseA || code > charCodes.lowercaseZ) {
      break;
    }
    const next = READ_WORD_TREE[treePos + (code - charCodes.lowercaseA) + 1];
    if (next === -1) {
      break;
    } else {
      treePos = next;
      pos++;
    }
  }

  const keywordValue = READ_WORD_TREE[treePos];
  if (keywordValue > -1 && !IS_IDENTIFIER_CHAR[code]) {
    state.pos = pos;
    if (keywordValue & 1) {
      finishToken(keywordValue >>> 1);
    } else {
      finishToken(tt.name, keywordValue >>> 1);
    }
    return;
  }

  while (pos < input.length) {
    const ch = input.charCodeAt(pos);
    if (IS_IDENTIFIER_CHAR[ch]) {
      pos++;
    } else if (ch === charCodes.backslash) {
      // \u
      pos += 2;
      if (input.charCodeAt(pos) === charCodes.leftCurlyBrace) {
        while (pos < input.length && input.charCodeAt(pos) !== charCodes.rightCurlyBrace) {
          pos++;
        }
        pos++;
      }
    } else if (ch === charCodes.atSign && input.charCodeAt(pos + 1) === charCodes.atSign) {
      pos += 2;
    } else {
      break;
    }
  }
  state.pos = pos;
  finishToken(tt.name);
}
