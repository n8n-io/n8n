/**
 * Utils for managing repository mappings.
 *
 * The majority of this code is ported from [rules_go](https://github.com/bazelbuild/rules_go/pull/3347).
 */
export interface RepoMappings {
    [sourceRepo: string]: {
        [targetRepoApparentName: string]: string;
    };
}
export declare function currentRepository(): string;
export declare function callerRepository(): string;
export declare function callerRepositoryFromStack(skip: number): string;
