import { Rule } from "eslint";
import { ArrayPattern, ArrowFunctionExpression, AssignmentPattern, Expression, FunctionDeclaration, FunctionExpression, Literal, MaybeNamedClassDeclaration, MaybeNamedFunctionDeclaration, Node, ObjectPattern, Pattern, Property, RestElement, SpreadElement } from "estree";

//#region lib/types.d.ts
interface FunctionInfo {
  codePath: Rule.CodePath | null;
  hasReturnWithFixer?: boolean;
  hasYieldWithFixer?: boolean;
  node: Node | null;
  shouldCheck: boolean;
  upper: FunctionInfo | null;
}
interface PartialRuleInfo {
  create?: Node | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | null;
  isNewStyle?: boolean;
  meta?: Expression | Pattern | FunctionDeclaration;
}
interface RuleInfo extends PartialRuleInfo {
  create: FunctionExpression | ArrowFunctionExpression | FunctionDeclaration;
  isNewStyle: boolean;
}
type TestInfo = {
  invalid: (Expression | SpreadElement | null)[];
  valid: (Expression | SpreadElement | null)[];
};
type ViolationAndSuppressionData = {
  messageId?: Expression | SpreadElement | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern;
  message?: Expression | SpreadElement | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern;
  data?: Expression | SpreadElement | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern;
  fix?: Expression | SpreadElement | ObjectPattern | ArrayPattern | RestElement | AssignmentPattern;
};
type MetaDocsProperty = {
  docsNode: Property | undefined;
  metaNode: Node | undefined;
  metaPropertyNode: Property | undefined;
};
type StringLiteral = Literal & {
  value: string;
};
//#endregion
export { FunctionInfo, MetaDocsProperty, PartialRuleInfo, RuleInfo, StringLiteral, TestInfo, ViolationAndSuppressionData };