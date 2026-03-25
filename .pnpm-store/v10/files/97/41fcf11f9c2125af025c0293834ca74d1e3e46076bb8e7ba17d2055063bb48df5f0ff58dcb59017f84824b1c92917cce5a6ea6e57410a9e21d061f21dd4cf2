/// <reference types="node" />

import * as stream from "stream";

export class SSH2Stream extends stream.Transform {
    /**
     * The number of bytes sent since the last keying. This metric can be useful in determining when to call rekey().
     */
    bytesSent: number;

    /**
     * The number of bytes received since the last keying. This metric can be useful in determining when to call rekey().
     */
    bytesReceived: number;

    /**
     * Creates and returns a new SSH2Stream instance.
     */
    constructor(config?: SSH2StreamConfig);

    /**
     * (Client/Server)
     * Writes a dummy GLOBAL_REQUEST packet (specifically "keepalive@openssh.com") that requests a reply.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    ping(): boolean;

    /**
     * (Client/Server)
     * Writes a disconnect packet and closes the stream.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    disconnect(reasonCode?: number): boolean;

    /**
     * (Client/Server)
     * Starts the re-keying process. Incoming/Outgoing packets are buffered until the re-keying
     * process has finished. Returns `false` to indicate that no more packets should be written
     * until the `NEWKEYS` event is seen.
     */
    rekey(): boolean;

