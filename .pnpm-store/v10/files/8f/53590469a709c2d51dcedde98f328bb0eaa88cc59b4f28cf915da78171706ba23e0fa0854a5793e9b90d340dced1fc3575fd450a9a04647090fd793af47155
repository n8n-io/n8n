import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type DatasetPreview = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    name: string;
    description: string;
    ownerId: string;
    workspaceId: string;
};
/** @internal */
export declare const DatasetPreview$inboundSchema: z.ZodType<DatasetPreview, z.ZodTypeDef, unknown>;
export declare function datasetPreviewFromJSON(jsonString: string): SafeParseResult<DatasetPreview, SDKValidationError>;
//# sourceMappingURL=datasetpreview.d.ts.map