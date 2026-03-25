type WrappingOperator = "not" | "brackets";
type PredicateOperator = "lessThan" | "lessThanOrEqual" | "moreThan" | "moreThanOrEqual" | "equal" | "notEqual" | "ilike" | "like" | "between" | "in" | "any" | "isNull" | "arrayContains" | "arrayContainedBy" | "arrayOverlap" | "and" | "jsonContains" | "or";
export interface WherePredicateOperator {
    operator: PredicateOperator;
    parameters: string[];
}
export interface WhereWrappingOperator {
    operator: WrappingOperator;
    condition: WhereClauseCondition;
}
export interface WhereClause {
    type: "simple" | "and" | "or";
    condition: WhereClauseCondition;
}
export type WhereClauseCondition = string | WherePredicateOperator | WhereWrappingOperator | WhereClause[];
export {};
