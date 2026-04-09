// Original file: proto/xds/xds/data/orca/v3/orca_load_report.proto

import type { Long } from '@grpc/proto-loader';

export interface OrcaLoadReport {
  /**
   * CPU utilization expressed as a fraction of available CPU resources. This
   * should be derived from the latest sample or measurement. The value may be
   * larger than 1.0 when the usage exceeds the reporter dependent notion of
   * soft limits.
   */
  'cpu_utilization'?: (number | string);
  /**
   * Memory utilization expressed as a fraction of available memory
   * resources. This should be derived from the latest sample or measurement.
   */
  'mem_utilization'?: (number | string);
  /**
   * Total RPS being served by an endpoint. This should cover all services that an endpoint is
   * responsible for.
   * Deprecated -- use ``rps_fractional`` field instead.
   * @deprecated
   */
  'rps'?: (number | string | Long);
  /**
   * Application specific requests costs. Each value is an absolute cost (e.g. 3487 bytes of
   * storage) associated with the request.
   */
  'request_cost'?: ({[key: string]: number | string});
  /**
   * Resource utilization values. Each value is expressed as a fraction of total resources
   * available, derived from the latest sample or measurement.
   */
  'utilization'?: ({[key: string]: number | string});
  /**
   * Total RPS being served by an endpoint. This should cover all services that an endpoint is
   * responsible for.
   */
  'rps_fractional'?: (number | string);
  /**
   * Total EPS (errors/second) being served by an endpoint. This should cover
   * all services that an endpoint is responsible for.
   */
  'eps'?: (number | string);
  /**
   * Application specific opaque metrics.
   */
  'named_metrics'?: ({[key: string]: number | string});
  /**
   * Application specific utilization expressed as a fraction of available
   * resources. For example, an application may report the max of CPU and memory
   * utilization for better load balancing if it is both CPU and memory bound.
   * This should be derived from the latest sample or measurement.
   * The value may be larger than 1.0 when the usage exceeds the reporter
   * dependent notion of soft limits.
   */
  'application_utilization'?: (number | string);
}

export interface OrcaLoadReport__Output {
  /**
   * CPU utilization expressed as a fraction of available CPU resources. This
   * should be derived from the latest sample or measurement. The value may be
   * larger than 1.0 when the usage exceeds the reporter dependent notion of
   * soft limits.
   */
  'cpu_utilization': (number);
  /**
   * Memory utilization expressed as a fraction of available memory
   * resources. This should be derived from the latest sample or measurement.
   */
  'mem_utilization': (number);
  /**
   * Total RPS being served by an endpoint. This should cover all services that an endpoint is
   * responsible for.
   * Deprecated -- use ``rps_fractional`` field instead.
   * @deprecated
   */
  'rps': (string);
  /**
   * Application specific requests costs. Each value is an absolute cost (e.g. 3487 bytes of
   * storage) associated with the request.
   */
  'request_cost': ({[key: string]: number});
  /**
   * Resource utilization values. Each value is expressed as a fraction of total resources
   * available, derived from the latest sample or measurement.
   */
  'utilization': ({[key: string]: number});
  /**
   * Total RPS being served by an endpoint. This should cover all services that an endpoint is
   * responsible for.
   */
  'rps_fractional': (number);
  /**
   * Total EPS (errors/second) being served by an endpoint. This should cover
   * all services that an endpoint is responsible for.
   */
  'eps': (number);
  /**
   * Application specific opaque metrics.
   */
  'named_metrics': ({[key: string]: number});
  /**
   * Application specific utilization expressed as a fraction of available
   * resources. For example, an application may report the max of CPU and memory
   * utilization for better load balancing if it is both CPU and memory bound.
   * This should be derived from the latest sample or measurement.
   * The value may be larger than 1.0 when the usage exceeds the reporter
   * dependent notion of soft limits.
   */
  'application_utilization': (number);
}
