import type { EndpointObjectProperty } from "../endpoint";
import type { ConditionObject, Expression } from "./shared";
/**
 * @public
 */
export type EndpointObjectProperties = Record<string, EndpointObjectProperty>;
/**
 * @public
 */
export type EndpointObjectHeaders = Record<string, Expression[]>;
/**
 * @public
 */
export type EndpointObject = {
    url: Expression;
    properties?: EndpointObjectProperties;
    headers?: EndpointObjectHeaders;
};
/**
 * @public
 */
export type EndpointRuleObject = {
    type: "endpoint";
    conditions?: ConditionObject[];
    endpoint: EndpointObject;
    documentation?: string;
};
