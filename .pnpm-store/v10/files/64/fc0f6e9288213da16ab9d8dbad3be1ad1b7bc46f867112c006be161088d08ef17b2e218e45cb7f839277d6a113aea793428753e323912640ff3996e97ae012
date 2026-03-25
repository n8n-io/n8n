import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const GithubRepositoryOutType: {
    readonly Github: "github";
};
export type GithubRepositoryOutType = ClosedEnum<typeof GithubRepositoryOutType>;
export type GithubRepositoryOut = {
    type?: GithubRepositoryOutType | undefined;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight?: number | undefined;
    commitId: string;
};
/** @internal */
export declare const GithubRepositoryOutType$inboundSchema: z.ZodNativeEnum<typeof GithubRepositoryOutType>;
/** @internal */
export declare const GithubRepositoryOutType$outboundSchema: z.ZodNativeEnum<typeof GithubRepositoryOutType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace GithubRepositoryOutType$ {
    /** @deprecated use `GithubRepositoryOutType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Github: "github";
    }>;
    /** @deprecated use `GithubRepositoryOutType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Github: "github";
    }>;
}
/** @internal */
export declare const GithubRepositoryOut$inboundSchema: z.ZodType<GithubRepositoryOut, z.ZodTypeDef, unknown>;
/** @internal */
export type GithubRepositoryOut$Outbound = {
    type: string;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight: number;
    commit_id: string;
};
/** @internal */
export declare const GithubRepositoryOut$outboundSchema: z.ZodType<GithubRepositoryOut$Outbound, z.ZodTypeDef, GithubRepositoryOut>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace GithubRepositoryOut$ {
    /** @deprecated use `GithubRepositoryOut$inboundSchema` instead. */
    const inboundSchema: z.ZodType<GithubRepositoryOut, z.ZodTypeDef, unknown>;
    /** @deprecated use `GithubRepositoryOut$outboundSchema` instead. */
    const outboundSchema: z.ZodType<GithubRepositoryOut$Outbound, z.ZodTypeDef, GithubRepositoryOut>;
    /** @deprecated use `GithubRepositoryOut$Outbound` instead. */
    type Outbound = GithubRepositoryOut$Outbound;
}
export declare function githubRepositoryOutToJSON(githubRepositoryOut: GithubRepositoryOut): string;
export declare function githubRepositoryOutFromJSON(jsonString: string): SafeParseResult<GithubRepositoryOut, SDKValidationError>;
//# sourceMappingURL=githubrepositoryout.d.ts.map