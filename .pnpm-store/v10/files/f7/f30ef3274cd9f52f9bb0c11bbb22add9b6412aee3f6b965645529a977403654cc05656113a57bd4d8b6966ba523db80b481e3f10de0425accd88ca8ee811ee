import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type GithubRepositoryOut = {
    type?: "github" | undefined;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight: number | undefined;
    commitId: string;
};
/** @internal */
export declare const GithubRepositoryOut$inboundSchema: z.ZodType<GithubRepositoryOut, z.ZodTypeDef, unknown>;
export declare function githubRepositoryOutFromJSON(jsonString: string): SafeParseResult<GithubRepositoryOut, SDKValidationError>;
//# sourceMappingURL=githubrepositoryout.d.ts.map