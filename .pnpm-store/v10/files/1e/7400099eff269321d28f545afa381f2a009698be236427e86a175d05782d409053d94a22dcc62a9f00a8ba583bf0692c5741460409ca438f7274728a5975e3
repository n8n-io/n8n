"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _types = require('../parser/tokenizer/types');

var _Transformer = require('./Transformer'); var _Transformer2 = _interopRequireDefault(_Transformer);

/**
 * Transformer supporting the optional chaining and nullish coalescing operators.
 *
 * Tech plan here:
 * https://github.com/alangpierce/sucrase/wiki/Sucrase-Optional-Chaining-and-Nullish-Coalescing-Technical-Plan
 *
 * The prefix and suffix code snippets are handled by TokenProcessor, and this transformer handles
 * the operators themselves.
 */
 class OptionalChainingNullishTransformer extends _Transformer2.default {
  constructor( tokens,  nameManager) {
    super();this.tokens = tokens;this.nameManager = nameManager;;
  }

  process() {
    if (this.tokens.matches1(_types.TokenType.nullishCoalescing)) {
      const token = this.tokens.currentToken();
      if (this.tokens.tokens[token.nullishStartIndex].isAsyncOperation) {
        this.tokens.replaceTokenTrimmingLeftWhitespace(", async () => (");
      } else {
        this.tokens.replaceTokenTrimmingLeftWhitespace(", () => (");
      }
      return true;
    }
    if (this.tokens.matches1(_types.TokenType._delete)) {
      const nextToken = this.tokens.tokenAtRelativeIndex(1);
      if (nextToken.isOptionalChainStart) {
        this.tokens.removeInitialToken();
        return true;
      }
    }
    const token = this.tokens.currentToken();
    const chainStart = token.subscriptStartIndex;
    if (
      chainStart != null &&
      this.tokens.tokens[chainStart].isOptionalChainStart &&
      // Super subscripts can't be optional (since super is never null/undefined), and the syntax
      // relies on the subscript being intact, so leave this token alone.
      this.tokens.tokenAtRelativeIndex(-1).type !== _types.TokenType._super
    ) {
      const param = this.nameManager.claimFreeName("_");
      let arrowStartSnippet;
      if (
        chainStart > 0 &&
        this.tokens.matches1AtIndex(chainStart - 1, _types.TokenType._delete) &&
        this.isLastSubscriptInChain()
      ) {
        // Delete operations are special: we already removed the delete keyword, and to still
        // perform a delete, we need to insert a delete in the very last part of the chain, which
        // in correct code will always be a property access.
        arrowStartSnippet = `${param} => delete ${param}`;
      } else {
        arrowStartSnippet = `${param} => ${param}`;
      }
      if (this.tokens.tokens[chainStart].isAsyncOperation) {
        arrowStartSnippet = `async ${arrowStartSnippet}`;
      }
      if (
        this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.parenL) ||
        this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.lessThan)
      ) {
        if (this.justSkippedSuper()) {
          this.tokens.appendCode(".bind(this)");
        }
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalCall', ${arrowStartSnippet}`);
      } else if (this.tokens.matches2(_types.TokenType.questionDot, _types.TokenType.bracketL)) {
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}`);
      } else if (this.tokens.matches1(_types.TokenType.questionDot)) {
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'optionalAccess', ${arrowStartSnippet}.`);
      } else if (this.tokens.matches1(_types.TokenType.dot)) {
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}.`);
      } else if (this.tokens.matches1(_types.TokenType.bracketL)) {
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'access', ${arrowStartSnippet}[`);
      } else if (this.tokens.matches1(_types.TokenType.parenL)) {
        if (this.justSkippedSuper()) {
          this.tokens.appendCode(".bind(this)");
        }
        this.tokens.replaceTokenTrimmingLeftWhitespace(`, 'call', ${arrowStartSnippet}(`);
      } else {
        throw new Error("Unexpected subscript operator in optional chain.");
      }
      return true;
    }
    return false;
  }

  /**
   * Determine if the current token is the last of its chain, so that we know whether it's eligible
   * to have a delete op inserted.
   *
   * We can do this by walking forward until we determine one way or another. Each
   * isOptionalChainStart token must be paired with exactly one isOptionalChainEnd token after it in
   * a nesting way, so we can track depth and walk to the end of the chain (the point where the
   * depth goes negative) and see if any other subscript token is after us in the chain.
   */
  isLastSubscriptInChain() {
    let depth = 0;
    for (let i = this.tokens.currentIndex() + 1; ; i++) {
      if (i >= this.tokens.tokens.length) {
        throw new Error("Reached the end of the code while finding the end of the access chain.");
      }
      if (this.tokens.tokens[i].isOptionalChainStart) {
        depth++;
      } else if (this.tokens.tokens[i].isOptionalChainEnd) {
        depth--;
      }
      if (depth < 0) {
        return true;
      }

      // This subscript token is a later one in the same chain.
      if (depth === 0 && this.tokens.tokens[i].subscriptStartIndex != null) {
        return false;
      }
    }
  }

  /**
   * Determine if we are the open-paren in an expression like super.a()?.b.
   *
   * We can do this by walking backward to find the previous subscript. If that subscript was
   * preceded by a super, then we must be the subscript after it, so if this is a call expression,
   * we'll need to attach the right context.
   */
  justSkippedSuper() {
    let depth = 0;
    let index = this.tokens.currentIndex() - 1;
    while (true) {
      if (index < 0) {
        throw new Error(
          "Reached the start of the code while finding the start of the access chain.",
        );
      }
      if (this.tokens.tokens[index].isOptionalChainStart) {
        depth--;
      } else if (this.tokens.tokens[index].isOptionalChainEnd) {
        depth++;
      }
      if (depth < 0) {
        return false;
      }

      // This subscript token is a later one in the same chain.
      if (depth === 0 && this.tokens.tokens[index].subscriptStartIndex != null) {
        return this.tokens.tokens[index - 1].type === _types.TokenType._super;
      }
      index--;
    }
  }
} exports.default = OptionalChainingNullishTransformer;
