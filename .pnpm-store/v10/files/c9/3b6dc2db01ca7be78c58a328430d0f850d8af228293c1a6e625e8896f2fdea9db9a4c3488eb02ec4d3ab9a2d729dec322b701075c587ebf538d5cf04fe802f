import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TranscriptionStreamDone, TranscriptionStreamDone$Outbound } from "./transcriptionstreamdone.js";
import { TranscriptionStreamEventTypes } from "./transcriptionstreameventtypes.js";
import { TranscriptionStreamLanguage, TranscriptionStreamLanguage$Outbound } from "./transcriptionstreamlanguage.js";
import { TranscriptionStreamSegmentDelta, TranscriptionStreamSegmentDelta$Outbound } from "./transcriptionstreamsegmentdelta.js";
import { TranscriptionStreamTextDelta, TranscriptionStreamTextDelta$Outbound } from "./transcriptionstreamtextdelta.js";
export type TranscriptionStreamEventsData = (TranscriptionStreamDone & {
    type: "transcription.done";
}) | (TranscriptionStreamSegmentDelta & {
    type: "transcription.segment";
}) | (TranscriptionStreamLanguage & {
    type: "transcription.language";
}) | (TranscriptionStreamTextDelta & {
    type: "transcription.text.delta";
});
export type TranscriptionStreamEvents = {
    event: TranscriptionStreamEventTypes;
    data: (TranscriptionStreamDone & {
        type: "transcription.done";
    }) | (TranscriptionStreamSegmentDelta & {
        type: "transcription.segment";
    }) | (TranscriptionStreamLanguage & {
        type: "transcription.language";
    }) | (TranscriptionStreamTextDelta & {
        type: "transcription.text.delta";
    });
};
/** @internal */
export declare const TranscriptionStreamEventsData$inboundSchema: z.ZodType<TranscriptionStreamEventsData, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamEventsData$Outbound = (TranscriptionStreamDone$Outbound & {
    type: "transcription.done";
}) | (TranscriptionStreamSegmentDelta$Outbound & {
    type: "transcription.segment";
}) | (TranscriptionStreamLanguage$Outbound & {
    type: "transcription.language";
}) | (TranscriptionStreamTextDelta$Outbound & {
    type: "transcription.text.delta";
});
/** @internal */
export declare const TranscriptionStreamEventsData$outboundSchema: z.ZodType<TranscriptionStreamEventsData$Outbound, z.ZodTypeDef, TranscriptionStreamEventsData>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamEventsData$ {
    /** @deprecated use `TranscriptionStreamEventsData$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamEventsData, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamEventsData$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamEventsData$Outbound, z.ZodTypeDef, TranscriptionStreamEventsData>;
    /** @deprecated use `TranscriptionStreamEventsData$Outbound` instead. */
    type Outbound = TranscriptionStreamEventsData$Outbound;
}
export declare function transcriptionStreamEventsDataToJSON(transcriptionStreamEventsData: TranscriptionStreamEventsData): string;
export declare function transcriptionStreamEventsDataFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamEventsData, SDKValidationError>;
/** @internal */
export declare const TranscriptionStreamEvents$inboundSchema: z.ZodType<TranscriptionStreamEvents, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamEvents$Outbound = {
    event: string;
    data: (TranscriptionStreamDone$Outbound & {
        type: "transcription.done";
    }) | (TranscriptionStreamSegmentDelta$Outbound & {
        type: "transcription.segment";
    }) | (TranscriptionStreamLanguage$Outbound & {
        type: "transcription.language";
    }) | (TranscriptionStreamTextDelta$Outbound & {
        type: "transcription.text.delta";
    });
};
/** @internal */
export declare const TranscriptionStreamEvents$outboundSchema: z.ZodType<TranscriptionStreamEvents$Outbound, z.ZodTypeDef, TranscriptionStreamEvents>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamEvents$ {
    /** @deprecated use `TranscriptionStreamEvents$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamEvents, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamEvents$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamEvents$Outbound, z.ZodTypeDef, TranscriptionStreamEvents>;
    /** @deprecated use `TranscriptionStreamEvents$Outbound` instead. */
    type Outbound = TranscriptionStreamEvents$Outbound;
}
export declare function transcriptionStreamEventsToJSON(transcriptionStreamEvents: TranscriptionStreamEvents): string;
export declare function transcriptionStreamEventsFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamEvents, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamevents.d.ts.map