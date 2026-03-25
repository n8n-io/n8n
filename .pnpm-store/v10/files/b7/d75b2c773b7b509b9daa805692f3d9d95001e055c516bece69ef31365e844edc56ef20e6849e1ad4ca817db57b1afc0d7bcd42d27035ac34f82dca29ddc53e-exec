// Type definitions for ssh2 v1.11
// Project: https://github.com/mscdex/ssh2
// Definitions by: Qubo <https://github.com/tkQubo>
//                 Ron Buckton <https://github.com/rbuckton>
//                 Will Boyce <https://github.com/wrboyce>
//                 Lucas Motta <https://github.com/lucasmotta>
//                 Tom Xu <https://github.com/hengkx>
//                 Leo Toneff <https://github.com/bragle>
//                 Lucian Buzzo <https://github.com/LucianBuzzo>
//                 Dan Hensby <https://github.com/dhensby>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import { Duplex, Writable, Readable, ReadableOptions, WritableOptions } from "stream";
import { EventEmitter } from "events";
import { Socket, Server as NetServer } from "net";
import { Agent as BaseHTTPAgent, AgentOptions } from "http";
import { Agent as BaseHTTPSAgent } from "https";

export interface Prompt {
    prompt: string;
    echo?: boolean;
}

/**
 * Possible Key Exchange Algorithms
 */
export type KexAlgorithm = "curve25519-sha256"
    | "curve25519-sha256@libssh.org"
    | "ecdh-sha2-nistp256"
    | "ecdh-sha2-nistp384"
    | "ecdh-sha2-nistp521"
    | "diffie-hellman-group-exchange-sha256"
    | "diffie-hellman-group14-sha256"
    | "diffie-hellman-group15-sha512"
    | "diffie-hellman-group16-sha512"
    | "diffie-hellman-group17-sha512"
    | "diffie-hellman-group18-sha512"
    | "diffie-hellman-group-exchange-sha1"
    | "diffie-hellman-group14-sha1"
    | "diffie-hellman-group1-sha1";

export type ServerHostKeyAlgorithm = "ssh-ed25519"
    | "ecdsa-sha2-nistp256"
    | "ecdsa-sha2-nistp384"
    | "ecdsa-sha2-nistp521"
    | "rsa-sha2-512"
    | "rsa-sha2-256"
    | "ssh-rsa"
    | "ssh-dss";

export type CompressionAlgorithm = "none" | "zlib" | "zlib@openssh.com";

export type CipherAlgorithm = "chacha20-poly1305@openssh.com"
    | "aes128-gcm"
    | "aes128-gcm@openssh.com"
    | "aes256-gcm"
    | "aes256-gcm@openssh.com"
    | "aes128-ctr"
    | "aes192-ctr"
    | "aes256-ctr"
    | "aes256-cbc"
    | "aes192-cbc"
    | "aes128-cbc"
    | "blowfish-cbc"
    | "3des-cbc"
    | "arcfour256"
    | "arcfour128"
    | "cast128-cbc"
    | "arcfour";

export type MacAlgorithm = "hmac-sha2-256-etm@openssh.com"
    | "hmac-sha2-512-etm@openssh.com"
    | "hmac-sha1-etm@openssh.com"
    | "hmac-sha2-256"
    | "hmac-sha2-512"
    | "hmac-sha1"
    | "hmac-md5"
    | "hmac-sha2-256-96"
    | "hmac-sha2-512-96"
    | "hmac-ripemd160"
    | "hmac-sha1-96"
    | "hmac-md5-96"

/**
 * Lists of supported algorithms can either be an ordered array of all supported algorithms,
 * OR a map of algorithms to manipulate the default list
 */
export type AlgorithmList<T> = T[] | Record<"append" | "prepend" | "remove", T | T[]>;

/**
 * Overrides for the default transport layer algorithms used for the connection.
 *
 * The order of the algorithms in the arrays are important, with the most favorable being first.
 */
export interface Algorithms {
    kex?: AlgorithmList<KexAlgorithm>;
    cipher?: AlgorithmList<CipherAlgorithm>;
    serverHostKey?: AlgorithmList<ServerHostKeyAlgorithm>;
    hmac?: AlgorithmList<MacAlgorithm>;
    compress?: AlgorithmList<CompressionAlgorithm>;
}

export type KeyType = 'ssh-rsa' | 'ssh-dss' | 'ssh-ed25519' | 'ecdsa-sha2-nistp256' | 'ecdsa-sha2-nistp384' | 'ecdsa-sha2-nistp521';

export interface ParsedKey {
    type: KeyType;
    comment: string;
    sign(data: Buffer | string, algo?: string): Buffer;
    verify(data: Buffer | string, signature: Buffer, algo?: string): boolean;
    isPrivateKey(): boolean;
    getPrivatePEM(): string;
    getPublicPEM(): string;
    getPublicSSH(): Buffer;
    equals(key: Buffer | string | ParsedKey): boolean;
}

export interface Versions {
    /**
     * The SSH protocol version supported by the remote party.
     */
    protocol: string;

    /**
     * The software name and version used by the remote party.
     */
    software: string;
}

export interface Header {
    /**
     * The raw identification string sent by the remote party.
     */
    identRaw: string;

    /**
     * Contains various version information parsed from identRaw.
     */
    versions: Versions;

    /**
     * Any text that comes after the software name/version.
     */
    comments: string;

    /**
     * Any greeting sent by the server
     */
    greeting?: string;
}

export type OpenMode = "r" | "r+" | "w" | "wx" | "xw" | "w+" | "xw+" | "a" | "ax" | "xa" | "a+" | "ax+" | "xa+";

export namespace utils {
    function parseKey(data: Buffer | string | ParsedKey, passphrase?: Buffer | string): ParsedKey | Error;
    namespace sftp {
        enum OPEN_MODE {
            READ = 0x00000001,
            WRITE = 0x00000002,
            APPEND = 0x00000004,
            CREAT = 0x00000008,
            TRUNC = 0x00000010,
            EXCL = 0x00000020
        }

