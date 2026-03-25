import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';
import type { PreferOptionalChainOptions } from './PreferOptionalChainOptions';
export declare const enum OperandValidity {
    Valid = "Valid",
    Invalid = "Invalid"
}
export declare const enum NullishComparisonType {
    /** `x != null`, `x != undefined` */
    NotEqualNullOrUndefined = "NotEqualNullOrUndefined",
    /** `x == null`, `x == undefined` */
    EqualNullOrUndefined = "EqualNullOrUndefined",
    /** `x !== null` */
    NotStrictEqualNull = "NotStrictEqualNull",
    /** `x === null` */
    StrictEqualNull = "StrictEqualNull",
    /** `x !== undefined`, `typeof x !== 'undefined'` */
    NotStrictEqualUndefined = "NotStrictEqualUndefined",
    /** `x === undefined`, `typeof x === 'undefined'` */
    StrictEqualUndefined = "StrictEqualUndefined",
    /** `!x` */
    NotBoolean = "NotBoolean",
    /** `x` */
    Boolean = "Boolean"
}
export interface ValidOperand {
    comparedName: TSESTree.Node;
    comparisonType: NullishComparisonType;
    isYoda: boolean;
    node: TSESTree.Expression;
    type: OperandValidity.Valid;
}
export interface InvalidOperand {
    type: OperandValidity.Invalid;
}
type Operand = InvalidOperand | ValidOperand;
export declare function gatherLogicalOperands(node: TSESTree.LogicalExpression, parserServices: ParserServicesWithTypeInformation, sourceCode: Readonly<SourceCode>, options: PreferOptionalChainOptions): {
    newlySeenLogicals: Set<TSESTree.LogicalExpression>;
    operands: Operand[];
};
export {};
//# sourceMappingURL=gatherLogicalOperands.d.ts.map