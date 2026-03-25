import { Scope, Rule, SourceCode } from 'eslint';
import { Program, Identifier, Property, SpreadElement, CallExpression, Expression, ObjectExpression, Node, FunctionExpression, ArrowFunctionExpression, AssignmentProperty } from 'estree';
import { RuleInfo, TestInfo, ViolationAndSuppressionData, MetaDocsProperty } from './types.js';

/**
* Performs static analysis on an AST to try to determine the final value of `module.exports`.
* @param sourceCode The object contains `Program` AST node, and optional `scopeManager`
* @returns An object with keys `meta`, `create`, and `isNewStyle`. `meta` and `create` correspond to the AST nodes
for the final values of `module.exports.meta` and `module.exports.create`. `isNewStyle` will be `true` if `module.exports`
is an object, and `false` if `module.exports` is just the `create` function. If no valid ESLint rule info can be extracted
from the file, the return value will be `null`.
*/
declare function getRuleInfo({ ast, scopeManager, }: {
    ast: Program;
    scopeManager: Scope.ScopeManager;
}): RuleInfo | null;
/**
 * Gets all the identifiers referring to the `context` variable in a rule source file. Note that this function will
 * only work correctly after traversing the AST has started (e.g. in the first `Program` node).
 * @param scopeManager
 * @param ast The `Program` node for the file
 * @returns A Set of all `Identifier` nodes that are references to the `context` value for the file
 */
declare function getContextIdentifiers(scopeManager: Scope.ScopeManager, ast: Program): Set<Identifier>;
/**
 * Gets the key name of a Property, if it can be determined statically.
 * @param node The `Property` node
 * @param scope
 * @returns The key name, or `null` if the name cannot be determined statically.
 */
declare function getKeyName(property: Property | SpreadElement, scope?: Scope.Scope): string | null;
/**
 * Performs static analysis on an AST to try to find test cases
 * @param context The `context` variable for the source file itself
 * @param ast The `Program` node for the file.
 * @returns A list of objects with `valid` and `invalid` keys containing a list of AST nodes corresponding to tests
 */
declare function getTestInfo(context: Rule.RuleContext, ast: Program): TestInfo[];
/**
 * Gets information on a report, given the ASTNode of context.report().
 * @param node The ASTNode of context.report()
 */
declare function getReportInfo(node: CallExpression, context: Rule.RuleContext): Record<string, Property['value']> | Record<string, Expression | SpreadElement> | null;
/**
 * Gets a set of all `sourceCode` identifiers.
 * @param scopeManager
 * @param ast The AST of the file. This must have `parent` properties.
 * @returns A set of all identifiers referring to the `SourceCode` object.
 */
declare function getSourceCodeIdentifiers(scopeManager: Scope.ScopeManager, ast: Program): Set<Identifier>;
/**
 * Insert a given property into a given object literal.
 * @param fixer The fixer.
 * @param node The ObjectExpression node to insert a property.
 * @param propertyText The property code to insert.
 */
declare function insertProperty(fixer: Rule.RuleFixer, node: ObjectExpression, propertyText: string, sourceCode: SourceCode): Rule.Fix;
/**
 * Collect all context.report({...}) violation/suggestion-related nodes into a standardized array for convenience.
 * @param reportInfo - Result of getReportInfo().
 * @returns {messageId?: String, message?: String, data?: Object, fix?: Function}[]
 */
declare function collectReportViolationAndSuggestionData(reportInfo: NonNullable<ReturnType<typeof getReportInfo>>): ViolationAndSuppressionData[];
/**
 * Whether the provided node represents an autofixer function.
 * @param node
 * @param contextIdentifiers
 */
declare function isAutoFixerFunction(node: Node, contextIdentifiers: Set<Identifier>, context: Rule.RuleContext): node is FunctionExpression | ArrowFunctionExpression;
/**
 * Whether the provided node represents a suggestion fixer function.
 * @param node
 * @param contextIdentifiers
 * @param context
 */
declare function isSuggestionFixerFunction(node: Node, contextIdentifiers: Set<Identifier>, context: Rule.RuleContext): boolean;
/**
 * List all properties contained in an object.
 * Evaluates and includes any properties that may be behind spreads.
 * @param objectNode
 * @param scopeManager
 * @returns the list of all properties that could be found
 */
declare function evaluateObjectProperties(objectNode: Node | undefined, scopeManager: Scope.ScopeManager): (Property | SpreadElement)[];
declare function getMetaDocsProperty(propertyName: string, ruleInfo: RuleInfo, scopeManager: Scope.ScopeManager): MetaDocsProperty;
/**
 * Get the `meta.messages` node from a rule.
 * @param ruleInfo
 * @param scopeManager
 */
declare function getMessagesNode(ruleInfo: RuleInfo | null, scopeManager: Scope.ScopeManager): ObjectExpression | undefined;
/**
 * Get the list of messageId properties from `meta.messages` for a rule.
 * @param ruleInfo
 * @param scopeManager
 */
declare function getMessageIdNodes(ruleInfo: RuleInfo, scopeManager: Scope.ScopeManager): (Property | SpreadElement)[] | undefined;
/**
 * Get the messageId property from a rule's `meta.messages` that matches the given `messageId`.
 * @param messageId - the messageId to check for
 * @param ruleInfo
 * @param scopeManager
 * @param scope
 * @returns The matching messageId property from `meta.messages`.
 */
declare function getMessageIdNodeById(messageId: string, ruleInfo: RuleInfo, scopeManager: Scope.ScopeManager, scope: Scope.Scope): Property | undefined;
declare function getMetaSchemaNode(metaNode: Node | undefined, scopeManager: Scope.ScopeManager): Property | undefined;
declare function getMetaSchemaNodeProperty(schemaNode: AssignmentProperty | Property | undefined, scopeManager: Scope.ScopeManager): Node | null;
/**
 * Get the possible values that a variable was initialized to at some point.
 * @param node - the Identifier node for the variable.
 * @param scopeManager
 * @returns the values that the given variable could be initialized to.
 */
declare function findPossibleVariableValues(node: Identifier, scopeManager: Scope.ScopeManager): Node[];
/**
 * @param node
 * @returns Whether the node is an Identifier with name `undefined`.
 */
declare function isUndefinedIdentifier(node: Node): boolean;
/**
 * Check whether a variable's definition is from a function parameter.
 * @param node - the Identifier node for the variable.
 * @param scopeManager
 * @returns whether the variable comes from a function parameter
 */
declare function isVariableFromParameter(node: Identifier, scopeManager: Scope.ScopeManager): boolean;

export { collectReportViolationAndSuggestionData, evaluateObjectProperties, findPossibleVariableValues, getContextIdentifiers, getKeyName, getMessageIdNodeById, getMessageIdNodes, getMessagesNode, getMetaDocsProperty, getMetaSchemaNode, getMetaSchemaNodeProperty, getReportInfo, getRuleInfo, getSourceCodeIdentifiers, getTestInfo, insertProperty, isAutoFixerFunction, isSuggestionFixerFunction, isUndefinedIdentifier, isVariableFromParameter };
