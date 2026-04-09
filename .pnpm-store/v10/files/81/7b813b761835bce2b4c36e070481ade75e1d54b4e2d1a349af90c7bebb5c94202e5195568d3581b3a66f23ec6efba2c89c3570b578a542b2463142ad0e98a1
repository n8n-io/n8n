import type { IProblemPattern } from '@rushstack/problem-matcher';
import { type FileLocationStyle } from './Path';
/**
 * Provides options for the creation of a FileError.
 *
 * @public
 */
export interface IFileErrorOptions {
    /**
     * The absolute path to the file that contains the error.
     */
    absolutePath: string;
    /**
     * The root folder for the project that the error is in relation to.
     */
    projectFolder: string;
    /**
     * The line number of the error in the target file. Minimum value is 1.
     */
    line?: number;
    /**
     * The column number of the error in the target file. Minimum value is 1.
     */
    column?: number;
}
/**
 * Provides options for the output message of a file error.
 *
 * @public
 */
export interface IFileErrorFormattingOptions {
    /**
     * The format for the error message. If no format is provided, format 'Unix' is used by default.
     */
    format?: FileLocationStyle;
}
/**
 * An `Error` subclass that should be thrown to report an unexpected state that specifically references
 * a location in a file.
 *
 * @remarks The file path provided to the FileError constructor is expected to exist on disk. FileError
 * should not be used for reporting errors that are not in reference to an existing file.
 *
 * @public
 */
export declare class FileError extends Error {
    /** @internal */
    static _sanitizedEnvironmentVariable: string | undefined;
    /** @internal */
    static _environmentVariableIsAbsolutePath: boolean;
    private static _environmentVariableBasePathFnMap;
    /** {@inheritdoc IFileErrorOptions.absolutePath} */
    readonly absolutePath: string;
    /** {@inheritdoc IFileErrorOptions.projectFolder} */
    readonly projectFolder: string;
    /** {@inheritdoc IFileErrorOptions.line} */
    readonly line: number | undefined;
    /** {@inheritdoc IFileErrorOptions.column} */
    readonly column: number | undefined;
    /**
     * Constructs a new instance of the {@link FileError} class.
     *
     * @param message - A message describing the error.
     * @param options - Options for the error.
     */
    constructor(message: string, options: IFileErrorOptions);
    /**
     * Get the Unix-formatted the error message.
     *
     * @override
     */
    toString(): string;
    /**
     * Get the formatted error message.
     *
     * @param options - Options for the error message format.
     */
    getFormattedErrorMessage(options?: IFileErrorFormattingOptions): string;
    /**
     * Get the problem matcher pattern for parsing error messages.
     *
     * @param options - Options for the error message format.
     * @returns The problem matcher pattern.
     */
    static getProblemMatcher(options?: Pick<IFileErrorFormattingOptions, 'format'>): IProblemPattern;
    private _evaluateBaseFolder;
    static [Symbol.hasInstance](instance: object): boolean;
}
//# sourceMappingURL=FileError.d.ts.map