/// <reference types="node" />
/// <reference types="node" />
import SSH2, { AcceptConnection, Channel, ClientChannel, ConnectConfig, ExecOptions, Prompt, PseudoTtyOptions, RejectConnection, SFTPWrapper, ShellOptions, TcpConnectionDetails, TransferOptions, UNIXConnectionDetails } from 'ssh2';
import stream from 'stream';
export type Config = ConnectConfig & {
    password?: string;
    privateKey?: string;
    privateKeyPath?: string;
    tryKeyboard?: boolean;
    onKeyboardInteractive?: (name: string, instructions: string, lang: string, prompts: Prompt[], finish: (responses: string[]) => void) => void;
};
export interface SSHExecCommandOptions {
    cwd?: string;
    stdin?: string | stream.Readable;
    execOptions?: ExecOptions;
    encoding?: BufferEncoding;
    noTrim?: boolean;
    onChannel?: (clientChannel: ClientChannel) => void;
    onStdout?: (chunk: Buffer) => void;
    onStderr?: (chunk: Buffer) => void;
}
export interface SSHExecCommandResponse {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
}
export interface SSHExecOptions extends SSHExecCommandOptions {
    stream?: 'stdout' | 'stderr' | 'both';
}
export interface SSHPutFilesOptions {
    sftp?: SFTPWrapper | null;
    concurrency?: number;
    transferOptions?: TransferOptions;
}
export interface SSHGetPutDirectoryOptions extends SSHPutFilesOptions {
    tick?: (localFile: string, remoteFile: string, error: Error | null) => void;
    validate?: (path: string) => boolean;
    recursive?: boolean;
}
export type SSHMkdirMethod = 'sftp' | 'exec';
export type SSHForwardInListener = (details: TcpConnectionDetails, accept: AcceptConnection<ClientChannel>, reject: RejectConnection) => void;
export interface SSHForwardInDetails {
    dispose(): Promise<void>;
    port: number;
}
export type SSHForwardInStreamLocalListener = (info: UNIXConnectionDetails, accept: AcceptConnection, reject: RejectConnection) => void;
export interface SSHForwardInStreamLocalDetails {
    dispose(): Promise<void>;
}
export declare class SSHError extends Error {
    code: string | null;
    constructor(message: string, code?: string | null);
}
export declare class NodeSSH {
    connection: SSH2.Client | null;
    private getConnection;
    connect(givenConfig: Config): Promise<this>;
    isConnected(): boolean;
    requestShell(options?: PseudoTtyOptions | ShellOptions | false): Promise<ClientChannel>;
    withShell(callback: (channel: ClientChannel) => Promise<void>, options?: PseudoTtyOptions | ShellOptions | false): Promise<void>;
    requestSFTP(): Promise<SFTPWrapper>;
    withSFTP(callback: (sftp: SFTPWrapper) => Promise<void>): Promise<void>;
    execCommand(givenCommand: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse>;
    exec(command: string, parameters: string[], options?: SSHExecOptions & {
        stream?: 'stdout' | 'stderr';
    }): Promise<string>;
    exec(command: string, parameters: string[], options?: SSHExecOptions & {
        stream: 'both';
    }): Promise<SSHExecCommandResponse>;
    mkdir(path: string, method?: SSHMkdirMethod, givenSftp?: SFTPWrapper | null): Promise<void>;
    getFile(localFile: string, remoteFile: string, givenSftp?: SFTPWrapper | null, transferOptions?: TransferOptions | null): Promise<void>;
    putFile(localFile: string, remoteFile: string, givenSftp?: SFTPWrapper | null, transferOptions?: TransferOptions | null): Promise<void>;
    putFiles(files: {
        local: string;
        remote: string;
    }[], { concurrency, sftp: givenSftp, transferOptions }?: SSHPutFilesOptions): Promise<void>;
    putDirectory(localDirectory: string, remoteDirectory: string, { concurrency, sftp: givenSftp, transferOptions, recursive, tick, validate, }?: SSHGetPutDirectoryOptions): Promise<boolean>;
    getDirectory(localDirectory: string, remoteDirectory: string, { concurrency, sftp: givenSftp, transferOptions, recursive, tick, validate, }?: SSHGetPutDirectoryOptions): Promise<boolean>;
    forwardIn(remoteAddr: string, remotePort: number, onConnection?: SSHForwardInListener): Promise<SSHForwardInDetails>;
    forwardOut(srcIP: string, srcPort: number, dstIP: string, dstPort: number): Promise<Channel>;
    forwardInStreamLocal(socketPath: string, onConnection?: SSHForwardInStreamLocalListener): Promise<SSHForwardInStreamLocalDetails>;
    forwardOutStreamLocal(socketPath: string): Promise<Channel>;
    dispose(): void;
}
