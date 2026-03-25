/// <reference types="node" />

import * as FS from "fs";
import { Constants } from "./util";

declare class AdmZip {
    /**
     * @param fileNameOrRawData If provided, reads an existing archive. Otherwise creates a new, empty archive.
     * @param options Options when initializing the ZIP file
     */
    constructor(fileNameOrRawData?: string | Buffer, options?: Partial<AdmZip.InitOptions>);
    /**
     * Extracts the given entry from the archive and returns the content as a Buffer object
     * @param entry ZipEntry object or String with the full path of the entry
     * @param pass Password used for decrypting the file
     * @return Buffer or Null in case of error
     */
    readFile(entry: string | AdmZip.IZipEntry, pass?: string | Buffer): Buffer | null;
    /**
     * Asynchronous `readFile`.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param callback Called with a `Buffer` or `null` in case of error.
     */
    readFileAsync(entry: string | AdmZip.IZipEntry, callback: (data: Buffer | null, err: string) => void): void;
    /**
     * Extracts the given entry from the archive and returns the content as
     * plain text in the given encoding.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param encoding If no encoding is specified `"utf8"` is used.
     */
    readAsText(fileName: string | AdmZip.IZipEntry, encoding?: string): string;
    /**
     * Asynchronous `readAsText`.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param callback Called with the resulting string.
     * @param encoding If no encoding is specified `"utf8"` is used.
     */
    readAsTextAsync(
        fileName: string | AdmZip.IZipEntry,
        callback: (data: string, err: string) => void,
        encoding?: string,
    ): void;
    /**
     * Remove the entry from the file or the entry and all its nested directories
     * and files if the given entry is a directory.
     * @param entry The full path of the entry or a `IZipEntry` object.
     */
    deleteFile(entry: string | AdmZip.IZipEntry): void;
    /**
     * Adds a comment to the zip. The zip must be rewritten after
     * adding the comment.
     * @param comment Content of the comment.
     */
    addZipComment(comment: string): void;
    /**
     * @return The zip comment.
     */
    getZipComment(): string;
    /**
     * Adds a comment to a specified file or `IZipEntry`. The zip must be rewritten after
     * adding the comment.
     * The comment cannot exceed 65535 characters in length.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param comment The comment to add to the entry.
     */
    addZipEntryComment(entry: string | AdmZip.IZipEntry, comment: string): void;
    /**
     * Returns the comment of the specified entry.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @return The comment of the specified entry.
     */
    getZipEntryComment(entry: string | AdmZip.IZipEntry): string;
    /**
     * Updates the content of an existing entry inside the archive. The zip
     * must be rewritten after updating the content.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param content The entry's new contents.
     */
    updateFile(entry: string | AdmZip.IZipEntry, content: Buffer): void;
    /**
     * Adds a file from the disk to the archive.
     * @param localPath Path to a file on disk.
     * @param zipPath Path to a directory in the archive. Defaults to the empty
     *   string.
     * @param zipName Name for the file.
     * @param comment Comment to be attached to the file
     */
    addLocalFile(localPath: string, zipPath?: string, zipName?: string, comment?: string): void;
    /**
     * Adds a local directory and all its nested files and directories to the
     * archive.
     * @param localPath Path to a folder on disk.
     * @param zipPath Path to a folder in the archive. Default: `""`.
     * @param filter RegExp or Function if files match will be included.
     */
    addLocalFolder(localPath: string, zipPath?: string, filter?: RegExp | ((filename: string) => boolean)): void;
    /**
     * Asynchronous addLocalFile
     * @param localPath
     * @param callback
     * @param zipPath optional path inside zip
     * @param filter optional RegExp or Function if files match will
     *    be included.
     */
    addLocalFolderAsync(
        localPath: string,
        callback: (success?: boolean, err?: string) => void,
        zipPath?: string,
        filter?: RegExp | ((filename: string) => boolean),
    ): void;
    /**
     * @param localPath - path where files will be extracted
     * @param props - optional properties
     * @param props.zipPath - optional path inside zip
     * @param props.filter - RegExp or Function if files match will be included.
     */
    addLocalFolderPromise(
        localPath: string,
        props: { zipPath?: string; filter?: RegExp | ((filename: string) => boolean) },
    ): Promise<void>;
    /**
     * Allows you to create a entry (file or directory) in the zip file.
     * If you want to create a directory the `entryName` must end in `"/"` and a `null`
     * buffer should be provided.
     * @param entryName Entry path.
     * @param content Content to add to the entry; must be a 0-length buffer
     *   for a directory.
     * @param comment Comment to add to the entry.
     * @param attr Attribute to add to the entry.
     * @return The entry corresponding to one which was just added.
     */
    addFile(entryName: string, content: Buffer, comment?: string, attr?: number): AdmZip.IZipEntry;
    /**
     * Returns an array of `IZipEntry` objects representing the files and folders
     * inside the archive.
     */
    getEntries(): AdmZip.IZipEntry[];
    /**
     * Returns a `IZipEntry` object representing the file or folder specified by `name`.
     * @param name Name of the file or folder to retrieve.
     * @return The entry corresponding to the `name`.
     */
    getEntry(name: string): AdmZip.IZipEntry | null;
    /**
     * Returns the number of entries in the ZIP
     * @return The amount of entries in the ZIP
     */
    getEntryCount(): number;
    /**
     * Loop through each entry in the ZIP
     * @param callback The callback that receives each individual entry
     */
    forEach(callback: (entry: AdmZip.IZipEntry) => void): void;
    /**
     * Extracts the given entry to the given `targetPath`.
     * If the entry is a directory inside the archive, the entire directory and
     * its subdirectories will be extracted.
     * @param entry The full path of the entry or a `IZipEntry` object.
     * @param targetPath Target folder where to write the file.
     * @param maintainEntryPath If maintainEntryPath is `true` and the entry is
     *   inside a folder, the entry folder will be created in `targetPath` as
     *   well. Default: `true`.
     * @param overwrite If the file already exists at the target path, the file
     *   will be overwriten if this is `true`. Default: `false`.
     * @param keepOriginalPermission The file will be set as the permission from
     *   the entry if this is true. Default: `false`.
     * @param outFileName String If set will override the filename of the
     *   extracted file (Only works if the entry is a file)
     * @return Boolean
     */
    extractEntryTo(
        entryPath: string | AdmZip.IZipEntry,
        targetPath: string,
        maintainEntryPath?: boolean,
        overwrite?: boolean,
        keepOriginalPermission?: boolean,
        outFileName?: string,
    ): boolean;
    /**
     * Test the archive
     * @param password The password for the archive
     */
    test(password?: string | Buffer): boolean;
    /**
     * Extracts the entire archive to the given location.
     * @param targetPath Target location.
     * @param overwrite If the file already exists at the target path, the file
     *   will be overwriten if this is `true`. Default: `false`.
     * @param keepOriginalPermission The file will be set as the permission from
     *   the entry if this is true. Default: `false`.
     * @param password The password for the archive
     */
    extractAllTo(
        targetPath: string,
        overwrite?: boolean,
        keepOriginalPermission?: boolean,
        password?: string | Buffer,
    ): void;
    /**
     * Extracts the entire archive to the given location.
     * @param targetPath Target location.
     * @param overwrite If the file already exists at the target path, the file
     *   will be overwriten if this is `true`. Default: `false`.
     * @param keepOriginalPermission The file will be set as the permission from
     *   the entry if this is true. Default: `false`.
     * @param callback The callback function will be called after extraction.
     */
    extractAllToAsync(
        targetPath: string,
        overwrite?: boolean,
        keepOriginalPermission?: boolean,
        callback?: (error?: Error) => void,
    ): void;
    /**
     * Writes the newly created zip file to disk at the specified location or
     * if a zip was opened and no `targetFileName` is provided, it will
     * overwrite the opened zip.
     */
    writeZip(targetFileName?: string, callback?: (error: Error | null) => void): void;
    /**
     * Writes the newly created zip file to disk at the specified location or
     * if a zip was opened and no `targetFileName` is provided, it will
     * overwrite the opened zip.
     */
    writeZipPromise(targetFileName?: string, props?: { overwrite?: boolean; perm?: number }): Promise<boolean>;
    /**
     * Returns the content of the entire zip file.
     */
    toBuffer(): Buffer;
    /**
     * Asynchronously returns the content of the entire zip file.
     * @param onSuccess called with the content of the zip file, once it has been generated.
     * @param onFail unused.
     * @param onItemStart called before an entry is compressed.
     * @param onItemEnd called after an entry is compressed.
     */
    toBuffer(
        onSuccess: (buffer: Buffer) => void,
        onFail?: (...args: any[]) => void,
        onItemStart?: (name: string) => void,
        onItemEnd?: (name: string) => void,
    ): void;
    /**
     * Asynchronously convert the promise to a Buffer
     */
    toBufferPromise(): Promise<Buffer>;
}