        enum STATUS_CODE {
            OK = 0,
            EOF = 1,
            NO_SUCH_FILE = 2,
            PERMISSION_DENIED = 3,
            FAILURE = 4,
            BAD_MESSAGE = 5,
            NO_CONNECTION = 6,
            CONNECTION_LOST = 7,
            OP_UNSUPPORTED = 8
        }

        function stringToFlags(str: OpenMode): number | null;
        function flagsToString(flags: number): OpenMode | null;
    }
}

export type ChannelType = "session" | "sftp" | "direct-tcpip" | "direct-streamlocal@openssh.com";

export type ChannelSubType = "exec" | "shell";

export interface Channel extends Duplex {
    /** Standard input for the Channel. */
    stdin: this;
    /** Standard output for the Channel. */
    stdout: this;
    /** Standard error for the Channel. */
    stderr: Writable | Readable;
    /** Indicates whether this is a server or client channel. */
    server: boolean;
    /** The channel type, usually "session". */
    type: ChannelType;
    /** The channel subtype, usually "exec", "shell", or undefined. */
    subtype?: ChannelSubType;
    incoming: unknown;
    outgoing: unknown;

    /**
     * Sends EOF to the remote side.
     */
    eof(): void;

    /**
     * Closes the channel on both sides.
     */
    close(...args: any[]): void;

    /**
     * Shuts down the channel on this side.
     */
    destroy(): this;

    /**
     * Session type-specific methods
     */
    setWindow(rows: string, cols: string, height: string, width: string): void;
    signal(signalName: string): void;
    exit(status: number): void;
    exit(signalName: string, coreDumped?: boolean, msg?: string): void;

    /**
     * Emitted once the channel is completely closed on both the client and the server.
     */
    on(event: "close", listener: () => void): this;
    on(event: "eof", listener: () => void): this;
    on(event: "end", listener: () => void): this;
    on(event: string | symbol, listener: Function): this;
}

export interface ClientChannel extends Channel {
    /** Standard error for the Channel. */
    stderr: Readable;
    /** Indicates whether this is a server or client channel. */
    server: false;

    /**
     * An `exit` event *may* (the SSH2 spec says it is optional) be emitted when the process
     * finishes. If the process finished normally, the process's return value is passed to
     * the `exit` callback.
     */
    on(event: "exit", listener: (code: string) => void): this;
    on(event: "exit", listener: (code: null, signal: string, dump: string, desc: string) => void): this;
    on(event: string | symbol, listener: Function): this;
}

export interface ServerChannel extends Channel {
    /** Standard error for the Channel. */
    stderr: Writable;
    /** Indicates whether this is a server or client channel. */
    server: true;
}

export type AcceptConnection<T extends Channel = Channel> = () => T;
export type AcceptSftpConnection = () => SFTPWrapper;
export type RejectConnection = () => void;

export class Client extends EventEmitter {
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
    on(event: "tcp connection", listener: (details: TcpConnectionDetails, accept: AcceptConnection<ClientChannel>, reject: RejectConnection) => void): this;

    /**
     * Emitted when an incoming X11 connection is being requested.
     *
     * Calling `accept()` accepts the connection and returns a `Channel` object.
     * Calling `reject()` rejects the connection and no further action is needed.
     */
    on(event: "x11", listener: (details: X11Details, accept: AcceptConnection<ClientChannel>, reject: RejectConnection) => void): this;

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
    on(event: "keyboard-interactive", listener: (name: string, instructions: string, lang: string, prompts: Prompt[], finish: KeyboardInteractiveCallback) => void): this;

    /**
     * Emitted when the server has requested that the user's password be changed, if using
     * password-based user authentication.
     *
     * Call `done` with the new password.
     */
    on(event: "change password", listener: (message: string, done: ChangePasswordCallback) => void): this;

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
    on(event: "close", listener: () => void): this;

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

    /**
     * Emitted when a handshake has completed (either initial or rekey).
     */
    on(event: "handshake", listener: (negotiated: NegotiatedAlgorithms) => void): this;

    /**
     * Emitted when the server announces its available host keys.
     */
    on(event: "hostkeys", listener: (keys: ParsedKey[]) => void): this;

    /**
     * An incoming forwarded UNIX socket connection is being requested.
     */
    on(event: "unix connection", listener: (info: UNIXConnectionDetails, accept: AcceptConnection, reject: RejectConnection) => void): this;

    /**
     * Attempts a connection to a server.
     */
    connect(config: ConnectConfig): this;

    /**
     * Executes a command on the server.
     *
     * @param command The command to execute.
     * @param options Options for the command.
     * @param callback The callback to execute when the command has completed.
     */
    exec(command: string, options: ExecOptions, callback: ClientCallback): this;

    /**
     * Executes a command on the server.
     *
     * @param command The command to execute.
     * @param callback The callback to execute when the command has completed.
     */
    exec(command: string, callback: ClientCallback): this;

    /**
     * Starts an interactive shell session on the server.
     *
     * @param window Either an object containing pseudo-tty settings, `false` to suppress creation of a pseudo-tty.
     * @param options Options for the command.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(window: PseudoTtyOptions | false, options: ShellOptions, callback: ClientCallback): this;

    /**
     * Starts an interactive shell session on the server.
     *
     * @param window Either an object containing pseudo-tty settings, `false` to suppress creation of a pseudo-tty.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(window: PseudoTtyOptions | false, callback: ClientCallback): this;

    /**
     * Starts an interactive shell session on the server.
     *
     * @param options Options for the command.
     * @param callback The callback to execute when the channel has been created.
     */
    shell(options: ShellOptions, callback: ClientCallback): this;

    /**
     * Starts an interactive shell session on the server.
     *
     * @param callback The callback to execute when the channel has been created.
     */
    shell(callback: ClientCallback): this;

    /**
     * Bind to `remoteAddr` on `remotePort` on the server and forward incoming TCP connections.
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
     * @param [callback] An optional callback that is invoked when the remote address is bound.
     */
    forwardIn(remoteAddr: string, remotePort: number, callback?: ClientForwardCallback): this;

