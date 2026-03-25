interface GetPortOptions {
    name: string;
    random: boolean;
    port: number;
    ports: number[];
    portRange: [fromInclusive: number, toInclusive: number];
    alternativePortRange: [fromInclusive: number, toInclusive: number];
    host: string;
    verbose?: boolean;
    public?: boolean;
}
interface WaitForPortOptions {
    host?: HostAddress;
    delay?: number;
    retries?: number;
}
type GetPortInput = Partial<GetPortOptions> | number | string;
type HostAddress = undefined | string;
type PortNumber = number;

declare function getPort(_userOptions?: GetPortInput): Promise<PortNumber>;
declare function getRandomPort(host?: HostAddress): Promise<number>;
declare function waitForPort(port: PortNumber, options?: WaitForPortOptions): Promise<void>;
declare function checkPort(port: PortNumber, host?: HostAddress | HostAddress[], verbose?: boolean): Promise<PortNumber | false>;

declare function isUnsafePort(port: number): boolean;
declare function isSafePort(port: number): boolean;

export { type GetPortInput, type GetPortOptions, type HostAddress, type PortNumber, type WaitForPortOptions, checkPort, getPort, getRandomPort, isSafePort, isUnsafePort, waitForPort };
