import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ResponseStartedEvent = {
    type?: "conversation.response.started" | undefined;
    createdAt?: Date | undefined;
    conversationId: string;
};
/** @internal */
export declare const ResponseStartedEvent$inboundSchema: z.ZodType<ResponseStartedEvent, z.ZodTypeDef, unknown>;
export declare function responseStartedEventFromJSON(jsonString: string): SafeParseResult<ResponseStartedEvent, SDKValidationError>;
//# sourceMappingURL=responsestartedevent.d.ts.map