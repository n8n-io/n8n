/**
 * Get UUID string from OpenTelemetry trace ID hex string.
 * @param traceId - The hex string trace ID to convert
 * @returns UUID string representation
 */
export function getUuidFromOtelTraceId(traceId) {
    // Insert hyphens to convert back to UUID format
    return `${traceId.substring(0, 8)}-${traceId.substring(8, 12)}-${traceId.substring(12, 16)}-${traceId.substring(16, 20)}-${traceId.substring(20, 32)}`;
}
/**
 * Get UUID string from OpenTelemetry span ID hex string.
 * @param spanId - The hex string span ID to convert (8 bytes/16 hex chars)
 * @returns UUID string representation with zero padding at the front
 */
export function getUuidFromOtelSpanId(spanId) {
    // Pad with zeros at the front, then format as UUID
    const paddedHex = spanId.padStart(16, "0");
    return `00000000-0000-0000-${paddedHex.substring(0, 4)}-${paddedHex.substring(4, 16)}`;
}
