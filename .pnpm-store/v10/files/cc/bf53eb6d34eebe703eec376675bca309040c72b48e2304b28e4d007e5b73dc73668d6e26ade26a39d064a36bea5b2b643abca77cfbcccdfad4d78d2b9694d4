declare function isUnsafePort(port: number): boolean;
declare function isSafePort(port: number): boolean;

interface GetPortOptions {
    name: string;
    random: boolean;
    port: number;
    ports: number[];
    portRange: [from: number, to: number];
    alternativePortRange: [from: number, to: number];
    host: string;
    verbose?: boolean;
}
type GetPortInput = Partial<GetPortOptions> | number | string;
type HostAddress = undefined | string;
type PortNumber = number;
declare function getPort(config?: GetPortInput): Promise<PortNumber>;
declare function getRandomPort(host?: HostAddress): Promise<number>;
interface WaitForPortOptions {
    host?: HostAddress;
    delay?: number;
    retries?: number;
}
declare function waitForPort(port: PortNumber, options?: WaitForPortOptions): Promise<void>;
declare function checkPort(port: PortNumber, host?: HostAddress | HostAddress[], _verbose?: boolean): Promise<PortNumber | false>;

export { GetPortInput, GetPortOptions, HostAddress, PortNumber, WaitForPortOptions, checkPort, getPort, getRandomPort, isSafePort, isUnsafePort, waitForPort };