    /**
     * (Client/Server)
     * Writes a request success packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    requestSuccess(data?: Buffer): boolean;

    /**
     * (Client/Server)
     * Writes a request failure packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    requestFailure(): boolean;

    /**
     * (Client/Server)
     * Writes a channel success packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelSuccess(channel: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel failure packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelFailure(channel: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel EOF packet for the given `channel`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelEOF(channel: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel close packet for the given `channel`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelClose(channel: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel window adjust packet for the given `channel` where `amount` is the
     * number of bytes to add to the channel window.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelWindowAdjust(channel: number, amount: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel data packet for the given `channel` where `data` is a _Buffer_ or _string_.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelData(channel: number, data: string | Buffer): boolean;

    /**
     * (Client/Server)
     * Writes a channel extended data packet for the given `channel` where `data is a _Buffer_
     * or _string_.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelExtData(channel: number, data: string | Buffer, type: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel open confirmation packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelOpenConfirm(remoteChannel: number, localChannel: number, initWindow: number, maxPacket: number): boolean;

    /**
     * (Client/Server)
     * Writes a channel open failure packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    channelOpenFail(remoteChannel: number, reasonCode: number, description?: string, lang?: string): boolean;

    /**
     * (Client-only)
     * Writes a service request packet for `serviceName`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    service(serviceName: string): boolean;

    /**
     * (Client-only)
     * Writes a tcpip forward global request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    tcpipForward(bindAddr: string, bindPort: number, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a cancel tcpip forward global request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    cancelTcpipForward(bindAddr: string, bindPort: number, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a password userauth request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authPassword(username: string, password: string): boolean;

    /**
     * (Client-only)
     * Writes a publickey userauth request packet. `pubKey` is the object returned from using
     * `utils.parseKey()` on a private or public key. If `cbSign` is not present, a pubkey
     * check userauth packet is written. Otherwise `cbSign` is called with `(blob, callback)`,
     * where `blob` is the data to sign with the private key and the resulting signature
     * _Buffer_ is passed to `callback` as the first argument.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authPK(
        username: string,
        pubKey: ParsedKey,
        cbSign?: (blob: Buffer, callback: (signedBlob: Buffer) => void) => void,
    ): boolean;

    /**
     * (Client-only)
     * Writes a hostbased userauth request packet. `pubKey` is the object returned from using
     * `utils.parseKey()` on a private or public key. `cbSign` is called with `(blob, callback)`,
     * where `blob` is the data to sign with the private key and the resulting signature
     * _Buffer_ is passed to `callback` as the first argument.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authHostBased(
        username: string,
        pubKey: ParsedKey,
        localHostname: string,
        localUsername: string,
        cbSign?: (blob: Buffer, callback: (signedBlob: Buffer) => void) => void,
    ): boolean;

    /**
     * (Client-only)
     * Writes a keyboard-interactive userauth request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authKeyboard(username: string): boolean;

    /**
     * (Client-only)
     * Writes a "none" userauth request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authNone(username: string): boolean;

    /**
     * (Client-only)
     * Writes a userauth info response packet. `responses` is an _array_ of zero or more strings
     * corresponding to responses to prompts previously sent by the server.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authInfoRes(responses?: string[]): boolean;

    /**
     * (Client-only)
     * Writes a direct tcpip channel open packet. `config` must contain `srcIP`, `srcPort`,
     * `dstIP`, and `dstPort`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    directTcpip(channel: number, initWindow: number, maxPacket: number, config: TcpipForwardingConfig): boolean;

    /**
     * (Client-only)
     * Writes a session channel open packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    session(channel: number, initWindow: number, maxPacket: number): boolean;

    /**
     * (Client-only)
     * Writes an `auth-agent-req@openssh.com` channel request packet. `wantReply` defaults to
     * `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_agentForward(channel: number, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a window change channel request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    windowChange(channel: number, rows: number, cols: number, height: number, width: number): boolean;

    /**
     * (Client-only)
     * Writes a pty channel request packet. If `terminalType` is falsey, `vt100` is used.
     * `terminalModes` can be the raw bytes, an _object_ of the terminal modes to set, or a falsey value for no modes. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    pty(
        channel: number,
        rows: number,
        cols: number,
        height: number,
        width: number,
        terminalType?: string,
        terminalModes?: any,
        wantReply?: boolean,
    ): boolean;

    /**
     * (Client-only)
     * Writes an env channel request packet. `value` can be a _string_ or _Buffer_. `wantReply`
     * defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    env(channel: number, key: string, value: string | Buffer, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a shell channel request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    shell(channel: number, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes an exec channel request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exec(channel: number, command: string, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a signal channel request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    signal(channel: number, signalName: string): boolean;

    /**
     * (Client-only)
     * Writes an X11 forward channel request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    x11Forward(channel: number, config: X11ForwardingConfig, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a subsystem channel request packet. `name` is the name of the subsystem (e.g.
     * `sftp` or `netconf`). `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    subsystem(channel: number, name: string, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a no-more-sessions@openssh.com request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_noMoreSessions(wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a streamlocal-forward@openssh.com request packet. `wantReply` defaults to `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_streamLocalForward(socketPath: string, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a cancel-streamlocal-forward@openssh.com request packet. `wantReply` defaults to
     * `true`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_cancelStreamLocalForward(socketPath: string, wantReply?: boolean): boolean;

    /**
     * (Client-only)
     * Writes a direct-streamlocal@openssh.com channel open packet. `config` must contain
     * `socketPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_directStreamLocal(
        channel: number,
        initWindow: number,
        maxPacket: number,
        config: SocketForwardingConfig,
    ): boolean;

    /**
     * (Server-only)
     * Writes a service accept packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    serviceAccept(serviceName: string): boolean;

    /**
     * (Server-only)
     * Writes a userauth failure packet. `authMethods` is an _array_ of authentication methods
     * that can continue.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authFailure(authMethods?: string[], partialSuccess?: boolean): boolean;

    /**
     * (Server-only)
     * Writes a userauth success packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authSuccess(): boolean;

    /**
     * (Server-only)
     * Writes a userauth PK OK packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authPKOK(keyAlgorithm: string, keyData: Buffer): boolean;

    /**
     * (Server-only)
     * Writes a userauth info request packet. `prompts` is an array of `Prompt` objects.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    authInfoReq(name: string, instructions: string, prompts: Prompt[]): boolean;

    /**
     * (Server-only)
     * Writes a forwarded tcpip channel open packet. `info` must contain `boundAddr`,
     * `boundPort`, `remoteAddr`, and `remotePort`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    forwardedTcpip(channel: number, initWindow: number, maxPacket: number, info: ForwardedTcpip): boolean;

    /**
     * (Server-only)
     * Writes an X11 channel open packet. `info` must contain `originAddr` and `originPort`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    x11(channel: number, initWindow: number, maxPacket: number, info: ForwardedX11): boolean;

    /**
     * (Server-only)
     * Writes an forwarded-streamlocal@openssh.com channel open packet. `info` must contain
     * `socketPath`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    openssh_forwardedStreamLocal(
        channel: number,
        initWindow: number,
        maxPacket: number,
        info: ForwardedSocket,
    ): boolean;

    /**
     * (Server-only)
     * Writes an exit status channel request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exitStatus(channel: number, exitCode: number): boolean;

    /**
     * (Server-only)
     * Writes an exit signal channel request packet.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    exitSignal(channel: number, signalName: string, coreDumped: boolean, errorMessage: string): boolean;

    /**
     * (Client/Server)
     * Emitted when the protocol header is seen.
     */
    on(event: "header", listener: (header: Header) => void): this;

