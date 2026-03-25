// Type definitions for promise-ftp 1.3
// Project: https://github.com/realtymaps/promise-ftp
// Definitions by: coolreader18 <https://github.com/coolreader18>
//                 Rolands Jegorovs <https://github.com/Rolandisimo>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.2

/// <reference types="node" />

import * as FtpClient from "ftp";
import * as PromiseFtpCommon from "promise-ftp-common";
import * as Promise from "bluebird";

declare namespace PromiseFtp {
    interface ERROR_CODES {
        421: "Service not available, closing control connection";
        425: "Can't open data connection";
        426: "Connection closed, transfer aborted";
        450: "Requested file action not taken / File unavailable (e.g., file busy)";
        451: "Requested action aborted: local error in processing";
        452: "Requested action not taken / Insufficient storage space in system";
        500: "Syntax error / Command unrecognized";
        501: "Syntax error in parameters or arguments";
        502: "Command not implemented";
        503: "Bad sequence of commands";
        504: "Command not implemented for that parameter";
        530: "Not logged in";
        532: "Need account for storing files";
        550: "Requested action not taken / File unavailable (e.g., file not found, no access)";
        551: "Requested action aborted: page type unknown";
        552: "Requested file action aborted / Exceeded storage allocation (for current directory or dataset)";
        553: "Requested action not taken / File name not allowed";
    }
    const ERROR_CODES: ERROR_CODES;
    // tslint:disable-next-line strict-export-declare-modifiers
    export import FtpConnectionError = PromiseFtpCommon.FtpConnectionError;
    // tslint:disable-next-line strict-export-declare-modifiers
    export import FtpReconnectError = PromiseFtpCommon.FtpReconnectError;
    // tslint:disable-next-line strict-export-declare-modifiers
    export import STATUSES = PromiseFtpCommon.STATUSES;

    /**
     * Options for FtpPromise#connect()
     */
    // tslint:disable-next-line strict-export-declare-modifiers
    export import Options = FtpClient.Options;

    /**
     * Element returned by FtpPromise#list()
     */
    // tslint:disable-next-line strict-export-declare-modifiers
    export import ListingElement = FtpClient.ListingElement;
}

declare class PromiseFtp {
    /**
     * The underlying FtpClient instance
     */
    rawClient: FtpClient;

    getConnectionStatus(): PromiseFtpCommon.STATUSES;
    /**
     * Connect to an FTP server.
     */
    connect: (options: PromiseFtp.Options) => Promise<string>;

    /**
     * Reconnect with the same options as previously connected with `#connect()`.
     */
    reconnect: () => Promise<string>;

    /**
     * Close the connection to the server after any/all enqueued
     * commands have been executed.
     * @returns a promise that resolves with the last error recieved if there
     * was an error, true if there was an error but the client didn't recieve it,
     * or false if there was no error.
     */
    end(): Promise<Error | boolean>;

    /**
     * Close the connection to the server immediately.
     */
    destroy(): boolean;

    /**
     * Retrieve the directory listing of path.
     * @param path - defaults to the current working directory.
     * @param useCompression - defaults to false.
     * @returns the contents of the specified directory
     */
    list(path?: string, useCompression?: boolean): Promise<Array<FtpClient.ListingElement | string>>;
    list(useCompression: boolean): Promise<Array<FtpClient.ListingElement | string>>;

    /**
     * Optional "standard" commands (RFC 959)
     * Retrieve the directory listing of path.
     * Similar to `#list()`, except the directory is temporarily changed to path to
     * retrieve the directory listing. This is useful for servers that do not
     * handle characters like spaces and quotes in directory names well for the
     * LIST command. This function is "optional" because it relies on `#pwd()`
     * being available.
     * @param path - defaults to the current working directory.
     * @param useCompression - defaults to false.
     * @returns the contents of the specified directory
     */
    listSafe(
        path?: string,
        useCompression?: boolean
    ): Promise<Array<FtpClient.ListingElement | string>>;
    listSafe(useCompression: boolean): Promise<Array<FtpClient.ListingElement | string>>;