    /**
     * Unbind from `remoteAddr` on `remotePort` on the server and stop forwarding incoming TCP
     * connections. Until `callback` is called, more connections may still come in.
     *
     * @param remoteAddr The remote address to unbind on the server.
     * @param remotePort The remote port to unbind on the server.
     * @param [callback] An optional callback that is invoked when the remote address is unbound.
     */
    unforwardIn(remoteAddr: string, remotePort: number, callback?: Callback): this;

    /**
     * Open a connection with `srcIP` and `srcPort` as the originating address and port and
     * `dstIP` and `dstPort` as the remote destination address and port.
     *
     * @param srcIP The originating address.
     * @param srcPort The originating port.
     * @param dstIP The destination address.
     * @param dstPort The destination port.
     * @param [callback] The callback that is invoked when the address is bound.
     */
    forwardOut(srcIP: string, srcPort: number, dstIP: string, dstPort: number, callback?: ClientCallback): this;

    /**
     * Starts an SFTP session.
     *
     * @param callback The callback that is invoked when the SFTP session has started.
     */
    sftp(callback: ClientSFTPCallback): this;

    /**
     * Invokes `subsystem` on the server.
     *
     * @param subsystem The subsystem to start on the server.
     * @param callback The callback that is invoked when the subsystem has started.
     */
    subsys(subsystem: string, callback: ClientCallback): this;

    /**
     * Disconnects the socket.
     */
    end(): this;

    /**
     * Destroys the socket.
     */
    destroy(): this;

    /**
     * OpenSSH extension that sends a request to reject any new sessions (e.g. exec, shell,
     * sftp, subsys) for this connection.
     */
    openssh_noMoreSessions(cb: Callback): this;

    /**
     * OpenSSH extension that binds to a UNIX domain socket at `socketPath` on the server and
     * forwards incoming connections.
     */
    openssh_forwardInStreamLocal(socketPath: string, cb: Callback): this;

    /**
     * OpenSSH extension that unbinds from a UNIX domain socket at `socketPath` on the server
     * and stops forwarding incoming connections.
     */
    openssh_unforwardInStreamLocal(socketPath: string, cb: Callback): this;

    /**
     * OpenSSH extension that opens a connection to a UNIX domain socket at `socketPath` on
     * the server.
     */
    openssh_forwardOutStreamLocal(socketPath: string, cb: ClientCallback): this;
}

export type HostVerifier = (key: Buffer, verify: VerifyCallback) => void;
export type SyncHostVerifier = (key: Buffer) => boolean;
export type HostFingerprintVerifier = (fingerprint: string, verify: VerifyCallback) => boolean;
export type SyncHostFingerprintVerifier = (fingerprint: string) => boolean;
export type DebugFunction = (message: string) => void;
export type AuthenticationType = "password" | "publickey" | "hostbased" | "agent" | "keyboard-interactive" | "none";

export interface ConnectConfig {
    /** Hostname or IP address of the server. */
    host?: string;
    /** Port number of the server. */
    port?: number;
    /** Only connect via resolved IPv4 address for `host`. */
    forceIPv4?: boolean;
    /** Only connect via resolved IPv6 address for `host`. */
    forceIPv6?: boolean;
    /** The host's key is hashed using this method and passed to `hostVerifier`. */
    hostHash?: string;
    /** Verifies a hexadecimal hash of the host's key. */
    hostVerifier?: HostVerifier | SyncHostVerifier | HostFingerprintVerifier | SyncHostFingerprintVerifier;
    /** Username for authentication. */
    username?: string;
    /** Password for password-based user authentication. */
    password?: string;
    /** Path to ssh-agent's UNIX socket for ssh-agent-based user authentication (or 'pageant' when using Pagent on Windows). */
    agent?: BaseAgent | string;
    /** Buffer or string that contains a private key for either key-based or hostbased user authentication (OpenSSH format). */
    privateKey?: Buffer | string;
    /** For an encrypted private key, this is the passphrase used to decrypt it. */
    passphrase?: Buffer | string;
    /** Along with `localUsername` and `privateKey`, set this to a non-empty string for hostbased user authentication. */
    localHostname?: string;
    /** Along with `localHostname` and `privateKey`, set this to a non-empty string for hostbased user authentication. */
    localUsername?: string;
    /** Try keyboard-interactive user authentication if primary user authentication method fails. */
    tryKeyboard?: boolean;
    /** How often (in milliseconds) to send SSH-level keepalive packets to the server. Set to 0 to disable. */
    keepaliveInterval?: number;
    /** How many consecutive, unanswered SSH-level keepalive packets that can be sent to the server before disconnection. */
    keepaliveCountMax?: number;
    /** * How long (in milliseconds) to wait for the SSH handshake to complete. */
    readyTimeout?: number;
    /** Performs a strict server vendor check before sending vendor-specific requests. */
    strictVendor?: boolean;
    /** A `ReadableStream` to use for communicating with the server instead of creating and using a new TCP connection (useful for connection hopping). */
    sock?: Readable;
    /** Set to `true` to use OpenSSH agent forwarding (`auth-agent@openssh.com`) for the life of the connection. */
    agentForward?: boolean;
    /** Explicit overrides for the default transport layer algorithms used for the connection. */
    algorithms?: Algorithms;
    /** A function that receives a single string argument to get detailed (local) debug information. */
    debug?: DebugFunction;
    /** Function with parameters (methodsLeft, partialSuccess, callback) where methodsLeft and partialSuccess are null on the first authentication attempt, otherwise are an array and boolean respectively. Return or call callback() with the name of the authentication method to try next (pass false to signal no more methods to try). Valid method names are: 'none', 'password', 'publickey', 'agent', 'keyboard-interactive', 'hostbased'. Default: function that follows a set method order: None -> Password -> Private Key -> Agent (-> keyboard-interactive if tryKeyboard is true) -> Hostbased. */
    authHandler?: AuthenticationType[] | AuthHandlerMiddleware | AuthMethod[];
    /** IP address of the network interface to use to connect to the server. Default: (none -- determined by OS) */
    localAddress?: string;
    /** The local port number to connect from. Default: (none -- determined by OS) */
    localPort?: number;
    /** The underlying socket timeout in ms. Default: none) */
    timeout?: number;
    /** A custom server software name/version identifier. Default: 'ssh2js' + moduleVersion + 'srv' */
    ident?: Buffer | string;
}

