import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TranscriptionStreamDone } from "./transcriptionstreamdone.js";
import { TranscriptionStreamEventTypes } from "./transcriptionstreameventtypes.js";
import { TranscriptionStreamLanguage } from "./transcriptionstreamlanguage.js";
import { TranscriptionStreamSegmentDelta } from "./transcriptionstreamsegmentdelta.js";
import { TranscriptionStreamTextDelta } from "./transcriptionstreamtextdelta.js";
export type TranscriptionStreamEventsData = (TranscriptionStreamDone & {
    type: "transcription.done";
}) | (TranscriptionStreamLanguage & {
    type: "transcription.language";
}) | (TranscriptionStreamSegmentDelta & {
    type: "transcription.segment";
}) | (TranscriptionStreamTextDelta & {
    type: "transcription.text.delta";
});
export type TranscriptionStreamEvents = {
    event: TranscriptionStreamEventTypes;
    data: (TranscriptionStreamDone & {
        type: "transcription.done";
    }) | (TranscriptionStreamLanguage & {
        type: "transcription.language";
    }) | (TranscriptionStreamSegmentDelta & {
        type: "transcription.segment";
    }) | (TranscriptionStreamTextDelta & {
        type: "transcription.text.delta";
    });
};
/** @internal */
export declare const TranscriptionStreamEventsData$inboundSchema: z.ZodType<TranscriptionStreamEventsData, z.ZodTypeDef, unknown>;
export declare function transcriptionStreamEventsDataFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamEventsData, SDKValidationError>;
/** @internal */
export declare const TranscriptionStreamEvents$inboundSchema: z.ZodType<TranscriptionStreamEvents, z.ZodTypeDef, unknown>;
export declare function transcriptionStreamEventsFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamEvents, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamevents.d.ts.map