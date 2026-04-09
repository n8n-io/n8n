import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BaseTaskStatus } from "./basetaskstatus.js";
export type DatasetImportTask = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    creatorId: string;
    datasetId: string;
    workspaceId: string;
    status: BaseTaskStatus;
    progress?: number | null | undefined;
    message?: string | null | undefined;
};
/** @internal */
export declare const DatasetImportTask$inboundSchema: z.ZodType<DatasetImportTask, z.ZodTypeDef, unknown>;
export declare function datasetImportTaskFromJSON(jsonString: string): SafeParseResult<DatasetImportTask, SDKValidationError>;
//# sourceMappingURL=datasetimporttask.d.ts.map