    /**
     * (Client/Server)
     */
    on(
        event: "GLOBAL_REQUEST",
        listener: (reqName: string, wantReply: boolean, request: GlobalRequest | Buffer | undefined) => void,
    ): this;

    /**
     * (Client/Server)
     */
    on(event: "DISCONNECT", listener: (reason: string, reasonCode: number, description: string) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "DEBUG", listener: (message: string) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "NEWKEYS", listener: () => void): this;

    /**
     * (Client/Server)
     */
    on(event: "REQUEST_SUCCESS", listener: (resData: Buffer) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "REQUEST_FAILURE", listener: () => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_OPEN", listener: (channelInfo: ChannelOpenInfo) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_OPEN_CONFIRMATION:0", listener: (channelInfo: ChannelOpenConfirmationInfo) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_OPEN_FAILURE:0", listener: (failInfo: ChannelOpenFailureInfo) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_REQUEST:0", listener: (request: ChannelRequest) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_DATA:0", listener: (data: Buffer) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_EXTENDED_DATA:0", listener: (type: number, data: Buffer) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_WINDOW_ADJUST:0", listener: (bytesToAdd: number) => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_SUCCESS:0", listener: () => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_FAILURE:0", listener: () => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_EOF:0", listener: () => void): this;

    /**
     * (Client/Server)
     */
    on(event: "CHANNEL_CLOSE:0", listener: () => void): this;

    /**
     * (Client-only)
     * This event allows you to verify a host's key. If `callback` is called with `true`, the
     * handshake continues. Otherwise a disconnection will occur if `callback` is called with
     * `false`. The default behavior is to auto-allow any host key if there are no handlers
     * for this event.
     */
    on(event: "fingerprint", listener: (hostKey: Buffer, callback: (success: boolean) => void) => void): this;

    /**
     * (Client-only)
     */
    on(event: "SERVICE_ACCEPT", listener: (serviceName: string) => void): this;

    /**
     * (Client-only)
     */
    on(event: "USERAUTH_PASSWD_CHANGEREQ", listener: (message: string) => void): this;

    /**
     * (Client-only)
     */
    on(
        event: "USERAUTH_INFO_REQUEST",
        listener: (name: string, instructions: string, lang: string, prompts: Prompt[]) => void,
    ): this;

    /**
     * (Client-only)
     */
    on(event: "USERAUTH_PK_OK", listener: () => void): this;

    /**
     * (Client-only)
     */
    on(event: "USERAUTH_SUCCESS", listener: () => void): this;

    /**
     * (Client-only)
     */
    on(event: "USERAUTH_FAILURE", listener: (methodsContinue: string[], partialSuccess: boolean) => void): this;

    /**
     * (Client-only)
     */
    on(event: "USERAUTH_BANNER", listener: (message: string) => void): this;

    /**
     * (Server-only)
     */
    on(event: "SERVICE_REQUEST", listener: (serviceName: string) => void): this;

