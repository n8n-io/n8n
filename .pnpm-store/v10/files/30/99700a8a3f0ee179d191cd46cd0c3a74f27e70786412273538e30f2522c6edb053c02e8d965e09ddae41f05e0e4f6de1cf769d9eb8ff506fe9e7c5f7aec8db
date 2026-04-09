import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ToolConfiguration, ToolConfiguration$Outbound } from "./toolconfiguration.js";
export declare const CodeInterpreterToolType: {
    readonly CodeInterpreter: "code_interpreter";
};
export type CodeInterpreterToolType = ClosedEnum<typeof CodeInterpreterToolType>;
export type CodeInterpreterTool = {
    toolConfiguration?: ToolConfiguration | null | undefined;
    type?: CodeInterpreterToolType | undefined;
};
/** @internal */
export declare const CodeInterpreterToolType$inboundSchema: z.ZodNativeEnum<typeof CodeInterpreterToolType>;
/** @internal */
export declare const CodeInterpreterToolType$outboundSchema: z.ZodNativeEnum<typeof CodeInterpreterToolType>;
/** @internal */
export declare const CodeInterpreterTool$inboundSchema: z.ZodType<CodeInterpreterTool, z.ZodTypeDef, unknown>;
/** @internal */
export type CodeInterpreterTool$Outbound = {
    tool_configuration?: ToolConfiguration$Outbound | null | undefined;
    type: string;
};
/** @internal */
export declare const CodeInterpreterTool$outboundSchema: z.ZodType<CodeInterpreterTool$Outbound, z.ZodTypeDef, CodeInterpreterTool>;
export declare function codeInterpreterToolToJSON(codeInterpreterTool: CodeInterpreterTool): string;
export declare function codeInterpreterToolFromJSON(jsonString: string): SafeParseResult<CodeInterpreterTool, SDKValidationError>;
//# sourceMappingURL=codeinterpretertool.d.ts.map