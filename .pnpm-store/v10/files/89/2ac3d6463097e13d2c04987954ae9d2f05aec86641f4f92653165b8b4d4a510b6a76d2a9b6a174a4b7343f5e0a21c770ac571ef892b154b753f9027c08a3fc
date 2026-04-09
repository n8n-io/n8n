// Original file: proto/xds/xds/service/orca/v3/orca.proto

import type * as grpc from '../../../../../index'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { OrcaLoadReport as _xds_data_orca_v3_OrcaLoadReport, OrcaLoadReport__Output as _xds_data_orca_v3_OrcaLoadReport__Output } from '../../../../xds/data/orca/v3/OrcaLoadReport';
import type { OrcaLoadReportRequest as _xds_service_orca_v3_OrcaLoadReportRequest, OrcaLoadReportRequest__Output as _xds_service_orca_v3_OrcaLoadReportRequest__Output } from '../../../../xds/service/orca/v3/OrcaLoadReportRequest';

/**
 * Out-of-band (OOB) load reporting service for the additional load reporting
 * agent that does not sit in the request path. Reports are periodically sampled
 * with sufficient frequency to provide temporal association with requests.
 * OOB reporting compensates the limitation of in-band reporting in revealing
 * costs for backends that do not provide a steady stream of telemetry such as
 * long running stream operations and zero QPS services. This is a server
 * streaming service, client needs to terminate current RPC and initiate
 * a new call to change backend reporting frequency.
 */
export interface OpenRcaServiceClient extends grpc.Client {
  StreamCoreMetrics(argument: _xds_service_orca_v3_OrcaLoadReportRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_xds_data_orca_v3_OrcaLoadReport__Output>;
  StreamCoreMetrics(argument: _xds_service_orca_v3_OrcaLoadReportRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_xds_data_orca_v3_OrcaLoadReport__Output>;
  streamCoreMetrics(argument: _xds_service_orca_v3_OrcaLoadReportRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_xds_data_orca_v3_OrcaLoadReport__Output>;
  streamCoreMetrics(argument: _xds_service_orca_v3_OrcaLoadReportRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_xds_data_orca_v3_OrcaLoadReport__Output>;
  
}

/**
 * Out-of-band (OOB) load reporting service for the additional load reporting
 * agent that does not sit in the request path. Reports are periodically sampled
 * with sufficient frequency to provide temporal association with requests.
 * OOB reporting compensates the limitation of in-band reporting in revealing
 * costs for backends that do not provide a steady stream of telemetry such as
 * long running stream operations and zero QPS services. This is a server
 * streaming service, client needs to terminate current RPC and initiate
 * a new call to change backend reporting frequency.
 */
export interface OpenRcaServiceHandlers extends grpc.UntypedServiceImplementation {
  StreamCoreMetrics: grpc.handleServerStreamingCall<_xds_service_orca_v3_OrcaLoadReportRequest__Output, _xds_data_orca_v3_OrcaLoadReport>;
  
}

export interface OpenRcaServiceDefinition extends grpc.ServiceDefinition {
  StreamCoreMetrics: MethodDefinition<_xds_service_orca_v3_OrcaLoadReportRequest, _xds_data_orca_v3_OrcaLoadReport, _xds_service_orca_v3_OrcaLoadReportRequest__Output, _xds_data_orca_v3_OrcaLoadReport__Output>
}
