import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { FileSchema } from "./fileschema.js";
export type ListFilesOut = {
    data: Array<FileSchema>;
    object: string;
    total?: number | null | undefined;
};
/** @internal */
export declare const ListFilesOut$inboundSchema: z.ZodType<ListFilesOut, z.ZodTypeDef, unknown>;
export declare function listFilesOutFromJSON(jsonString: string): SafeParseResult<ListFilesOut, SDKValidationError>;
//# sourceMappingURL=listfilesout.d.ts.map