export interface AuthMethod {
    type: AuthenticationType;
    username: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect without authentication.
 */
export interface NoAuthMethod extends AuthMethod {
    type: "none";
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with a password.
 */
export interface PasswordAuthMethod extends AuthMethod {
    type: "password";
    password: string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with a public key.
 */
export interface PublicKeyAuthMethod extends AuthMethod {
    type: "publickey";
    key: ParsedKey | Buffer | string;
    passphrase?: Buffer | string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with host-based authentication.
 */
export interface HostBasedAuthMethod extends AuthMethod {
    type: "hostbased";
    localHostname: string;
    localUsername: string;
    /**
     * Can be a string, Buffer, or parsed key containing a private key
     */
    key: ParsedKey | Buffer | string;
    /**
     * `passphrase` only required for encrypted keys
     */
    passphrase?: Buffer | string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with an agent.
 */
export interface AgentAuthMethod extends AuthMethod {
    type: "agent";
    /**
     * Can be a string that is interpreted exactly like the `agent` connection config
     * option or can be a custom agent object/instance that extends and implements `BaseAgent`
     */
    agent: BaseAgent | string;
}

/**
 * Strategy returned from the {@link ConnectConfig.authHandler} to connect with an agent.
 */
export interface KeyboardInteractiveAuthMethod  extends AuthMethod {
    type: "keyboard-interactive";
    /**
     * This works exactly the same way as a 'keyboard-interactive' client event handler
     */
    prompt(name: string, instructions: string, lang: string, prompts: Prompt[], finish: KeyboardInteractiveCallback): void;
}

export type AnyAuthMethod = NoAuthMethod | PasswordAuthMethod | HostBasedAuthMethod | PublicKeyAuthMethod | AgentAuthMethod | KeyboardInteractiveAuthMethod;

export type NextAuthHandler = (authName: AuthenticationType | AnyAuthMethod) => void;

export type AuthHandlerMiddleware = (authsLeft: AuthenticationType[], partialSuccess: boolean, next: NextAuthHandler) => void;

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
    level?: string;
    /** Additional detail for 'client-ssh' messages. */
    description?: string;
}

export interface ExecOptions {
    /** An environment to use for the execution of the command. */
    env?: NodeJS.ProcessEnv;
    /** Set to `true` to allocate a pseudo-tty with defaults, or an object containing specific pseudo-tty settings. */
    pty?: PseudoTtyOptions | boolean;
    /** Set either to `true` to use defaults, a number to specify a specific screen number, or an object containing x11 settings. */
    x11?: X11Options | number | boolean;
    allowHalfOpen?: boolean;
}

export interface ShellOptions {
    /** An environment to use for the execution of the shell. */
    env?: NodeJS.ProcessEnv;
    /** Set either to `true` to use defaults, a number to specify a specific screen number, or an object containing x11 settings. */
    x11?: X11Options | number | boolean;
}

export interface X11Options {
    /** Whether to allow just a single connection (default: `false`).*/
    single?: boolean;
    /** The Screen number to use (default: `0`). */
    screen?: number;
    /** The authentication protocol name. Default: 'MIT-MAGIC-COOKIE-1' */
    protocol?: string;
    /** The authentication cookie. Can be a hex string or a Buffer containing the raw cookie value (which will be converted to a hex string). Default: (random 16 byte value) */
    cookie?: Buffer | string;
}

export interface PseudoTtyOptions {
    /** The number of rows (default: `24`). */
    rows?: number;
    /** The number of columns (default: `80`). */
    cols?: number;
    /** The height in pixels (default: `480`). */
    height?: number;
    /** The width in pixels (default: `640`). */
    width?: number;
    /** The value to use for $TERM (default: `'vt100'`) */
    term?: string;
    /** An object containing Terminal Modes as keys, with each value set to each mode argument. Default: null */
    modes?: TerminalModes;
}

export type ServerConnectionListener = (client: Connection, info: ClientInfo) => void;

export class Server extends NetServer {
    static KEEPALIVE_CLIENT_INTERVAL: number;
    static KEEPALIVE_CLIENT_COUNT_MAX: number;
    constructor(cfg: ServerConfig, listener?: ServerConnectionListener);
    injectSocket(socket: Socket): void;
    on(event: "connection", listener: ServerConnectionListener): this;
    on(event: string | symbol, listener: Function): this;
}

export interface ServerConfig {
    /** An array of host private keys. */
    hostKeys: PrivateKeys;
    /** Explicit overrides for the default transport layer algorithms used for the connection. */
    algorithms?: Algorithms;
    /** A message that is sent to clients immediately upon connection, before handshaking begins. */
    greeting?: string;
    /** A message that is sent to clients once, right before authentication begins. */
    banner?: string;
    /** A custom server software name/version identifier. */
    ident?: string;
    /** This is the highWaterMark to use for the parser stream (default: `32 * 1024`). */
    highWaterMark?: number; // in docs but not in code
    /** The keep alive interval for this server */
    keepaliveInterval?: number;
    /** The most allowed failed keep alive attempts before closing a connection */
    keepaliveCountMax?: number;
    /** A function that receives a single string argument to get detailed (local) debug information. */
    debug?: DebugFunction;
}

export interface EncryptedPrivateKey {
    /** A Buffer or string that contains a private key. */
    key: ParsedKey | Buffer | string;
    /** The passphrase to decrypt a private key. */
    passphrase?: Buffer | string;
}

export interface ClientInfo {
    /** The remote address of the connection. */
    ip: string;
    /** Information about the client. */
    header: Header;
    family: string;
    port: number;
}

export interface Connection extends EventEmitter {
    // Connection events

    /**
     * Emitted when the client has requested authentication.
     */
    on(event: "authentication", listener: (context: AuthContext) => void): this;

    /**
     * Emitted when the client has been successfully authenticated.
     */
    on(event: "ready", listener: () => void): this;

    /**
     * Emitted when the client has requested a new session.
     * Sessions are used to start interactive shells, execute commands, request X11 forwarding, etc.
     */
    on(event: "session", listener: (accept: AcceptConnection<Session>, reject: RejectConnection) => void): this;

