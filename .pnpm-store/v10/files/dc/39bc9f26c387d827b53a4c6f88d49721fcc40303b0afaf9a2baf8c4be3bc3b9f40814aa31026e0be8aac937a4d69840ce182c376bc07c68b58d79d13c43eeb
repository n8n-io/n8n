import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ToolConfiguration = {
    exclude?: Array<string> | null | undefined;
    include?: Array<string> | null | undefined;
    requiresConfirmation?: Array<string> | null | undefined;
};
/** @internal */
export declare const ToolConfiguration$inboundSchema: z.ZodType<ToolConfiguration, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolConfiguration$Outbound = {
    exclude?: Array<string> | null | undefined;
    include?: Array<string> | null | undefined;
    requires_confirmation?: Array<string> | null | undefined;
};
/** @internal */
export declare const ToolConfiguration$outboundSchema: z.ZodType<ToolConfiguration$Outbound, z.ZodTypeDef, ToolConfiguration>;
export declare function toolConfigurationToJSON(toolConfiguration: ToolConfiguration): string;
export declare function toolConfigurationFromJSON(jsonString: string): SafeParseResult<ToolConfiguration, SDKValidationError>;
//# sourceMappingURL=toolconfiguration.d.ts.map