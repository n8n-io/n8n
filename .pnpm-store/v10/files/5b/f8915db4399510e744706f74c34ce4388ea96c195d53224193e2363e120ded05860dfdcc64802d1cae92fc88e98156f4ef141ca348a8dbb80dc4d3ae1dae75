
import {nextToken, skipLineComment} from "../tokenizer/index";
import {charCodes} from "../util/charcodes";
import {input, state} from "./base";
import {parseTopLevel} from "./statement";

export function parseFile() {
  // If enabled, skip leading hashbang line.
  if (
    state.pos === 0 &&
    input.charCodeAt(0) === charCodes.numberSign &&
    input.charCodeAt(1) === charCodes.exclamationMark
  ) {
    skipLineComment(2);
  }
  nextToken();
  return parseTopLevel();
}
