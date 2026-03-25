import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const GithubRepositoryInType: {
    readonly Github: "github";
};
export type GithubRepositoryInType = ClosedEnum<typeof GithubRepositoryInType>;
export type GithubRepositoryIn = {
    type?: GithubRepositoryInType | undefined;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight?: number | undefined;
    token: string;
};
/** @internal */
export declare const GithubRepositoryInType$inboundSchema: z.ZodNativeEnum<typeof GithubRepositoryInType>;
/** @internal */
export declare const GithubRepositoryInType$outboundSchema: z.ZodNativeEnum<typeof GithubRepositoryInType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace GithubRepositoryInType$ {
    /** @deprecated use `GithubRepositoryInType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Github: "github";
    }>;
    /** @deprecated use `GithubRepositoryInType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Github: "github";
    }>;
}
/** @internal */
export declare const GithubRepositoryIn$inboundSchema: z.ZodType<GithubRepositoryIn, z.ZodTypeDef, unknown>;
/** @internal */
export type GithubRepositoryIn$Outbound = {
    type: string;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight: number;
    token: string;
};
/** @internal */
export declare const GithubRepositoryIn$outboundSchema: z.ZodType<GithubRepositoryIn$Outbound, z.ZodTypeDef, GithubRepositoryIn>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace GithubRepositoryIn$ {
    /** @deprecated use `GithubRepositoryIn$inboundSchema` instead. */
    const inboundSchema: z.ZodType<GithubRepositoryIn, z.ZodTypeDef, unknown>;
    /** @deprecated use `GithubRepositoryIn$outboundSchema` instead. */
    const outboundSchema: z.ZodType<GithubRepositoryIn$Outbound, z.ZodTypeDef, GithubRepositoryIn>;
    /** @deprecated use `GithubRepositoryIn$Outbound` instead. */
    type Outbound = GithubRepositoryIn$Outbound;
}
export declare function githubRepositoryInToJSON(githubRepositoryIn: GithubRepositoryIn): string;
export declare function githubRepositoryInFromJSON(jsonString: string): SafeParseResult<GithubRepositoryIn, SDKValidationError>;
//# sourceMappingURL=githubrepositoryin.d.ts.map