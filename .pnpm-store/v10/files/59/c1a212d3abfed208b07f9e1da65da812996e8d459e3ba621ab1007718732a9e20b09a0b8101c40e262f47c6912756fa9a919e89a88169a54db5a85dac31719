import { Request, RequestHandler } from "express";
import { Readable } from "stream";

declare global {
    namespace Express {
        namespace Multer {
            /** Object containing file metadata and access information. */
            interface File {
                /** Name of the form field associated with this file. */
                fieldname: string;
                /** Name of the file on the uploader's computer. */
                originalname: string;
                /**
                 * Value of the `Content-Transfer-Encoding` header for this file.
                 * @deprecated since July 2015
                 * @see RFC 7578, Section 4.7
                 */
                encoding: string;
                /** Value of the `Content-Type` header for this file. */
                mimetype: string;
                /** Size of the file in bytes. */
                size: number;
                /**
                 * A readable stream of this file. Only available to the `_handleFile`
                 * callback for custom `StorageEngine`s.
                 */
                stream: Readable;
                /** `DiskStorage` only: Directory to which this file has been uploaded. */
                destination: string;
                /** `DiskStorage` only: Name of this file within `destination`. */
                filename: string;
                /** `DiskStorage` only: Full path to the uploaded file. */
                path: string;
                /** `MemoryStorage` only: A Buffer containing the entire file. */
                buffer: Buffer;
            }
        }

        interface Request {
            /** `Multer.File` object populated by `single()` middleware. */
            file?: Multer.File | undefined;
            /**
             * Array or dictionary of `Multer.File` object populated by `array()`,
             * `fields()`, and `any()` middleware.
             */
            files?:
                | {
                    [fieldname: string]: Multer.File[];
                }
                | Multer.File[]
                | undefined;
        }
    }
}

/**
 * Returns a Multer instance that provides several methods for generating
 * middleware that process files uploaded in `multipart/form-data` format.
 *
 * The `StorageEngine` specified in `storage` will be used to store files. If
 * `storage` is not set and `dest` is, files will be stored in `dest` on the
 * local file system with random names. If neither are set, files will be stored
 * in memory.
 *
 * In addition to files, all generated middleware process all text fields in
 * the request. For each non-file field, the `Request.body` object will be
 * populated with an entry mapping the field name to its string value, or array
 * of string values if multiple fields share the same name.
 */
declare function multer(options?: multer.Options): multer.Multer;

declare namespace multer {
    /**
     * @see {@link https://github.com/expressjs/multer#api}
     */
    interface Multer {
        /**
         * Returns middleware that processes a single file associated with the
         * given form field.
         *
         * The `Request` object will be populated with a `file` object containing
         * information about the processed file.
         *
         * @param fieldName Name of the multipart form field to process.
         */
        single(fieldName: string): RequestHandler;
        /**
         * Returns middleware that processes multiple files sharing the same field
         * name.
         *
         * The `Request` object will be populated with a `files` array containing
         * an information object for each processed file.
         *
         * @param fieldName Shared name of the multipart form fields to process.
         * @param maxCount Optional. Maximum number of files to process. (default: Infinity)
         * @throws `MulterError('LIMIT_UNEXPECTED_FILE')` if more than `maxCount` files are associated with `fieldName`
         */
        array(fieldName: string, maxCount?: number): RequestHandler;
        /**
         * Returns middleware that processes multiple files associated with the
         * given form fields.
         *
         * The `Request` object will be populated with a `files` object which
         * maps each field name to an array of the associated file information
         * objects.
         *
         * @param fields Array of `Field` objects describing multipart form fields to process.
         * @throws `MulterError('LIMIT_UNEXPECTED_FILE')` if more than `maxCount` files are associated with `fieldName` for any field.
         */
        fields(fields: readonly Field[]): RequestHandler;
        /**
         * Returns middleware that processes all files contained in the multipart
         * request.
         *
         * The `Request` object will be populated with a `files` array containing
         * an information object for each processed file.
         */
        any(): RequestHandler;
        /**
         * Returns middleware that accepts only non-file multipart form fields.
         *
         * @throws `MulterError('LIMIT_UNEXPECTED_FILE')` if any file is encountered.
         */
        none(): RequestHandler;
    }

    /**
     * Returns a `StorageEngine` implementation configured to store files on
     * the local file system.
     *
     * A string or function may be specified to determine the destination
     * directory, and a function to determine filenames. If no options are set,
     * files will be stored in the system's temporary directory with random 32
     * character filenames.
     */
    function diskStorage(options: DiskStorageOptions): StorageEngine;

    /**
     * Returns a `StorageEngine` implementation configured to store files in
     * memory as `Buffer` objects.
     */
    function memoryStorage(): StorageEngine;