    /**
     * (Server-only)
     */
    on(
        event: "USERAUTH_REQUEST",
        listener: (username: string, serviceName: string, authMethod: string, authMethodData: AuthMethodData) => void,
    ): this;

    /**
     * (Server-only)
     */
    on(event: "USERAUTH_INFO_RESPONSE", listener: (responses: string[]) => void): this;

    /**
     * Emitted when the connection has authenticated.
     */
    on(event: "ready", listener: () => void): this;

    /**
     * Emitted when the socket has disconnected.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the client socket was closed.
     */
    on(event: "close", listener: () => void): this;

    /**
     * Emitted when more requests/data can be sent to the stream.
     */
    on(event: "continue", listener: () => void): this;

    /**
     * Emitted when an error occurred.
     */
    on(event: "error", listener: (err: any) => void): this;

    on(event: string | symbol, listener: Function): this;
}

export interface SSH2StreamConfig {
    /**
     * Set to true to create an instance in server mode.
     */
    server?: boolean | undefined;

    /**
     * If in server mode, an object keyed on host key format.
     */
    hostKeys?: HostKeys | undefined;

    /**
     * A message that is sent to clients immediately upon connection, before handshaking begins.
     */
    banner?: string | undefined;

    /**
     * A custom server software name/version identifier.
     * @default 'ssh2js' + moduleVersion + 'srv'
     */
    ident?: string | undefined;

    /**
     * This is the maximum packet size that will be accepted. It should be 35000 bytes or larger to be compatible with other SSH2 implementations.
     * @default 35000
     */
    maxPacketSize?: number | undefined;

    /**
     * This is the highWaterMark to use for the parser stream.
     * @default 32 * 1024
     */
    highWaterMark?: number | undefined;

    /**
     * This option allows you to explicitly override the default transport layer algorithms used for the connection. Each value must be an array of valid algorithms for that category. The order of the algorithms in the arrays are important, with the most favorable being first.
     */
    algorithms?: Algorithms | undefined;

    /**
     * Set this to a function that receives a single string argument to get detailed (local) debug information.
     */
    debug?: ((information: string) => any) | undefined;
}

export interface HostKeys {
    [format: string]: HostKey;
}

export interface HostKey {
    privateKey: ParsedKey;
    publicKey: ParsedKey;
}

/**
 * Overrides for the default transport layer algorithms used for the connection.
 *
 * The order of the algorithms in the arrays are important, with the most favorable being first.
 */
export interface Algorithms {
    kex?: string[] | undefined;
    cipher?: string[] | undefined;
    serverHostKey?: string[] | undefined;
    hmac?: string[] | undefined;
    compress?: string[] | undefined;
}

export interface Header {
    /**
     * (Client-only) An optional greeting message presented by the server.
     */
    greeting?: string | undefined;

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

export interface TcpipForwardGlobalRequest {
    /**
     * The IP address to start/stop binding to.
     */
    bindAddr: string;

