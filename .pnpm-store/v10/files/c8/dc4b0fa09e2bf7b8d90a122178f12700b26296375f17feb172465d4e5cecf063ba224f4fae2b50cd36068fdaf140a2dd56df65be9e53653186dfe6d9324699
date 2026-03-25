import State from "../tokenizer/state";
import {charCodes} from "../util/charcodes";

export let isJSXEnabled;
export let isTypeScriptEnabled;
export let isFlowEnabled;
export let state;
export let input;
export let nextContextId;

export function getNextContextId() {
  return nextContextId++;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function augmentError(error) {
  if ("pos" in error) {
    const loc = locationForIndex(error.pos);
    error.message += ` (${loc.line}:${loc.column})`;
    error.loc = loc;
  }
  return error;
}

export class Loc {
  
  
  constructor(line, column) {
    this.line = line;
    this.column = column;
  }
}

export function locationForIndex(pos) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < pos; i++) {
    if (input.charCodeAt(i) === charCodes.lineFeed) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return new Loc(line, column);
}

export function initParser(
  inputCode,
  isJSXEnabledArg,
  isTypeScriptEnabledArg,
  isFlowEnabledArg,
) {
  input = inputCode;
  state = new State();
  nextContextId = 1;
  isJSXEnabled = isJSXEnabledArg;
  isTypeScriptEnabled = isTypeScriptEnabledArg;
  isFlowEnabled = isFlowEnabledArg;
}
