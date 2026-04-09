import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Connector } from "./connector.js";
import { PaginationResponse } from "./paginationresponse.js";
export type PaginatedConnectors = {
    items: Array<Connector>;
    pagination: PaginationResponse;
};
/** @internal */
export declare const PaginatedConnectors$inboundSchema: z.ZodType<PaginatedConnectors, z.ZodTypeDef, unknown>;
export declare function paginatedConnectorsFromJSON(jsonString: string): SafeParseResult<PaginatedConnectors, SDKValidationError>;
//# sourceMappingURL=paginatedconnectors.d.ts.map