    /**
     * The port to start/stop binding to.
     */
    bindPort: number;
}

export interface openssh_StreamLocalForwardGlobalRequest {
    socketPath: string;
}

export type GlobalRequest = TcpipForwardGlobalRequest | openssh_StreamLocalForwardGlobalRequest | Buffer;

export interface ChannelOpenConfirmationInfo {
    recipient: number;
    sender: number;
    window: number;
    packetSize: number;
}

export interface ChannelOpenFailureInfo {
    recipient: number;
    reasonCode: number;
    reason: string;
    description: string;
}

export interface X11ChannelInfo {
    type: "x11";
    sender: number;
    window: number;
    packetSize: number;
    data: X11ChannelData;
}

export interface X11ChannelData {
    srcIP: string;
    srcPort: number;
}

export interface ForwardedTcpipChannelInfo {
    type: "forwarded-tcpip";
    sender: number;
    window: number;
    packetSize: number;
    data: TcpipChannelData;
}

export interface DirectTcpipChannelInfo {
    type: "direct-tcpip";
    sender: number;
    window: number;
    packetSize: number;
    data: TcpipChannelData;
}

export interface TcpipChannelData {
    srcIP: string;
    srcPort: number;
    destIP: string;
    destPort: number;
}

export interface openssh_ForwardedStreamLocalChannelInfo {
    type: "forwarded-streamlocal@openssh.com";
    sender: number;
    window: number;
    packetSize: number;
    data: SocketChannelData;
}

export interface openssh_DirectStreamLocalChannelInfo {
    type: "direct-streamlocal@openssh.com";
    sender: number;
    window: number;
    packetSize: number;
    data: SocketChannelData;
}

export interface SocketChannelData {
    socketPath: string;
}

export interface openssh_AuthAgentChannelInfo {
    type: "auth-agent@openssh.com";
    sender: number;
    window: number;
    packetSize: number;
}

export interface SessionChannelInfo {
    type: "session";
    sender: number;
    window: number;
    packetSize: number;
}

export type ChannelOpenInfo =
    | X11ChannelInfo
    | ForwardedTcpipChannelInfo
    | openssh_ForwardedStreamLocalChannelInfo
    | openssh_AuthAgentChannelInfo
    | DirectTcpipChannelInfo
    | openssh_DirectStreamLocalChannelInfo
    | SessionChannelInfo;

export interface ExitStatusChannelRequest {
    request: "exit-status";
    recipient: number;
    code: number;
}

export interface ExitSignalChannelRequest {
    request: "exit-signal";
    recipient: number;
    signal: string;
    coredump: boolean;
    description: string;
}

export interface PseudoTtyChannelRequest {
    request: "pty-req";
    recipient: number;
    wantReply: boolean;
    term: string;
    cols: number;
    rows: number;
    width: number;
    height: number;
    modes: any;
}

export interface WindowChangeChannelRequest {
    request: "window-change";
    recipient: number;
    cols: number;
    rows: number;
    width: number;
    height: number;
}

export interface X11ChannelRequest {
    request: "x11-req";
    recipient: number;
    wantReply: boolean;
    single: boolean;
    protocol: string;
    cookie: string;
    screen: number;
}

export interface EnvChannelRequest {
    request: "env";
    recipient: number;
    wantReply: boolean;
    key: string;
    val: string;
}

export interface ShellChannelRequest {
    request: "shell";
    recipient: number;
    wantReply: boolean;
}

export interface ExecChannelRequest {
    request: "exec";
    recipient: number;
    wantReply: boolean;
    command: string;
}

export interface SubsystemChannelRequest {
    request: "subsystem";
    recipient: number;
    wantReply: boolean;
    subsystem: string;
}

export interface SignalChannelRequest {
    request: "signal";
    recipient: number;
    signal: string;
}

export interface FlowControlChannelRequest {
    request: "xon-xoff";
    recipient: number;
    clientControl: boolean;
}

export interface openssh_AuthAgentChannelRequest {
    request: "auth-agent-req@openssh.com";
    recipient: number;
}

export type ChannelRequest =
    | ExitStatusChannelRequest
    | ExitSignalChannelRequest
    | PseudoTtyChannelRequest
    | WindowChangeChannelRequest
    | X11ChannelRequest
    | EnvChannelRequest
    | ShellChannelRequest
    | ExecChannelRequest
    | SubsystemChannelRequest
    | SignalChannelRequest
    | FlowControlChannelRequest;

export interface PublicKeyAuthMethodData {
    keyAlgo: string;
    key: Buffer;
    signature?: Buffer | undefined;
    blob?: Buffer | undefined;
}

export interface HostbasedAuthMethodData {
    keyAlgo: string;
    key: Buffer;
    signature?: Buffer | undefined;
    blob?: Buffer | undefined;
    localHostname: string;
    localUsername: string;
}

export type AuthMethodData = string | PublicKeyAuthMethodData | HostbasedAuthMethodData;

export interface TcpipForwardingConfig {
    /**
     * Source IP address of outgoing connection.
     */
    srcIP: string;

    /**
     * Source port of outgoing connection.
     */
    srcPort: number;

