// Type definitions for ssh2 v0.5.x
// Project: https://github.com/mscdex/ssh2
// Definitions by: Qubo <https://github.com/tkQubo>
//                 Ron Buckton <https://github.com/rbuckton>
//                 Will Boyce <https://github.com/wrboyce>
//                 Lucas Motta <https://github.com/lucasmotta>
//                 Tom Xu <https://github.com/hengkx>
//                 Leo Toneff <https://github.com/bragle>
//                 Lucian Buzzo <https://github.com/LucianBuzzo>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import * as stream from "stream";
import * as events from "events";
import * as net from "net";

import {
    utils as streamsUtils,
    Algorithms,
    Header,
    Prompt,
    SFTPStream,
    InputAttributes,
    Attributes,
    Stats,
    TransferOptions,
    ReadFileOptions,
    WriteFileOptions,
    ReadStreamOptions,
    WriteStreamOptions,
    FileEntry,
    ParsedKey,
} from "ssh2-streams";

export import SFTP_STATUS_CODE = SFTPStream.STATUS_CODE;
export import SFTP_OPEN_MODE = SFTPStream.OPEN_MODE;

export namespace utils {
    let parseKey: typeof streamsUtils['parseKey'];
    namespace sftp {
        const STATUS_CODE: typeof SFTP_STATUS_CODE;
        const OPEN_MODE: typeof SFTP_OPEN_MODE;

        function stringToFlags(str: string): number | null;
        function flagsToString(flags: number): string | null;
    }
}

export interface Channel extends stream.Duplex {
    /** If `true` only sends `EOF` when `end()` is called. */
    allowHalfOpen: boolean;
    /** Standard input for the Channel. */
    stdin: this;
    /** Standard output for the Channel. */
    stdout: this;
    /** Standard error for the Channel. */
    stderr: stream.Readable | stream.Writable;
    /** Indicates whether this is a server or client channel. */
    server: boolean;
    /** The channel type, usually "session". */
    type: string | undefined;
    /** The channel subtype, usually "exec", "shell", or undefined. */
    subtype: string | undefined;

    /**
     * Sends EOF to the remote side.
     *
     * Returns false if you should wait for the continue event before sending any more traffic.
     */
    eof(): boolean;

    /**
     * Closes the channel on both sides.
     *
     * Returns false if you should wait for the continue event before sending any more traffic.
     */
    close(): boolean;

    /**
     * Shuts down the channel on this side.
     */
    destroy(): this;
}

export interface ClientChannel extends Channel {
    /** Standard error for the Channel. */
    stderr: stream.Readable;
    /** Indicates whether this is a server or client channel. */
    server: false;

    /**
     * Lets the server know that the local terminal window has been resized.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    setWindow(rows: number, cols: number, height: number, width: number): boolean;

    /**
     * Sends a POSIX signal to the current process on the server. Valid signal names are:
     * 'ABRT', 'ALRM', 'FPE', 'HUP', 'ILL', 'INT', 'KILL', 'PIPE', 'QUIT', 'SEGV', 'TERM',
     * 'USR1', and 'USR2'.
     *
     * Some server implementations may ignore this request if they do not support signals.
     *
     * Note: If you are trying to send SIGINT and you find `signal()` doesn't work, try writing
     * `'\x03'` to the Channel stream instead.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    signal(signalName: string): boolean;

    /**
     * Emitted once the channel is completely closed on both the client and the server.
     */
    on(event: "close", listener: () => void): this;

    /**
     * An `exit` event *may* (the SSH2 spec says it is optional) be emitted when the process
     * finishes. If the process finished normally, the process's return value is passed to
     * the `exit` callback.
     */
    on(event: "exit", listener: (exitCode: number | null, signalName?: string, didCoreDump?: boolean, description?: string) => void): this;

    on(event: string | symbol, listener: Function): this;
}

export interface ServerChannel extends Channel {
    /** Standard error for the Channel. */
    stderr: stream.Writable;
    /** Indicates whether this is a server or client channel. */
    server: true;

    /**
     * Sends an exit status code to the client.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exit(exitCode: number): boolean;

    /**
     * Sends an exit signal to the client.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exit(name: string, coreDumped: boolean, msg: string): boolean;

    /**
     * Emitted once the channel is completely closed on both the client and the server.
     */
    on(event: "close", listener: () => void): this;

    on(event: string | symbol, listener: Function): this;
}

export class Client extends events.EventEmitter {
    // Client-events

    /**
     * Emitted when a notice was sent by the server upon connection.
     */
    on(event: "banner", listener: (message: string) => void): this;

    /**
     * Emitted when authentication was successful.
     */
    on(event: "ready", listener: () => void): this;

    /**
     * Emitted when an incoming forwarded TCP connection is being requested.
     *
     * Calling `accept()` accepts the connection and returns a `Channel` object.
     * Calling `reject()` rejects the connection and no further action is needed.
     */
    on(event: "tcp connection", listener: (details: TcpConnectionDetails, accept: () => ClientChannel, reject: () => void) => void): this;

    /**
     * Emitted when an incoming X11 connection is being requested.
     *
     * Calling `accept()` accepts the connection and returns a `Channel` object.
     * Calling `reject()` rejects the connection and no further action is needed.
     */
    on(event: "x11", listener: (details: X11Details, accept: () => ClientChannel, reject: () => void) => void): this;

    /**
     * Emitted when the server is asking for replies to the given `prompts` for keyboard-
     * interactive user authentication.
     *
     * * `name` is generally what you'd use as a window title (for GUI apps).
     * * `prompts` is an array of `Prompt` objects.
     *
     * The answers for all prompts must be provided as an array of strings and passed to
     * `finish` when you are ready to continue.
     *
     * NOTE: It's possible for the server to come back and ask more questions.
     */
    on(event: "keyboard-interactive", listener: (name: string, instructions: string, lang: string, prompts: Prompt[], finish: (responses: string[]) => void) => void): this;

    /**
     * Emitted when the server has requested that the user's password be changed, if using
     * password-based user authentication.
     *
     * Call `done` with the new password.
     */
    on(event: "change password", listener: (message: string, lang: string, done: (password: string) => void) => void): this;

    /**
     * Emitted when more requests/data can be sent to the server (after a `Client` method
     * returned `false`).
     */
    on(event: "continue", listener: () => void): this;

    /**
     * Emitted when an error occurred.
     */
    on(event: "error", listener: (err: Error & ClientErrorExtensions) => void): this;

    /**
     * Emitted when the socket was disconnected.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the socket was closed.
     */
    on(event: "close", listener: (hadError: boolean) => void): this;

