


import {ContextualKeyword} from "../parser/tokenizer/keywords";
import {TokenType as tt} from "../parser/tokenizer/types";

import getClassInfo, {} from "../util/getClassInfo";
import CJSImportTransformer from "./CJSImportTransformer";
import ESMImportTransformer from "./ESMImportTransformer";
import FlowTransformer from "./FlowTransformer";
import JestHoistTransformer from "./JestHoistTransformer";
import JSXTransformer from "./JSXTransformer";
import NumericSeparatorTransformer from "./NumericSeparatorTransformer";
import OptionalCatchBindingTransformer from "./OptionalCatchBindingTransformer";
import OptionalChainingNullishTransformer from "./OptionalChainingNullishTransformer";
import ReactDisplayNameTransformer from "./ReactDisplayNameTransformer";
import ReactHotLoaderTransformer from "./ReactHotLoaderTransformer";

import TypeScriptTransformer from "./TypeScriptTransformer";








export default class RootTransformer {
   __init() {this.transformers = []}
  
  
   __init2() {this.generatedVariables = []}
  
  
  
  

  constructor(
    sucraseContext,
    transforms,
    enableLegacyBabel5ModuleInterop,
    options,
  ) {;RootTransformer.prototype.__init.call(this);RootTransformer.prototype.__init2.call(this);
    this.nameManager = sucraseContext.nameManager;
    this.helperManager = sucraseContext.helperManager;
    const {tokenProcessor, importProcessor} = sucraseContext;
    this.tokens = tokenProcessor;
    this.isImportsTransformEnabled = transforms.includes("imports");
    this.isReactHotLoaderTransformEnabled = transforms.includes("react-hot-loader");
    this.disableESTransforms = Boolean(options.disableESTransforms);

    if (!options.disableESTransforms) {
      this.transformers.push(
        new OptionalChainingNullishTransformer(tokenProcessor, this.nameManager),
      );
      this.transformers.push(new NumericSeparatorTransformer(tokenProcessor));
      this.transformers.push(new OptionalCatchBindingTransformer(tokenProcessor, this.nameManager));
    }

    if (transforms.includes("jsx")) {
      if (options.jsxRuntime !== "preserve") {
        this.transformers.push(
          new JSXTransformer(this, tokenProcessor, importProcessor, this.nameManager, options),
        );
      }
      this.transformers.push(
        new ReactDisplayNameTransformer(this, tokenProcessor, importProcessor, options),
      );
    }

    let reactHotLoaderTransformer = null;
    if (transforms.includes("react-hot-loader")) {
      if (!options.filePath) {
        throw new Error("filePath is required when using the react-hot-loader transform.");
      }
      reactHotLoaderTransformer = new ReactHotLoaderTransformer(tokenProcessor, options.filePath);
      this.transformers.push(reactHotLoaderTransformer);
    }

    // Note that we always want to enable the imports transformer, even when the import transform
    // itself isn't enabled, since we need to do type-only import pruning for both Flow and
    // TypeScript.
    if (transforms.includes("imports")) {
      if (importProcessor === null) {
        throw new Error("Expected non-null importProcessor with imports transform enabled.");
      }
      this.transformers.push(
        new CJSImportTransformer(
          this,
          tokenProcessor,
          importProcessor,
          this.nameManager,
          this.helperManager,
          reactHotLoaderTransformer,
          enableLegacyBabel5ModuleInterop,
          Boolean(options.enableLegacyTypeScriptModuleInterop),
          transforms.includes("typescript"),
          transforms.includes("flow"),
          Boolean(options.preserveDynamicImport),
          Boolean(options.keepUnusedImports),
        ),
      );
    } else {
      this.transformers.push(
        new ESMImportTransformer(
          tokenProcessor,
          this.nameManager,
          this.helperManager,
          reactHotLoaderTransformer,
          transforms.includes("typescript"),
          transforms.includes("flow"),
          Boolean(options.keepUnusedImports),
          options,
        ),
      );
    }

    if (transforms.includes("flow")) {
      this.transformers.push(
        new FlowTransformer(this, tokenProcessor, transforms.includes("imports")),
      );
    }
    if (transforms.includes("typescript")) {
      this.transformers.push(
        new TypeScriptTransformer(this, tokenProcessor, transforms.includes("imports")),
      );
    }
    if (transforms.includes("jest")) {
      this.transformers.push(
        new JestHoistTransformer(this, tokenProcessor, this.nameManager, importProcessor),
      );
    }
  }

