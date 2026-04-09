import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { Annotations } from "./annotations.js";
import { BlobResourceContents } from "./blobresourcecontents.js";
import { TextResourceContents } from "./textresourcecontents.js";
export type Resource = TextResourceContents | BlobResourceContents;
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 *
 * @remarks
 *
 * It is up to the client how best to render embedded resources for the benefit
 * of the LLM and/or the user.
 */
export type EmbeddedResource = {
    type?: "resource" | undefined;
    resource: TextResourceContents | BlobResourceContents;
    annotations?: Annotations | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const Resource$inboundSchema: z.ZodType<Resource, z.ZodTypeDef, unknown>;
export declare function resourceFromJSON(jsonString: string): SafeParseResult<Resource, SDKValidationError>;
/** @internal */
export declare const EmbeddedResource$inboundSchema: z.ZodType<EmbeddedResource, z.ZodTypeDef, unknown>;
export declare function embeddedResourceFromJSON(jsonString: string): SafeParseResult<EmbeddedResource, SDKValidationError>;
//# sourceMappingURL=embeddedresource.d.ts.map