    /**
     * Emitted when the socket has timed out.
     */
    on(event: "timeout", listener: () => void): this;

    /**
     * Emitted when the socket has connected.
     */
    on(event: "connect", listener: () => void): this;

    /**
     * Emitted when the server responds with a greeting message.
     */
    on(event: "greeting", listener: (greeting: string) => void): this;

    on(event: string | symbol, listener: Function): this;

    // Client-methods

    /**
     * Creates and returns a new Client instance.
     */
    constructor();

    /**
     * Attempts a connection to a server.
     */
    connect(config: ConnectConfig): this;

    /**
     * Executes a command on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param command The command to execute.
     * @param options Options for the command.
     * @param callback The callback to execute when the command has completed.
     */
    exec(command: string, options: ExecOptions, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Executes a command on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param command The command to execute.
     * @param callback The callback to execute when the command has completed.
     */
    exec(command: string, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Starts an interactive shell session on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param window Either an object containing containing pseudo-tty settings, `false` to suppress creation of a pseudo-tty.
     * @param options Options for the command.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(window: PseudoTtyOptions | false, options: ShellOptions, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Starts an interactive shell session on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param window Either an object containing containing pseudo-tty settings, `false` to suppress creation of a pseudo-tty.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(window: PseudoTtyOptions | false, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Starts an interactive shell session on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param options Options for the command.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(options: ShellOptions, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Starts an interactive shell session on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param callback The callback to execute when the channel has been created.
     */
    shell(callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Bind to `remoteAddr` on `remotePort` on the server and forward incoming TCP connections.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param remoteAddr The remote address to bind on the server. The following lists several special values for `remoteAddr` and their respective bindings:
     *
     *   | address       | description
     *   |:--------------|:-----------
     *   | `''`          | Listen on all protocol families supported by the server
     *   | `'0.0.0.0'`   | Listen on all IPv4 addresses
     *   | `'::'`        | Listen on all IPv6 addresses
     *   | `'localhost'` | Listen on the loopback interface for all protocol families
     *   | `'127.0.0.1'` | Listen on the loopback interfaces for IPv4
     *   | `'::1'`       | Listen on the loopback interfaces for IPv6
     *
     * @param remotePort The remote port to bind on the server. If this value is `0`, the actual bound port is provided to `callback`.
     * @param callback An optional callback that is invoked when the remote address is bound.
     */
    forwardIn(remoteAddr: string, remotePort: number, callback?: (err: Error | undefined, bindPort: number) => void): boolean;

    /**
     * Unbind from `remoteAddr` on `remotePort` on the server and stop forwarding incoming TCP
     * connections. Until `callback` is called, more connections may still come in.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param remoteAddr The remote address to unbind on the server.
     * @param remotePort The remote port to unbind on the server.
     * @param callback An optional callback that is invoked when the remote address is unbound.
     */
    unforwardIn(remoteAddr: string, remotePort: number, callback?: (err: Error | undefined) => void): boolean;

    /**
     * Open a connection with `srcIP` and `srcPort` as the originating address and port and
     * `dstIP` and `dstPort` as the remote destination address and port.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param srcIP The originating address.
     * @param srcPort The originating port.
     * @param dstIP The destination address.
     * @param dstPort The destination port.
     * @param callback The callback that is invoked when the address is bound.
     */
    forwardOut(srcIP: string, srcPort: number, dstIP: string, dstPort: number, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Starts an SFTP session.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param callback The callback that is invoked when the SFTP session has started.
     */
    sftp(callback: (err: Error | undefined, sftp: SFTPWrapper) => void): boolean;

    /**
     * Invokes `subsystem` on the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param subsystem The subsystem to start on the server.
     * @param callback The callback that is invoked when the subsystem has started.
     */
    subsys(subsystem: string, callback: (err: Error | undefined, channel: ClientChannel) => void): boolean;

    /**
     * Disconnects the socket.
     */
    end(): void;

    /**
     * Destroys the socket.
     */
    destroy(): void;

    /**
     * OpenSSH extension that sends a request to reject any new sessions (e.g. exec, shell,
     * sftp, subsys) for this connection.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_noMoreSessions(callback?: (err: Error | undefined) => void): boolean;

    /**
     * OpenSSH extension that binds to a UNIX domain socket at `socketPath` on the server and
     * forwards incoming connections.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_forwardInStreamLocal(socketPath: string, callback?: (err: Error | undefined) => void): boolean;

    /**
     * OpenSSH extension that unbinds from a UNIX domain socket at `socketPath` on the server
     * and stops forwarding incoming connections.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_unforwardInStreamLocal(socketPath: string, callback?: (err: Error | undefined) => void): boolean;

    /**
     * OpenSSH extension that opens a connection to a UNIX domain socket at `socketPath` on
     * the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_forwardOutStreamLocal(socketPath: string, callback?: (err: Error | undefined, channel: ClientChannel) => void): boolean;
}

export interface ConnectConfig {
    /** Hostname or IP address of the server. */
    host?: string | undefined;
    /** Port number of the server. */
    port?: number | undefined;
    /** Only connect via resolved IPv4 address for `host`. */
    forceIPv4?: boolean | undefined;
    /** Only connect via resolved IPv6 address for `host`. */
    forceIPv6?: boolean | undefined;
    /** The host's key is hashed using this method and passed to `hostVerifier`. */
    hostHash?: "md5" | "sha1" | undefined;
    /** Verifies a hexadecimal hash of the host's key. */
    hostVerifier?: ((keyHash: string, callback: (verified: boolean) => void) => boolean | void) | undefined;
    /** Username for authentication. */
    username?: string | undefined;
    /** Password for password-based user authentication. */
    password?: string | undefined;
    /** Path to ssh-agent's UNIX socket for ssh-agent-based user authentication (or 'pageant' when using Pagent on Windows). */
    agent?: BaseAgent | string | undefined;
    /** Buffer or string that contains a private key for either key-based or hostbased user authentication (OpenSSH format). */
    privateKey?: Buffer | string | undefined;
    /** For an encrypted private key, this is the passphrase used to decrypt it. */
    passphrase?: string | undefined;
    /** Along with `localUsername` and `privateKey`, set this to a non-empty string for hostbased user authentication. */
    localHostname?: string | undefined;
    /** Along with `localHostname` and `privateKey`, set this to a non-empty string for hostbased user authentication. */
    localUsername?: string | undefined;
    /** Try keyboard-interactive user authentication if primary user authentication method fails. */
    tryKeyboard?: boolean | undefined;
    /** How often (in milliseconds) to send SSH-level keepalive packets to the server. Set to 0 to disable. */
    keepaliveInterval?: number | undefined;
    /** How many consecutive, unanswered SSH-level keepalive packets that can be sent to the server before disconnection. */
    keepaliveCountMax?: number | undefined;
    /** * How long (in milliseconds) to wait for the SSH handshake to complete. */
    readyTimeout?: number | undefined;
    /** Performs a strict server vendor check before sending vendor-specific requests. */
    strictVendor?: boolean | undefined;
    /** A `ReadableStream` to use for communicating with the server instead of creating and using a new TCP connection (useful for connection hopping). */
    sock?: NodeJS.ReadableStream | undefined;
    /** Set to `true` to use OpenSSH agent forwarding (`auth-agent@openssh.com`) for the life of the connection. */
    agentForward?: boolean | undefined;
    /** Explicit overrides for the default transport layer algorithms used for the connection. */
    algorithms?: Algorithms | undefined;
    /** Compression settings: true (prefer), false (never), 'force' (require) */
    compress?: boolean | 'force' | undefined;
    /** A function that receives a single string argument to get detailed (local) debug information. */
    debug?: ((information: string) => any) | undefined;
    /** Function with parameters (methodsLeft, partialSuccess, callback) where methodsLeft and partialSuccess are null on the first authentication attempt, otherwise are an array and boolean respectively. Return or call callback() with the name of the authentication method to try next (pass false to signal no more methods to try). Valid method names are: 'none', 'password', 'publickey', 'agent', 'keyboard-interactive', 'hostbased'. Default: function that follows a set method order: None -> Password -> Private Key -> Agent (-> keyboard-interactive if tryKeyboard is true) -> Hostbased. */
    // dtslint incorrectly thinks that void is not part of the return type on the next line
    // tslint:disable-next-line:void-return
    authHandler?: (methodsLeft: Array<string> | null, partialSuccess: boolean | null, callback: (nextAuth: AuthHandlerResult) => void) => (AuthHandlerResult | void);
}

/**
 * Return value or callback value from the {@link ConnectConfig.authHandler}.
 * Should be the next authentication method to try (either by name or complete
 * options) or false if there are no more methods to try.
 */
export type AuthHandlerResult = AnyAuthMethod | AnyAuthMethod['type'] | false;

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect without authentication.
 */
export interface NoAuthMethod {
    type: 'none';
    username: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with a password.
 */
export interface PasswordAuthMethod {
    type: 'password';
    username: string;
    password: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with a public key.
 */
export interface PublicKeyAuthMethod {
    type: 'publickey';
    username: string;
    /**
     * Can be a string, Buffer, or parsed key containing a private key
     */
    key: string | Buffer | ParsedKey;
    /**
     * `passphrase` only required for encrypted keys
     */
    passphrase?: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with host-based authentication.
 */
export interface HostBasedAuthMethod {
    type: 'hostbased';
    username: string;
    localUsername: string;
    localPassword: string;
    /**
     * Can be a string, Buffer, or parsed key containing a private key
     */
    key: string | Buffer | ParsedKey;
    /**
     * `passphrase` only required for encrypted keys
     */
    passphrase?: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with an agent.
 */
export interface AgentAuthMethod {
    type: 'agent';
    username: string;
    /**
     * Can be a string that is interpreted exactly like the `agent` connection config
     * option or can be a custom agent object/instance that extends and implements `BaseAgent`
     */
    agent: string | BaseAgent;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with an agent.
 */
export interface KeyboardInteractiveAuthMethod {
    type: 'keyboard-interactive';
    username: string;
    /**
     * This works exactly the same way as a 'keyboard-interactive' client event handler
    */
    prompt(name: string, instructions: string, lang: string, prompts: Prompt[], finish: (responses: string[]) => void): void;
}

export type AnyAuthMethod = NoAuthMethod | PasswordAuthMethod | HostBasedAuthMethod | PublicKeyAuthMethod | AgentAuthMethod | KeyboardInteractiveAuthMethod;

export interface TcpConnectionDetails {
    /** The originating IP of the connection. */
    srcIP: string;
    /** The originating port of the connection. */
    srcPort: number;
    /** The remote IP the connection was received on (given in earlier call to `forwardIn()`). */
    destIP: string;
    /** The remote port the connection was received on (given in earlier call to `forwardIn()`). */
    destPort: number;
}

export interface X11Details {
    /** The originating IP of the connection. */
    srcIP: string;
    /** The originating port of the connection. */
    srcPort: number;
}

export interface ClientErrorExtensions {
    /** Indicates 'client-socket' for socket-level errors and 'client-ssh' for SSH disconnection messages. */
    level?: string | undefined;
    /** Additional detail for 'client-ssh' messages. */
    description?: string | undefined;
}

export interface ExecOptions {
    /** An environment to use for the execution of the command. */
    env?: NodeJS.ProcessEnv | undefined;
    /** Set to `true` to allocate a pseudo-tty with defaults, or an object containing specific pseudo-tty settings. */
    pty?: true | PseudoTtyOptions | undefined;
    /** Set either to `true` to use defaults, a number to specify a specific screen number, or an object containing x11 settings. */
    x11?: boolean | number | X11Options | undefined;
}

export interface ShellOptions {
    /** An environment to use for the execution of the shell. */
    env?: NodeJS.ProcessEnv | undefined;
    /** Set either to `true` to use defaults, a number to specify a specific screen number, or an object containing x11 settings. */
    x11?: boolean | number | X11Options | undefined;
}

export interface X11Options {
    /** Whether to allow just a single connection (default: `false`).*/
    single?: boolean | undefined;
    /** The Screen number to use (default: `0`). */
    screen?: number | undefined;
}

export interface PseudoTtyOptions {
    /** The number of rows (default: `24`). */
    rows?: number | undefined;
    /** The number of columns (default: `80`). */
    cols?: number | undefined;
    /** The height in pixels (default: `480`). */
    height?: number | undefined;
    /** The width in pixels (default: `640`). */
    width?: number | undefined;
    /** The value to use for $TERM (default: `'vt100'`) */
    term?: string | undefined;
}

export class Server extends events.EventEmitter {
    static KEEPALIVE_INTERVAL: number;
    static KEEPALIVE_CLIENT_INTERVAL: number;
    static KEEPALIVE_CLIENT_COUNT_MAX: number;

    // Server events

    /**
     * Emitted when a new client has connected.
     */
    on(event: "connection", listener: (client: Connection, info: ClientInfo) => void): this;

    /**
     * Emitted when an error occurs.
     */
    on(event: "error", listener: (err: Error) => void): this;

    /**
     * Emitted when the server has been bound after calling `server.listen()`.
     */
    on(event: "listening", listener: () => void): this;

    /**
     * Emitted when the server closes. Note that if connections exist, this event is not emitted until all connections are ended.
     */
    on(event: "close", listener: () => void): this;

    on(event: string | symbol, listener: Function): this;

    // Server methods

    /**
     * Creates and returns a new Server instance.
     *
     * @param config Server configuration properties.
     * @param connectionListener if supplied, is added as a connection listener.
     */
    constructor(config: ServerConfig, connectionListener?: (client: Connection, info: ClientInfo) => void);

    /**
     * Creates and returns a new Server instance.
     *
     * @param config Server configuration properties.
     * @param connectionListener if supplied, is added as a connection listener.
     */
    static createServer(config: ServerConfig, connectionListener?: (client: Connection, info: ClientInfo) => void): Server;

    /**
     * Start a local socket server listening for connections on the given `path`.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param path A UNIX domain socket path.
     * @param backlog The maximum length of the queue of pending connections.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(path: string, backlog?: number, callback?: () => void): this;

    /**
     * Start a local socket server listening for connections on the given `path`.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param path A UNIX domain socket path.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(path: string, callback?: () => void): this;

    /**
     * This will cause the server to accept connections on the specified handle, but it is
     * presumed that the file descriptor or handle has already been bound to a port or domain
     * socket.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param handle Either a server or socket (anything with an underlying `_handle` member), or an `{fd: number}` object.
     * @param backlog The maximum length of the queue of pending connections.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(handle: net.Server | net.Socket | { fd: number }, backlog?: number, callback?: () => void): this;

    /**
     * This will cause the server to accept connections on the specified handle, but it is
     * presumed that the file descriptor or handle has already been bound to a port or domain
     * socket.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param handle Either a server or socket (anything with an underlying `_handle` member), or an `{fd: number}` object.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(handle: net.Server | net.Socket | { fd: number }, callback?: () => void): this;

    /**
     * This will cause the server to accept connections using the specified options.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param options Connection options.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(options: net.ListenOptions, callback?: () => void): this;

    /**
     * Begin accepting connections on the specified port and hostname.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param port The port on which to start listening. If this value is `undefined` or `0`,
     *          the operating system will define a random port which can be retrieved later
     *          using `server.address().port`.
     * @param hostname The hostname to bind. If `hostname` is omitted, the server will accept
     *          conections on any IPv6 address (`::`) when IPv6 is availble, or any IPv4
     *          address (`0.0.0.0`) otherwise.
     * @param backlog The maximum length of the queue of pending connections.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(port: number, hostname?: string, backlog?: number, callback?: () => void): this;

    /**
     * Begin accepting connections on the specified port and hostname.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param port The port on which to start listening. If this value is `undefined` or `0`,
     *          the operating system will define a random port which can be retrieved later
     *          using `server.address().port`.
     * @param hostname The hostname to bind. If `hostname` is omitted, the server will accept
     *          conections on any IPv6 address (`::`) when IPv6 is availble, or any IPv4
     *          address (`0.0.0.0`) otherwise.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(port: number, hostname?: string, callback?: () => void): this;

    /**
     * Begin accepting connections on the specified port.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param port The port on which to start listening. If this value is `undefined` or `0`,
     *          the operating system will define a random port which can be retrieved later
     *          using `server.address().port`.
     * @param backlog The maximum length of the queue of pending connections.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(port: number, backlog?: number, callback?: () => void): this;

    /**
     * Begin accepting connections on the specified port.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param port The port on which to start listening. If this value is `undefined` or `0`,
     *          the operating system will define a random port which can be retrieved later
     *          using `server.address().port`.
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(port: number, callback?: () => void): this;

    /**
     * Begin accepting connections on a random port.
     *
     * This function is asynchronous. When the server has been bound, `listening` event will be emitted.
     *
     * @param callback An optional callback to add to the `listening` event of the server.
     */
    listen(callback?: () => void): this;

    /**
     * Returns the bound address, the address family name, and port of the server as reported
     * by the operating system.
     */
    address(): { port: number; family: string; address: string; };

    /**
     * Asynchronously get the number of concurrent connections on the server.
     */
    getConnections(callback: (err: Error | undefined, count: number) => void): void;

    /**
     * Stops the server from accepting new connections and keeps existing connections. This
     * function is asynchronous, the server is finally closed when all connections are ended
     * and the server emits a 'close' event.
     *
     * @param callback Optional callback that will be called once the `close` event occurs.
     *      Unlike that event, it will be called with an `Error` as its only argument if the
     *      server was not open when it was closed.
     */
    close(callback?: (err: Error | undefined) => void): this;

    /**
     * Opposite of `unref`, calling `ref` on a previously unrefd server will not let the
     * program exit if it's the only server left (the default behavior). If the server is
     * refd calling `ref` again will have no effect.
     */
    ref(): void;

    /**
     * Calling `unref` on a server will allow the program to exit if this is the only active
     * server in the event system. If the server is already unrefd calling `unref` again
     * will have no effect.
     */
    unref(): void;
}

export interface ServerConfig {
    /** An array of host private keys. */
    hostKeys: (Buffer | string | EncryptedPrivateKey)[];
    /** Explicit overrides for the default transport layer algorithms used for the connection. */
    algorithms?: Algorithms | undefined;
    /** A message that is sent to clients immediately upon connection, before handshaking begins. */
    greeting?: string | undefined
    /** A message that is sent to clients once, right before authentication begins. */
    banner?: string | undefined;
    /** A custom server software name/version identifier. */
    ident?: string | undefined;
    /** This is the highWaterMark to use for the parser stream (default: `32 * 1024`). */
    highWaterMark?: number | undefined;
    /** This is the maximum packet size that will be accepted. It should be 35000 bytes or larger to be compatible with other SSH2 implementations. */
    maxPacketSize?: number | undefined;
    /** A function that receives a single string argument to get detailed (local) debug information. */
    debug?: ((information: string) => any) | undefined;
}

export interface EncryptedPrivateKey {
    /** A Buffer or string that contains a private key. */
    key: Buffer | string;
    /** The passphrase to decrypt a private key. */
    passphrase?: string | undefined;
}

export interface ClientInfo {
    /** The remote address of the connection. */
    ip: string;
    /** Information about the client. */
    header: Header;
}

export interface Connection extends events.EventEmitter {
    // Connection events

    /**
     * Emitted when the client has requested authentication.
     */
    on(event: "authentication", listener: (authCtx: AuthContext) => void): this;

    /**
     * Emitted when the client has been successfully authenticated.
     */
    on(event: "ready", listener: () => void): this;

    /**
     * Emitted when the client has requested a new session.
     * Sessions are used to start interactive shells, execute commands, request X11 forwarding, etc.
     */
    on(event: "session", listener: (accept: () => Session, reject: () => boolean) => void): this;

    /**
     * Emitted when the client has requested an outbound (TCP) connection.
     */
    on(event: "tcpip", listener: (accept: () => ServerChannel, reject: () => boolean, info: TcpipRequestInfo) => void): this;

    /**
     * Emitted when the client has requested a connection to a UNIX domain socket.
     */
    on(event: "openssh.streamlocal", listener: (accept: () => ServerChannel, reject: () => boolean, info: SocketRequestInfo) => void): this;

    /**
     * Emitted when the client has sent a global request for name.
     * If info.bindPort === 0, you should pass the chosen port to accept so that the client will know what port was bound.
     */
    on(event: "request", listener: (accept: ((chosenPort?: number) => void) | undefined, reject: (() => void) | undefined, name: "tcpip-forward" | "cancel-tcpip-forward", info: TcpipBindInfo) => void): this;

    /**
     * Emitted when the client has sent a global request for name.
     */
    on(event: "request", listener: (accept: (() => void) | undefined, reject: () => void, name: "streamlocal-forward@openssh.com" | "cancel-streamlocal-forward@openssh.com", info: SocketBindInfo) => void): this;

    /**
     * Emitted when the client has sent a global request for name.
     * If info.bindPort === 0, you should pass the chosen port to accept so that the client will know what port was bound.
     */
    on(event: "request", listener: (accept: ((chosenPort?: number) => void) | undefined, reject: (() => void) | undefined, name: string, info: TcpipBindInfo | SocketBindInfo) => void): this;

    /**
     * Emitted when the client has finished rekeying (either client or server initiated).
     */
    on(event: "rekey", listener: () => void): this;

    /**
     * Emitted when more requests/data can be sent to the client (after a Connection method returned false).
     */
    on(event: "continue", listener: () => void): this;

    /**
     * Emitted when an error occurrs.
     */
    on(event: "error", listener: (err: Error) => void): this;

    /**
     * Emitted when the socket has disconnected.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the client socket was closed.
     */
    on(event: "close", listener: (hadError: boolean) => void): this;

    on(event: string | symbol, listener: Function): this;

    noMoreSessions: boolean;
    authenticated: boolean;

    // Connection methods

    /**
     * Closes the client connection.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    end(): boolean;

    /**
     * Alert the client of an incoming X11 client connection from `originAddr` on port `originPort`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    x11(originAddr: string, originPort: number, callback: (err: Error | undefined, channel: ServerChannel) => void): boolean;

    /**
     * Alert the client of an incoming TCP connection on `boundAddr` on port `boundPort` from
     * `remoteAddr` on port `remotePort`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    forwardOut(boundAddr: string, boundPort: number, remoteAddr: string, remotePort: number, callback: (err: Error | undefined, channel: ServerChannel) => void): boolean;

    /**
     * Initiates a rekeying with the client.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param callback An optional callback added as a one-time handler for the `rekey` event.
     */
    rekey(callback?: (err: Error | undefined) => void): boolean;

    /**
     * Alert the client of an incoming UNIX domain socket connection on socketPath.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_forwardOutStreamLocal(socketPath: string, callback: (err: Error, channel: ServerChannel) => void): boolean;
}

export interface AuthContextBase extends events.EventEmitter {
    /** The client's username. */
    username: string;
    /** The service requesting authentication. */
    service: string;
    /** The method of authentication. */
    method: string;

    /**
     * Accepts the authentication request.
     */
    accept(): void;

    /**
     * Rejects the authentication request.
     */
    reject(): void;

    /**
     * Rejects the authentication request.
     */
    reject(isPartialSuccess: boolean): void;

    /**
     * Rejects the authentication request.
     */
    reject(authMethodsLeft?: string[], isPartialSuccess?: boolean): void;

    /**
     * Emitted when the client aborts the authentication request.
     */
    on(event: "abort", listener: () => void): this;

    on(event: string | symbol, listener: Function): this;
}

export interface KeyboardAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "keyboard-interactive";

    /** A list of preferred authentication "sub-methods" sent by the client. */
    submethods: string[];

    /**
     * Send prompts to the client.
     * @param prompts The prompts to send to the client.
     * @param callback A callback to call with the responses from the client.
     */
    prompt(prompts: string | Prompt | (string | Prompt)[], callback: () => void): void;

    /**
     * Send prompts to the client.
     * @param prompts The prompts to send to the client.
     * @param title The title for the prompt.
     * @param callback A callback to call with the responses from the client.
     */
    prompt(prompts: string | Prompt | (string | Prompt)[], title: string, callback: () => void): void;

    /**
     * Send prompts to the client.
     * @param prompts The prompts to send to the client.
     * @param title The title for the prompt.
     * @param instructions Instructions for the client.
     * @param callback A callback to call with the responses from the client.
     */
    prompt(prompts: string | Prompt | (string | Prompt)[], title: string, instructions: string, callback: () => void): void;
}

export interface PublicKeyAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "publickey";
    /** The public key sent by the client. */
    key: PublicKey;
    /** The signature to verify, or `undefined` if the client is only checking the validity of the key. */
    signature: Buffer | undefined;
    /** The signature algorithm, or `undefined` if the client is only checking the validity of the key. */
    sigAlgo: string;
    /** The data used to verify the key, or `undefined` if the client is only checking the validity of the key. */
    blob: Buffer;
}

export interface PublicKey {
    /** The name of the key algorithm. */
    algo: string;
    /** The actual key data. */
    data: Buffer;
}

export interface HostbasedAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "hostbased";
    /** The public key sent by the client. */
    key: PublicKey;
    /** The signature to verify, or `undefined` if the client is only checking the validity of the key. */
    signature: Buffer | undefined;
    /** The signature algorithm, or `undefined` if the client is only checking the validity of the key. */
    sigAlgo: string;
    /** The data used to verify the key, or `undefined` if the client is only checking the validity of the key. */
    blob: Buffer;
    /** The local hostname of the client. */
    localHostname: string;
    /** The local username of the client. */
    localUsername: string;
}

export interface PasswordAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "password";
    /** The password sent by the client. */
    password: string;
}

export interface NoneAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "none";
}

export type AuthContext = KeyboardAuthContext | PublicKeyAuthContext | HostbasedAuthContext | PasswordAuthContext | NoneAuthContext;

export interface TcpipRequestInfo {
    /** Source IP address of outgoing connection. */
    srcIP: string;
    /** Source port of outgoing connection. */
    srcPort: number;
    /** Destination IP address of outgoing connection. */
    destIP: string;
    /** Destination port of outgoing connection. */
    destPort: number;
}

export interface SocketRequestInfo {
    /** Destination socket path of outgoing connection. */
    socketPath: string;
}

export interface TcpipBindInfo {
    /** The IP address to start/stop binding to. */
    bindAddr: string;
    /** The port to start/stop binding to. */
    bindPort: number;
}

export interface SocketBindInfo {
    /** The socket path to start/stop binding to. */
    socketPath: string;
}

export type SessionAcceptReject = (() => boolean) | undefined

export interface Session extends events.EventEmitter {
    // Session events

    /**
     * Emitted when the client requested allocation of a pseudo-TTY for this session.
     */
    on(event: "pty", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject, info: PseudoTtyInfo) => void): this;

    /**
     * Emitted when the client reported a change in window dimensions during this session.
     */
    on(event: "window-change", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject, info: WindowChangeInfo) => void): this;

    /**
     * Emitted when the client requested X11 forwarding.
     */
    on(event: "x11", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject, info: X11Info) => void): this;

    /**
     * Emitted when the client requested an environment variable to be set for this session.
     */
    on(event: "env", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject, info: SetEnvInfo) => void): this;

    /**
     * Emitted when the client has sent a POSIX signal.
     */
    on(event: "signal", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject, info: SignalInfo) => void): this;

    /**
     * Emitted when the client has requested incoming ssh-agent requests be forwarded to them.
     */
    on(event: "auth-agent", listener: (accept: SessionAcceptReject, reject: SessionAcceptReject) => void): this;

    /**
     * Emitted when the client has requested an interactive shell.
     */
    on(event: "shell", listener: (accept: () => ServerChannel, reject: SessionAcceptReject) => void): this;

    /**
     * Emitted when the client has requested execution of a command string.
     */
    on(event: "exec", listener: (accept: () => ServerChannel, reject: SessionAcceptReject, info: ExecInfo) => void): this;

    /**
     * Emitted when the client has requested the SFTP subsystem.
     */
    on(event: "sftp", listener: (accept: () => SFTPStream, reject: SessionAcceptReject) => void): this;

    /**
     * Emitted when the client has requested an arbitrary subsystem.
     */
    on(event: "subsystem", listener: (accept: () => ServerChannel, reject: SessionAcceptReject, info: SubsystemInfo) => void): this;

    /**
     * Emitted when the session has closed.
     */
    on(event: "close", listener: () => void): this;

    on(event: string | symbol, listener: Function): this;
}

export interface PseudoTtyInfo {
    /** The number of columns for the pseudo-TTY. */
    cols: number;
    /** The number of rows for the pseudo-TTY. */
    rows: number;
    /** The width of the pseudo-TTY in pixels. */
    width: number;
    /** The height of the pseudo-TTY in pixels. */
    height: number;
    /** Contains the requested terminal modes of the pseudo-TTY. */
    modes: TerminalModes;
}

export interface TerminalModes {
    [mode: string]: number | undefined;
    /** Interrupt character; `255` if none. Not all of these characters are supported on all systems. */
    VINTR?: number | undefined;
    /** The quit character (sends `SIGQUIT` signal on POSIX systems). */
    VQUIT?: number | undefined;
    /** Erase the character to left of the cursor. */
    VERASE?: number | undefined;
    /** Kill the current input line. */
    VKILL?: number | undefined;
    /** End-of-file character (sends `EOF` from the terminal). */
    VEOF?: number | undefined;
    /** End-of-line character in addition to carriage return and/or linefeed. */
    VEOL?: number | undefined;
    /** Additional end-of-line character. */
    VEOL2?: number | undefined;
    /** Continues paused output (normally control-Q). */
    VSTART?: number | undefined;
    /** Pauses output (normally control-S). */
    VSTOP?: number | undefined;
    /** Suspends the current program. */
    VSUSP?: number | undefined;
    /** Another suspend character. */
    VDSUSP?: number | undefined;
    /** Reprints the current input line. */
    VREPRINT?: number | undefined;
    /** Erases a word left of cursor. */
    VWERASE?: number | undefined;
    /** Enter the next character typed literally, even if it is a special character */
    VLNEXT?: number | undefined;
    /** Character to flush output. */
    VFLUSH?: number | undefined;
    /** Switch to a different shell layer. */
    VSWTCH?: number | undefined;
    /** Prints system status line (load, command, pid, etc). */
    VSTATUS?: number | undefined;
    /** Toggles the flushing of terminal output. */
    VDISCARD?: number | undefined;
    /** The ignore parity flag.  The parameter SHOULD be `0` if this flag is FALSE, and `1` if it is TRUE. */
    IGNPAR?: 0 | 1 | undefined;
    /** Mark parity and framing errors. */
    PARMRK?: 0 | 1 | undefined;
    /** Enable checking of parity errors. */
    INPCK?: 0 | 1 | undefined;
    /** Strip 8th bit off characters. */
    ISTRIP?: 0 | 1 | undefined;
    /** Map NL into CR on input. */
    INLCR?: 0 | 1 | undefined;
    /** Ignore CR on input. */
    IGNCR?: 0 | 1 | undefined;
    /** Map CR to NL on input. */
    ICRNL?: 0 | 1 | undefined;
    /** Translate uppercase characters to lowercase. */
    IUCLC?: 0 | 1 | undefined;
    /** Enable output flow control. */
    IXON?: 0 | 1 | undefined;
    /** Any char will restart after stop. */
    IXANY?: 0 | 1 | undefined;
    /** Enable input flow control. */
    IXOFF?: 0 | 1 | undefined;
    /** Ring bell on input queue full. */
    IMAXBEL?: 0 | 1 | undefined;
    /** Enable signals INTR, QUIT, [D]SUSP. */
    ISIG?: 0 | 1 | undefined;
    /** Canonicalize input lines. */
    ICANON?: 0 | 1 | undefined;
    /** Enable input and output of uppercase characters by preceding their lowercase equivalents with `\`. */
    XCASE?: 0 | 1 | undefined;
    /** Enable echoing. */
    ECHO?: 0 | 1 | undefined;
    /** Visually erase chars. */
    ECHOE?: 0 | 1 | undefined;
    /** Kill character discards current line. */
    ECHOK?: 0 | 1 | undefined;
    /** Echo NL even if ECHO is off. */
    ECHONL?: 0 | 1 | undefined;
    /** Don't flush after interrupt. */
    NOFLSH?: 0 | 1 | undefined;
    /** Stop background jobs from output. */
    TOSTOP?: 0 | 1 | undefined;
    /** Enable extensions. */
    IEXTEN?: 0 | 1 | undefined;
    /** Echo control characters as ^(Char). */
    ECHOCTL?: 0 | 1 | undefined;
    /** Visual erase for line kill. */
    ECHOKE?: 0 | 1 | undefined;
    /** Retype pending input. */
    PENDIN?: 0 | 1 | undefined;
    /** Enable output processing. */
    OPOST?: 0 | 1 | undefined;
    /** Convert lowercase to uppercase. */
    OLCUC?: 0 | 1 | undefined;
    /** Map NL to CR-NL. */
    ONLCR?: 0 | 1 | undefined;
    /** Translate carriage return to newline (output). */
    OCRNL?: 0 | 1 | undefined;
    /** Translate newline to carriage return-newline (output). */
    ONOCR?: 0 | 1 | undefined;
    /** Newline performs a carriage return (output). */
    ONLRET?: 0 | 1 | undefined;
    /** 7 bit mode. */
    CS7?: 0 | 1 | undefined;
    /** 8 bit mode. */
    CS8?: 0 | 1 | undefined;
    /** Parity enable. */
    PARENB?: 0 | 1 | undefined;
    /** Odd parity, else even. */
    PARODD?: 0 | 1 | undefined;
    /** Specifies the input baud rate in bits per second. */
    TTY_OP_ISPEED?: number | undefined;
    /** Specifies the output baud rate in bits per second. */
    TTY_OP_OSPEED?: number | undefined;
}

export interface WindowChangeInfo {
    /** The number of columns for the pseudo-TTY. */
    cols: number;
    /** The number of rows for the pseudo-TTY. */
    rows: number;
    /** The width of the pseudo-TTY in pixels. */
    width: number;
    /** The height of the pseudo-TTY in pixels. */
    height: number;
}

export interface X11Info {
    /** true if only a single connection should be forwarded. */
    single: boolean;
    /** The name of the X11 authentication method used. */
    protocol: string;
    /** The X11 authentication cookie encoded in hexadecimal. */
    cookie: string;
    /** The screen number for which to forward X11 connections. */
    screen: number;
}

export interface SetEnvInfo {
    /** The environment variable's name. */
    key: string;
    /** The environment variable's value. */
    value: string;
}

export interface SignalInfo {
    /** The signal name (e.g. SIGUSR1). */
    name: string;
}

export interface ExecInfo {
    /** The command line to be executed. */
    command: string;
}

export interface SubsystemInfo {
    /** The name of the subsystem. */
    name: string;
}

export interface SFTPWrapper extends events.EventEmitter {
    /**
     * (Client-only)
     * Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput.
     */
    fastGet(remotePath: string, localPath: string, options: TransferOptions, callback: (err: any) => void): void;

    /**
     * (Client-only)
     * Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput.
     */
    fastGet(remotePath: string, localPath: string, callback: (err: any) => void): void;

    /**
     * (Client-only)
     * Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput.
     */
    fastPut(localPath: string, remotePath: string, options: TransferOptions, callback: (err: any) => void): void;

    /**
     * (Client-only)
     * Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput.
     */
    fastPut(localPath: string, remotePath: string, callback: (err: any) => void): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, options: ReadFileOptions, callback: (err: any, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, encoding: string, callback: (err: any, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, callback: (err: any, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Returns a new readable stream for `path`.
     */
    createReadStream(path: string, options?: ReadStreamOptions): stream.Readable;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, options: WriteFileOptions, callback?: (err: any) => void): void;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, encoding: string, callback?: (err: any) => void): void;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, callback?: (err: any) => void): void;

    /**
     * (Client-only)
     * Returns a new writable stream for `path`.
     */
    createWriteStream(path: string, options?: WriteStreamOptions): stream.Writable;

    /**
     * (Client-only)
     * Opens a file `filename` for `mode` with optional `attributes`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    open(filename: string, mode: string, attributes: InputAttributes, callback: (err: any, handle: Buffer) => void): boolean;

    /**
     * (Client-only)
     * Opens a file `filename` for `mode`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    open(filename: string, mode: string, callback: (err: any, handle: Buffer) => void): boolean;

    /**
     * (Client-only)
     * Closes the resource associated with `handle` given by `open()` or `opendir()`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    close(handle: Buffer, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Reads `length` bytes from the resource associated with `handle` starting at `position`
     * and stores the bytes in `buffer` starting at `offset`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    read(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: (err: any, bytesRead: number, buffer: Buffer, position: number) => void): boolean;

    /**
     * (Client-only)
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    write(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Retrieves attributes for the resource associated with `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    fstat(handle: Buffer, callback: (err: any, stats: Stats) => void): boolean;

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for the resource associated with `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    fsetstat(handle: Buffer, attributes: InputAttributes, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the access time and modified time for the resource associated with `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    futimes(handle: Buffer, atime: number | Date, mtime: number | Date, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the owner for the resource associated with `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    fchown(handle: Buffer, uid: number, gid: number, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the mode for the resource associated with `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    fchmod(handle: Buffer, mode: number | string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Opens a directory `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    opendir(path: string, callback: (err: any, handle: Buffer) => void): boolean;

    /**
     * (Client-only)
     * Retrieves a directory listing.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    readdir(location: string | Buffer, callback: (err: any, list: FileEntry[]) => void): boolean;

    /**
     * (Client-only)
     * Removes the file/symlink at `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    unlink(path: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Renames/moves `srcPath` to `destPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    rename(srcPath: string, destPath: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Creates a new directory `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    mkdir(path: string, attributes: InputAttributes, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Creates a new directory `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    mkdir(path: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Removes the directory at `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    rmdir(path: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Retrieves attributes for `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    stat(path: string, callback: (err: any, stats: Stats) => void): boolean;

    /**
     * (Client-only)
     * `path` exists.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exists(path: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Retrieves attributes for `path`. If `path` is a symlink, the link itself is stat'ed
     * instead of the resource it refers to.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    lstat(path: string, callback: (err: any, stats: Stats) => void): boolean;

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    setstat(path: string, attributes: InputAttributes, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the access time and modified time for `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    utimes(path: string, atime: number | Date, mtime: number | Date, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the owner for `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    chown(path: string, uid: number, gid: number, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Sets the mode for `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    chmod(path: string, mode: number | string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Retrieves the target for a symlink at `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    readlink(path: string, callback: (err: any, target: string) => void): boolean;

    /**
     * (Client-only)
     * Creates a symlink at `linkPath` to `targetPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    symlink(targetPath: string, linkPath: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only)
     * Resolves `path` to an absolute path.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    realpath(path: string, callback: (err: any, absPath: string) => void): boolean;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX rename(3) from `srcPath` to `destPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ext_openssh_rename(srcPath: string, destPath: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX statvfs(2) on `path`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ext_openssh_statvfs(path: string, callback: (err: any, fsInfo: any) => void): boolean;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fstatvfs(2) on open handle `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ext_openssh_fstatvfs(handle: Buffer, callback: (err: any, fsInfo: any) => void): boolean;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX link(2) to create a hard link to `targetPath` at `linkPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ext_openssh_hardlink(targetPath: string, linkPath: string, callback: (err: any) => void): boolean;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fsync(3) on the open handle `handle`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ext_openssh_fsync(handle: Buffer, callback: (err: any, fsInfo: any) => void): boolean;

    /**
     * Ends the stream.
     */
    end(): void;

    /**
     * Emitted when an error occurred.
     */
    on(event: "error", listener: (err: any) => void): this;

    /**
     * Emitted when the session has ended.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the session has closed.
     */
    on(event: "close", listener: () => void): this;

    /**
     * Emitted when more requests/data can be sent to the stream.
     */
    on(event: "continue", listener: () => void): this;

    on(event: string | symbol, listener: Function): this;
}

/**
 * Interface representing an inbound agent request. This is defined as an
 * "opaque type" in the ssh2 documentation, and should only be used
 * for correlation, not introspected.
 */
export interface AgentInboundRequest {
    __opaque_type: never
}

/**
 * Options passed to {@link BaseAgent.sign} and AgentProtocol methods.
 */
export interface SigningRequestOptions {
    hash?: 'sha256' | 'sha512';
}

export class AgentProtocol extends stream.Duplex {
    /**
     * Creates and returns a new AgentProtocol instance. `isClient` determines
     * whether the instance operates in client or server mode.
     */
    constructor(isClient: boolean);

    /**
     * (Server mode only)
     * Replies to the given `request` with a failure response.
     */
    failureReply(request: AgentInboundRequest): void;

    /**
     * (Client mode only)
     * Requests a list of public keys from the agent. `callback` is passed
     * `(err, keys)` where `keys` is a possible array of public keys for
     * authentication.
     */
     getIdentities(callback: (err: Error | undefined, publicKeys?: ParsedKey[]) => void): void;

     /**
      * (Server mode only)
      * Responds to a identities list `request` with the given array of keys in `keys`.
      */
     getIdentitiesReply(request: AgentInboundRequest, keys: ParsedKey[]): void;

    /**
     * (Client mode only)
     * Signs the datawith the given public key, and calls back with its signature.
     * Note that, in the current implementation, "options" is always an empty object.
     */
     sign(publicKey: ParsedKey, data: Buffer, options: SigningRequestOptions, callback: (err: Error | undefined, signature?: Buffer) => void): void;

     /**
      * (Server mode only)
      * Responds to a sign `request` with the given signature in `signature`.
      */
     signReply(request: AgentInboundRequest, signature: Buffer): void;

    /**
     * (Server mode only)
     * The client has requested a list of public keys stored in the agent.
     * Use `failureReply()` or `getIdentitiesReply()` to reply appropriately.
     */
    on(event: "identities", listener: (request: AgentInboundRequest) => void): this;

    /**
     * (Server mode only)
     * The client has requested `data` to be signed using the key identified
     * by `pubKey`. Use `failureReply()` or `signReply()` to reply appropriately.
     */
    on(event: "sign", listener: (publicKey: ParsedKey, data: Buffer, options: SigningRequestOptions) => void): this;

    on(event: string | symbol, listener: Function): this;
}

/**
 * Creates and returns a new agent instance using the same logic as the
 * `Client`'s `agent` configuration option: if the platform is Windows and
 * it's the value "pageant", it creates a `PageantAgent`, otherwise if it's not
 * a path to a Windows pipe it creates a `CygwinAgent`. In all other cases,
 * it creates an `OpenSSHAgent`.
 */
export function createAgent(agentValue: string): BaseAgent;

/**
 * Base agent that you can use to create a custom SSH agent. `TKey` is the
 * parsed or parsable public key your class retrieves, and is invoked with.
 * If a string or a buffer, you can pass it to `utils.parseKey()`
 */
export abstract class BaseAgent<TPublicKey extends string | Buffer | ParsedKey = string | Buffer | ParsedKey> {
    /**
     * Retrieves user identities, where `keys` is a possible array of public
     * keys for authentication.
     */
     abstract getIdentities(callback: (err: Error | undefined, publicKeys?: TPublicKey[]) => void): void;

    /**
     * Signs the datawith the given public key, and calls back with its signature.
     * Note that, in the current implementation, "options" is always an empty object.
     */
    abstract sign(publicKey: TPublicKey, data: Buffer, options: SigningRequestOptions, callback: (err: Error | undefined, signature?: Buffer) => void): void;

    /**
     * Optional method that may be implemented to support agent forwarding. Callback
     * should be invoked with a Duplex stream to be used to communicate with your agent/
     * You will probably want to utilize `AgentProtocol` as agent forwarding is an
     * OpenSSH feature, so the `stream` needs to be able to
     * transmit/receive OpenSSH agent protocol packets.
     */
    getStream?(callback: (err: Error | undefined, stream: stream.Duplex) => void): void;
}

/**
 * Communicates with an OpenSSH agent listening on the UNIX socket at `socketPath`.
 */
export class OpenSSHAgent extends BaseAgent<ParsedKey> {
    constructor(socketPath: string);

    /** @inheritdoc */
    getIdentities(callback: (err: Error | undefined, publicKeys?: ParsedKey[]) => void): void;

    /** @inheritdoc */
    sign(publicKey: ParsedKey, data: Buffer, options: SigningRequestOptions, callback: (err: Error | undefined, signature?: Buffer) => void): void;

    /** @inheritdoc */
    getStream(callback: (err: Error | undefined, stream: stream.Duplex) => void): void;
}

/**
 * Communicates with an agent listening at `socketPath` in a Cygwin environment.
 */
export class CygwinAgent extends OpenSSHAgent {
    constructor(socketPath: string)
}

/**
 * Creates a new agent instance for communicating with a running Pageant agent process.
 */
export class PageantAgent extends OpenSSHAgent {
    constructor(socketPath: string)
}
