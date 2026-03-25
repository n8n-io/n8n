import {ContextualKeyword} from "../parser/tokenizer/keywords";
import {TokenType as tt} from "../parser/tokenizer/types";


import Transformer from "./Transformer";

export default class FlowTransformer extends Transformer {
  constructor(
     rootTransformer,
     tokens,
     isImportsTransformEnabled,
  ) {
    super();this.rootTransformer = rootTransformer;this.tokens = tokens;this.isImportsTransformEnabled = isImportsTransformEnabled;;
  }

  process() {
    if (
      this.rootTransformer.processPossibleArrowParamEnd() ||
      this.rootTransformer.processPossibleAsyncArrowWithTypeParams() ||
      this.rootTransformer.processPossibleTypeRange()
    ) {
      return true;
    }
    if (this.tokens.matches1(tt._enum)) {
      this.processEnum();
      return true;
    }
    if (this.tokens.matches2(tt._export, tt._enum)) {
      this.processNamedExportEnum();
      return true;
    }
    if (this.tokens.matches3(tt._export, tt._default, tt._enum)) {
      this.processDefaultExportEnum();
      return true;
    }
    return false;
  }

  /**
   * Handle a declaration like:
   * export enum E ...
   *
   * With this imports transform, this becomes:
   * const E = [[enum]]; exports.E = E;
   *
   * otherwise, it becomes:
   * export const E = [[enum]];
   */
  processNamedExportEnum() {
    if (this.isImportsTransformEnabled) {
      // export
      this.tokens.removeInitialToken();
      const enumName = this.tokens.identifierNameAtRelativeIndex(1);
      this.processEnum();
      this.tokens.appendCode(` exports.${enumName} = ${enumName};`);
    } else {
      this.tokens.copyToken();
      this.processEnum();
    }
  }

  /**
   * Handle a declaration like:
   * export default enum E
   *
   * With the imports transform, this becomes:
   * const E = [[enum]]; exports.default = E;
   *
   * otherwise, it becomes:
   * const E = [[enum]]; export default E;
   */
  processDefaultExportEnum() {
    // export
    this.tokens.removeInitialToken();
    // default
    this.tokens.removeToken();
    const enumName = this.tokens.identifierNameAtRelativeIndex(1);
    this.processEnum();
    if (this.isImportsTransformEnabled) {
      this.tokens.appendCode(` exports.default = ${enumName};`);
    } else {
      this.tokens.appendCode(` export default ${enumName};`);
    }
  }

  /**
   * Transpile flow enums to invoke the "flow-enums-runtime" library.
   *
   * Currently, the transpiled code always uses `require("flow-enums-runtime")`,
   * but if future flexibility is needed, we could expose a config option for
   * this string (similar to configurable JSX). Even when targeting ESM, the
   * default behavior of babel-plugin-transform-flow-enums is to use require
   * rather than injecting an import.
   *
   * Flow enums are quite a bit simpler than TS enums and have some convenient
   * constraints:
   * - Element initializers must be either always present or always absent. That
   *   means that we can use fixed lookahead on the first element (if any) and
   *   assume that all elements are like that.
   * - The right-hand side of an element initializer must be a literal value,
   *   not a complex expression and not referencing other elements. That means
   *   we can simply copy a single token.
   *
   * Enums can be broken up into three basic cases:
   *
   * Mirrored enums:
   * enum E {A, B}
   *   ->
   * const E = require("flow-enums-runtime").Mirrored(["A", "B"]);
   *
   * Initializer enums:
   * enum E {A = 1, B = 2}
   *   ->
   * const E = require("flow-enums-runtime")({A: 1, B: 2});
   *
   * Symbol enums:
   * enum E of symbol {A, B}
   *   ->
   * const E = require("flow-enums-runtime")({A: Symbol("A"), B: Symbol("B")});
   *
   * We can statically detect which of the three cases this is by looking at the
   * "of" declaration (if any) and seeing if the first element has an initializer.
   * Since the other transform details are so similar between the three cases, we
   * use a single implementation and vary the transform within processEnumElement
   * based on case.
   */
  processEnum() {
    // enum E -> const E
    this.tokens.replaceToken("const");
    this.tokens.copyExpectedToken(tt.name);

    let isSymbolEnum = false;
    if (this.tokens.matchesContextual(ContextualKeyword._of)) {
      this.tokens.removeToken();
      isSymbolEnum = this.tokens.matchesContextual(ContextualKeyword._symbol);
      this.tokens.removeToken();
    }
    const hasInitializers = this.tokens.matches3(tt.braceL, tt.name, tt.eq);
    this.tokens.appendCode(' = require("flow-enums-runtime")');

    const isMirrored = !isSymbolEnum && !hasInitializers;
    this.tokens.replaceTokenTrimmingLeftWhitespace(isMirrored ? ".Mirrored([" : "({");

    while (!this.tokens.matches1(tt.braceR)) {
      // ... is allowed at the end and has no runtime behavior.
      if (this.tokens.matches1(tt.ellipsis)) {
        this.tokens.removeToken();
        break;
      }
      this.processEnumElement(isSymbolEnum, hasInitializers);
      if (this.tokens.matches1(tt.comma)) {
        this.tokens.copyToken();
      }
    }

    this.tokens.replaceToken(isMirrored ? "]);" : "});");
  }

  /**
   * Process an individual enum element, producing either an array element or an
   * object element based on what type of enum this is.
   */
  processEnumElement(isSymbolEnum, hasInitializers) {
    if (isSymbolEnum) {
      // Symbol enums never have initializers and are expanded to object elements.
      // A, -> A: Symbol("A"),
      const elementName = this.tokens.identifierName();
      this.tokens.copyToken();
      this.tokens.appendCode(`: Symbol("${elementName}")`);
    } else if (hasInitializers) {
      // Initializers are expanded to object elements.
      // A = 1, -> A: 1,
      this.tokens.copyToken();
      this.tokens.replaceTokenTrimmingLeftWhitespace(":");
      this.tokens.copyToken();
    } else {
      // Enum elements without initializers become string literal array elements.
      // A, -> "A",
      this.tokens.replaceToken(`"${this.tokens.identifierName()}"`);
    }
  }
}