declare namespace AdmZip {
    /**
     * The `IZipEntry` is more than a structure representing the entry inside the
     * zip file. Beside the normal attributes and headers a entry can have, the
     * class contains a reference to the part of the file where the compressed
     * data resides and decompresses it when requested. It also compresses the
     * data and creates the headers required to write in the zip file.
     */
    // disable warning about the I-prefix in interface name to prevent breaking stuff for users without a major bump
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface IZipEntry {
        /**
         * Represents the full name and path of the file
         */
        entryName: string;
        readonly rawEntryName: Buffer;
        /**
         * Extra data associated with this entry.
         */
        extra: Buffer;
        /**
         * Entry comment.
         */
        comment: string;
        readonly name: string;
        /**
         * Read-Only property that indicates the type of the entry.
         */
        readonly isDirectory: boolean;
        /**
         * Get the header associated with this ZipEntry.
         */
        readonly header: EntryHeader;
        attr: number;
        /**
         * Retrieve the compressed data for this entry. Note that this may trigger
         * compression if any properties were modified.
         */
        getCompressedData(): Buffer;
        /**
         * Asynchronously retrieve the compressed data for this entry. Note that
         * this may trigger compression if any properties were modified.
         */
        getCompressedDataAsync(callback: (data: Buffer) => void): void;
        /**
         * Set the (uncompressed) data to be associated with this entry.
         */
        setData(value: string | Buffer): void;
        /**
         * Get the decompressed data associated with this entry.
         */
        getData(): Buffer;
        /**
         * Asynchronously get the decompressed data associated with this entry.
         */
        getDataAsync(callback: (data: Buffer, err: string) => void): void;
        /**
         * Returns the CEN Entry Header to be written to the output zip file, plus
         * the extra data and the entry comment.
         */
        packHeader(): Buffer;
        /**
         * Returns a nicely formatted string with the most important properties of
         * the ZipEntry.
         */
        toString(): string;
    }

    interface EntryHeader {
        made: number;
        version: number;
        flags: number;
        method: number;
        time: Date;
        crc: number;
        compressedSize: number;
        size: number;
        fileNameLength: number;
        extraLength: number;
        commentLength: number;
        diskNumStart: number;
        inAttr: number;
        attr: number;
        offset: number;
        readonly encripted: boolean;
        readonly entryHeaderSize: number;
        readonly realDataOffset: number;
        readonly dataHeader: DataHeader;
        loadDataHeaderFromBinary(data: Buffer): void;
        loadFromBinary(data: Buffer): void;
        dataHeaderToBinary(): Buffer;
        entryHeaderToBinary(): Buffer;
        toString(): string;
    }

    interface DataHeader {
        version: number;
        flags: number;
        method: number;
        time: number;
        crc: number;
        compressedSize: number;
        size: number;
        fnameLen: number;
        extraLen: number;
    }

    interface InitOptions {
        /* If true it disables files sorting */
        noSort: boolean;
        /* Read entries during load (initial loading may be slower) */
        readEntries: boolean;
        /* Read method */
        method: (typeof Constants)[keyof typeof Constants] | number;
        /* file system */
        fs: null | typeof FS;
    }
}

export = AdmZip;
