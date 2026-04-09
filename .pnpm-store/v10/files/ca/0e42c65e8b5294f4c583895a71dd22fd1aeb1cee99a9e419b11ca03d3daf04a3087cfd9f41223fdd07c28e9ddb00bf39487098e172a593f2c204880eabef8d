/// <reference types="node" />
import tls = require("tls");
import events = require("events");

declare namespace Client {
    /**
     * Options for Client#connect()
     */
    export interface Options {
        /**
         * The hostname or IP address of the FTP server. Default: 'localhost'
         */
        host?: string | undefined;
        /**
         * The port of the FTP server. Default: 21
         */
        port?: number | undefined;
        /**
         * Set to true for both control and data connection encryption, 'control' for control connection encryption only, or 'implicit' for
         * implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990) Default: false
         */
        secure?: string | boolean | undefined;
        /**
         * Additional options to be passed to tls.connect(). Default: (none)
         */
        secureOptions?: tls.ConnectionOptions | undefined;
        /**
         * Username for authentication. Default: 'anonymous'
         */
        user?: string | undefined;
        /**
         * Password for authentication. Default: 'anonymous@'
         */
        password?: string | undefined;
        /**
         * How long (in milliseconds) to wait for the control connection to be established. Default: 10000
         */
        connTimeout?: number | undefined;
        /**
         * How long (in milliseconds) to wait for a PASV data connection to be established. Default: 10000
         */
        pasvTimeout?: number | undefined;
        /**
         * How often (in milliseconds) to send a 'dummy' (NOOP) command to keep the connection alive. Default: 10000
         */
        keepalive?: number | undefined;
        /**
         * Debug function to invoke to enable debug logging.
         */
        debug?: ((message: string) => void) | undefined;
    }

    export interface FilePermissions {
        /**
         * An empty string or any combination of 'r', 'w', 'x'.
         */
        user: string;
        /**
         * An empty string or any combination of 'r', 'w', 'x'.
         */
        group: string;
        /**
         * An empty string or any combination of 'r', 'w', 'x'.
         */
        other: string;
    }

    /**
     * Element returned by `Client#list()`
     */
    export interface ListingElement {
        /**
         * A single character denoting the entry type: 'd' for directory, '-' for file (or 'l' for symlink on **\*NIX only**).
         */
        "type": string;
        /**
         * The name of the entry
         */
        name: string;
        /**
         * The size of the entry in bytes
         */
        size: number;
        /**
         * The last modified date of the entry
         */
        date: Date;
        /**
         * The various permissions for this entry **(*NIX only)**
         */
        rights?: Client.FilePermissions | undefined;
        /**
         * The user name or ID that this entry belongs to **(*NIX only)**.
         */
        owner?: string | undefined;
        /**
         * The group name or ID that this entry belongs to **(*NIX only)**.
         */
        group?: string | undefined;
        /**
         * For symlink entries, this is the symlink's target **(*NIX only)**.
         */
        target?: string | undefined;
        /**
         * True if the sticky bit is set for this entry **(*NIX only)**.
         */
        sticky?: boolean | undefined;
    }
}

declare interface Client {
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "greeting", listener: (msg: string) => void): this;
    on(event: "ready", listener: () => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "close", listener: (hadErr: boolean) => void): this;
    on(event: string, listener: () => void): this;
}

/**
 * FTP client.
 *
 * Events:
 * @event greeting(< string >msg) - Emitted after connection. msg is the text the server sent upon connection.
 * @event ready() - Emitted when connection and authentication were sucessful.
 * @event close(< boolean >hadErr) - Emitted when the connection has fully closed.
 * @event end() - Emitted when the connection has ended.
 * @event error(< Error >err) - Emitted when an error occurs. In case of protocol-level errors, err contains
 *                              a 'code' property that references the related 3-digit FTP response code.
 */
declare class Client extends events.EventEmitter {
    /**
     * Creates and returns a new FTP client instance.
     */
    constructor();

    /**
     * Connects to an FTP server.
     */
    connect(config?: Client.Options): void;

    /**
     * Closes the connection to the server after any/all enqueued commands have been executed.
     */
    end(): void;

    /**
     * Closes the connection to the server immediately.
     */
    destroy(): void;

    /**
     * Retrieves the directory listing of path.
     * @param path defaults to the current working directory.
     * @param useCompression defaults to false.
     */
    list(
        path: string,
        useCompression: boolean,
        callback: (error: Error, listing: Client.ListingElement[]) => void,
    ): void;
    list(path: string, callback: (error: Error, listing: Client.ListingElement[]) => void): void;
    list(useCompression: boolean, callback: (error: Error, listing: Client.ListingElement[]) => void): void;
    list(callback: (error: Error, listing: Client.ListingElement[]) => void): void;

