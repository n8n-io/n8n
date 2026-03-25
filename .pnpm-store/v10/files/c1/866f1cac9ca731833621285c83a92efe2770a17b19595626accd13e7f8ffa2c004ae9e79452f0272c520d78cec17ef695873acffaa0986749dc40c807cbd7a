import * as z from "zod";
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
/** @internal */
export type EventOut$Outbound = {
    name: string;
    data?: {
        [k: string]: any;
    } | null | undefined;
    created_at: number;
};
/** @internal */
export declare const EventOut$outboundSchema: z.ZodType<EventOut$Outbound, z.ZodTypeDef, EventOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace EventOut$ {
    /** @deprecated use `EventOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<EventOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `EventOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<EventOut$Outbound, z.ZodTypeDef, EventOut>;
    /** @deprecated use `EventOut$Outbound` instead. */
    type Outbound = EventOut$Outbound;
}
export declare function eventOutToJSON(eventOut: EventOut): string;
export declare function eventOutFromJSON(jsonString: string): SafeParseResult<EventOut, SDKValidationError>;
//# sourceMappingURL=eventout.d.ts.map