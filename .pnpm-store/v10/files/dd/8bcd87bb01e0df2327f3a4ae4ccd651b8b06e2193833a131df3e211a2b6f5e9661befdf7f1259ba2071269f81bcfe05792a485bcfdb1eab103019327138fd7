import { Logger } from "../logger";
/**
 * @public
 */
export type ReferenceObject = {
    ref: string;
};
/**
 * @public
 */
export type FunctionObject = {
    fn: string;
    argv: FunctionArgv;
};
/**
 * @public
 */
export type FunctionArgv = Array<Expression | boolean | number>;
/**
 * @public
 */
export type FunctionReturn = string | boolean | number | {
    [key: string]: FunctionReturn;
};
/**
 * @public
 */
export type ConditionObject = FunctionObject & {
    assign?: string;
};
/**
 * @public
 */
export type Expression = string | ReferenceObject | FunctionObject;
/**
 * @public
 */
export type EndpointParams = Record<string, string | boolean>;
/**
 * @public
 */
export type EndpointResolverOptions = {
    endpointParams: EndpointParams;
    logger?: Logger;
};
/**
 * @public
 */
export type ReferenceRecord = Record<string, FunctionReturn>;
/**
 * @public
 */
export type EvaluateOptions = EndpointResolverOptions & {
    referenceRecord: ReferenceRecord;
};