    /**
     * Retrieve a file at path from the server.
     * @param path - the path of the file to get.
     * @param useCompression - defaults to false.
     * @returns a stream which empties to the contents of the specified file.
     */
    get(path: string, useCompression?: boolean): Promise<NodeJS.ReadableStream>;

    /**
     * Send data to the server to be stored as a file.
     * @param input - can be a ReadableStream, a Buffer, or a path to a local file.
     * @param destPath - the path of the file to write to.
     * @param useCompression - defaults to false.
     */
    put(
        input: NodeJS.ReadableStream | Buffer | string,
        destPath: string,
        useCompression?: boolean
    ): Promise<void>;

    /**
     * Create a new file on the server or append to one that already exists.
     * @param input - can be a ReadableStream, a Buffer, or a pathto a local file.
     * @param destPath - the path of the file to create or append to.
     * @param useCompression - defaults to false.
     */
    append(
        input: NodeJS.ReadableStream | Buffer | string,
        destPath: string,
        useCompression?: boolean
    ): Promise<void>;

    /**
     * Rename a file on the server.
     * @param oldPath - the old path of the file.
     * @param newPath - the new path to move it to.
     */
    rename: (oldPath: string, newPath: string) => Promise<void>;

    /**
     * Logout the user from the server.
     */
    logout: () => Promise<void>;

    /**
     * Delete a file on the server.
     */
    delete: (path: string) => Promise<void>;

    /**
     * Change the current working directory.
     * @param cwd - the path to change the CWD to.
     * @returns the current directory if the server replies with the path in the
     * response text, otherwise undefined.
     */
    cwd(path: string): Promise<string | undefined>;

    /**
     * Abort the current data transfer (e.g. from `#get()`, `#put()`, or `#list()`)
     */
    abort(): Promise<void>;

    /**
     * Send command using SITE.
     * @param command - the command to send, e.g 'CHMOD 755 foo' or 'QUOTA'.
     */
    site(command: string): Promise<{ text: string; code: number }>;

    /**
     * Retrieve human-readable information about the server's status.
     * @returns a string with the server's status.
     */
    status: () => Promise<string>;

    /**
     * Set the transfer data type to ASCII.
     */
    ascii(): Promise<void>;

    /**
     * Set the transfer data type to binary (default at time of connection).
     */
    binary(): Promise<void>;

    /**
     * Optional "standard" commands (RFC 959)
     * Create a new directory on the server.
     * @param path - the path of the new directory.
     * @param recursive - enables a `mkdir -p` algorithm, defaults to false.
     */
    mkdir(path: string, recursive?: boolean): Promise<void>;

    /**
     * Optional "standard" commands (RFC 959)
     * Remove a directory on the server.
     * @param path - the path of the directory to remove.
     * @param recursive - enables deleting the directory if not empty, defaults to false.
     */
    rmdir(path: string, recursive?: boolean): Promise<void>;

    /**
     * Optional "standard" commands (RFC 959)
     * Change the working directory to the parent of the current directory.
     * Like `cd ..`.
     */
    cdup(): Promise<void>;

    /**
     * Optional "standard" commands (RFC 959)
     * Retrieve the current working directory.
     */
    pwd(): Promise<string>;

    /**
     * Optional "standard" commands (RFC 959)
     * Retrieve information about the system running the server.
     * @returns the server's OS.
     */
    system(): Promise<string>;

    /**
     * Extended commands (RFC 3659)
     * Retrieve the size of a file on the server.
     * @param path - the path of the file whose size is to be retrieved.
     * @returns the size of the specified file.
     */
    size(path: string): Promise<number>;

    /**
     * Extended commands (RFC 3659)
     * Retrieve the last modified date and time for a file or directory.
     * @param path - the path of the file/directory whose modified date is to
     * be retrieved.
     * @returns the last modified date at the specified path.
     */
    lastMod(path: string): Promise<Date>;

    /**
     * Extended commands (RFC 3659)
     * Set the file byte offset for the next file transfer action (get/put).
     * @param byteOffset - The file byte offset.
     */
    restart(byteOffset: number): Promise<void>;
}

export = PromiseFtp;
