interface Options {
    tdsVersion: number;
    packetSize: number;
    clientProgVer: number;
    clientPid: number;
    connectionId: number;
    clientTimeZone: number;
    clientLcid: number;
}
declare class Login7Payload {
    tdsVersion: number;
    packetSize: number;
    clientProgVer: number;
    clientPid: number;
    connectionId: number;
    clientTimeZone: number;
    clientLcid: number;
    readOnlyIntent: boolean;
    initDbFatal: boolean;
    userName: string | undefined;
    password: string | undefined;
    serverName: string | undefined;
    appName: string | undefined;
    hostname: string | undefined;
    libraryName: string | undefined;
    language: string | undefined;
    database: string | undefined;
    clientId: Buffer | undefined;
    sspi: Buffer | undefined;
    attachDbFile: string | undefined;
    changePassword: string | undefined;
    fedAuth: {
        type: 'ADAL';
        echo: boolean;
        workflow: 'default' | 'integrated';
    } | {
        type: 'SECURITYTOKEN';
        echo: boolean;
        fedAuthToken: string;
    } | undefined;
    constructor({ tdsVersion, packetSize, clientProgVer, clientPid, connectionId, clientTimeZone, clientLcid }: Options);
    toBuffer(): Buffer<ArrayBuffer>;
    buildOptionFlags1(): number;
    buildFeatureExt(): Buffer<ArrayBuffer>;
    buildOptionFlags2(): number;
    buildTypeFlags(): number;
    buildOptionFlags3(): number;
    scramblePassword(password: Buffer): Buffer<ArrayBufferLike>;
    toString(indent?: string): string;
}
export default Login7Payload;