  transform() {
    this.tokens.reset();
    this.processBalancedCode();
    const shouldAddUseStrict = this.isImportsTransformEnabled;
    // "use strict" always needs to be first, so override the normal transformer order.
    let prefix = shouldAddUseStrict ? '"use strict";' : "";
    for (const transformer of this.transformers) {
      prefix += transformer.getPrefixCode();
    }
    prefix += this.helperManager.emitHelpers();
    prefix += this.generatedVariables.map((v) => ` var ${v};`).join("");
    for (const transformer of this.transformers) {
      prefix += transformer.getHoistedCode();
    }
    let suffix = "";
    for (const transformer of this.transformers) {
      suffix += transformer.getSuffixCode();
    }
    const result = this.tokens.finish();
    let {code} = result;
    if (code.startsWith("#!")) {
      let newlineIndex = code.indexOf("\n");
      if (newlineIndex === -1) {
        newlineIndex = code.length;
        code += "\n";
      }
      return {
        code: code.slice(0, newlineIndex + 1) + prefix + code.slice(newlineIndex + 1) + suffix,
        // The hashbang line has no tokens, so shifting the tokens to account
        // for prefix can happen normally.
        mappings: this.shiftMappings(result.mappings, prefix.length),
      };
    } else {
      return {
        code: prefix + code + suffix,
        mappings: this.shiftMappings(result.mappings, prefix.length),
      };
    }
  }

  processBalancedCode() {
    let braceDepth = 0;
    let parenDepth = 0;
    while (!this.tokens.isAtEnd()) {
      if (this.tokens.matches1(tt.braceL) || this.tokens.matches1(tt.dollarBraceL)) {
        braceDepth++;
      } else if (this.tokens.matches1(tt.braceR)) {
        if (braceDepth === 0) {
          return;
        }
        braceDepth--;
      }
      if (this.tokens.matches1(tt.parenL)) {
        parenDepth++;
      } else if (this.tokens.matches1(tt.parenR)) {
        if (parenDepth === 0) {
          return;
        }
        parenDepth--;
      }
      this.processToken();
    }
  }

  processToken() {
    if (this.tokens.matches1(tt._class)) {
      this.processClass();
      return;
    }
    for (const transformer of this.transformers) {
      const wasProcessed = transformer.process();
      if (wasProcessed) {
        return;
      }
    }
    this.tokens.copyToken();
  }

  /**
   * Skip past a class with a name and return that name.
   */
  processNamedClass() {
    if (!this.tokens.matches2(tt._class, tt.name)) {
      throw new Error("Expected identifier for exported class name.");
    }
    const name = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
    this.processClass();
    return name;
  }

  processClass() {
    const classInfo = getClassInfo(this, this.tokens, this.nameManager, this.disableESTransforms);

    // Both static and instance initializers need a class name to use to invoke the initializer, so
    // assign to one if necessary.
    const needsCommaExpression =
      (classInfo.headerInfo.isExpression || !classInfo.headerInfo.className) &&
      classInfo.staticInitializerNames.length + classInfo.instanceInitializerNames.length > 0;

    let className = classInfo.headerInfo.className;
    if (needsCommaExpression) {
      className = this.nameManager.claimFreeName("_class");
      this.generatedVariables.push(className);
      this.tokens.appendCode(` (${className} =`);
    }

    const classToken = this.tokens.currentToken();
    const contextId = classToken.contextId;
    if (contextId == null) {
      throw new Error("Expected class to have a context ID.");
    }
    this.tokens.copyExpectedToken(tt._class);
    while (!this.tokens.matchesContextIdAndLabel(tt.braceL, contextId)) {
      this.processToken();
    }

    this.processClassBody(classInfo, className);

    const staticInitializerStatements = classInfo.staticInitializerNames.map(
      (name) => `${className}.${name}()`,
    );
    if (needsCommaExpression) {
      this.tokens.appendCode(
        `, ${staticInitializerStatements.map((s) => `${s}, `).join("")}${className})`,
      );
    } else if (classInfo.staticInitializerNames.length > 0) {
      this.tokens.appendCode(` ${staticInitializerStatements.map((s) => `${s};`).join(" ")}`);
    }
  }