    /**
     * Emitted when the client has requested an outbound (TCP) connection.
     */
    on(event: "tcpip", listener: (accept: AcceptConnection<ServerChannel>, reject: RejectConnection, info: TcpipRequestInfo) => void): this;

    /**
     * Emitted when the client has requested a connection to a UNIX domain socket.
     */
    on(event: "openssh.streamlocal", listener: (accept: AcceptConnection<ServerChannel>, reject: RejectConnection, info: SocketRequestInfo) => void): this;

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
     * Emitted when the client has finished rekeying (either client or server initiated).
     */
    on(event: "rekey", listener: () => void): this;

    /**
     * Emitted when an error occurrs.
     */
    on(event: "error", listener: ErrorCallback): this;

    /**
     * Emitted when the socket has disconnected.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the client socket was closed.
     */
    on(event: "close", listener: () => void): this;

    /**
     * Emitted when the Alogrithms have been negotiated; emitted every time there is a rekey
     */
    on(event: "handshake", listener: (negotiated: NegotiatedAlgorithms) => void): this;

    /**
     * Emitted if the server sends a greeting header
     */
    on(event: "greeting", listener: (greeting: string) => void): this;

    noMoreSessions: boolean;
    authenticated: boolean;

    // Connection methods

    /**
     * Closes the client connection.
     */
    end(): this;

    /**
     * Alert the client of an incoming X11 client connection from `originAddr` on port `originPort`.
     */
    x11(originAddr: string, originPort: number, channel: ServerCallback): this;

    /**
     * Alert the client of an incoming TCP connection on `boundAddr` on port `boundPort` from
     * `remoteAddr` on port `remotePort`.
     */
    forwardOut(boundAddr: string, boundPort: number, remoteAddr: string, remotePort: number, callback: ServerCallback): this;

    /**
     * Initiates a rekeying with the client.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     *
     * @param callback An optional callback added as a one-time handler for the `rekey` event.
     */
    rekey(callback?: () => void): void;

    /**
     * Alert the client of an incoming UNIX domain socket connection on socketPath.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_forwardOutStreamLocal(socketPath: string, callback: ServerCallback): this;
}

export interface AuthContextBase extends EventEmitter {
    /** The client's username. */
    username: string;
    /** The service requesting authentication. */
    service: string;
    /** The method of authentication. */
    method: AuthenticationType;

    /**
     * Accepts the authentication request.
     */
    accept(): void;

    /**
     * Rejects the authentication request.
     */
    reject(authMethodsLeft?: AuthenticationType[], isPartialSuccess?: boolean): void;

    /**
     * Emitted when the client aborts the authentication request.
     */
    on(event: "abort", listener: () => void): this;
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
    prompt(prompts: string | Prompt | (string | Prompt)[], callback: KeyboardInteractiveCallback): void;

    /**
     * Send prompts to the client.
     * @param prompts The prompts to send to the client.
     * @param title The title for the prompt.
     * @param callback A callback to call with the responses from the client.
     */
    prompt(prompts: string | Prompt | (string | Prompt)[], title: string, callback: KeyboardInteractiveCallback): void;

    /**
     * Send prompts to the client.
     * @param prompts The prompts to send to the client.
     * @param title The title for the prompt.
     * @param instructions Instructions for the client.
     * @param callback A callback to call with the responses from the client.
     */
    prompt(prompts: string | Prompt | (string | Prompt)[], title: string, instructions: string, callback: KeyboardInteractiveCallback): void;
}

export interface PublicKeyAuthContext extends AuthContextBase {
    /** The method of authentication. */
    method: "publickey";
    /** The public key sent by the client. */
    key: PublicKey;
    /** The signature to verify, or `undefined` if the client is only checking the validity of the key. */
    signature?: Buffer;
    /** The data used to verify the key, or `undefined` if the client is only checking the validity of the key. */
    blob?: Buffer;
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
    signature: Buffer;
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
    requestChange(prompt: string, cb: ChangePasswordCallback): void;
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

// keep so anyone importing this doesn't see breaking changes
export type SessionAcceptReject = () => void;
export type SessionAccept = () => void;

// NB: Doesn't  actually extend ServerChannel/Channel/Duplex, it is just an EventEmitter
export interface Session extends ServerChannel {
    // Session events

    /**
     * Emitted when the client requested allocation of a pseudo-TTY for this session.
     */
    on(event: "pty", listener: (accept: SessionAccept, reject: RejectConnection, info: PseudoTtyInfo) => void): this;

    /**
     * Emitted when the client reported a change in window dimensions during this session.
     */
    on(event: "window-change", listener: (accept: SessionAccept, reject: RejectConnection, info: WindowChangeInfo) => void): this;

    /**
     * Emitted when the client requested X11 forwarding.
     */
    on(event: "x11", listener: (accept: SessionAccept, reject: RejectConnection, info: X11Info) => void): this;

    /**
     * Emitted when the client requested an environment variable to be set for this session.
     */
    on(event: "env", listener: (accept: SessionAccept, reject: RejectConnection, info: SetEnvInfo) => void): this;

    /**
     * Emitted when the client has sent a POSIX signal.
     */
    on(event: "signal", listener: (accept: SessionAccept, reject: RejectConnection, info: SignalInfo) => void): this;

    /**
     * Emitted when the client has requested incoming ssh-agent requests be forwarded to them.
     */
    on(event: "auth-agent", listener: (accept: SessionAccept, reject: RejectConnection) => void): this;

    /**
     * Emitted when the client has requested an interactive shell.
     */
    on(event: "shell", listener: (accept: AcceptConnection<ServerChannel>, reject: RejectConnection) => void): this;

    /**
     * Emitted when the client has requested execution of a command string.
     */
    on(event: "exec", listener: (accept: AcceptConnection<ServerChannel>, reject: RejectConnection, info: ExecInfo) => void): this;

    /**
     * Emitted when the client has requested the SFTP subsystem.
     */
    on(event: "sftp", listener: (accept: AcceptSftpConnection, reject: RejectConnection) => void): this;

