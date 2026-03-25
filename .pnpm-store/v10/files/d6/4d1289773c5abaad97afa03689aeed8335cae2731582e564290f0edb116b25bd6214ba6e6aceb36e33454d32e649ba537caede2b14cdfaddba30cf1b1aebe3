"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }


var _types = require('./parser/tokenizer/types');
var _isAsyncOperation = require('./util/isAsyncOperation'); var _isAsyncOperation2 = _interopRequireDefault(_isAsyncOperation);











 class TokenProcessor {
   __init() {this.resultCode = ""}
  // Array mapping input token index to optional string index position in the
  // output code.
   __init2() {this.resultMappings = new Array(this.tokens.length)}
   __init3() {this.tokenIndex = 0}

  constructor(
     code,
     tokens,
     isFlowEnabled,
     disableESTransforms,
     helperManager,
  ) {;this.code = code;this.tokens = tokens;this.isFlowEnabled = isFlowEnabled;this.disableESTransforms = disableESTransforms;this.helperManager = helperManager;TokenProcessor.prototype.__init.call(this);TokenProcessor.prototype.__init2.call(this);TokenProcessor.prototype.__init3.call(this);}

  /**
   * Snapshot the token state in a way that can be restored later, useful for
   * things like lookahead.
   *
   * resultMappings do not need to be copied since in all use cases, they will
   * be overwritten anyway after restore.
   */
  snapshot() {
    return {
      resultCode: this.resultCode,
      tokenIndex: this.tokenIndex,
    };
  }

  restoreToSnapshot(snapshot) {
    this.resultCode = snapshot.resultCode;
    this.tokenIndex = snapshot.tokenIndex;
  }

  /**
   * Remove and return the code generated since the snapshot, leaving the
   * current token position in-place. Unlike most TokenProcessor operations,
   * this operation can result in input/output line number mismatches because
   * the removed code may contain newlines, so this operation should be used
   * sparingly.
   */
  dangerouslyGetAndRemoveCodeSinceSnapshot(snapshot) {
    const result = this.resultCode.slice(snapshot.resultCode.length);
    this.resultCode = snapshot.resultCode;
    return result;
  }

  reset() {
    this.resultCode = "";
    this.resultMappings = new Array(this.tokens.length);
    this.tokenIndex = 0;
  }

  matchesContextualAtIndex(index, contextualKeyword) {
    return (
      this.matches1AtIndex(index, _types.TokenType.name) &&
      this.tokens[index].contextualKeyword === contextualKeyword
    );
  }

  identifierNameAtIndex(index) {
    // TODO: We need to process escapes since technically you can have unicode escapes in variable
    // names.
    return this.identifierNameForToken(this.tokens[index]);
  }

  identifierNameAtRelativeIndex(relativeIndex) {
    return this.identifierNameForToken(this.tokenAtRelativeIndex(relativeIndex));
  }

  identifierName() {
    return this.identifierNameForToken(this.currentToken());
  }

  identifierNameForToken(token) {
    return this.code.slice(token.start, token.end);
  }

  rawCodeForToken(token) {
    return this.code.slice(token.start, token.end);
  }

  stringValueAtIndex(index) {
    return this.stringValueForToken(this.tokens[index]);
  }

  stringValue() {
    return this.stringValueForToken(this.currentToken());
  }

  stringValueForToken(token) {
    // This is used to identify when two imports are the same and to resolve TypeScript enum keys.
    // Ideally we'd process escapes within the strings, but for now we pretty much take the raw
    // code.
    return this.code.slice(token.start + 1, token.end - 1);
  }

  matches1AtIndex(index, t1) {
    return this.tokens[index].type === t1;
  }

  matches2AtIndex(index, t1, t2) {
    return this.tokens[index].type === t1 && this.tokens[index + 1].type === t2;
  }

  matches3AtIndex(index, t1, t2, t3) {
    return (
      this.tokens[index].type === t1 &&
      this.tokens[index + 1].type === t2 &&
      this.tokens[index + 2].type === t3
    );
  }

  matches1(t1) {
    return this.tokens[this.tokenIndex].type === t1;
  }

  matches2(t1, t2) {
    return this.tokens[this.tokenIndex].type === t1 && this.tokens[this.tokenIndex + 1].type === t2;
  }

  matches3(t1, t2, t3) {
    return (
      this.tokens[this.tokenIndex].type === t1 &&
      this.tokens[this.tokenIndex + 1].type === t2 &&
      this.tokens[this.tokenIndex + 2].type === t3
    );
  }

  matches4(t1, t2, t3, t4) {
    return (
      this.tokens[this.tokenIndex].type === t1 &&
      this.tokens[this.tokenIndex + 1].type === t2 &&
      this.tokens[this.tokenIndex + 2].type === t3 &&
      this.tokens[this.tokenIndex + 3].type === t4
    );
  }

  matches5(t1, t2, t3, t4, t5) {
    return (
      this.tokens[this.tokenIndex].type === t1 &&
      this.tokens[this.tokenIndex + 1].type === t2 &&
      this.tokens[this.tokenIndex + 2].type === t3 &&
      this.tokens[this.tokenIndex + 3].type === t4 &&
      this.tokens[this.tokenIndex + 4].type === t5
    );
  }

  matchesContextual(contextualKeyword) {
    return this.matchesContextualAtIndex(this.tokenIndex, contextualKeyword);
  }

  matchesContextIdAndLabel(type, contextId) {
    return this.matches1(type) && this.currentToken().contextId === contextId;
  }

  previousWhitespaceAndComments() {
    let whitespaceAndComments = this.code.slice(
      this.tokenIndex > 0 ? this.tokens[this.tokenIndex - 1].end : 0,
      this.tokenIndex < this.tokens.length ? this.tokens[this.tokenIndex].start : this.code.length,
    );
    if (this.isFlowEnabled) {
      whitespaceAndComments = whitespaceAndComments.replace(/@flow/g, "");
    }
    return whitespaceAndComments;
  }

  replaceToken(newCode) {
    this.resultCode += this.previousWhitespaceAndComments();
    this.appendTokenPrefix();
    this.resultMappings[this.tokenIndex] = this.resultCode.length;
    this.resultCode += newCode;
    this.appendTokenSuffix();
    this.tokenIndex++;
  }

  replaceTokenTrimmingLeftWhitespace(newCode) {
    this.resultCode += this.previousWhitespaceAndComments().replace(/[^\r\n]/g, "");
    this.appendTokenPrefix();
    this.resultMappings[this.tokenIndex] = this.resultCode.length;
    this.resultCode += newCode;
    this.appendTokenSuffix();
    this.tokenIndex++;
  }

  removeInitialToken() {
    this.replaceToken("");
  }

  removeToken() {
    this.replaceTokenTrimmingLeftWhitespace("");
  }

  /**
   * Remove all code until the next }, accounting for balanced braces.
   */
  removeBalancedCode() {
    let braceDepth = 0;
    while (!this.isAtEnd()) {
      if (this.matches1(_types.TokenType.braceL)) {
        braceDepth++;
      } else if (this.matches1(_types.TokenType.braceR)) {
        if (braceDepth === 0) {
          return;
        }
        braceDepth--;
      }
      this.removeToken();
    }
  }

  copyExpectedToken(tokenType) {
    if (this.tokens[this.tokenIndex].type !== tokenType) {
      throw new Error(`Expected token ${tokenType}`);
    }
    this.copyToken();
  }

  copyToken() {
    this.resultCode += this.previousWhitespaceAndComments();
    this.appendTokenPrefix();
    this.resultMappings[this.tokenIndex] = this.resultCode.length;
    this.resultCode += this.code.slice(
      this.tokens[this.tokenIndex].start,
      this.tokens[this.tokenIndex].end,
    );
    this.appendTokenSuffix();
    this.tokenIndex++;
  }

  copyTokenWithPrefix(prefix) {
    this.resultCode += this.previousWhitespaceAndComments();
    this.appendTokenPrefix();
    this.resultCode += prefix;
    this.resultMappings[this.tokenIndex] = this.resultCode.length;
    this.resultCode += this.code.slice(
      this.tokens[this.tokenIndex].start,
      this.tokens[this.tokenIndex].end,
    );
    this.appendTokenSuffix();
    this.tokenIndex++;
  }

   appendTokenPrefix() {
    const token = this.currentToken();
    if (token.numNullishCoalesceStarts || token.isOptionalChainStart) {
      token.isAsyncOperation = _isAsyncOperation2.default.call(void 0, this);
    }
    if (this.disableESTransforms) {
      return;
    }
    if (token.numNullishCoalesceStarts) {
      for (let i = 0; i < token.numNullishCoalesceStarts; i++) {
        if (token.isAsyncOperation) {
          this.resultCode += "await ";
          this.resultCode += this.helperManager.getHelperName("asyncNullishCoalesce");
        } else {
          this.resultCode += this.helperManager.getHelperName("nullishCoalesce");
        }
        this.resultCode += "(";
      }
    }
    if (token.isOptionalChainStart) {
      if (token.isAsyncOperation) {
        this.resultCode += "await ";
      }
      if (this.tokenIndex > 0 && this.tokenAtRelativeIndex(-1).type === _types.TokenType._delete) {
        if (token.isAsyncOperation) {
          this.resultCode += this.helperManager.getHelperName("asyncOptionalChainDelete");
        } else {
          this.resultCode += this.helperManager.getHelperName("optionalChainDelete");
        }
      } else if (token.isAsyncOperation) {
        this.resultCode += this.helperManager.getHelperName("asyncOptionalChain");
      } else {
        this.resultCode += this.helperManager.getHelperName("optionalChain");
      }
      this.resultCode += "([";
    }
  }

   appendTokenSuffix() {
    const token = this.currentToken();
    if (token.isOptionalChainEnd && !this.disableESTransforms) {
      this.resultCode += "])";
    }
    if (token.numNullishCoalesceEnds && !this.disableESTransforms) {
      for (let i = 0; i < token.numNullishCoalesceEnds; i++) {
        this.resultCode += "))";
      }
    }
  }

  appendCode(code) {
    this.resultCode += code;
  }

  currentToken() {
    return this.tokens[this.tokenIndex];
  }

  currentTokenCode() {
    const token = this.currentToken();
    return this.code.slice(token.start, token.end);
  }

  tokenAtRelativeIndex(relativeIndex) {
    return this.tokens[this.tokenIndex + relativeIndex];
  }

  currentIndex() {
    return this.tokenIndex;
  }

  /**
   * Move to the next token. Only suitable in preprocessing steps. When
   * generating new code, you should use copyToken or removeToken.
   */
  nextToken() {
    if (this.tokenIndex === this.tokens.length) {
      throw new Error("Unexpectedly reached end of input.");
    }
    this.tokenIndex++;
  }

  previousToken() {
    this.tokenIndex--;
  }

  finish() {
    if (this.tokenIndex !== this.tokens.length) {
      throw new Error("Tried to finish processing tokens before reaching the end.");
    }
    this.resultCode += this.previousWhitespaceAndComments();
    return {code: this.resultCode, mappings: this.resultMappings};
  }

  isAtEnd() {
    return this.tokenIndex === this.tokens.length;
  }
} exports.default = TokenProcessor;
