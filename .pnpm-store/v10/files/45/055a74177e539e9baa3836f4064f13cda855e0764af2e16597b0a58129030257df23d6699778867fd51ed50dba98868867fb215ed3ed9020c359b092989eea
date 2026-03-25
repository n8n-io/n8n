"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _keywords = require('./keywords');
var _types = require('./types');

 class Scope {
  
  
  

  constructor(startTokenIndex, endTokenIndex, isFunctionScope) {
    this.startTokenIndex = startTokenIndex;
    this.endTokenIndex = endTokenIndex;
    this.isFunctionScope = isFunctionScope;
  }
} exports.Scope = Scope;

 class StateSnapshot {
  constructor(
     potentialArrowAt,
     noAnonFunctionType,
     inDisallowConditionalTypesContext,
     tokensLength,
     scopesLength,
     pos,
     type,
     contextualKeyword,
     start,
     end,
     isType,
     scopeDepth,
     error,
  ) {;this.potentialArrowAt = potentialArrowAt;this.noAnonFunctionType = noAnonFunctionType;this.inDisallowConditionalTypesContext = inDisallowConditionalTypesContext;this.tokensLength = tokensLength;this.scopesLength = scopesLength;this.pos = pos;this.type = type;this.contextualKeyword = contextualKeyword;this.start = start;this.end = end;this.isType = isType;this.scopeDepth = scopeDepth;this.error = error;}
} exports.StateSnapshot = StateSnapshot;

 class State {constructor() { State.prototype.__init.call(this);State.prototype.__init2.call(this);State.prototype.__init3.call(this);State.prototype.__init4.call(this);State.prototype.__init5.call(this);State.prototype.__init6.call(this);State.prototype.__init7.call(this);State.prototype.__init8.call(this);State.prototype.__init9.call(this);State.prototype.__init10.call(this);State.prototype.__init11.call(this);State.prototype.__init12.call(this);State.prototype.__init13.call(this); }
  // Used to signify the start of a potential arrow function
  __init() {this.potentialArrowAt = -1}

  // Used by Flow to handle an edge case involving function type parsing.
  __init2() {this.noAnonFunctionType = false}

  // Used by TypeScript to handle ambiguities when parsing conditional types.
  __init3() {this.inDisallowConditionalTypesContext = false}

  // Token store.
  __init4() {this.tokens = []}

  // Array of all observed scopes, ordered by their ending position.
  __init5() {this.scopes = []}

  // The current position of the tokenizer in the input.
  __init6() {this.pos = 0}

  // Information about the current token.
  __init7() {this.type = _types.TokenType.eof}
  __init8() {this.contextualKeyword = _keywords.ContextualKeyword.NONE}
  __init9() {this.start = 0}
  __init10() {this.end = 0}

  __init11() {this.isType = false}
  __init12() {this.scopeDepth = 0}

  /**
   * If the parser is in an error state, then the token is always tt.eof and all functions can
   * keep executing but should be written so they don't get into an infinite loop in this situation.
   *
   * This approach, combined with the ability to snapshot and restore state, allows us to implement
   * backtracking without exceptions and without needing to explicitly propagate error states
   * everywhere.
   */
  __init13() {this.error = null}

  snapshot() {
    return new StateSnapshot(
      this.potentialArrowAt,
      this.noAnonFunctionType,
      this.inDisallowConditionalTypesContext,
      this.tokens.length,
      this.scopes.length,
      this.pos,
      this.type,
      this.contextualKeyword,
      this.start,
      this.end,
      this.isType,
      this.scopeDepth,
      this.error,
    );
  }

  restoreFromSnapshot(snapshot) {
    this.potentialArrowAt = snapshot.potentialArrowAt;
    this.noAnonFunctionType = snapshot.noAnonFunctionType;
    this.inDisallowConditionalTypesContext = snapshot.inDisallowConditionalTypesContext;
    this.tokens.length = snapshot.tokensLength;
    this.scopes.length = snapshot.scopesLength;
    this.pos = snapshot.pos;
    this.type = snapshot.type;
    this.contextualKeyword = snapshot.contextualKeyword;
    this.start = snapshot.start;
    this.end = snapshot.end;
    this.isType = snapshot.isType;
    this.scopeDepth = snapshot.scopeDepth;
    this.error = snapshot.error;
  }
} exports.default = State;
