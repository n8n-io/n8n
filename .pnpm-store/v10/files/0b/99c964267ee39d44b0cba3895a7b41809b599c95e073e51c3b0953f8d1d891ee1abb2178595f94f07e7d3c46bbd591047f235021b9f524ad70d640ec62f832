export interface PortGenerator {
    generatePort(): Promise<number>;
}
export declare class RandomPortGenerator {
    generatePort(): Promise<number>;
}
export declare class FixedPortGenerator implements PortGenerator {
    private readonly ports;
    private portIndex;
    constructor(ports: number[]);
    generatePort(): Promise<number>;
}
