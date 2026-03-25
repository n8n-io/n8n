import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FileSchema, FileSchema$Outbound } from "./fileschema.js";
export type ListFilesOut = {
    data: Array<FileSchema>;
    object: string;
    total: number;
};
/** @internal */
export declare const ListFilesOut$inboundSchema: z.ZodType<ListFilesOut, z.ZodTypeDef, unknown>;
/** @internal */
export type ListFilesOut$Outbound = {
    data: Array<FileSchema$Outbound>;
    object: string;
    total: number;
};
/** @internal */
export declare const ListFilesOut$outboundSchema: z.ZodType<ListFilesOut$Outbound, z.ZodTypeDef, ListFilesOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ListFilesOut$ {
    /** @deprecated use `ListFilesOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ListFilesOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `ListFilesOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ListFilesOut$Outbound, z.ZodTypeDef, ListFilesOut>;
    /** @deprecated use `ListFilesOut$Outbound` instead. */
    type Outbound = ListFilesOut$Outbound;
}
export declare function listFilesOutToJSON(listFilesOut: ListFilesOut): string;
export declare function listFilesOutFromJSON(jsonString: string): SafeParseResult<ListFilesOut, SDKValidationError>;
//# sourceMappingURL=listfilesout.d.ts.map