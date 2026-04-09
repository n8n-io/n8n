import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const Op: {
    readonly Lt: "lt";
    readonly Lte: "lte";
    readonly Gt: "gt";
    readonly Gte: "gte";
    readonly Startswith: "startswith";
    readonly Istartswith: "istartswith";
    readonly Endswith: "endswith";
    readonly Iendswith: "iendswith";
    readonly Contains: "contains";
    readonly Icontains: "icontains";
    readonly Matches: "matches";
    readonly Notcontains: "notcontains";
    readonly Inotcontains: "inotcontains";
    readonly Eq: "eq";
    readonly Neq: "neq";
    readonly Isnull: "isnull";
    readonly Includes: "includes";
    readonly Excludes: "excludes";
    readonly LenEq: "len_eq";
};
export type Op = ClosedEnum<typeof Op>;
export type FilterCondition = {
    field: string;
    op: Op;
    value?: any | undefined;
};
/** @internal */
export declare const Op$inboundSchema: z.ZodNativeEnum<typeof Op>;
/** @internal */
export declare const Op$outboundSchema: z.ZodNativeEnum<typeof Op>;
/** @internal */
export declare const FilterCondition$inboundSchema: z.ZodType<FilterCondition, z.ZodTypeDef, unknown>;
/** @internal */
export type FilterCondition$Outbound = {
    field: string;
    op: string;
    value?: any | undefined;
};
/** @internal */
export declare const FilterCondition$outboundSchema: z.ZodType<FilterCondition$Outbound, z.ZodTypeDef, FilterCondition>;
export declare function filterConditionToJSON(filterCondition: FilterCondition): string;
export declare function filterConditionFromJSON(jsonString: string): SafeParseResult<FilterCondition, SDKValidationError>;
//# sourceMappingURL=filtercondition.d.ts.map