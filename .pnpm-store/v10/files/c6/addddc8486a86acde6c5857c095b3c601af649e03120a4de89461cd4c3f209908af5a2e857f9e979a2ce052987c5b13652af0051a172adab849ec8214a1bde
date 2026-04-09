import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const Audience: {
    readonly User: "user";
    readonly Assistant: "assistant";
};
export type Audience = ClosedEnum<typeof Audience>;
export type Annotations = {
    audience?: Array<Audience> | null | undefined;
    priority?: number | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const Audience$inboundSchema: z.ZodNativeEnum<typeof Audience>;
/** @internal */
export declare const Annotations$inboundSchema: z.ZodType<Annotations, z.ZodTypeDef, unknown>;
export declare function annotationsFromJSON(jsonString: string): SafeParseResult<Annotations, SDKValidationError>;
//# sourceMappingURL=annotations.d.ts.map