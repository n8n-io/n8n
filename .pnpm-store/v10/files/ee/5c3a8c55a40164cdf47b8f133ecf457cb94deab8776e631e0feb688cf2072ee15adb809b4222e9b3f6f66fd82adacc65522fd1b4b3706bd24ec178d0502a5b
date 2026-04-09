import { PathCache, TrieNode } from './utils';
export interface ITSCAliasConfig {
    replacers?: ReplacerOptions;
    resolveFullPaths?: boolean;
    verbose?: boolean;
    fileExtensions?: Partial<FileExtensions>;
}
export type PathLike = {
    [key: string]: string[];
};
export type StringReplacer = (importStatement: string) => string;
export interface FileExtensions {
    inputGlob: string;
    outputCheck: string[];
}
export interface ITSConfig {
    baseUrl?: string;
    outDir?: string;
    declarationDir?: string;
    paths?: PathLike;
    replacers?: ReplacerOptions;
    resolveFullPaths?: boolean;
    verbose?: boolean;
    fileExtensions?: Partial<FileExtensions>;
}
export interface IProjectConfig {
    configFile: string;
    baseUrl: string;
    outDir: string;
    configDir: string;
    outPath: string;
    confDirParentFolderName: string;
    hasExtraModule: boolean;
    configDirInOutPath: string;
    relConfDirPathInOutPath: string;
    pathCache: PathCache;
    inputGlob: string;
}
export interface IConfig extends IProjectConfig {
    output: IOutput;
    aliasTrie: TrieNode<Alias>;
    replacers: AliasReplacer[];
}
export interface ReplaceTscAliasPathsOptions {
    configFile?: string;
    outDir?: string;
    declarationDir?: string;
    watch?: boolean;
    verbose?: boolean;
    debug?: boolean;
    resolveFullPaths?: boolean;
    resolveFullExtension?: '.js' | '.mjs' | '.cjs';
    replacers?: string[];
    output?: IOutput;
    aliasTrie?: TrieNode<Alias>;
    fileExtensions?: Partial<FileExtensions>;
}
export interface Alias {
    shouldPrefixMatchWildly: boolean;
    prefix: string;
    paths: AliasPath[];
}
export interface AliasPath {
    basePath: string;
    path: string;
    isExtra: boolean;
}
export interface AliasReplacerArguments {
    orig: string;
    file: string;
    config: IConfig;
}
export type AliasReplacer = (args: AliasReplacerArguments) => string;
export interface ReplacerOptions {
    [key: string]: {
        enabled: boolean;
        file?: string;
    };
}
export interface IOutput {
    verbose: boolean;
    debug: (message: string, obj?: unknown) => void;
    info(message: string): void;
    error(message: string, exitProcess?: boolean): void;
    clear(): void;
    assert(claim: unknown, message: string): void;
}
