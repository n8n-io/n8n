"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }


var _keywords = require('../parser/tokenizer/keywords');
var _types = require('../parser/tokenizer/types');

var _elideImportEquals = require('../util/elideImportEquals'); var _elideImportEquals2 = _interopRequireDefault(_elideImportEquals);



var _getDeclarationInfo = require('../util/getDeclarationInfo'); var _getDeclarationInfo2 = _interopRequireDefault(_getDeclarationInfo);
var _getImportExportSpecifierInfo = require('../util/getImportExportSpecifierInfo'); var _getImportExportSpecifierInfo2 = _interopRequireDefault(_getImportExportSpecifierInfo);
var _getNonTypeIdentifiers = require('../util/getNonTypeIdentifiers');
var _isExportFrom = require('../util/isExportFrom'); var _isExportFrom2 = _interopRequireDefault(_isExportFrom);
var _removeMaybeImportAttributes = require('../util/removeMaybeImportAttributes');
var _shouldElideDefaultExport = require('../util/shouldElideDefaultExport'); var _shouldElideDefaultExport2 = _interopRequireDefault(_shouldElideDefaultExport);

var _Transformer = require('./Transformer'); var _Transformer2 = _interopRequireDefault(_Transformer);

/**
 * Class for editing import statements when we are keeping the code as ESM. We still need to remove
 * type-only imports in TypeScript and Flow.
 */
 class ESMImportTransformer extends _Transformer2.default {
  
  
  

  constructor(
     tokens,
     nameManager,
     helperManager,
     reactHotLoaderTransformer,
     isTypeScriptTransformEnabled,
     isFlowTransformEnabled,
     keepUnusedImports,
    options,
  ) {
    super();this.tokens = tokens;this.nameManager = nameManager;this.helperManager = helperManager;this.reactHotLoaderTransformer = reactHotLoaderTransformer;this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;this.isFlowTransformEnabled = isFlowTransformEnabled;this.keepUnusedImports = keepUnusedImports;;
    this.nonTypeIdentifiers =
      isTypeScriptTransformEnabled && !keepUnusedImports
        ? _getNonTypeIdentifiers.getNonTypeIdentifiers.call(void 0, tokens, options)
        : new Set();
    this.declarationInfo =
      isTypeScriptTransformEnabled && !keepUnusedImports
        ? _getDeclarationInfo2.default.call(void 0, tokens)
        : _getDeclarationInfo.EMPTY_DECLARATION_INFO;
    this.injectCreateRequireForImportRequire = Boolean(options.injectCreateRequireForImportRequire);
  }

  process() {
    // TypeScript `import foo = require('foo');` should always just be translated to plain require.
    if (this.tokens.matches3(_types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)) {
      return this.processImportEquals();
    }
    if (
      this.tokens.matches4(_types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) &&
      this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)
    ) {
      // import type T = require('T')
      this.tokens.removeInitialToken();
      // This construct is always exactly 8 tokens long, so remove the 7 remaining tokens.
      for (let i = 0; i < 7; i++) {
        this.tokens.removeToken();
      }
      return true;
    }
    if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.eq)) {
      this.tokens.replaceToken("module.exports");
      return true;
    }
    if (
      this.tokens.matches5(_types.TokenType._export, _types.TokenType._import, _types.TokenType.name, _types.TokenType.name, _types.TokenType.eq) &&
      this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._type)
    ) {
      // export import type T = require('T')
      this.tokens.removeInitialToken();
      // This construct is always exactly 9 tokens long, so remove the 8 remaining tokens.
      for (let i = 0; i < 8; i++) {
        this.tokens.removeToken();
      }
      return true;
    }
    if (this.tokens.matches1(_types.TokenType._import)) {
      return this.processImport();
    }
    if (this.tokens.matches2(_types.TokenType._export, _types.TokenType._default)) {
      return this.processExportDefault();
    }
    if (this.tokens.matches2(_types.TokenType._export, _types.TokenType.braceL)) {
      return this.processNamedExports();
    }
    if (
      this.tokens.matches2(_types.TokenType._export, _types.TokenType.name) &&
      this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._type)
    ) {
      // export type {a};
      // export type {a as b};
      // export type {a} from './b';
      // export type * from './b';
      // export type * as ns from './b';
      this.tokens.removeInitialToken();
      this.tokens.removeToken();
      if (this.tokens.matches1(_types.TokenType.braceL)) {
        while (!this.tokens.matches1(_types.TokenType.braceR)) {
          this.tokens.removeToken();
        }
        this.tokens.removeToken();
      } else {
        // *
        this.tokens.removeToken();
        if (this.tokens.matches1(_types.TokenType._as)) {
          // as
          this.tokens.removeToken();
          // ns
          this.tokens.removeToken();
        }
      }
      // Remove type re-export `... } from './T'`
      if (
        this.tokens.matchesContextual(_keywords.ContextualKeyword._from) &&
        this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.string)
      ) {
        this.tokens.removeToken();
        this.tokens.removeToken();
        _removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
      }
      return true;
    }
    return false;
  }

   processImportEquals() {
    const importName = this.tokens.identifierNameAtIndex(this.tokens.currentIndex() + 1);
    if (this.shouldAutomaticallyElideImportedName(importName)) {
      // If this name is only used as a type, elide the whole import.
      _elideImportEquals2.default.call(void 0, this.tokens);
    } else if (this.injectCreateRequireForImportRequire) {
      // We're using require in an environment (Node ESM) that doesn't provide
      // it as a global, so generate a helper to import it.
      // import -> const
      this.tokens.replaceToken("const");
      // Foo
      this.tokens.copyToken();
      // =
      this.tokens.copyToken();
      // require
      this.tokens.replaceToken(this.helperManager.getHelperName("require"));
    } else {
      // Otherwise, just switch `import` to `const`.
      this.tokens.replaceToken("const");
    }
    return true;
  }

   processImport() {
    if (this.tokens.matches2(_types.TokenType._import, _types.TokenType.parenL)) {
      // Dynamic imports don't need to be transformed.
      return false;
    }

    const snapshot = this.tokens.snapshot();
    const allImportsRemoved = this.removeImportTypeBindings();
    if (allImportsRemoved) {
      this.tokens.restoreToSnapshot(snapshot);
      while (!this.tokens.matches1(_types.TokenType.string)) {
        this.tokens.removeToken();
      }
      this.tokens.removeToken();
      _removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
      if (this.tokens.matches1(_types.TokenType.semi)) {
        this.tokens.removeToken();
      }
    }
    return true;
  }

  /**
   * Remove type bindings from this import, leaving the rest of the import intact.
   *
   * Return true if this import was ONLY types, and thus is eligible for removal. This will bail out
   * of the replacement operation, so we can return early here.
   */
   removeImportTypeBindings() {
    this.tokens.copyExpectedToken(_types.TokenType._import);
    if (
      this.tokens.matchesContextual(_keywords.ContextualKeyword._type) &&
      !this.tokens.matches1AtIndex(this.tokens.currentIndex() + 1, _types.TokenType.comma) &&
      !this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 1, _keywords.ContextualKeyword._from)
    ) {
      // This is an "import type" statement, so exit early.
      return true;
    }

    if (this.tokens.matches1(_types.TokenType.string)) {
      // This is a bare import, so we should proceed with the import.
      this.tokens.copyToken();
      return false;
    }

    // Skip the "module" token in import reflection.
    if (
      this.tokens.matchesContextual(_keywords.ContextualKeyword._module) &&
      this.tokens.matchesContextualAtIndex(this.tokens.currentIndex() + 2, _keywords.ContextualKeyword._from)
    ) {
      this.tokens.copyToken();
    }

    let foundNonTypeImport = false;
    let foundAnyNamedImport = false;
    let needsComma = false;

    // Handle default import.
    if (this.tokens.matches1(_types.TokenType.name)) {
      if (this.shouldAutomaticallyElideImportedName(this.tokens.identifierName())) {
        this.tokens.removeToken();
        if (this.tokens.matches1(_types.TokenType.comma)) {
          this.tokens.removeToken();
        }
      } else {
        foundNonTypeImport = true;
        this.tokens.copyToken();
        if (this.tokens.matches1(_types.TokenType.comma)) {
          // We're in a statement like:
          // import A, * as B from './A';
          // or
          // import A, {foo} from './A';
          // where the `A` is being kept. The comma should be removed if an only
          // if the next part of the import statement is elided, but that's hard
          // to determine at this point in the code. Instead, always remove it
          // and set a flag to add it back if necessary.
          needsComma = true;
          this.tokens.removeToken();
        }
      }
    }

    if (this.tokens.matches1(_types.TokenType.star)) {
      if (this.shouldAutomaticallyElideImportedName(this.tokens.identifierNameAtRelativeIndex(2))) {
        this.tokens.removeToken();
        this.tokens.removeToken();
        this.tokens.removeToken();
      } else {
        if (needsComma) {
          this.tokens.appendCode(",");
        }
        foundNonTypeImport = true;
        this.tokens.copyExpectedToken(_types.TokenType.star);
        this.tokens.copyExpectedToken(_types.TokenType.name);
        this.tokens.copyExpectedToken(_types.TokenType.name);
      }
    } else if (this.tokens.matches1(_types.TokenType.braceL)) {
      if (needsComma) {
        this.tokens.appendCode(",");
      }
      this.tokens.copyToken();
      while (!this.tokens.matches1(_types.TokenType.braceR)) {
        foundAnyNamedImport = true;
        const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens);
        if (
          specifierInfo.isType ||
          this.shouldAutomaticallyElideImportedName(specifierInfo.rightName)
        ) {
          while (this.tokens.currentIndex() < specifierInfo.endIndex) {
            this.tokens.removeToken();
          }
          if (this.tokens.matches1(_types.TokenType.comma)) {
            this.tokens.removeToken();
          }
        } else {
          foundNonTypeImport = true;
          while (this.tokens.currentIndex() < specifierInfo.endIndex) {
            this.tokens.copyToken();
          }
          if (this.tokens.matches1(_types.TokenType.comma)) {
            this.tokens.copyToken();
          }
        }
      }
      this.tokens.copyExpectedToken(_types.TokenType.braceR);
    }

    if (this.keepUnusedImports) {
      return false;
    }
    if (this.isTypeScriptTransformEnabled) {
      return !foundNonTypeImport;
    } else if (this.isFlowTransformEnabled) {
      // In Flow, unlike TS, `import {} from 'foo';` preserves the import.
      return foundAnyNamedImport && !foundNonTypeImport;
    } else {
      return false;
    }
  }

   shouldAutomaticallyElideImportedName(name) {
    return (
      this.isTypeScriptTransformEnabled &&
      !this.keepUnusedImports &&
      !this.nonTypeIdentifiers.has(name)
    );
  }

   processExportDefault() {
    if (
      _shouldElideDefaultExport2.default.call(void 0, 
        this.isTypeScriptTransformEnabled,
        this.keepUnusedImports,
        this.tokens,
        this.declarationInfo,
      )
    ) {
      // If the exported value is just an identifier and should be elided by TypeScript
      // rules, then remove it entirely. It will always have the form `export default e`,
      // where `e` is an identifier.
      this.tokens.removeInitialToken();
      this.tokens.removeToken();
      this.tokens.removeToken();
      return true;
    }

    const alreadyHasName =
      this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._function, _types.TokenType.name) ||
      // export default async function
      (this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType.name, _types.TokenType._function, _types.TokenType.name) &&
        this.tokens.matchesContextualAtIndex(
          this.tokens.currentIndex() + 2,
          _keywords.ContextualKeyword._async,
        )) ||
      this.tokens.matches4(_types.TokenType._export, _types.TokenType._default, _types.TokenType._class, _types.TokenType.name) ||
      this.tokens.matches5(_types.TokenType._export, _types.TokenType._default, _types.TokenType._abstract, _types.TokenType._class, _types.TokenType.name);

    if (!alreadyHasName && this.reactHotLoaderTransformer) {
      // This is a plain "export default E" statement and we need to assign E to a variable.
      // Change "export default E" to "let _default; export default _default = E"
      const defaultVarName = this.nameManager.claimFreeName("_default");
      this.tokens.replaceToken(`let ${defaultVarName}; export`);
      this.tokens.copyToken();
      this.tokens.appendCode(` ${defaultVarName} =`);
      this.reactHotLoaderTransformer.setExtractedDefaultExportName(defaultVarName);
      return true;
    }
    return false;
  }

  /**
   * Handle a statement with one of these forms:
   * export {a, type b};
   * export {c, type d} from 'foo';
   *
   * In both cases, any explicit type exports should be removed. In the first
   * case, we also need to handle implicit export elision for names declared as
   * types. In the second case, we must NOT do implicit named export elision,
   * but we must remove the runtime import if all exports are type exports.
   */
   processNamedExports() {
    if (!this.isTypeScriptTransformEnabled) {
      return false;
    }
    this.tokens.copyExpectedToken(_types.TokenType._export);
    this.tokens.copyExpectedToken(_types.TokenType.braceL);

    const isReExport = _isExportFrom2.default.call(void 0, this.tokens);
    let foundNonTypeExport = false;
    while (!this.tokens.matches1(_types.TokenType.braceR)) {
      const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, this.tokens);
      if (
        specifierInfo.isType ||
        (!isReExport && this.shouldElideExportedName(specifierInfo.leftName))
      ) {
        // Type export, so remove all tokens, including any comma.
        while (this.tokens.currentIndex() < specifierInfo.endIndex) {
          this.tokens.removeToken();
        }
        if (this.tokens.matches1(_types.TokenType.comma)) {
          this.tokens.removeToken();
        }
      } else {
        // Non-type export, so copy all tokens, including any comma.
        foundNonTypeExport = true;
        while (this.tokens.currentIndex() < specifierInfo.endIndex) {
          this.tokens.copyToken();
        }
        if (this.tokens.matches1(_types.TokenType.comma)) {
          this.tokens.copyToken();
        }
      }
    }
    this.tokens.copyExpectedToken(_types.TokenType.braceR);

    if (!this.keepUnusedImports && isReExport && !foundNonTypeExport) {
      // This is a type-only re-export, so skip evaluating the other module. Technically this
      // leaves the statement as `export {}`, but that's ok since that's a no-op.
      this.tokens.removeToken();
      this.tokens.removeToken();
      _removeMaybeImportAttributes.removeMaybeImportAttributes.call(void 0, this.tokens);
    }

    return true;
  }

  /**
   * ESM elides all imports with the rule that we only elide if we see that it's
   * a type and never see it as a value. This is in contrast to CJS, which
   * elides imports that are completely unknown.
   */
   shouldElideExportedName(name) {
    return (
      this.isTypeScriptTransformEnabled &&
      !this.keepUnusedImports &&
      this.declarationInfo.typeDeclarations.has(name) &&
      !this.declarationInfo.valueDeclarations.has(name)
    );
  }
} exports.default = ESMImportTransformer;
