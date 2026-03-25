import { RuleSetRules } from "./TreeRuleObject";
/**
 * @public
 */
export type DeprecatedObject = {
    message?: string;
    since?: string;
};
/**
 * @public
 */
export type ParameterObject = {
    type: "String" | "string" | "Boolean" | "boolean";
    default?: string | boolean;
    required?: boolean;
    documentation?: string;
    builtIn?: string;
    deprecated?: DeprecatedObject;
};
/**
 * @public
 */
export type RuleSetObject = {
    version: string;
    serviceId?: string;
    parameters: Record<string, ParameterObject>;
    rules: RuleSetRules;
};
