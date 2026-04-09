export interface IncludeExclude {
    /**
     * Configure list of attribute key patterns to include from resource detectors.
     * Attribute keys from resource detectors are evaluated to match as follows:
     *   * If the value of the attribute key exactly matches.
     *   * If the value of the attribute key matches the wildcard pattern, where '?' matches any single character and '*' matches any number of characters including none.
     * If omitted, all attributes are included.
     */
    included?: string[];
    /**
     * Configure list of attribute key patterns to exclude from resource detectors. Applies after .resource.detectors.attributes.included (i.e. excluded has higher priority than included).
     * Attribute keys from resource detectors are evaluated to match as follows:
     *   * If the value of the attribute key exactly matches.
     *   * If the value of the attribute key matches the wildcard pattern, where '?' matches any single character and '*' matches any number of characters including none.
     * If omitted, .included attributes are included.
     */
    excluded?: string[];
}
export interface NameStringValuePair {
    name: string;
    value: string;
}
export interface OtlpHttpExporter {
    /**
     * Configure endpoint, including the trace, metric or log specific path.
     * If omitted or null, http://localhost:4318/v1/traces is used for trace,
     * http://localhost:4318/v1/metrics for metrics
     * and http://localhost:4318/v1/logs is used for logs.
     */
    endpoint?: string;
    /**
     * Configure TLS settings for the exporter.
     */
    tls?: HttpTls;
    /**
     * Configure compression.
     * Values include: gzip, none. Implementations may support other compression algorithms.
     * If omitted or null, none is used.
     */
    compression?: string;
    /**
     * Configure max time (in milliseconds) to wait for each export.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 10000 is used.
     */
    timeout?: number;
    /**
     * Configure headers. Entries have higher priority than entries from .headers_list.
     * If an entry's .value is null, the entry is ignored.
     */
    headers?: NameStringValuePair[];
    /**
     * Configure headers. Entries have lower priority than entries from .headers.
     * The value is a list of comma separated key-value pairs matching the format of OTEL_EXPORTER_OTLP_HEADERS.
     * If omitted or null, no headers are added.
     */
    headers_list?: string;
    /**
     * Configure the encoding used for messages.
     * Values include: protobuf, json. Implementations may not support json.
     * If omitted or null, protobuf is used.
     */
    encoding?: OtlpHttpEncoding;
}
export declare enum OtlpHttpEncoding {
    JSON = "json",
    Protobuf = "protobuf"
}
export interface OtlpGrpcExporter {
    /**
     * Configure endpoint.
     * If omitted or null, http://localhost:4317 is used.
     */
    endpoint?: string;
    /**
     * Configure TLS settings for the exporter.
     */
    tls?: GrpcTls;
    /**
     * Configure headers. Entries have higher priority than entries from .headers_list.
     * If an entry's .value is null, the entry is ignored.
     */
    headers?: NameStringValuePair[];
    /**
     * Configure headers. Entries have lower priority than entries from .headers.
     * The value is a list of comma separated key-value pairs matching the format of OTEL_EXPORTER_OTLP_HEADERS.
     * If omitted or null, no headers are added.
     */
    headers_list?: string;
    /**
     * Configure compression.
     * Values include: gzip, none. Implementations may support other compression algorithms.
     * If omitted or null, none is used.
     */
    compression?: string;
    /**
     * Configure max time (in milliseconds) to wait for each export.
     * Value must be non-negative. A value of 0 indicates no limit (infinity).
     * If omitted or null, 10000 is used.
     */
    timeout?: number;
}
export interface ExperimentalOtlpFileExporter {
    /**
     * Configure output stream.
     * Values include stdout, or scheme+destination. For example: file:///path/to/file.jsonl.
     * If omitted or null, stdout is used.
     */
    output_stream?: string;
}
export interface HttpTls {
    /**
     * Configure certificate used to verify a server's TLS credentials.
     * Absolute path to certificate file in PEM format.
     * If omitted or null, system default certificate verification is used for secure connections.
     */
    ca_file?: string;
    /**
     * Configure mTLS private client key.
     * Absolute path to client key file in PEM format. If set, .client_certificate must also be set.
     * If omitted or null, mTLS is not used.
     */
    key_file?: string;
    /**
     * Configure mTLS client certificate.
     * Absolute path to client certificate file in PEM format. If set, .client_key must also be set.
     * If omitted or null, mTLS is not used.
     */
    cert_file?: string;
}
export interface GrpcTls {
    /**
     * Configure certificate used to verify a server's TLS credentials.
     * Absolute path to certificate file in PEM format.
     * If omitted or null, system default certificate verification is used for secure connections.
     */
    ca_file?: string;
    /**
     * Configure mTLS private client key.
     * Absolute path to client key file in PEM format. If set, .client_certificate must also be set.
     * If omitted or null, mTLS is not used.
     */
    key_file?: string;
    /**
     * Configure mTLS client certificate.
     * Absolute path to client certificate file in PEM format. If set, .client_key must also be set.
     * If omitted or null, mTLS is not used.
     */
    cert_file?: string;
    /**
     * Configure client transport security for the exporter's connection.
     * Only applicable when .endpoint is provided without http or https scheme. Implementations may choose to ignore .insecure.
     * If omitted or null, false is used.
     */
    insecure?: boolean;
}
export declare enum SeverityNumber {
    DEBUG = "debug",
    DEBUG2 = "debug2",
    DEBUG3 = "debug3",
    DEBUG4 = "debug4",
    ERROR = "error",
    ERROR2 = "error2",
    ERROR3 = "error3",
    ERROR4 = "error4",
    FATAL = "fatal",
    FATAL2 = "fatal2",
    FATAL3 = "fatal3",
    FATAL4 = "fatal4",
    INFO = "info",
    INFO2 = "info2",
    INFO3 = "info3",
    INFO4 = "info4",
    TRACE = "trace",
    TRACE2 = "trace2",
    TRACE3 = "trace3",
    TRACE4 = "trace4",
    WARN = "warn",
    WARN2 = "warn2",
    WARN3 = "warn3",
    WARN4 = "warn4"
}
//# sourceMappingURL=commonModel.d.ts.map