    /**
     * Emitted when the client has requested an arbitrary subsystem.
     */
    on(event: "subsystem", listener: (accept: AcceptConnection<ServerChannel>, reject: RejectConnection, info: SubsystemInfo) => void): this;

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

export interface TransferOptions {
    concurrency?: number;
    chunkSize?: number;
    fileSize?: number;
    step?: (total: number, nb: number, fsize: number) => void;
    mode?: number | string;
}

export interface ReadFileOptions {
    encoding?: BufferEncoding;
    flag?: string;
}

export interface WriteFileOptions {
    encoding?: BufferEncoding;
    mode?: number;
    flag?: string;
}

export interface InputAttributes {
    mode?: number | string;
    uid?: number;
    gid?: number;
    size?: number;
    atime?: number | Date;
    mtime?: number | Date;
}

export interface Attributes {
    mode: number;
    uid: number;
    gid: number;
    size: number;
    atime: number;
    mtime: number;
}

export interface Stats extends Attributes {
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}

export interface FileEntry {
    filename: string;
    longname: string;
    attrs: Attributes;
}

export interface SFTPWrapper extends EventEmitter {
    /**
     * (Client-only)
     * Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput.
     */
    fastGet(remotePath: string, localPath: string, options: TransferOptions, callback: Callback): void;

    /**
     * (Client-only)
     * Downloads a file at `remotePath` to `localPath` using parallel reads for faster throughput.
     */
    fastGet(remotePath: string, localPath: string, callback: Callback): void;

    /**
     * (Client-only)
     * Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput.
     */
    fastPut(localPath: string, remotePath: string, options: TransferOptions, callback: Callback): void;

    /**
     * (Client-only)
     * Uploads a file from `localPath` to `remotePath` using parallel reads for faster throughput.
     */
    fastPut(localPath: string, remotePath: string, callback: Callback): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, options: ReadFileOptions, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, encoding: BufferEncoding, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Reads a file in memory and returns its contents
     */
    readFile(remotePath: string, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Returns a new readable stream for `path`.
     */
    createReadStream(path: string, options?: ReadStreamOptions): ReadStream;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, options: WriteFileOptions, callback?: Callback): void;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, encoding: string, callback?: Callback): void;

    /**
     * (Client-only)
     * Writes data to a file
     */
    writeFile(remotePath: string, data: string | Buffer, callback?: Callback): void;

    /**
     * (Client-only)
     * Appends data to a file
     */
    appendFile(remotePath: string, data: string | Buffer, options: WriteFileOptions, callback?: Callback): void;

    /**
     * (Client-only)
     * Appends data to a file
     */
    appendFile(remotePath: string, data: string | Buffer, callback?: Callback): void;

    /**
     * (Client-only)
     * Returns a new writable stream for `path`.
     */
    createWriteStream(path: string, options?: WriteStreamOptions): WriteStream;

