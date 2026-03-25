import type ts from 'typescript';
export interface ISourceLocation {
    /**
     * The absolute path to the source file.
     */
    sourceFilePath: string;
    /**
     * The line number in the source file. The first line number is 1.
     */
    sourceFileLine: number;
    /**
     * The column number in the source file. The first column number is 1.
     */
    sourceFileColumn: number;
}
export interface IGetSourceLocationOptions {
    /**
     * The source file to get the source location from.
     */
    sourceFile: ts.SourceFile;
    /**
     * The position within the source file to get the source location from.
     */
    pos: number;
    /**
     * If `false` or not provided, then we attempt to follow source maps in order to resolve the
     * location to the original `.ts` file. If resolution isn't possible for some reason, we fall
     * back to the `.d.ts` location.
     *
     * If `true`, then we don't bother following source maps, and the location refers to the `.d.ts`
     * location.
     */
    useDtsLocation?: boolean;
}
export declare class SourceMapper {
    private _sourceMapByFilePath;
    private _originalFileInfoByPath;
    /**
     * Given a `.d.ts` source file and a specific position within the file, return the corresponding
     * `ISourceLocation`.
     */
    getSourceLocation(options: IGetSourceLocationOptions): ISourceLocation;
    private _getMappedSourceLocation;
    private _getSourceMap;
    private static _findNearestMappingItem;
    private static _compareMappingItem;
}
//# sourceMappingURL=SourceMapper.d.ts.map