    /**
     * Destination IP address of outgoing connection.
     */
    destIP: string;

    /**
     * Destination port of outgoing connection.
     */
    destPort: number;
}

export interface X11ForwardingConfig {
    /**
     * true if only a single connection should be forwarded.
     */
    single: boolean;

    /**
     * The name of the X11 authentication method used (e.g. MIT-MAGIC-COOKIE-1).
     */
    protocol: string;

    /**
     * The X11 authentication cookie encoded in hexadecimal.
     */
    cookie: string;

    /**
     * The screen number to forward X11 connections for.
     */
    screen: number;
}

export interface SocketForwardingConfig {
    socketPath: string;
}

export interface Prompt {
    prompt: string;
    echo?: boolean | undefined;
}

export interface ForwardedTcpip {
    bindAddr: string;
    bindPort: number;
    remoteAddr: string;
    remotePort: number;
}

export interface ForwardedX11 {
    originAddr: string;
    originPort: number;
}

export interface ForwardedSocket {
    socketPath: string;
}

export class SFTPStream extends stream.Transform {
    /**
     * Creates and returns a new SFTPStream instance.
     */
    constructor(remoteIdentRaw: string);

    /**
     * Creates and returns a new SFTPStream instance.
     */
    constructor(cfg?: SFTPStreamConfig, remoteIdentRaw?: string);

    /**
     * Converts string flags (e.g. `'r'`, `'a+'`, etc.) to the appropriate
     * `SFTPStream.OPEN_MODE` flag mask.
     *
     * Returns `null` if conversion failed.
     */
    static stringToFlags(flagsStr: string): number;

    /**
     * Converts flag mask (e.g. number containing `SFTPStream.OPEN_MODE` values) to the
     * appropriate string value.
     *
     * Returns `null` if conversion failed.
     */
    static flagsToString(flagsMask: number): string;

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
    writeFile(
        remotePath: string,
        data: string | Buffer,
        options: WriteFileOptions,
        callback?: (err: any) => void,
    ): void;

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
    open(
        filename: string,
        mode: string,
        attributes: InputAttributes,
        callback: (err: any, handle: Buffer) => void,
    ): boolean;

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
    readData(
        handle: Buffer,
        buffer: Buffer,
        offset: number,
        length: number,
        position: number,
        callback: (err: any, bytesRead: number, buffer: Buffer, position: number) => void,
    ): boolean;

    /**
     * (Client-only)
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    writeData(
        handle: Buffer,
        buffer: Buffer,
        offset: number,
        length: number,
        position: number,
        callback: (err: any) => void,
    ): boolean;

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
     * (Server-only)
     * Sends a status response for the request identified by `id`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    status(reqID: number, statusCode: number, message?: string): boolean;

    /**
     * (Server-only)
     * Sends a handle response for the request identified by `id`.
     *
     * @param handle A handle must be less than 256 bytes and is an opaque value that could
     *          merely contain the value of a backing file descriptor or some other unique,
     *          custom value.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    handle(reqID: number, handle: Buffer): boolean;

    /**
     * (Server-only)
     * Sends a data response for the request identified by `id`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    data(reqID: number, data: string | Buffer, encoding?: string): boolean;

    /**
     * (Server-only)
     * Sends a name response for the request identified by `id`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    name(reqID: number, names: FileEntry[]): boolean;

    /**
     * (Server-only)
     * Sends an attrs response for the request identified by `id`.
     *
     * Returns `false` if you should wait for the `continue` event before sending any more traffic.
     */
    attrs(reqID: number, attrs: Attributes): boolean;

