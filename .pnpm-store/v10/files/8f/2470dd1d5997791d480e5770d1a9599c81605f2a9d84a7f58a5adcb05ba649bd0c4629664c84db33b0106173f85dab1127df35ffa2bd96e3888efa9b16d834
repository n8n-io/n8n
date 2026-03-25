export type PortWithBinding = {
    container: number;
    host: number;
    protocol?: "tcp" | "udp";
};
export type PortWithOptionalBinding = number | `${number}/${"tcp" | "udp"}` | PortWithBinding;
export declare const getContainerPort: (port: PortWithOptionalBinding) => number;
export declare const hasHostBinding: (port: PortWithOptionalBinding) => port is PortWithBinding;
export declare const getProtocol: (port: PortWithOptionalBinding) => string;
