import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const TranscriptionStreamLanguageType: {
    readonly TranscriptionLanguage: "transcription.language";
};
export type TranscriptionStreamLanguageType = ClosedEnum<typeof TranscriptionStreamLanguageType>;
export type TranscriptionStreamLanguage = {
    type?: TranscriptionStreamLanguageType | undefined;
    audioLanguage: string;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const TranscriptionStreamLanguageType$inboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamLanguageType>;
/** @internal */
export declare const TranscriptionStreamLanguageType$outboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamLanguageType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamLanguageType$ {
    /** @deprecated use `TranscriptionStreamLanguageType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionLanguage: "transcription.language";
    }>;
    /** @deprecated use `TranscriptionStreamLanguageType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionLanguage: "transcription.language";
    }>;
}
/** @internal */
export declare const TranscriptionStreamLanguage$inboundSchema: z.ZodType<TranscriptionStreamLanguage, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamLanguage$Outbound = {
    type: string;
    audio_language: string;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamLanguage$outboundSchema: z.ZodType<TranscriptionStreamLanguage$Outbound, z.ZodTypeDef, TranscriptionStreamLanguage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamLanguage$ {
    /** @deprecated use `TranscriptionStreamLanguage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamLanguage, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamLanguage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamLanguage$Outbound, z.ZodTypeDef, TranscriptionStreamLanguage>;
    /** @deprecated use `TranscriptionStreamLanguage$Outbound` instead. */
    type Outbound = TranscriptionStreamLanguage$Outbound;
}
export declare function transcriptionStreamLanguageToJSON(transcriptionStreamLanguage: TranscriptionStreamLanguage): string;
export declare function transcriptionStreamLanguageFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamLanguage, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamlanguage.d.ts.map