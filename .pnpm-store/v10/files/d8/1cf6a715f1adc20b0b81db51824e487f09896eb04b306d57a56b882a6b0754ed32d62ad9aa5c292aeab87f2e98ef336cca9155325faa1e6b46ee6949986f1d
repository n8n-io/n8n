import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Annotations } from "./annotations.js";
import { MCPServerIcon } from "./mcpservericon.js";
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 *
 * @remarks
 *
 * Note: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.
 */
export type ResourceLink = {
    name: string;
    title?: string | null | undefined;
    uri: string;
    description?: string | null | undefined;
    mimeType?: string | null | undefined;
    size?: number | null | undefined;
    icons?: Array<MCPServerIcon> | null | undefined;
    annotations?: Annotations | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    type?: "resource_link" | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ResourceLink$inboundSchema: z.ZodType<ResourceLink, z.ZodTypeDef, unknown>;
export declare function resourceLinkFromJSON(jsonString: string): SafeParseResult<ResourceLink, SDKValidationError>;
//# sourceMappingURL=resourcelink.d.ts.map