    /**
     * Retrieves a file at path from the server. useCompression defaults to false
     */
    get(path: string, callback: (error: Error, stream: NodeJS.ReadableStream) => void): void;
    get(path: string, useCompression: boolean, callback: (error: Error, stream: NodeJS.ReadableStream) => void): void;

    /**
     * Sends data to the server to be stored as destPath.
     * @param input can be a ReadableStream, a Buffer, or a path to a local file.
     * @param destPath
     * @param useCompression defaults to false.
     */
    put(
        input: NodeJS.ReadableStream | Buffer | string,
        destPath: string,
        useCompression: boolean,
        callback: (error: Error) => void,
    ): void;
    put(input: NodeJS.ReadableStream | Buffer | string, destPath: string, callback: (error: Error) => void): void;

    /**
     * Same as put(), except if destPath already exists, it will be appended to instead of overwritten.
     * @param input can be a ReadableStream, a Buffer, or a path to a local file.
     * @param destPath
     * @param useCompression defaults to false.
     */
    append(
        input: NodeJS.ReadableStream | Buffer | string,
        destPath: string,
        useCompression: boolean,
        callback: (error: Error) => void,
    ): void;
    append(input: NodeJS.ReadableStream | Buffer | string, destPath: string, callback: (error: Error) => void): void;

    /**
     * Renames oldPath to newPath on the server
     */
    rename(oldPath: string, newPath: string, callback: (error: Error) => void): void;

    /**
     * Logout the user from the server.
     */
    logout(callback: (error: Error) => void): void;

    /**
     * Delete a file on the server
     */
    delete(path: string, callback: (error: Error) => void): void;

    /**
     * Changes the current working directory to path. callback has 2 parameters: < Error >err, < string >currentDir.
     * Note: currentDir is only given if the server replies with the path in the response text.
     */
    cwd(path: string, callback: (error: Error, currentDir?: string) => void): void;

    /**
     * Aborts the current data transfer (e.g. from get(), put(), or list())
     */
    abort(callback: (error: Error) => void): void;

    /**
     * Sends command (e.g. 'CHMOD 755 foo', 'QUOTA') using SITE. callback has 3 parameters:
     * < Error >err, < _string >responseText, < integer >responseCode.
     */
    site(command: string, callback: (error: Error, responseText: string, responseCode: number) => void): void;

    /**
     * Retrieves human-readable information about the server's status.
     */
    status(callback: (error: Error, status: string) => void): void;

    /**
     * Sets the transfer data type to ASCII.
     */
    ascii(callback: (error: Error) => void): void;

    /**
     * Sets the transfer data type to binary (default at time of connection).
     */
    binary(callback: (error: Error) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Creates a new directory, path, on the server. recursive is for enabling a 'mkdir -p' algorithm and defaults to false
     */
    mkdir(path: string, recursive: boolean, callback: (error: Error) => void): void;
    mkdir(path: string, callback: (error: Error) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Removes a directory, path, on the server. If recursive, this call will delete the contents of the directory if it is not empty
     */
    rmdir(path: string, recursive: boolean, callback: (error: Error) => void): void;
    rmdir(path: string, callback: (error: Error) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Changes the working directory to the parent of the current directory
     */
    cdup(callback: (error: Error) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Retrieves the current working directory
     */
    pwd(callback: (error: Error, path: string) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Retrieves the server's operating system.
     */
    system(callback: (error: Error, OS: string) => void): void;

    /**
     * Optional "standard" commands (RFC 959)
     * Similar to list(), except the directory is temporarily changed to path to retrieve the directory listing.
     * This is useful for servers that do not handle characters like spaces and quotes in directory names well for the LIST command.
     * This function is "optional" because it relies on pwd() being available.
     */
    listSafe(
        path: string,
        useCompression: boolean,
        callback: (error: Error, listing: Client.ListingElement[]) => void,
    ): void;
    listSafe(path: string, callback: (error: Error, listing: Client.ListingElement[]) => void): void;
    listSafe(useCompression: boolean, callback: (error: Error, listing: Client.ListingElement[]) => void): void;
    listSafe(callback: (error: Error, listing: Client.ListingElement[]) => void): void;

    /**
     * Extended commands (RFC 3659)
     * Retrieves the size of path
     */
    size(path: string, callback: (error: Error, size: number) => void): void;

    /**
     * Extended commands (RFC 3659)
     * Retrieves the last modified date and time for path
     */
    lastMod(path: string, callback: (error: Error, lastMod: Date) => void): void;

    /**
     * Extended commands (RFC 3659)
     * Sets the file byte offset for the next file transfer action (get/put) to byteOffset
     */
    restart(byteOffset: number, callback: (error: Error) => void): void;
}

export = Client;
