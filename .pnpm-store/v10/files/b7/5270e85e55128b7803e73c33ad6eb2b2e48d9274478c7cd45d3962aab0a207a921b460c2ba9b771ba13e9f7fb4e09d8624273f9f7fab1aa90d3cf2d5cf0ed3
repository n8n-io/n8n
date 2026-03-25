"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factory = exports.name = exports.version = void 0;
var bs_logger_1 = require("bs-logger");
/**
 * Remember to increase the version whenever transformer's content is changed. This is to inform Jest to not reuse
 * the previous cache which contains old transformer's content
 */
exports.version = 4;
// Used for constructing cache key
exports.name = 'hoist-jest';
var HOIST_METHODS = ['mock', 'unmock', 'enableAutomock', 'disableAutomock', 'deepUnmock'];
var JEST_GLOBALS_MODULE_NAME = '@jest/globals';
var JEST_GLOBAL_NAME = 'jest';
function factory(_a) {
    var configSet = _a.configSet;
    var logger = configSet.logger.child({ namespace: exports.name });
    var ts = configSet.compilerModule;
    var importNamesOfJestObj = [];
    var isJestGlobalImport = function (node) {
        return (ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === JEST_GLOBALS_MODULE_NAME);
    };
    var shouldHoistExpression = function (node) {
        if (ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            HOIST_METHODS.includes(node.expression.name.text)) {
            if (importNamesOfJestObj.length) {
                // @jest/globals is in used
                return ((ts.isIdentifier(node.expression.expression) &&
                    importNamesOfJestObj.includes(node.expression.expression.text)) ||
                    (ts.isPropertyAccessExpression(node.expression.expression) &&
                        ts.isIdentifier(node.expression.expression.expression) &&
                        importNamesOfJestObj.includes(node.expression.expression.expression.text)) ||
                    shouldHoistExpression(node.expression.expression));
            }
            else {
                // @jest/globals is not in used
                return ((ts.isIdentifier(node.expression.expression) && node.expression.expression.text === JEST_GLOBAL_NAME) ||
                    shouldHoistExpression(node.expression.expression));
            }
        }
        return false;
    };
    /**
     * Checks whether given node is a statement that we need to hoist
     */
    var isHoistableStatement = function (node) {
        return ts.isExpressionStatement(node) && shouldHoistExpression(node.expression);
    };
    var canHoistInBlockScope = function (node) {
        return !!node.statements.find(function (stmt) {
            return ts.isVariableStatement(stmt) &&
                stmt.declarationList.declarations.find(function (decl) { return ts.isIdentifier(decl.name) && decl.name.text !== JEST_GLOBAL_NAME; }) &&
                node.statements.find(function (stmt) { return isHoistableStatement(stmt); });
        });
    };
    /**
     * Sort statements according to priority
     * - Import Jest object from `@jest/globals`
     * - Hoistable methods
     * - Non-hoistable methods
     */
    var sortStatements = function (statements) {
        if (statements.length <= 1) {
            return statements;
        }
        return statements.sort(function (stmtA, stmtB) {
            return isJestGlobalImport(stmtA) ||
                (isHoistableStatement(stmtA) && !isHoistableStatement(stmtB) && !isJestGlobalImport(stmtB))
                ? -1
                : 1;
        });
    };
    var createVisitor = function (ctx, _) {
        var visitor = function (node) {
            var resultNode = ts.visitEachChild(node, visitor, ctx);
            // Since we use `visitEachChild`, we go upwards tree so all children node elements are checked first
            if (ts.isBlock(resultNode) && canHoistInBlockScope(resultNode)) {
                var newNodeArrayStatements = ts.factory.createNodeArray(sortStatements(resultNode.statements));
                return ts.factory.updateBlock(resultNode, newNodeArrayStatements);
            }
            else {
                if (ts.isSourceFile(resultNode)) {
                    resultNode.statements.forEach(function (stmt) {
                        var _a, _b;
                        /**
                         * Gather all possible import names, from different types of import syntax including:
                         * - named import, e.g. `import { jest } from '@jest/globals'`
                         * - aliased named import, e.g. `import {jest as aliasedJest} from '@jest/globals'`
                         * - namespace import, e.g `import * as JestGlobals from '@jest/globals'`
                         */
                        if (isJestGlobalImport(stmt) &&
                            ((_a = stmt.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) &&
                            (ts.isNamespaceImport(stmt.importClause.namedBindings) ||
                                ts.isNamedImports(stmt.importClause.namedBindings))) {
                            var namedBindings = stmt.importClause.namedBindings;
                            var jestImportName = ts.isNamespaceImport(namedBindings)
                                ? namedBindings.name.text
                                : (_b = namedBindings.elements.find(function (element) { var _a; return element.name.text === JEST_GLOBAL_NAME || ((_a = element.propertyName) === null || _a === void 0 ? void 0 : _a.text) === JEST_GLOBAL_NAME; })) === null || _b === void 0 ? void 0 : _b.name.text;
                            if (jestImportName) {
                                importNamesOfJestObj.push(jestImportName);
                            }
                        }
                    });
                    var newNodeArrayStatements = ts.factory.createNodeArray(sortStatements(resultNode.statements));
                    importNamesOfJestObj.length = 0;
                    return ts.factory.updateSourceFile(resultNode, newNodeArrayStatements, resultNode.isDeclarationFile, resultNode.referencedFiles, resultNode.typeReferenceDirectives, resultNode.hasNoDefaultLib, resultNode.libReferenceDirectives);
                }
                return resultNode;
            }
        };
        return visitor;
    };
    // returns the transformer factory
    return function (ctx) {
        var _a;
        return logger.wrap((_a = {}, _a[bs_logger_1.LogContexts.logLevel] = bs_logger_1.LogLevels.debug, _a.call = null, _a), 'visitSourceFileNode(): hoist jest', function (sf) {
            return ts.visitNode(sf, createVisitor(ctx, sf));
        });
    };
}
exports.factory = factory;
