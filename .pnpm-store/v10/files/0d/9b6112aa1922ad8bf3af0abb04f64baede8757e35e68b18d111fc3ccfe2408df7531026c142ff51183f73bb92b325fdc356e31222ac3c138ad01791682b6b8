import { Rule } from 'eslint';
import { Node, MaybeNamedFunctionDeclaration, MaybeNamedClassDeclaration, Expression, Pattern, FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, SpreadElement, ObjectPattern, ArrayPattern, RestElement, AssignmentPattern, Property } from 'estree';

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

export type { FunctionInfo, MetaDocsProperty, PartialRuleInfo, RuleInfo, TestInfo, ViolationAndSuppressionData };
