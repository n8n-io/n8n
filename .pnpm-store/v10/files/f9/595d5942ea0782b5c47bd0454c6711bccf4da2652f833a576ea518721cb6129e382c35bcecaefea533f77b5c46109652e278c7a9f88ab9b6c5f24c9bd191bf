import { AliasReplacer, AliasReplacerArguments, IConfig, IOutput, IProjectConfig, ReplaceTscAliasPathsOptions } from './interfaces';
export { ReplaceTscAliasPathsOptions, AliasReplacer, AliasReplacerArguments, IConfig, IProjectConfig, IOutput };
export declare function replaceTscAliasPaths(options?: ReplaceTscAliasPathsOptions): Promise<void>;
export declare type SingleFileReplacer = (input: {
    fileContents: string;
    filePath: string;
}) => string;
export declare function prepareSingleFileReplaceTscAliasPaths(options?: ReplaceTscAliasPathsOptions): Promise<SingleFileReplacer>;
