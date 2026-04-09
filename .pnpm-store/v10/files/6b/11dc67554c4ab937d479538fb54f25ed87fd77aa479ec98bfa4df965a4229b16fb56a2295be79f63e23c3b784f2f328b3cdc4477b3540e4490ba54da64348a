"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.name = exports.version = void 0;
exports.factory = factory;
const bs_logger_1 = require("bs-logger");
/**
 * Remember to increase the version whenever transformer's content is changed. This is to inform Jest to not reuse
 * the previous cache which contains old transformer's content
 */
exports.version = 4;
// Used for constructing cache key
exports.name = 'hoist-jest';
const HOIST_METHODS = ['mock', 'unmock', 'enableAutomock', 'disableAutomock', 'deepUnmock'];
const JEST_GLOBALS_MODULE_NAME = '@jest/globals';
const JEST_GLOBAL_NAME = 'jest';
function factory({ configSet }) {
    const logger = configSet.logger.child({ namespace: exports.name });
    const ts = configSet.compilerModule;
    const importNamesOfJestObj = [];
    const isJestGlobalImport = (node) => {
        return (ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === JEST_GLOBALS_MODULE_NAME);
    };
    const shouldHoistExpression = (node) => {
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
    const isHoistableStatement = (node) => {
        return ts.isExpressionStatement(node) && shouldHoistExpression(node.expression);
    };
    const canHoistInBlockScope = (node) => !!node.statements.find((stmt) => ts.isVariableStatement(stmt) &&
        stmt.declarationList.declarations.find((decl) => ts.isIdentifier(decl.name) && decl.name.text !== JEST_GLOBAL_NAME) &&
        node.statements.find((stmt) => isHoistableStatement(stmt)));
    /**
     * Sort statements according to priority
     * - Import Jest object from `@jest/globals`
     * - Hoistable methods
     * - Non-hoistable methods
     */
    const sortStatements = (statements) => {
        if (statements.length <= 1) {
            return statements;
        }
        return statements.sort((stmtA, stmtB) => isJestGlobalImport(stmtA) ||
            (isHoistableStatement(stmtA) && !isHoistableStatement(stmtB) && !isJestGlobalImport(stmtB))
            ? -1
            : 1);
    };
    const createVisitor = (ctx, _) => {
        const visitor = (node) => {
            const resultNode = ts.visitEachChild(node, visitor, ctx);
            // Since we use `visitEachChild`, we go upwards tree so all children node elements are checked first
            if (ts.isBlock(resultNode) && canHoistInBlockScope(resultNode)) {
                const newNodeArrayStatements = ts.factory.createNodeArray(sortStatements(resultNode.statements));
                return ts.factory.updateBlock(resultNode, newNodeArrayStatements);
            }
            else {
                if (ts.isSourceFile(resultNode)) {
                    resultNode.statements.forEach((stmt) => {
                        /**
                         * Gather all possible import names, from different types of import syntax including:
                         * - named import, e.g. `import { jest } from '@jest/globals'`
                         * - aliased named import, e.g. `import {jest as aliasedJest} from '@jest/globals'`
                         * - namespace import, e.g `import * as JestGlobals from '@jest/globals'`
                         */
                        if (isJestGlobalImport(stmt) &&
                            stmt.importClause?.namedBindings &&
                            (ts.isNamespaceImport(stmt.importClause.namedBindings) ||
                                ts.isNamedImports(stmt.importClause.namedBindings))) {
                            const { namedBindings } = stmt.importClause;
                            const jestImportName = ts.isNamespaceImport(namedBindings)
                                ? namedBindings.name.text
                                : namedBindings.elements.find((element) => element.name.text === JEST_GLOBAL_NAME || element.propertyName?.text === JEST_GLOBAL_NAME)?.name.text;
                            if (jestImportName) {
                                importNamesOfJestObj.push(jestImportName);
                            }
                        }
                    });
                    const newNodeArrayStatements = ts.factory.createNodeArray(sortStatements(resultNode.statements));
                    importNamesOfJestObj.length = 0;
                    return ts.factory.updateSourceFile(resultNode, newNodeArrayStatements, resultNode.isDeclarationFile, resultNode.referencedFiles, resultNode.typeReferenceDirectives, resultNode.hasNoDefaultLib, resultNode.libReferenceDirectives);
                }
                return resultNode;
            }
        };
        return visitor;
    };
    // returns the transformer factory
    return (ctx) => logger.wrap({ [bs_logger_1.LogContexts.logLevel]: bs_logger_1.LogLevels.debug, call: null }, 'visitSourceFileNode(): hoist jest', (sf) => ts.visitNode(sf, createVisitor(ctx, sf)));
}
