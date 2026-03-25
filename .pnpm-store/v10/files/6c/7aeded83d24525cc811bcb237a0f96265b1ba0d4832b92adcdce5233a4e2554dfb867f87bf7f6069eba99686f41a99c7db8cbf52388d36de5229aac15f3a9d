

import {augmentError, initParser, state} from "./traverser/base";
import {parseFile} from "./traverser/index";

export class File {
  
  

  constructor(tokens, scopes) {
    this.tokens = tokens;
    this.scopes = scopes;
  }
}

export function parse(
  input,
  isJSXEnabled,
  isTypeScriptEnabled,
  isFlowEnabled,
) {
  if (isFlowEnabled && isTypeScriptEnabled) {
    throw new Error("Cannot combine flow and typescript plugins.");
  }
  initParser(input, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
  const result = parseFile();
  if (state.error) {
    throw augmentError(state.error);
  }
  return result;
}
