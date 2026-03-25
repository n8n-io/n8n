/**
 * The format that the FileError message should conform to. The supported formats are:
 *  - Unix: `<path>:<line>:<column> - <message>`
 *  - VisualStudio: `<path>(<line>,<column>) - <message>`
 *
 * @public
 */
export type FileLocationStyle = 'Unix' | 'VisualStudio';
/**
 * Options for {@link Path.formatFileLocation}.
 * @public
 */
export interface IPathFormatFileLocationOptions {
    /**
     * The base path to use when converting `pathToFormat` to a relative path. If not specified,
     * `pathToFormat` will be used as-is.
     */
    baseFolder?: string;
    /**
     * The path that will be used to specify the file location.
     */
    pathToFormat: string;
    /**
     * The message related to the file location.
     */
    message: string;
    /**
     * The style of file location formatting to use.
     */
    format: FileLocationStyle;
    /**
     * The optional line number. If not specified, the line number will not be included
     * in the formatted string.
     */
    line?: number;
    /**
     * The optional column number. If not specified, the column number will not be included
     * in the formatted string.
     */
    column?: number;
}
/**
 * Options for {@link Path.formatConcisely}.
 * @public
 */
export interface IPathFormatConciselyOptions {
    /**
     * The path to be converted.
     */
    pathToConvert: string;
    /**
     * The base path to use when converting `pathToConvert` to a relative path.
     */
    baseFolder: string;
    /**
     * If set to true, don't include the leading `./` if the path is under the base folder.
     */
    trimLeadingDotSlash?: boolean;
}
/**
 * Common operations for manipulating file and directory paths.
 * @remarks
 * This API is intended to eventually be a complete replacement for the NodeJS "path" API.
 * @public
 */
export declare class Path {
    private static _relativePathRegex;
    private static _upwardPathSegmentRegex;
    /**
     * Returns true if "childPath" is located inside the "parentFolderPath" folder
     * or one of its child folders.  Note that "parentFolderPath" is not considered to be
     * under itself.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnder(childPath: string, parentFolderPath: string): boolean;
    /**
     * Returns true if "childPath" is equal to "parentFolderPath", or if it is inside that folder
     * or one of its children.  The "childPath" can refer to any type of file system object.
     *
     * @remarks
     * The indicated file/folder objects are not required to actually exist on disk.
     * For example, "parentFolderPath" is interpreted as a folder name even if it refers to a file.
     * If the paths are relative, they will first be resolved using path.resolve().
     */
    static isUnderOrEqual(childPath: string, parentFolderPath: string): boolean;
    /**
     * Returns true if `path1` and `path2` refer to the same underlying path.
     *
     * @remarks
     *
     * The comparison is performed using `path.relative()`.
     */
    static isEqual(path1: string, path2: string): boolean;
    /**
     * Formats a path to look nice for reporting purposes.
     * @remarks
     * If `pathToConvert` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix
     * unless the {@link IPathFormatConciselyOptions.trimLeadingDotSlash} option is set to `true`.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatConcisely(options: IPathFormatConciselyOptions): string;
    /**
     * Formats a file location to look nice for reporting purposes.
     * @remarks
     * If `pathToFormat` is under the `baseFolder`, then it will be converted to a relative with the `./` prefix.
     * Otherwise, it will be converted to an absolute path.
     *
     * Backslashes will be converted to slashes, unless the path starts with an OS-specific string like `C:\`.
     */
    static formatFileLocation(options: IPathFormatFileLocationOptions): string;
    /**
     * Replaces Windows-style backslashes with POSIX-style slashes.
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToSlashes(inputPath: string): string;
    /**
     * Replaces POSIX-style slashes with Windows-style backslashes
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToBackslashes(inputPath: string): string;
    /**
     * Replaces slashes or backslashes with the appropriate slash for the current operating system.
     */
    static convertToPlatformDefault(inputPath: string): string;
    /**
     * Returns true if the specified path is a relative path and does not use `..` to walk upwards.
     *
     * @example
     * ```ts
     * // These evaluate to true
     * isDownwardRelative('folder');
     * isDownwardRelative('file');
     * isDownwardRelative('folder/');
     * isDownwardRelative('./folder/');
     * isDownwardRelative('./folder/file');
     *
     * // These evaluate to false
     * isDownwardRelative('../folder');
     * isDownwardRelative('folder/../file');
     * isDownwardRelative('/folder/file');
     * ```
     */
    static isDownwardRelative(inputPath: string): boolean;
}
//# sourceMappingURL=Path.d.ts.map