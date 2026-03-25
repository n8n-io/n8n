/**
 * Event names used by Agent365Exporter for logging and monitoring.
 * These are low-cardinality event types to ensure efficient monitoring and aggregation.
 */
export declare enum ExporterEventNames {
    /**
     * Overall export operation event - logs the entire batch export success/failure and duration
     */
    EXPORT = "agent365-export",
    /**
     * Group export operation event - logs individual tenant/agent group export success/failure and duration.
     * Contextual information (tenantId, agentId, correlationId) should be passed in the details parameter.
     */
    EXPORT_GROUP = "export-group",
    /**
     * Tracked spans being skipped due to missing tenant or agent ID. Before export event, spans are partitioned by identity (tenant or agent ID) first.
     */
    EXPORT_PARTITION_SPAN_MISSING_IDENTITY = "export-partition-span-missing-identity"
}
//# sourceMappingURL=ExporterEventNames.d.ts.map