import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FilterCondition, FilterCondition$Outbound } from "./filtercondition.js";
import { FilterGroup, FilterGroup$Outbound } from "./filtergroup.js";
export type Filters = FilterCondition | FilterGroup;
export type FilterPayload = {
    filters: FilterCondition | FilterGroup | null;
};
/** @internal */
export declare const Filters$inboundSchema: z.ZodType<Filters, z.ZodTypeDef, unknown>;
/** @internal */
export type Filters$Outbound = FilterCondition$Outbound | FilterGroup$Outbound;
/** @internal */
export declare const Filters$outboundSchema: z.ZodType<Filters$Outbound, z.ZodTypeDef, Filters>;
export declare function filtersToJSON(filters: Filters): string;
export declare function filtersFromJSON(jsonString: string): SafeParseResult<Filters, SDKValidationError>;
/** @internal */
export declare const FilterPayload$inboundSchema: z.ZodType<FilterPayload, z.ZodTypeDef, unknown>;
/** @internal */
export type FilterPayload$Outbound = {
    filters: FilterCondition$Outbound | FilterGroup$Outbound | null;
};
/** @internal */
export declare const FilterPayload$outboundSchema: z.ZodType<FilterPayload$Outbound, z.ZodTypeDef, FilterPayload>;
export declare function filterPayloadToJSON(filterPayload: FilterPayload): string;
export declare function filterPayloadFromJSON(jsonString: string): SafeParseResult<FilterPayload, SDKValidationError>;
//# sourceMappingURL=filterpayload.d.ts.map