    /**
     * (Client-only)
     * Opens a file `filename` for `mode` with optional `attributes`.
     */
    open(filename: string, mode: number | OpenMode, attributes: InputAttributes, callback: (err: Error | undefined, handle: Buffer) => void): void;
    open(filename: string, mode: number | OpenMode, attributes: string | number, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Opens a file `filename` for `mode`.
     */
    open(filename: string, mode: number | OpenMode, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Closes the resource associated with `handle` given by `open()` or `opendir()`.
     */
    close(handle: Buffer, callback: Callback): void;

    /**
     * (Client-only)
     * Reads `length` bytes from the resource associated with `handle` starting at `position`
     * and stores the bytes in `buffer` starting at `offset`.
     */
    read(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | undefined, bytesRead: number, buffer: Buffer, position: number) => void): void;

    /**
     * (Client-only)
     */
    write(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: Callback): void;

    /**
     * (Client-only)
     * Retrieves attributes for the resource associated with `handle`.
     */
    fstat(handle: Buffer, callback: (err: Error | undefined, stats: Stats) => void): void;

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for the resource associated with `handle`.
     */
    fsetstat(handle: Buffer, attributes: InputAttributes, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the access time and modified time for the resource associated with `handle`.
     */
    futimes(handle: Buffer, atime: number | Date, mtime: number | Date, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the owner for the resource associated with `handle`.
     */
    fchown(handle: Buffer, uid: number, gid: number, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the mode for the resource associated with `handle`.
     */
    fchmod(handle: Buffer, mode: number | string, callback: Callback): void;

    /**
     * (Client-only)
     * Opens a directory `path`.
     */
    opendir(path: string, callback: (err: Error | undefined, handle: Buffer) => void): void;

    /**
     * (Client-only)
     * Retrieves a directory listing.
     */
    readdir(location: string | Buffer, callback: (err: Error | undefined, list: FileEntry[]) => void): void;

    /**
     * (Client-only)
     * Removes the file/symlink at `path`.
     */
    unlink(path: string, callback: Callback): void;

    /**
     * (Client-only)
     * Renames/moves `srcPath` to `destPath`.
     */
    rename(srcPath: string, destPath: string, callback: Callback): void;

    /**
     * (Client-only)
     * Creates a new directory `path`.
     */
    mkdir(path: string, attributes: InputAttributes, callback: Callback): void;

    /**
     * (Client-only)
     * Creates a new directory `path`.
     */
    mkdir(path: string, callback: Callback): void;

    /**
     * (Client-only)
     * Removes the directory at `path`.
     */
    rmdir(path: string, callback: Callback): void;

    /**
     * (Client-only)
     * Retrieves attributes for `path`.
     */
    stat(path: string, callback: (err: Error | undefined, stats: Stats) => void): void;

    /**
     * (Client-only)
     * `path` exists.
     */
    exists(path: string, callback: (hasError: boolean) => void): void;

    /**
     * (Client-only)
     * Retrieves attributes for `path`. If `path` is a symlink, the link itself is stat'ed
     * instead of the resource it refers to.
     */
    lstat(path: string, callback: (err: Error | undefined, stats: Stats) => void): void;

    /**
     * (Client-only)
     * Sets the attributes defined in `attributes` for `path`.
     */
    setstat(path: string, attributes: InputAttributes, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the access time and modified time for `path`.
     */
    utimes(path: string, atime: number | Date, mtime: number | Date, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the owner for `path`.
     */
    chown(path: string, uid: number, gid: number, callback: Callback): void;

    /**
     * (Client-only)
     * Sets the mode for `path`.
     */
    chmod(path: string, mode: number | string, callback: Callback): void;

    /**
     * (Client-only)
     * Retrieves the target for a symlink at `path`.
     */
    readlink(path: string, callback: (err: Error | undefined, target: string) => void): void;

    /**
     * (Client-only)
     * Creates a symlink at `linkPath` to `targetPath`.
     */
    symlink(targetPath: string, linkPath: string, callback: Callback): void;

    /**
     * (Client-only)
     * Resolves `path` to an absolute path.
     */
    realpath(path: string, callback: (err: Error | undefined, absPath: string) => void): void;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX rename(3) from `srcPath` to `destPath`.
     */
    ext_openssh_rename(srcPath: string, destPath: string, callback: Callback): void;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX statvfs(2) on `path`.
     */
    ext_openssh_statvfs(path: string, callback: (err: Error | undefined, fsInfo: any) => void): void;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fstatvfs(2) on open handle `handle`.
     */
    ext_openssh_fstatvfs(handle: Buffer, callback: (err: Error | undefined, fsInfo: any) => void): void;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX link(2) to create a hard link to `targetPath` at `linkPath`.
     */
    ext_openssh_hardlink(targetPath: string, linkPath: string, callback: Callback): void;

    /**
     * (Client-only, OpenSSH extension)
     * Performs POSIX fsync(3) on the open handle `handle`.
     */
    ext_openssh_fsync(handle: Buffer, callback: (err: Error | undefined, fsInfo: any) => void): void;

    /**
     * (Client-only, OpenSSH extension)
     * Similar to setstat(), but instead sets attributes on symlinks.
     */
    ext_openssh_lsetstat(path: string, attrs: InputAttributes, callback: Callback): void;
    ext_openssh_lsetstat(path: string, callback: Callback): void;

    /**
     * (Client-only, OpenSSH extension)
     * Similar to realpath(), but supports tilde-expansion, i.e. "~", "~/..." and "~user/...". These paths are expanded using shell-like rules.
     */
    ext_openssh_expandPath(path: string, callback: (err: Error | undefined, absPath: string) => void): void;

    /**
     * (Client-only)
     * Performs a remote file copy. If length is 0, then the server will read from srcHandle until EOF is reached.
     */
    ext_copy_data(handle: Buffer, srcOffset: number, len: number, dstHandle: Buffer, dstOffset: number, callback: Callback): void;

    /**
     * Emitted after initial protocol version check has passed
     */
    on(event: "ready", listener: () => void): this;
    on(event: "OPEN", listener: (reqId: number, filename: string, flags: number, attrs: Attributes) => void): this;
    on(event: "READ", listener: (reqId: number, handle: Buffer, offset: number, len: number) => void): this;
    on(event: "WRITE", listener: (reqId: number, handle: Buffer, offset: number, data: Buffer) => void): this;
    on(event: "FSTAT", listener: (reqId: number, handle: Buffer) => void): this;
    on(event: "FSETSTAT", listener: (reqId: number, handle: Buffer, attrs: Attributes) => void): this;
    on(event: "CLOSE", listener: (reqId: number, handle: Buffer) => void): this;
    on(event: "OPENDIR", listener: (reqId: number, path: string) => void): this;
    on(event: "READDIR", listener: (reqId: number, handle: Buffer) => void): this;
    on(event: "LSTAT", listener: (reqId: number, path: string) => void): this;
    on(event: "STAT", listener: (reqId: number, path: string) => void): this;
    on(event: "REMOVE", listener: (reqId: number, path: string) => void): this;
    on(event: "RMDIR", listener: (reqId: number, path: string) => void): this;
    on(event: "REALPATH", listener: (reqId: number, path: string) => void): this;
    on(event: "READLINK", listener: (reqId: number, path: string) => void): this;
    on(event: "SETSTAT", listener: (reqId: number, path: string, attrs: Attributes) => void): this;
    on(event: "MKDIR", listener: (reqId: number, path: string, attrs: Attributes) => void): this;
    on(event: "RENAME", listener: (reqId: number, oldPath: string, newPath: string) => void): this;
    on(event: "SYMLINK", listener: (reqId: number, targetPath: string, linkPath: string) => void): this;
    on(event: "EXTENDED", listener: (reqId: number, extName: string, extData: Buffer) => void): this;
    on(event: string | symbol, listener: Function): this;

    /**
     * Sends a status response for the request identified by id.
     */
    status(reqId: number, code: number, message?: string): void;

    /**
     * Sends a handle response for the request identified by id.
     * handle must be less than 256 bytes and is an opaque value that could merely contain the value of a
     * backing file descriptor or some other unique, custom value.
     */
    handle(reqId: number, handle: Buffer): void;

    /**
     * Sends a data response for the request identified by id. data can be a Buffer or string.
     * If data is a string, encoding is the encoding of data.
     */
    data(reqId: number, data: Buffer | string, encoding?: BufferEncoding): void;

    /**
     * Sends a name response for the request identified by id.
     */
    name(reqId: number, names: FileEntry[]): void;

    /**
     * Sends an attrs response for the request identified by id.
     */
    attrs(reqId: number, attrs: Attributes): void;
}

export interface PublicKeyEntry {
    pubKey: ParsedKey | {
        pubKey: ParsedKey | Buffer | string;
        comment?: string;
    }
}

export type KnownPublicKeys<T extends string | Buffer | ParsedKey = string | Buffer | ParsedKey> = (T | PublicKeyEntry)[]

export type PrivateKeys = (Buffer | ParsedKey | EncryptedPrivateKey | string)[];

export type Callback = (err?: Error | null) => void;

export type ErrorCallback = (err: Error) => void;

export type IdentityCallback<T extends string | Buffer | ParsedKey = string | Buffer | ParsedKey> = (err?: Error | null, keys?: KnownPublicKeys<T>) => void;

export type SignCallback = (err?: Error | null, signature?: Buffer) => void;

export type GetStreamCallback = (err?: Error | null, stream?: Duplex) => void;

/**
 * Interface representing an inbound agent request. This is defined as an
 * "opaque type" in the ssh2 documentation, and should only be used
 * for correlation, not introspected.
 */
export interface AgentInboundRequest {
    __opaque_type: never
}

export interface SigningRequestOptions  {
    hash: 'sha256' | 'sha512';
}

export class AgentProtocol extends Duplex {
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
     */
    sign(pubKey: ParsedKey | Buffer | string, data: Buffer, options?: SigningRequestOptions, callback?: SignCallback): boolean;
    sign(pubKey: ParsedKey | Buffer | string, data: Buffer, callback?: SignCallback): boolean;

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
    on(event: "identities", listener: (req: AgentInboundRequest) => void): this;

    /**
     * (Server mode only)
     * The client has requested `data` to be signed using the key identified
     * by `pubKey`. Use `failureReply()` or `signReply()` to reply appropriately.
     */
    on(event: "sign", listener: (req: AgentInboundRequest, pubKey: ParsedKey, data: Buffer, options: SigningRequestOptions) => void): this;

    on(event: string | symbol, listener: Function): this;
}

/**
 * Creates and returns a new agent instance using the same logic as the
 * `Client`'s `agent` configuration option: if the platform is Windows and
 * it's the value "pageant", it creates a `PageantAgent`, otherwise if it's not
 * a path to a Windows pipe it creates a `CygwinAgent`. In all other cases,
 * it creates an `OpenSSHAgent`.
 */
export function createAgent(socketPath: string | 'pageant'): BaseAgent;

export abstract class BaseAgent<TPublicKey extends string | Buffer | ParsedKey = string | Buffer | ParsedKey> {
    /**
     * Retrieves user identities, where `keys` is a possible array of public
     * keys for authentication.
     */
    abstract getIdentities(cb: IdentityCallback<TPublicKey>): void;

    /**
     * Signs the datawith the given public key, and calls back with its signature.
     * Note that, in the current implementation, "options" is always an empty object.
     */
    abstract sign(pubKey: TPublicKey, data: Buffer, options: SigningRequestOptions, cb?: SignCallback): void;
    abstract sign(pubKey: TPublicKey, data: Buffer, cb: SignCallback): void;

    /**
     * Optional method that may be implemented to support agent forwarding. Callback
     * should be invoked with a Duplex stream to be used to communicate with your agent/
     * You will probably want to utilize `AgentProtocol` as agent forwarding is an
     * OpenSSH feature, so the `stream` needs to be able to
     * transmit/receive OpenSSH agent protocol packets.
     */
    getStream?(cb: GetStreamCallback): void;
}

/**
 * Communicates with an OpenSSH agent listening on the UNIX socket at `socketPath`.
 */
export class OpenSSHAgent extends BaseAgent<ParsedKey> {
    constructor(socketPath: string);

    /** @inheritdoc */
    getIdentities(cb: IdentityCallback<ParsedKey>): void;

    /** @inheritdoc */
    sign(pubKey: ParsedKey | Buffer | string, data: Buffer, options?: SigningRequestOptions, cb?: SignCallback): boolean;
    sign(pubKey: ParsedKey | Buffer | string, data: Buffer, cb?: SignCallback): boolean;

    /** @inheritdoc */
    getStream(cb: GetStreamCallback): void;
}

/**
 * Communicates with an agent listening at `socketPath` in a Cygwin environment.
 */
export class CygwinAgent extends OpenSSHAgent {}

/**
 * Creates a new agent instance for communicating with a running Pageant agent process.
 */
export class PageantAgent extends OpenSSHAgent {}

export interface NegotiatedAlgorithms {
    kex: KexAlgorithm;
    serverHostKey: ServerHostKeyAlgorithm;
    cs: {
        cipher: CipherAlgorithm;
        mac: MacAlgorithm | '';
        compress: CompressionAlgorithm;
        lang: string;
    },
    sc: {
        cipher: CipherAlgorithm;
        mac: MacAlgorithm | '';
        compress: CompressionAlgorithm;
        lang: string;
    },
}

export type VerifyCallback = (valid: boolean) => void;

export interface ReadStreamOptions extends ReadableOptions {
    flags?: OpenMode;
    mode?: number;
    start?: number;
    end?: number;
    autoClose?: boolean;
    handle?: Buffer;
}

export interface WriteStreamOptions extends WritableOptions {
    flags?: OpenMode;
    mode?: number;
    start?: number;
    autoClose?: boolean;
    handle?: Buffer;
    encoding?: BufferEncoding;
}

export interface ReadStream extends Readable {
    pending: boolean;
    open(): void;
    close(cb: Callback): void;
    on(eventName: 'ready', listener: () => void): this;
    on(eventName: 'open', listener: (handle: Buffer) => void): this;
    on(event: string | symbol, listener: Function): this;
}

export interface WriteStream extends Writable {
    pending: boolean;
    open(): void;
    destroy(): this;
    close(cb: Callback): void;
    on(eventName: 'ready', listener: () => void): this;
    on(eventName: 'open', listener: (handle: Buffer) => void): this;
    on(event: string | symbol, listener: Function): this;
}

export type ClientCallback = (err: Error | undefined, channel: ClientChannel) => void;

export type ServerCallback = (err: Error | undefined, channel: ServerChannel) => void;

export type ClientForwardCallback = (err: Error | undefined, port: number) => void;

export type ClientSFTPCallback = (err: Error | undefined, sftp: SFTPWrapper) => void;

export type ChangePasswordCallback = (newPassword: string) => void;

export type KeyboardInteractiveCallback = (answers: string[]) => void;


export interface UNIXConnectionDetails {
    socketPath: string;
}

export interface HTTPAgentOptions extends AgentOptions {
    srcIP?: string;
}

export class HTTPAgent extends BaseHTTPAgent {
    constructor(connectCfg: ConnectConfig, agentOptions: HTTPAgentOptions);
}

export class HTTPSAgent extends BaseHTTPSAgent {
    constructor(connectCfg: ConnectConfig, agentOptions: HTTPAgentOptions);
}
