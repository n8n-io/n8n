import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ConversationPayload } from "./conversationpayload.js";
import { ConversationSource } from "./conversationsource.js";
export type DatasetRecord = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    datasetId: string;
    payload: ConversationPayload;
    properties: {
        [k: string]: any;
    };
    source: ConversationSource;
};
/** @internal */
export declare const DatasetRecord$inboundSchema: z.ZodType<DatasetRecord, z.ZodTypeDef, unknown>;
export declare function datasetRecordFromJSON(jsonString: string): SafeParseResult<DatasetRecord, SDKValidationError>;
//# sourceMappingURL=datasetrecord.d.ts.map