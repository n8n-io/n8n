export declare class PathCache {
    useCache: boolean;
    existsCache: Map<string, boolean>;
    absoluteCache: Map<string, string>;
    fileExtensions: string[];
    constructor(useCache: boolean, fileExtensions?: string[]);
    existsResolvedAlias(path: string): boolean;
    getAbsoluteAliasPath(basePath: string, aliasPath: string): string;
    private getCacheKey;
    private getAAP;
    private exists;
}
