/**
 * Constructor options for `SourceLocation`.
 * @public
 */
export interface ISourceLocationOptions {
    /**
     * The project folder URL as defined by the `api-extractor.json` config `projectFolderUrl`
     * setting.
     */
    projectFolderUrl?: string;
    /**
     * The file URL path relative to the `projectFolder` and `projectFolderURL` fields as
     * defined in the `api-extractor.json` config.
     */
    fileUrlPath?: string;
}
/**
 * The source location where a given API item is declared.
 *
 * @remarks
 * The source location points to the `.ts` source file where the API item was originally
   declared. However, in some cases, if source map resolution fails, it falls back to pointing
   to the `.d.ts` file instead.
 *
 * @public
 */
export declare class SourceLocation {
    private readonly _projectFolderUrl?;
    private readonly _fileUrlPath?;
    constructor(options: ISourceLocationOptions);
    /**
     * Returns the file URL to the given source location. Returns `undefined` if the file URL
     * cannot be determined.
     */
    get fileUrl(): string | undefined;
}
//# sourceMappingURL=SourceLocation.d.ts.map