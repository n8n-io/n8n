import { SshConnection } from "ssh-remote-port-forward";
export declare const SSHD_IMAGE: string;
declare class PortForwarder {
    private readonly sshConnection;
    private readonly containerId;
    private readonly networkId;
    private readonly ipAddress;
    private readonly networkName;
    constructor(sshConnection: SshConnection, containerId: string, networkId: string, ipAddress: string, networkName: string);
    exposeHostPort(port: number): Promise<void>;
    getContainerId(): string;
    getNetworkId(): string;
    getIpAddress(): string;
}
export declare class PortForwarderInstance {
    private static readonly USERNAME;
    private static readonly PASSWORD;
    private static instance;
    static isRunning(): boolean;
    static getInstance(): Promise<PortForwarder>;
    private static findPortForwarderContainer;
    private static reuseInstance;
    private static createInstance;
}
export {};
