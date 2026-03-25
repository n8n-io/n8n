import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const TranscriptionStreamTextDeltaType: {
    readonly TranscriptionTextDelta: "transcription.text.delta";
};
export type TranscriptionStreamTextDeltaType = ClosedEnum<typeof TranscriptionStreamTextDeltaType>;
export type TranscriptionStreamTextDelta = {
    text: string;
    type?: TranscriptionStreamTextDeltaType | undefined;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const TranscriptionStreamTextDeltaType$inboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamTextDeltaType>;
/** @internal */
export declare const TranscriptionStreamTextDeltaType$outboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamTextDeltaType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamTextDeltaType$ {
    /** @deprecated use `TranscriptionStreamTextDeltaType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionTextDelta: "transcription.text.delta";
    }>;
    /** @deprecated use `TranscriptionStreamTextDeltaType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionTextDelta: "transcription.text.delta";
    }>;
}
/** @internal */
export declare const TranscriptionStreamTextDelta$inboundSchema: z.ZodType<TranscriptionStreamTextDelta, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamTextDelta$Outbound = {
    text: string;
    type: string;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamTextDelta$outboundSchema: z.ZodType<TranscriptionStreamTextDelta$Outbound, z.ZodTypeDef, TranscriptionStreamTextDelta>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamTextDelta$ {
    /** @deprecated use `TranscriptionStreamTextDelta$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamTextDelta, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamTextDelta$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamTextDelta$Outbound, z.ZodTypeDef, TranscriptionStreamTextDelta>;
    /** @deprecated use `TranscriptionStreamTextDelta$Outbound` instead. */
    type Outbound = TranscriptionStreamTextDelta$Outbound;
}
export declare function transcriptionStreamTextDeltaToJSON(transcriptionStreamTextDelta: TranscriptionStreamTextDelta): string;
export declare function transcriptionStreamTextDeltaFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamTextDelta, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamtextdelta.d.ts.map