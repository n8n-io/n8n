import * as z from "zod/v3";
export type GithubRepositoryIn = {
    type?: "github" | undefined;
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight?: number | undefined;
    token: string;
};
/** @internal */
export type GithubRepositoryIn$Outbound = {
    type: "github";
    name: string;
    owner: string;
    ref?: string | null | undefined;
    weight: number;
    token: string;
};
/** @internal */
export declare const GithubRepositoryIn$outboundSchema: z.ZodType<GithubRepositoryIn$Outbound, z.ZodTypeDef, GithubRepositoryIn>;
export declare function githubRepositoryInToJSON(githubRepositoryIn: GithubRepositoryIn): string;
//# sourceMappingURL=githubrepositoryin.d.ts.map