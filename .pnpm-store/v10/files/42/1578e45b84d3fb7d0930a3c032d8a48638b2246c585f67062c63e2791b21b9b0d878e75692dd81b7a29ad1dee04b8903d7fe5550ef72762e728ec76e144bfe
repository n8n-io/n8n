import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { IntegrationsSchemasApiToolTool } from "./integrationsschemasapitooltool.js";
export type Connector = {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    modifiedAt: Date;
    server?: string | null | undefined;
    authType?: string | null | undefined;
    tools?: Array<IntegrationsSchemasApiToolTool> | null | undefined;
};
/** @internal */
export declare const Connector$inboundSchema: z.ZodType<Connector, z.ZodTypeDef, unknown>;
export declare function connectorFromJSON(jsonString: string): SafeParseResult<Connector, SDKValidationError>;
//# sourceMappingURL=connector.d.ts.map