    type ErrorCode =
        | "LIMIT_PART_COUNT"
        | "LIMIT_FILE_SIZE"
        | "LIMIT_FILE_COUNT"
        | "LIMIT_FIELD_KEY"
        | "LIMIT_FIELD_VALUE"
        | "LIMIT_FIELD_COUNT"
        | "LIMIT_UNEXPECTED_FILE";

    class MulterError extends Error {
        constructor(code: ErrorCode, field?: string);
        /** Name of the MulterError constructor. */
        name: string;
        /** Identifying error code. */
        code: ErrorCode;
        /** Descriptive error message. */
        message: string;
        /** Name of the multipart form field associated with this error. */
        field?: string | undefined;
    }

    /**
     * a function to control which files should be uploaded and which should be skipped
     * pass a boolean to indicate if the file should be accepted
     * pass an error if something goes wrong
     */
    interface FileFilterCallback {
        (error: Error): void;
        (error: null, acceptFile: boolean): void;
    }

    /** Options for initializing a Multer instance. */
    interface Options {
        /**
         * A `StorageEngine` responsible for processing files uploaded via Multer.
         * Takes precedence over `dest`.
         */
        storage?: StorageEngine | undefined;
        /**
         * The destination directory for uploaded files. If `storage` is not set
         * and `dest` is, Multer will create a `DiskStorage` instance configured
         * to store files at `dest` with random filenames.
         *
         * Ignored if `storage` is set.
         */
        dest?: string | undefined;
        /**
         * An object specifying various limits on incoming data. This object is
         * passed to Busboy directly, and the details of properties can be found
         * at https://github.com/mscdex/busboy#busboy-methods.
         */
        limits?: {
            /** Maximum size of each form field name in bytes. (Default: 100) */
            fieldNameSize?: number | undefined;
            /** Maximum size of each form field value in bytes. (Default: 1048576) */
            fieldSize?: number | undefined;
            /** Maximum number of non-file form fields. (Default: Infinity) */
            fields?: number | undefined;
            /** Maximum size of each file in bytes. (Default: Infinity) */
            fileSize?: number | undefined;
            /** Maximum number of file fields. (Default: Infinity) */
            files?: number | undefined;
            /** Maximum number of parts (non-file fields + files). (Default: Infinity) */
            parts?: number | undefined;
            /** Maximum number of headers. (Default: 2000) */
            headerPairs?: number | undefined;
        } | undefined;
        /** Preserve the full path of the original filename rather than the basename. (Default: false) */
        preservePath?: boolean | undefined;
        /**
         * Optional function to control which files are uploaded. This is called
         * for every file that is processed.
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param callback  a function to control which files should be uploaded and which should be skipped.
         */
        fileFilter?(
            req: Request,
            file: Express.Multer.File,
            callback: FileFilterCallback,
        ): void;
    }

    /**
     * Implementations of this interface are responsible for storing files
     * encountered by Multer and returning information on how to access them
     * once stored. Implementations must also provide a method for removing
     * files in the event that an error occurs.
     */
    interface StorageEngine {
        /**
         * Store the file described by `file`, then invoke the callback with
         * information about the stored file.
         *
         * File contents are available as a stream via `file.stream`. Information
         * passed to the callback will be merged with `file` for subsequent
         * middleware.
         *
         * @param req The Express `Request` object.
         * @param file Object with `stream`, `fieldname`, `originalname`, `encoding`, and `mimetype` defined.
         * @param callback Callback to specify file information.
         */
        _handleFile(
            req: Request,
            file: Express.Multer.File,
            callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
        ): void;
        /**
         * Remove the file described by `file`, then invoke the callback with.
         *
         * `file` contains all the properties available to `_handleFile`, as
         * well as those returned by `_handleFile`.
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param callback Callback to indicate completion.
         */
        _removeFile(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null) => void,
        ): void;
    }

    interface DiskStorageOptions {
        /**
         * A string or function that determines the destination path for uploaded
         * files. If a string is passed and the directory does not exist, Multer
         * attempts to create it recursively. If neither a string or a function
         * is passed, the destination defaults to `os.tmpdir()`.
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param callback Callback to determine the destination path.
         */
        destination?:
            | string
            | ((
                req: Request,
                file: Express.Multer.File,
                callback: (error: Error | null, destination: string) => void,
            ) => void)
            | undefined;
        /**
         * A function that determines the name of the uploaded file. If nothing
         * is passed, Multer will generate a 32 character pseudorandom hex string
         * with no extension.
         *
         * @param req The Express `Request` object.
         * @param file Object containing information about the processed file.
         * @param callback Callback to determine the name of the uploaded file.
         */
        filename?(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, filename: string) => void,
        ): void;
    }

    /**
     * An object describing a field name and the maximum number of files with
     * that field name to accept.
     */
    interface Field {
        /** The field name. */
        name: string;
        /** Optional maximum number of files per field to accept. (Default: Infinity) */
        maxCount?: number | undefined;
    }
}

export = multer;
