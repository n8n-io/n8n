import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type EventOut = {
    /**
     * The name of the event.
     */
    name: string;
    data?: {
        [k: string]: any;
    } | null | undefined;
    /**
     * The UNIX timestamp (in seconds) of the event.
     */
    createdAt: number;
};
/** @internal */
export declare const EventOut$inboundSchema: z.ZodType<EventOut, z.ZodTypeDef, unknown>;
export declare function eventOutFromJSON(jsonString: string): SafeParseResult<EventOut, SDKValidationError>;
//# sourceMappingURL=eventout.d.ts.map