    /**
     * (Client/Server)
     * Emitted after initial protocol version check has passed.
     */
    on(event: "ready", listener: () => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to open a file.
     *
     * Respond with:
     * * `handle()` - This indicates a successful opening of the file and passes the given handle back to the client to use to refer to this open file for future operations (e.g. reading, writing, closing).
     * * `status()` - Use this to indicate a failure to open the requested file.
     */
    on(event: "OPEN", listener: (reqID: number, filename: string, flags: number, attrs: InputAttributes) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to read data from a file handle.
     *
     * Respond with:
     * * `data()` - Use this to send the requested chunk of data back to the client. The amount of data sent is allowed to be less than the `length` requested.
     * * `status()` - Use this to indicate either end of file (`STATUS_CODE.EOF`) has been reached (`offset` is past the end of the file) or if an error occurred while reading the requested part of the file.
     */
    on(event: "READ", listener: (reqID: number, handle: Buffer, offset: number, length: number) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to write data to a file handle.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the write to the file.
     */
    on(event: "WRITE", listener: (reqID: number, handle: Buffer, offset: number, data: Buffer) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests attributes for the resource associated with `handle`.
     *
     * Respond with:
     * * `attrs()` - Use this to send the attributes for the requested file/directory back to the client.
     * * `status()` - Use this to indicate an error occurred while accessing the file/directory.
     */
    on(event: "FSTAT", listener: (reqID: number, handle: Buffer) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to write attributes for the resource associated with `handle`.
     *
     * Respond with:
     * * `status()` - Use this to indicates success/failure of the setting of the given file/directory attributes.
     */
    on(event: "FSETSTAT", listener: (reqID: number, handle: Buffer, attrs: InputAttributes) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to close a handle.
     *
     * Respond with:
     * * `status()` - Use this to indicate success (`STATUS_CODE.OK`) or failure of the closing of the file identified by `handle`.
     */
    on(event: "CLOSE", listener: (reqID: number, handle: Buffer) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to open a directory.
     *
     * Respond with:
     * * `handle()` - This indicates a successful opening of the directory and passes the given handle back to the client to use to refer to this open directory for future operations (e.g. reading directory contents, closing).
     * * `status()` - Use this to indicate a failure to open the requested directory.
     */
    on(event: "OPENDIR", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to read the contents of a directory.
     *
     * Respond with:
     * * `name()` - Use this to send one or more directory listings for the open directory back to the client.
     * * `status()` - Use this to indicate either end of directory contents (`STATUS_CODE.EOF`) or if an error occurred while reading the directory contents.
     */
    on(event: "READDIR", listener: (reqID: number, handle: Buffer) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests attributes for a path. If `path` is a symlink, the
     * link itself should stat'ed instead of the resource it refers to.
     *
     * Respond with:
     * * `attrs()` - Use this to send the attributes for the requested file/directory back to the client.
     * * `status()` - Use this to indicate an error occurred while accessing the file/directory.
     */
    on(event: "LSTAT", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests attributes for a path.
     *
     * Respond with:
     * * `attrs()` - Use this to send the attributes for the requested file/directory back to the client.
     * * `status()` - Use this to indicate an error occurred while accessing the file/directory.
     */
    on(event: "STAT", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to delete a file or symlink.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the removal of the file at `path`.
     */
    on(event: "REMOVE", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to remove a directory.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the removal of the directory at `path`.
     */
    on(event: "RMDIR", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests the absolute path for a path.
     *
     * Respond with:
     * * `name()` - Use this to respond with a normalized version of `path`. No file/directory attributes are required to be sent in this response.
     * * `status()` - Use this to indicate a failure in normalizing `path`.
     */
    on(event: "REALPATH", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests the target for a symlink at `path`.
     *
     * Respond with:
     * * `name()` - Use this to respond with the target of the symlink at `path`. No file/directory attributes are required to be sent in this response.
     * * `status()` - Use this to indicate a failure in reading the symlink at `path`.
     */
    on(event: "READLINK", listener: (reqID: number, path: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests to set the attributes defined in `attrs` for `path`.
     *
     * Respond with:
     * * `status()` - Use this to indicates success/failure of the setting of the given file/directory attributes.
     */
    on(event: "SETSTAT", listener: (reqID: number, path: string, attrs: InputAttributes) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests a new directory be created.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the creation of the directory at `path`.
     */
    on(event: "MKDIR", listener: (reqID: number, path: string, attrs: InputAttributes) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests a path be renamed.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the renaming of the file/directory at `oldPath` to `newPath`.
     */
    on(event: "RENAME", listener: (reqID: number, oldPath: string, newPath: string) => void): this;

    /**
     * (Server-only)
     * Emitted when the client requests a new symlink be created for a path.
     *
     * Respond with:
     * * `status()` - Use this to indicate success/failure of the symlink creation.
     */
    on(event: "SYMLINK", listener: (reqID: number, linkPath: string, targetPath: string) => void): this;

    /**
     * Emitted when the socket has disconnected.
     */
    on(event: "end", listener: () => void): this;

    /**
     * Emitted when the client socket was closed.
     */
    on(event: "close", listener: () => void): this;

    /**
     * Emitted when more requests/data can be sent to the stream.
     */
    on(event: "continue", listener: () => void): this;

    /**
     * Emitted when an error occurred.
     */
    on(event: "error", listener: (err: any) => void): this;

    on(event: string | symbol, listener: Function): this;
}

export namespace SFTPStream {
    /**
     * Contains the various status codes (for use especially with SFTPStream#status())
     */
    export enum STATUS_CODE {
        OK = 0,
        EOF = 1,
        NO_SUCH_FILE = 2,
        PERMISSION_DENIED = 3,
        FAILURE = 4,
        BAD_MESSAGE = 5,
        NO_CONNECTION = 6,
        CONNECTION_LOST = 7,
        OP_UNSUPPORTED = 8,
    }

    /**
     * Contains the various open file flags
     */
    export enum OPEN_MODE {
        READ = 0x00000001,
        WRITE = 0x00000002,
        APPEND = 0x00000004,
        CREAT = 0x00000008,
        TRUNC = 0x00000010,
        EXCL = 0x00000020,
    }
}

export interface SFTPStreamConfig {
    /**
     * Set to true to create an instance in server mode.
     */
    server?: boolean | undefined;

    /**
     * This is the highWaterMark to use for the stream.
     */
    highWaterMark?: number | undefined;

    /**
     * Set this to a function that receives a single string argument to get detailed (local) debug information.
     */
    debug?: ((information: string) => any) | undefined;
}

export interface TransferOptions {
    /**
     * Number of concurrent reads
     */
    concurrency?: number | undefined;

    /**
     * Size of each read in bytes
     */
    chunkSize?: number | undefined;

    /**
     * Called every time a part of a file was transferred
     */
    step?: ((total_transferred: number, chunk: number, total: number) => void) | undefined;

    /**
     * Integer or string representing the file mode to set for the uploaded file.
     */
    mode?: number | string | undefined;
}

export interface ReadStreamOptions {
    flags?: string | undefined;
    encoding?: string | undefined;
    handle?: Buffer | undefined;
    mode?: number | undefined;
    autoClose?: boolean | undefined;
    start?: number | undefined;
    end?: number | undefined;
}

export interface WriteStreamOptions {
    flags?: string | undefined;
    encoding?: string | undefined;
    mode?: number | undefined;
}

export interface FileEntry {
    filename: string;
    longname: string;
    attrs: Attributes;
}

export interface InputAttributes {
    mode?: number | string | undefined;
    uid?: number | undefined;
    gid?: number | undefined;
    size?: number | undefined;
    atime?: number | Date | undefined;
    mtime?: number | Date | undefined;
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

export namespace utils {
    export function parseKey(keyData: string | Buffer, passphrase?: string): ParsedKey | ParsedKey[] | Error | null;
}

export interface ParsedKey {
    type: string;
    comment: string;
    getPrivatePEM(): string;
    getPublicPEM(): string;
    getPublicSSH(): string;
    sign(data: string | Buffer): Buffer | Error;
    verify(data: string | Buffer, signature: Buffer): boolean | Error;
}

export interface ReadFileOptions {
    encoding?: string | undefined;
    flag?: string | undefined;
}

export interface WriteFileOptions {
    encoding?: string | undefined;
    mode?: number | undefined;
    flag?: string | undefined;
}
