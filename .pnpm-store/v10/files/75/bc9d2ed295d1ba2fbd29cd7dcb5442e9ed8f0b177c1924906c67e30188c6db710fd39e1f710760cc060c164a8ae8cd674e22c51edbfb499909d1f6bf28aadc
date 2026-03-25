


import {isDeclaration} from "./parser/tokenizer";
import {ContextualKeyword} from "./parser/tokenizer/keywords";
import {TokenType as tt} from "./parser/tokenizer/types";

import getImportExportSpecifierInfo from "./util/getImportExportSpecifierInfo";
import {getNonTypeIdentifiers} from "./util/getNonTypeIdentifiers";
















/**
 * Class responsible for preprocessing and bookkeeping import and export declarations within the
 * file.
 *
 * TypeScript uses a simpler mechanism that does not use functions like interopRequireDefault and
 * interopRequireWildcard, so we also allow that mode for compatibility.
 */
export default class CJSImportProcessor {
   __init() {this.nonTypeIdentifiers = new Set()}
   __init2() {this.importInfoByPath = new Map()}
   __init3() {this.importsToReplace = new Map()}
   __init4() {this.identifierReplacements = new Map()}
   __init5() {this.exportBindingsByLocalName = new Map()}

  constructor(
     nameManager,
     tokens,
     enableLegacyTypeScriptModuleInterop,
     options,
     isTypeScriptTransformEnabled,
     keepUnusedImports,
     helperManager,
  ) {;this.nameManager = nameManager;this.tokens = tokens;this.enableLegacyTypeScriptModuleInterop = enableLegacyTypeScriptModuleInterop;this.options = options;this.isTypeScriptTransformEnabled = isTypeScriptTransformEnabled;this.keepUnusedImports = keepUnusedImports;this.helperManager = helperManager;CJSImportProcessor.prototype.__init.call(this);CJSImportProcessor.prototype.__init2.call(this);CJSImportProcessor.prototype.__init3.call(this);CJSImportProcessor.prototype.__init4.call(this);CJSImportProcessor.prototype.__init5.call(this);}

  preprocessTokens() {
    for (let i = 0; i < this.tokens.tokens.length; i++) {
      if (
        this.tokens.matches1AtIndex(i, tt._import) &&
        !this.tokens.matches3AtIndex(i, tt._import, tt.name, tt.eq)
      ) {
        this.preprocessImportAtIndex(i);
      }
      if (
        this.tokens.matches1AtIndex(i, tt._export) &&
        !this.tokens.matches2AtIndex(i, tt._export, tt.eq)
      ) {
        this.preprocessExportAtIndex(i);
      }
    }
    this.generateImportReplacements();
  }

  /**
   * In TypeScript, import statements that only import types should be removed.
   * This includes `import {} from 'foo';`, but not `import 'foo';`.
   */
  pruneTypeOnlyImports() {
    this.nonTypeIdentifiers = getNonTypeIdentifiers(this.tokens, this.options);
    for (const [path, importInfo] of this.importInfoByPath.entries()) {
      if (
        importInfo.hasBareImport ||
        importInfo.hasStarExport ||
        importInfo.exportStarNames.length > 0 ||
        importInfo.namedExports.length > 0
      ) {
        continue;
      }
      const names = [
        ...importInfo.defaultNames,
        ...importInfo.wildcardNames,
        ...importInfo.namedImports.map(({localName}) => localName),
      ];
      if (names.every((name) => this.shouldAutomaticallyElideImportedName(name))) {
        this.importsToReplace.set(path, "");
      }
    }
  }

  shouldAutomaticallyElideImportedName(name) {
    return (
      this.isTypeScriptTransformEnabled &&
      !this.keepUnusedImports &&
      !this.nonTypeIdentifiers.has(name)
    );
  }

