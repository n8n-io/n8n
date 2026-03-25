import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const CodeInterpreterToolType: {
    readonly CodeInterpreter: "code_interpreter";
};
export type CodeInterpreterToolType = ClosedEnum<typeof CodeInterpreterToolType>;
export type CodeInterpreterTool = {
    type?: CodeInterpreterToolType | undefined;
};
/** @internal */
export declare const CodeInterpreterToolType$inboundSchema: z.ZodNativeEnum<typeof CodeInterpreterToolType>;
/** @internal */
export declare const CodeInterpreterToolType$outboundSchema: z.ZodNativeEnum<typeof CodeInterpreterToolType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CodeInterpreterToolType$ {
    /** @deprecated use `CodeInterpreterToolType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly CodeInterpreter: "code_interpreter";
    }>;
    /** @deprecated use `CodeInterpreterToolType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly CodeInterpreter: "code_interpreter";
    }>;
}
/** @internal */
export declare const CodeInterpreterTool$inboundSchema: z.ZodType<CodeInterpreterTool, z.ZodTypeDef, unknown>;
/** @internal */
export type CodeInterpreterTool$Outbound = {
    type: string;
};
/** @internal */
export declare const CodeInterpreterTool$outboundSchema: z.ZodType<CodeInterpreterTool$Outbound, z.ZodTypeDef, CodeInterpreterTool>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace CodeInterpreterTool$ {
    /** @deprecated use `CodeInterpreterTool$inboundSchema` instead. */
    const inboundSchema: z.ZodType<CodeInterpreterTool, z.ZodTypeDef, unknown>;
    /** @deprecated use `CodeInterpreterTool$outboundSchema` instead. */
    const outboundSchema: z.ZodType<CodeInterpreterTool$Outbound, z.ZodTypeDef, CodeInterpreterTool>;
    /** @deprecated use `CodeInterpreterTool$Outbound` instead. */
    type Outbound = CodeInterpreterTool$Outbound;
}
export declare function codeInterpreterToolToJSON(codeInterpreterTool: CodeInterpreterTool): string;
export declare function codeInterpreterToolFromJSON(jsonString: string): SafeParseResult<CodeInterpreterTool, SDKValidationError>;
//# sourceMappingURL=codeinterpretertool.d.ts.map