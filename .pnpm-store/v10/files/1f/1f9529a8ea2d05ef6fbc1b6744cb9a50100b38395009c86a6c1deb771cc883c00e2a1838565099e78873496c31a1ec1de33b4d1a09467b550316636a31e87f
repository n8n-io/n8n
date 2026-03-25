import { StringReplacer } from '../interfaces';
declare class ImportPathResolver {
    source: string;
    readonly sourcePath: string;
    constructor(source: string, sourcePath: string);
    get sourceDir(): string;
    replaceSourceImportPaths(replacer: StringReplacer): this;
    resolveFullImportPaths(ext?: string): this;
    private resolveFullPath;
    static newStringRegex(): RegExp;
    static newImportStatementRegex(flags?: string): RegExp;
    static resolveFullImportPaths(code: string, path: string, ext?: string): string;
    static replaceSourceImportPaths(code: string, path: string, replacer: StringReplacer): string;
}
export declare const resolveFullImportPaths: typeof ImportPathResolver.resolveFullImportPaths;
export declare const newImportStatementRegex: typeof ImportPathResolver.newImportStatementRegex;
export declare const replaceSourceImportPaths: typeof ImportPathResolver.replaceSourceImportPaths;
export declare const newStringRegex: typeof ImportPathResolver.newStringRegex;
export {};
