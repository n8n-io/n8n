import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ConversationUsageInfo } from "./conversationusageinfo.js";
export type ResponseDoneEvent = {
    type?: "conversation.response.done" | undefined;
    createdAt?: Date | undefined;
    usage: ConversationUsageInfo;
};
/** @internal */
export declare const ResponseDoneEvent$inboundSchema: z.ZodType<ResponseDoneEvent, z.ZodTypeDef, unknown>;
export declare function responseDoneEventFromJSON(jsonString: string): SafeParseResult<ResponseDoneEvent, SDKValidationError>;
//# sourceMappingURL=responsedoneevent.d.ts.map