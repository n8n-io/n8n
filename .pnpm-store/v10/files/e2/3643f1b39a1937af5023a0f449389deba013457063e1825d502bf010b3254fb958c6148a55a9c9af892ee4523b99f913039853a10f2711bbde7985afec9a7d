"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _types = require('../parser/tokenizer/types');

var _getImportExportSpecifierInfo = require('./getImportExportSpecifierInfo'); var _getImportExportSpecifierInfo2 = _interopRequireDefault(_getImportExportSpecifierInfo);

/**
 * Special case code to scan for imported names in ESM TypeScript. We need to do this so we can
 * properly get globals so we can compute shadowed globals.
 *
 * This is similar to logic in CJSImportProcessor, but trimmed down to avoid logic with CJS
 * replacement and flow type imports.
 */
 function getTSImportedNames(tokens) {
  const importedNames = new Set();
  for (let i = 0; i < tokens.tokens.length; i++) {
    if (
      tokens.matches1AtIndex(i, _types.TokenType._import) &&
      !tokens.matches3AtIndex(i, _types.TokenType._import, _types.TokenType.name, _types.TokenType.eq)
    ) {
      collectNamesForImport(tokens, i, importedNames);
    }
  }
  return importedNames;
} exports.default = getTSImportedNames;

function collectNamesForImport(
  tokens,
  index,
  importedNames,
) {
  index++;

  if (tokens.matches1AtIndex(index, _types.TokenType.parenL)) {
    // Dynamic import, so nothing to do
    return;
  }

  if (tokens.matches1AtIndex(index, _types.TokenType.name)) {
    importedNames.add(tokens.identifierNameAtIndex(index));
    index++;
    if (tokens.matches1AtIndex(index, _types.TokenType.comma)) {
      index++;
    }
  }

  if (tokens.matches1AtIndex(index, _types.TokenType.star)) {
    // * as
    index += 2;
    importedNames.add(tokens.identifierNameAtIndex(index));
    index++;
  }

  if (tokens.matches1AtIndex(index, _types.TokenType.braceL)) {
    index++;
    collectNamesForNamedImport(tokens, index, importedNames);
  }
}

function collectNamesForNamedImport(
  tokens,
  index,
  importedNames,
) {
  while (true) {
    if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
      return;
    }

    const specifierInfo = _getImportExportSpecifierInfo2.default.call(void 0, tokens, index);
    index = specifierInfo.endIndex;
    if (!specifierInfo.isType) {
      importedNames.add(specifierInfo.rightName);
    }

    if (tokens.matches2AtIndex(index, _types.TokenType.comma, _types.TokenType.braceR)) {
      return;
    } else if (tokens.matches1AtIndex(index, _types.TokenType.braceR)) {
      return;
    } else if (tokens.matches1AtIndex(index, _types.TokenType.comma)) {
      index++;
    } else {
      throw new Error(`Unexpected token: ${JSON.stringify(tokens.tokens[index])}`);
    }
  }
}