   generateImportReplacements() {
    for (const [path, importInfo] of this.importInfoByPath.entries()) {
      const {
        defaultNames,
        wildcardNames,
        namedImports,
        namedExports,
        exportStarNames,
        hasStarExport,
      } = importInfo;

      if (
        defaultNames.length === 0 &&
        wildcardNames.length === 0 &&
        namedImports.length === 0 &&
        namedExports.length === 0 &&
        exportStarNames.length === 0 &&
        !hasStarExport
      ) {
        // Import is never used, so don't even assign a name.
        this.importsToReplace.set(path, `require('${path}');`);
        continue;
      }

      const primaryImportName = this.getFreeIdentifierForPath(path);
      let secondaryImportName;
      if (this.enableLegacyTypeScriptModuleInterop) {
        secondaryImportName = primaryImportName;
      } else {
        secondaryImportName =
          wildcardNames.length > 0 ? wildcardNames[0] : this.getFreeIdentifierForPath(path);
      }
      let requireCode = `var ${primaryImportName} = require('${path}');`;
      if (wildcardNames.length > 0) {
        for (const wildcardName of wildcardNames) {
          const moduleExpr = this.enableLegacyTypeScriptModuleInterop
            ? primaryImportName
            : `${this.helperManager.getHelperName("interopRequireWildcard")}(${primaryImportName})`;
          requireCode += ` var ${wildcardName} = ${moduleExpr};`;
        }
      } else if (exportStarNames.length > 0 && secondaryImportName !== primaryImportName) {
        requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName(
          "interopRequireWildcard",
        )}(${primaryImportName});`;
      } else if (defaultNames.length > 0 && secondaryImportName !== primaryImportName) {
        requireCode += ` var ${secondaryImportName} = ${this.helperManager.getHelperName(
          "interopRequireDefault",
        )}(${primaryImportName});`;
      }

      for (const {importedName, localName} of namedExports) {
        requireCode += ` ${this.helperManager.getHelperName(
          "createNamedExportFrom",
        )}(${primaryImportName}, '${localName}', '${importedName}');`;
      }
      for (const exportStarName of exportStarNames) {
        requireCode += ` exports.${exportStarName} = ${secondaryImportName};`;
      }
      if (hasStarExport) {
        requireCode += ` ${this.helperManager.getHelperName(
          "createStarExport",
        )}(${primaryImportName});`;
      }

      this.importsToReplace.set(path, requireCode);

      for (const defaultName of defaultNames) {
        this.identifierReplacements.set(defaultName, `${secondaryImportName}.default`);
      }
      for (const {importedName, localName} of namedImports) {
        this.identifierReplacements.set(localName, `${primaryImportName}.${importedName}`);
      }
    }
  }

  getFreeIdentifierForPath(path) {
    const components = path.split("/");
    const lastComponent = components[components.length - 1];
    const baseName = lastComponent.replace(/\W/g, "");
    return this.nameManager.claimFreeName(`_${baseName}`);
  }

   preprocessImportAtIndex(index) {
    const defaultNames = [];
    const wildcardNames = [];
    const namedImports = [];

    index++;
    if (
      (this.tokens.matchesContextualAtIndex(index, ContextualKeyword._type) ||
        this.tokens.matches1AtIndex(index, tt._typeof)) &&
      !this.tokens.matches1AtIndex(index + 1, tt.comma) &&
      !this.tokens.matchesContextualAtIndex(index + 1, ContextualKeyword._from)
    ) {
      // import type declaration, so no need to process anything.
      return;
    }

    if (this.tokens.matches1AtIndex(index, tt.parenL)) {
      // Dynamic import, so nothing to do
      return;
    }

    if (this.tokens.matches1AtIndex(index, tt.name)) {
      defaultNames.push(this.tokens.identifierNameAtIndex(index));
      index++;
      if (this.tokens.matches1AtIndex(index, tt.comma)) {
        index++;
      }
    }

    if (this.tokens.matches1AtIndex(index, tt.star)) {
      // * as
      index += 2;
      wildcardNames.push(this.tokens.identifierNameAtIndex(index));
      index++;
    }

    if (this.tokens.matches1AtIndex(index, tt.braceL)) {
      const result = this.getNamedImports(index + 1);
      index = result.newIndex;

      for (const namedImport of result.namedImports) {
        // Treat {default as X} as a default import to ensure usage of require interop helper
        if (namedImport.importedName === "default") {
          defaultNames.push(namedImport.localName);
        } else {
          namedImports.push(namedImport);
        }
      }
    }

    if (this.tokens.matchesContextualAtIndex(index, ContextualKeyword._from)) {
      index++;
    }

    if (!this.tokens.matches1AtIndex(index, tt.string)) {
      throw new Error("Expected string token at the end of import statement.");
    }
    const path = this.tokens.stringValueAtIndex(index);
    const importInfo = this.getImportInfo(path);
    importInfo.defaultNames.push(...defaultNames);
    importInfo.wildcardNames.push(...wildcardNames);
    importInfo.namedImports.push(...namedImports);
    if (defaultNames.length === 0 && wildcardNames.length === 0 && namedImports.length === 0) {
      importInfo.hasBareImport = true;
    }
  }

   preprocessExportAtIndex(index) {
    if (
      this.tokens.matches2AtIndex(index, tt._export, tt._var) ||
      this.tokens.matches2AtIndex(index, tt._export, tt._let) ||
      this.tokens.matches2AtIndex(index, tt._export, tt._const)
    ) {
      this.preprocessVarExportAtIndex(index);
    } else if (
      this.tokens.matches2AtIndex(index, tt._export, tt._function) ||
      this.tokens.matches2AtIndex(index, tt._export, tt._class)
    ) {
      const exportName = this.tokens.identifierNameAtIndex(index + 2);
      this.addExportBinding(exportName, exportName);
    } else if (this.tokens.matches3AtIndex(index, tt._export, tt.name, tt._function)) {
      const exportName = this.tokens.identifierNameAtIndex(index + 3);
      this.addExportBinding(exportName, exportName);
    } else if (this.tokens.matches2AtIndex(index, tt._export, tt.braceL)) {
      this.preprocessNamedExportAtIndex(index);
    } else if (this.tokens.matches2AtIndex(index, tt._export, tt.star)) {
      this.preprocessExportStarAtIndex(index);
    }
  }

   preprocessVarExportAtIndex(index) {
    let depth = 0;
    // Handle cases like `export let {x} = y;`, starting at the open-brace in that case.
    for (let i = index + 2; ; i++) {
      if (
        this.tokens.matches1AtIndex(i, tt.braceL) ||
        this.tokens.matches1AtIndex(i, tt.dollarBraceL) ||
        this.tokens.matches1AtIndex(i, tt.bracketL)
      ) {
        depth++;
      } else if (
        this.tokens.matches1AtIndex(i, tt.braceR) ||
        this.tokens.matches1AtIndex(i, tt.bracketR)
      ) {
        depth--;
      } else if (depth === 0 && !this.tokens.matches1AtIndex(i, tt.name)) {
        break;
      } else if (this.tokens.matches1AtIndex(1, tt.eq)) {
        const endIndex = this.tokens.currentToken().rhsEndIndex;
        if (endIndex == null) {
          throw new Error("Expected = token with an end index.");
        }
        i = endIndex - 1;
      } else {
        const token = this.tokens.tokens[i];
        if (isDeclaration(token)) {
          const exportName = this.tokens.identifierNameAtIndex(i);
          this.identifierReplacements.set(exportName, `exports.${exportName}`);
        }
      }
    }
  }

  /**
   * Walk this export statement just in case it's an export...from statement.
   * If it is, combine it into the import info for that path. Otherwise, just
   * bail out; it'll be handled later.
   */
   preprocessNamedExportAtIndex(index) {
    // export {
    index += 2;
    const {newIndex, namedImports} = this.getNamedImports(index);
    index = newIndex;

    if (this.tokens.matchesContextualAtIndex(index, ContextualKeyword._from)) {
      index++;
    } else {
      // Reinterpret "a as b" to be local/exported rather than imported/local.
      for (const {importedName: localName, localName: exportedName} of namedImports) {
        this.addExportBinding(localName, exportedName);
      }
      return;
    }

    if (!this.tokens.matches1AtIndex(index, tt.string)) {
      throw new Error("Expected string token at the end of import statement.");
    }
    const path = this.tokens.stringValueAtIndex(index);
    const importInfo = this.getImportInfo(path);
    importInfo.namedExports.push(...namedImports);
  }

   preprocessExportStarAtIndex(index) {
    let exportedName = null;
    if (this.tokens.matches3AtIndex(index, tt._export, tt.star, tt._as)) {
      // export * as
      index += 3;
      exportedName = this.tokens.identifierNameAtIndex(index);
      // foo from
      index += 2;
    } else {
      // export * from
      index += 3;
    }
    if (!this.tokens.matches1AtIndex(index, tt.string)) {
      throw new Error("Expected string token at the end of star export statement.");
    }
    const path = this.tokens.stringValueAtIndex(index);
    const importInfo = this.getImportInfo(path);
    if (exportedName !== null) {
      importInfo.exportStarNames.push(exportedName);
    } else {
      importInfo.hasStarExport = true;
    }
  }

   getNamedImports(index) {
    const namedImports = [];
    while (true) {
      if (this.tokens.matches1AtIndex(index, tt.braceR)) {
        index++;
        break;
      }

      const specifierInfo = getImportExportSpecifierInfo(this.tokens, index);
      index = specifierInfo.endIndex;
      if (!specifierInfo.isType) {
        namedImports.push({
          importedName: specifierInfo.leftName,
          localName: specifierInfo.rightName,
        });
      }

      if (this.tokens.matches2AtIndex(index, tt.comma, tt.braceR)) {
        index += 2;
        break;
      } else if (this.tokens.matches1AtIndex(index, tt.braceR)) {
        index++;
        break;
      } else if (this.tokens.matches1AtIndex(index, tt.comma)) {
        index++;
      } else {
        throw new Error(`Unexpected token: ${JSON.stringify(this.tokens.tokens[index])}`);
      }
    }
    return {newIndex: index, namedImports};
  }

  /**
   * Get a mutable import info object for this path, creating one if it doesn't
   * exist yet.
   */
   getImportInfo(path) {
    const existingInfo = this.importInfoByPath.get(path);
    if (existingInfo) {
      return existingInfo;
    }
    const newInfo = {
      defaultNames: [],
      wildcardNames: [],
      namedImports: [],
      namedExports: [],
      hasBareImport: false,
      exportStarNames: [],
      hasStarExport: false,
    };
    this.importInfoByPath.set(path, newInfo);
    return newInfo;
  }

   addExportBinding(localName, exportedName) {
    if (!this.exportBindingsByLocalName.has(localName)) {
      this.exportBindingsByLocalName.set(localName, []);
    }
    this.exportBindingsByLocalName.get(localName).push(exportedName);
  }

  /**
   * Return the code to use for the import for this path, or the empty string if
   * the code has already been "claimed" by a previous import.
   */
  claimImportCode(importPath) {
    const result = this.importsToReplace.get(importPath);
    this.importsToReplace.set(importPath, "");
    return result || "";
  }

  getIdentifierReplacement(identifierName) {
    return this.identifierReplacements.get(identifierName) || null;
  }

  /**
   * Return a string like `exports.foo = exports.bar`.
   */
  resolveExportBinding(assignedName) {
    const exportedNames = this.exportBindingsByLocalName.get(assignedName);
    if (!exportedNames || exportedNames.length === 0) {
      return null;
    }
    return exportedNames.map((exportedName) => `exports.${exportedName}`).join(" = ");
  }

  /**
   * Return all imported/exported names where we might be interested in whether usages of those
   * names are shadowed.
   */
  getGlobalNames() {
    return new Set([
      ...this.identifierReplacements.keys(),
      ...this.exportBindingsByLocalName.keys(),
    ]);
  }
}
