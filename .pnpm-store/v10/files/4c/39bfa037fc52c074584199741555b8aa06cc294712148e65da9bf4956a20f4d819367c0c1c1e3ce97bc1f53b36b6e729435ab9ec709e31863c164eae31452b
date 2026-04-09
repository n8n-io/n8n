"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptHelpers = void 0;
/* eslint-disable no-bitwise */
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const SourceFileLocationFormatter_1 = require("./SourceFileLocationFormatter");
const TypeScriptInternals_1 = require("./TypeScriptInternals");
class TypeScriptHelpers {
    /**
     * This traverses any symbol aliases to find the original place where an item was defined.
     * For example, suppose a class is defined as "export default class MyClass { }"
     * but exported from the package's index.ts like this:
     *
     *    export { default as _MyClass } from './MyClass';
     *
     * In this example, calling followAliases() on the _MyClass symbol will return the
     * original definition of MyClass, traversing any intermediary places where the
     * symbol was imported and re-exported.
     */
    static followAliases(symbol, typeChecker) {
        let current = symbol;
        for (;;) {
            if (!(current.flags & ts.SymbolFlags.Alias)) {
                break;
            }
            const currentAlias = typeChecker.getAliasedSymbol(current);
            if (!currentAlias || currentAlias === current) {
                break;
            }
            current = currentAlias;
        }
        return current;
    }
    /**
     * Returns true if TypeScriptHelpers.followAliases() would return something different
     * from the input `symbol`.
     */
    static isFollowableAlias(symbol, typeChecker) {
        if (!(symbol.flags & ts.SymbolFlags.Alias)) {
            return false;
        }
        const alias = typeChecker.getAliasedSymbol(symbol);
        if (!alias || alias === symbol) {
            return false;
        }
        return true;
    }
    /**
     * Certain virtual symbols do not have any declarations.  For example, `ts.TypeChecker.getExportsOfModule()` can
     * sometimes return a "prototype" symbol for an object, even though there is no corresponding declaration in the
     * source code.  API Extractor generally ignores such symbols.
     */
    static tryGetADeclaration(symbol) {
        if (symbol.declarations && symbol.declarations.length > 0) {
            return symbol.declarations[0];
        }
        return undefined;
    }
    /**
     * Returns true if the specified symbol is an ambient declaration.
     */
    static isAmbient(symbol, typeChecker) {
        const followedSymbol = TypeScriptHelpers.followAliases(symbol, typeChecker);
        if (followedSymbol.declarations && followedSymbol.declarations.length > 0) {
            const firstDeclaration = followedSymbol.declarations[0];
            // Test 1: Are we inside the sinister "declare global {" construct?
            const highestModuleDeclaration = TypeScriptHelpers.findHighestParent(firstDeclaration, ts.SyntaxKind.ModuleDeclaration);
            if (highestModuleDeclaration) {
                if (highestModuleDeclaration.name.getText().trim() === 'global') {
                    return true;
                }
            }
            // Test 2: Otherwise, the main heuristic for ambient declarations is by looking at the
            // ts.SyntaxKind.SourceFile node to see whether it has a symbol or not (i.e. whether it
            // is acting as a module or not).
            const sourceFile = firstDeclaration.getSourceFile();
            if (typeChecker.getSymbolAtLocation(sourceFile)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Same semantics as tryGetSymbolForDeclaration(), but throws an exception if the symbol
     * cannot be found.
     */
    static getSymbolForDeclaration(declaration, checker) {
        const symbol = TypeScriptInternals_1.TypeScriptInternals.tryGetSymbolForDeclaration(declaration, checker);
        if (!symbol) {
            throw new node_core_library_1.InternalError('Unable to determine semantic information for declaration:\n' +
                SourceFileLocationFormatter_1.SourceFileLocationFormatter.formatDeclaration(declaration));
        }
        return symbol;
    }
    // Return name of the module, which could be like "./SomeLocalFile' or like 'external-package/entry/point'
    static getModuleSpecifier(nodeWithModuleSpecifier) {
        if (nodeWithModuleSpecifier.kind === ts.SyntaxKind.ImportType) {
            // As specified internally in typescript:/src/compiler/types.ts#ValidImportTypeNode
            if (nodeWithModuleSpecifier.argument.kind !== ts.SyntaxKind.LiteralType ||
                nodeWithModuleSpecifier.argument.literal.kind !== ts.SyntaxKind.StringLiteral) {
                throw new node_core_library_1.InternalError(`Invalid ImportTypeNode: ${nodeWithModuleSpecifier.getText()}\n` +
                    SourceFileLocationFormatter_1.SourceFileLocationFormatter.formatDeclaration(nodeWithModuleSpecifier));
            }
            const literalTypeNode = nodeWithModuleSpecifier.argument;
            const stringLiteral = literalTypeNode.literal;
            return stringLiteral.text.trim();
        }
        // Node is a declaration
        if (nodeWithModuleSpecifier.moduleSpecifier &&
            ts.isStringLiteralLike(nodeWithModuleSpecifier.moduleSpecifier)) {
            return TypeScriptInternals_1.TypeScriptInternals.getTextOfIdentifierOrLiteral(nodeWithModuleSpecifier.moduleSpecifier);
        }
        return undefined;
    }
    /**
     * Returns an ancestor of "node", such that the ancestor, any intermediary nodes,
     * and the starting node match a list of expected kinds.  Undefined is returned
     * if there aren't enough ancestors, or if the kinds are incorrect.
     *
     * For example, suppose child "C" has parents A --> B --> C.
     *
     * Calling _matchAncestor(C, [ExportSpecifier, NamedExports, ExportDeclaration])
     * would return A only if A is of kind ExportSpecifier, B is of kind NamedExports,
     * and C is of kind ExportDeclaration.
     *
     * Calling _matchAncestor(C, [ExportDeclaration]) would return C.
     */
    static matchAncestor(node, kindsToMatch) {
        // (slice(0) clones an array)
        const reversedParentKinds = kindsToMatch.slice(0).reverse();
        let current = undefined;
        for (const parentKind of reversedParentKinds) {
            if (!current) {
                // The first time through, start with node
                current = node;
            }
            else {
                // Then walk the parents
                current = current.parent;
            }
            // If we ran out of items, or if the kind doesn't match, then fail
            if (!current || current.kind !== parentKind) {
                return undefined;
            }
        }
        // If we matched everything, then return the node that matched the last parentKinds item
        return current;
    }
    /**
     * Does a depth-first search of the children of the specified node.  Returns the first child
     * with the specified kind, or undefined if there is no match.
     */
    static findFirstChildNode(node, kindToMatch) {
        for (const child of node.getChildren()) {
            if (child.kind === kindToMatch) {
                return child;
            }
            const recursiveMatch = TypeScriptHelpers.findFirstChildNode(child, kindToMatch);
            if (recursiveMatch) {
                return recursiveMatch;
            }
        }
        return undefined;
    }
    /**
     * Returns the first parent node with the specified  SyntaxKind, or undefined if there is no match.
     */
    static findFirstParent(node, kindToMatch) {
        let current = node.parent;
        while (current) {
            if (current.kind === kindToMatch) {
                return current;
            }
            current = current.parent;
        }
        return undefined;
    }
    /**
     * Returns the highest parent node with the specified SyntaxKind, or undefined if there is no match.
     * @remarks
     * Whereas findFirstParent() returns the first match, findHighestParent() returns the last match.
     */
    static findHighestParent(node, kindToMatch) {
        let current = node;
        let highest = undefined;
        for (;;) {
            current = TypeScriptHelpers.findFirstParent(current, kindToMatch);
            if (!current) {
                break;
            }
            highest = current;
        }
        return highest;
    }
    /**
     * Decodes the names that the compiler generates for a built-in ECMAScript symbol.
     *
     * @remarks
     * TypeScript binds well-known ECMAScript symbols like `[Symbol.iterator]` as `__@iterator`.
     * If `name` is of this form, then `tryGetWellKnownSymbolName()` converts it back into e.g. `[Symbol.iterator]`.
     * If the string does not start with `__@` then `undefined` is returned.
     */
    static tryDecodeWellKnownSymbolName(name) {
        const match = TypeScriptHelpers._wellKnownSymbolNameRegExp.exec(name);
        if (match) {
            const identifier = match[1];
            return `[Symbol.${identifier}]`;
        }
        return undefined;
    }
    /**
     * Returns whether the provided name was generated for a TypeScript `unique symbol`.
     */
    static isUniqueSymbolName(name) {
        return TypeScriptHelpers._uniqueSymbolNameRegExp.test(name);
    }
    /**
     * Derives the string representation of a TypeScript late-bound symbol.
     */
    static tryGetLateBoundName(declarationName) {
        // Create a node printer that ignores comments and indentation that we can use to convert
        // declarationName to a string.
        const printer = ts.createPrinter({ removeComments: true }, {
            onEmitNode(hint, node, emitCallback) {
                ts.setEmitFlags(declarationName, ts.EmitFlags.NoIndentation | ts.EmitFlags.SingleLine);
                emitCallback(hint, node);
            }
        });
        const sourceFile = declarationName.getSourceFile();
        const text = printer.printNode(ts.EmitHint.Unspecified, declarationName, sourceFile);
        // clean up any emit flags we've set on any nodes in the tree.
        ts.disposeEmitNodes(sourceFile);
        return text;
    }
}
exports.TypeScriptHelpers = TypeScriptHelpers;
// Matches TypeScript's encoded names for well-known ECMAScript symbols like
// "__@iterator" or "__@toStringTag".
TypeScriptHelpers._wellKnownSymbolNameRegExp = /^__@(\w+)$/;
// Matches TypeScript's encoded names for late-bound symbols derived from `unique symbol` declarations
// which have the form of "__@<variableName>@<symbolId>", i.e. "__@someSymbol@12345".
TypeScriptHelpers._uniqueSymbolNameRegExp = /^__@.*@\d+$/;
//# sourceMappingURL=TypeScriptHelpers.js.map