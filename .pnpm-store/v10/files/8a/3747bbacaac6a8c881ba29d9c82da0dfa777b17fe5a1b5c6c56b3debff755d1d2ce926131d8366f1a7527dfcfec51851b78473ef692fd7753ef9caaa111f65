/// <reference types="node" />
import type { Metadata, ChannelCredentials } from '@grpc/grpc-js';
import { ExportResponse, IExporterTransport } from '@opentelemetry/otlp-exporter-base';
export declare function createInsecureCredentials(): ChannelCredentials;
export declare function createSslCredentials(rootCert?: Buffer, privateKey?: Buffer, certChain?: Buffer): ChannelCredentials;
export declare function createEmptyMetadata(): Metadata;
export interface GrpcExporterTransportParameters {
    grpcPath: string;
    grpcName: string;
    address: string;
    /**
     * NOTE: Ensure that you're only importing/requiring gRPC inside the function providing the channel credentials,
     * otherwise, gRPC and http/https instrumentations may break.
     *
     * For common cases, you can avoid to import/require gRPC your function by using
     *   - {@link createSslCredentials}
     *   - {@link createInsecureCredentials}
     */
    credentials: () => ChannelCredentials;
    /**
     * NOTE: Ensure that you're only importing/requiring gRPC inside the function providing the metadata,
     * otherwise, gRPC and http/https instrumentations may break.
     *
     * To avoid having to import/require gRPC from your function to create a new Metadata object,
     * use {@link createEmptyMetadata}
     */
    metadata: () => Metadata;
    compression: 'gzip' | 'none';
}
export declare class GrpcExporterTransport implements IExporterTransport {
    private _parameters;
    private _client?;
    private _metadata?;
    constructor(_parameters: GrpcExporterTransportParameters);
    shutdown(): void;
    send(data: Uint8Array, timeoutMillis: number): Promise<ExportResponse>;
}
export declare function createOtlpGrpcExporterTransport(options: GrpcExporterTransportParameters): IExporterTransport;
//# sourceMappingURL=grpc-exporter-transport.d.ts.map