  /**
   * We want to just handle class fields in all contexts, since TypeScript supports them. Later,
   * when some JS implementations support class fields, this should be made optional.
   */
  processClassBody(classInfo, className) {
    const {
      headerInfo,
      constructorInsertPos,
      constructorInitializerStatements,
      fields,
      instanceInitializerNames,
      rangesToRemove,
    } = classInfo;
    let fieldIndex = 0;
    let rangeToRemoveIndex = 0;
    const classContextId = this.tokens.currentToken().contextId;
    if (classContextId == null) {
      throw new Error("Expected non-null context ID on class.");
    }
    this.tokens.copyExpectedToken(tt.braceL);
    if (this.isReactHotLoaderTransformEnabled) {
      this.tokens.appendCode(
        "__reactstandin__regenerateByEval(key, code) {this[key] = eval(code);}",
      );
    }

    const needsConstructorInit =
      constructorInitializerStatements.length + instanceInitializerNames.length > 0;

    if (constructorInsertPos === null && needsConstructorInit) {
      const constructorInitializersCode = this.makeConstructorInitCode(
        constructorInitializerStatements,
        instanceInitializerNames,
        className,
      );
      if (headerInfo.hasSuperclass) {
        const argsName = this.nameManager.claimFreeName("args");
        this.tokens.appendCode(
          `constructor(...${argsName}) { super(...${argsName}); ${constructorInitializersCode}; }`,
        );
      } else {
        this.tokens.appendCode(`constructor() { ${constructorInitializersCode}; }`);
      }
    }

    while (!this.tokens.matchesContextIdAndLabel(tt.braceR, classContextId)) {
      if (fieldIndex < fields.length && this.tokens.currentIndex() === fields[fieldIndex].start) {
        let needsCloseBrace = false;
        if (this.tokens.matches1(tt.bracketL)) {
          this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this`);
        } else if (this.tokens.matches1(tt.string) || this.tokens.matches1(tt.num)) {
          this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this[`);
          needsCloseBrace = true;
        } else {
          this.tokens.copyTokenWithPrefix(`${fields[fieldIndex].initializerName}() {this.`);
        }
        while (this.tokens.currentIndex() < fields[fieldIndex].end) {
          if (needsCloseBrace && this.tokens.currentIndex() === fields[fieldIndex].equalsIndex) {
            this.tokens.appendCode("]");
          }
          this.processToken();
        }
        this.tokens.appendCode("}");
        fieldIndex++;
      } else if (
        rangeToRemoveIndex < rangesToRemove.length &&
        this.tokens.currentIndex() >= rangesToRemove[rangeToRemoveIndex].start
      ) {
        if (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) {
          this.tokens.removeInitialToken();
        }
        while (this.tokens.currentIndex() < rangesToRemove[rangeToRemoveIndex].end) {
          this.tokens.removeToken();
        }
        rangeToRemoveIndex++;
      } else if (this.tokens.currentIndex() === constructorInsertPos) {
        this.tokens.copyToken();
        if (needsConstructorInit) {
          this.tokens.appendCode(
            `;${this.makeConstructorInitCode(
              constructorInitializerStatements,
              instanceInitializerNames,
              className,
            )};`,
          );
        }
        this.processToken();
      } else {
        this.processToken();
      }
    }
    this.tokens.copyExpectedToken(tt.braceR);
  }

  makeConstructorInitCode(
    constructorInitializerStatements,
    instanceInitializerNames,
    className,
  ) {
    return [
      ...constructorInitializerStatements,
      ...instanceInitializerNames.map((name) => `${className}.prototype.${name}.call(this)`),
    ].join(";");
  }

  /**
   * Normally it's ok to simply remove type tokens, but we need to be more careful when dealing with
   * arrow function return types since they can confuse the parser. In that case, we want to move
   * the close-paren to the same line as the arrow.
   *
   * See https://github.com/alangpierce/sucrase/issues/391 for more details.
   */
  processPossibleArrowParamEnd() {
    if (this.tokens.matches2(tt.parenR, tt.colon) && this.tokens.tokenAtRelativeIndex(1).isType) {
      let nextNonTypeIndex = this.tokens.currentIndex() + 1;
      // Look ahead to see if this is an arrow function or something else.
      while (this.tokens.tokens[nextNonTypeIndex].isType) {
        nextNonTypeIndex++;
      }
      if (this.tokens.matches1AtIndex(nextNonTypeIndex, tt.arrow)) {
        this.tokens.removeInitialToken();
        while (this.tokens.currentIndex() < nextNonTypeIndex) {
          this.tokens.removeToken();
        }
        this.tokens.replaceTokenTrimmingLeftWhitespace(") =>");
        return true;
      }
    }
    return false;
  }

  /**
   * An async arrow function might be of the form:
   *
   * async <
   *   T
   * >() => {}
   *
   * in which case, removing the type parameters will cause a syntax error. Detect this case and
   * move the open-paren earlier.
   */
  processPossibleAsyncArrowWithTypeParams() {
    if (
      !this.tokens.matchesContextual(ContextualKeyword._async) &&
      !this.tokens.matches1(tt._async)
    ) {
      return false;
    }
    const nextToken = this.tokens.tokenAtRelativeIndex(1);
    if (nextToken.type !== tt.lessThan || !nextToken.isType) {
      return false;
    }

    let nextNonTypeIndex = this.tokens.currentIndex() + 1;
    // Look ahead to see if this is an arrow function or something else.
    while (this.tokens.tokens[nextNonTypeIndex].isType) {
      nextNonTypeIndex++;
    }
    if (this.tokens.matches1AtIndex(nextNonTypeIndex, tt.parenL)) {
      this.tokens.replaceToken("async (");
      this.tokens.removeInitialToken();
      while (this.tokens.currentIndex() < nextNonTypeIndex) {
        this.tokens.removeToken();
      }
      this.tokens.removeToken();
      // We ate a ( token, so we need to process the tokens in between and then the ) token so that
      // we remain balanced.
      this.processBalancedCode();
      this.processToken();
      return true;
    }
    return false;
  }

  processPossibleTypeRange() {
    if (this.tokens.currentToken().isType) {
      this.tokens.removeInitialToken();
      while (this.tokens.currentToken().isType) {
        this.tokens.removeToken();
      }
      return true;
    }
    return false;
  }

  shiftMappings(
    mappings,
    prefixLength,
  ) {
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      if (mapping !== undefined) {
        mappings[i] = mapping + prefixLength;
      }
    }
    return mappings;
  }
}
