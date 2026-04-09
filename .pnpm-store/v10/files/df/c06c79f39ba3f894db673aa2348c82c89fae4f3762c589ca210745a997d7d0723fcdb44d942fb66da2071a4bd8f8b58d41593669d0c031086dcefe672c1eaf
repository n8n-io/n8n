import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilterCondition, FilterCondition$Outbound } from "./filtercondition.js";
export type Or = FilterCondition | FilterGroup;
export type FilterGroup = {
    and?: Array<FilterCondition | FilterGroup> | null | undefined;
    or?: Array<FilterCondition | FilterGroup> | null | undefined;
};
export type And = FilterCondition | FilterGroup;
/** @internal */
export declare const Or$inboundSchema: z.ZodType<Or, z.ZodTypeDef, unknown>;
/** @internal */
export type Or$Outbound = FilterCondition$Outbound | FilterGroup$Outbound;
/** @internal */
export declare const Or$outboundSchema: z.ZodType<Or$Outbound, z.ZodTypeDef, Or>;
export declare function orToJSON(or: Or): string;
export declare function orFromJSON(jsonString: string): SafeParseResult<Or, SDKValidationError>;
/** @internal */
export declare const FilterGroup$inboundSchema: z.ZodType<FilterGroup, z.ZodTypeDef, unknown>;
/** @internal */
export type FilterGroup$Outbound = {
    AND?: Array<FilterCondition$Outbound | FilterGroup$Outbound> | null | undefined;
    OR?: Array<FilterCondition$Outbound | FilterGroup$Outbound> | null | undefined;
};
/** @internal */
export declare const FilterGroup$outboundSchema: z.ZodType<FilterGroup$Outbound, z.ZodTypeDef, FilterGroup>;
export declare function filterGroupToJSON(filterGroup: FilterGroup): string;
export declare function filterGroupFromJSON(jsonString: string): SafeParseResult<FilterGroup, SDKValidationError>;
/** @internal */
export declare const And$inboundSchema: z.ZodType<And, z.ZodTypeDef, unknown>;
/** @internal */
export type And$Outbound = FilterCondition$Outbound | FilterGroup$Outbound;
/** @internal */
export declare const And$outboundSchema: z.ZodType<And$Outbound, z.ZodTypeDef, And>;
export declare function andToJSON(and: And): string;
export declare function andFromJSON(jsonString: string): SafeParseResult<And, SDKValidationError>;
//# sourceMappingURL=filtergroup.d.ts.map