import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ExecutionConfig } from "./executionconfig.js";
import { IntegrationsSchemasTurbineToolLocale } from "./integrationsschemasturbinetoollocale.js";
import { ResourceVisibility } from "./resourcevisibility.js";
export type IntegrationsSchemasApiToolTool = {
    id: string;
    name: string;
    description: string;
    systemPrompt?: string | null | undefined;
    locale?: IntegrationsSchemasTurbineToolLocale | null | undefined;
    jsonschema?: {
        [k: string]: any;
    } | null | undefined;
    executionConfig: ExecutionConfig | null;
    visibility: ResourceVisibility;
    createdAt: Date;
    modifiedAt: Date;
    active?: boolean | null | undefined;
};
/** @internal */
export declare const IntegrationsSchemasApiToolTool$inboundSchema: z.ZodType<IntegrationsSchemasApiToolTool, z.ZodTypeDef, unknown>;
export declare function integrationsSchemasApiToolToolFromJSON(jsonString: string): SafeParseResult<IntegrationsSchemasApiToolTool, SDKValidationError>;
//# sourceMappingURL=integrationsschemasapitooltool.d.ts.map