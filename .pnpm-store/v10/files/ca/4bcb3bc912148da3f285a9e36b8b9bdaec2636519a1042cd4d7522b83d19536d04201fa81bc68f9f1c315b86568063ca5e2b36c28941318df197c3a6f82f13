import { Client } from "ssh2";
export declare class SshConnection {
    private readonly client;
    constructor(client: Client);
    remoteForward(remoteAddress: string, remotePort: number): Promise<void>;
    ref(): void;
    unref(): void;
    private getSocket;
}
