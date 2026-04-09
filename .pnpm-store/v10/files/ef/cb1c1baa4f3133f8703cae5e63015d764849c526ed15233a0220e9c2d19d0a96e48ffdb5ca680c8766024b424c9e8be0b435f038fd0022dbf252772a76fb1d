import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Not typed since mcp config can changed / not stable
 *
 * @remarks
 * we allow all extra fields and this is a dict
 * TODO: once mcp is stable, we need to type this
 */
export type ExecutionConfig = {
    type: string;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ExecutionConfig$inboundSchema: z.ZodType<ExecutionConfig, z.ZodTypeDef, unknown>;
export declare function executionConfigFromJSON(jsonString: string): SafeParseResult<ExecutionConfig, SDKValidationError>;
//# sourceMappingURL=executionconfig.d.ts.map