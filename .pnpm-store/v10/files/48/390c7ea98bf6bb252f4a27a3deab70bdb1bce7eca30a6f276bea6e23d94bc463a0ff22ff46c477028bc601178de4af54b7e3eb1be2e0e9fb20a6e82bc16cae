Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const attributes = require('./attributes.js');

/**
 * Network PII attributes that should be removed when sendDefaultPii is false
 * @internal
 */
const NETWORK_PII_ATTRIBUTES = new Set([attributes.CLIENT_ADDRESS_ATTRIBUTE, attributes.CLIENT_PORT_ATTRIBUTE, attributes.MCP_RESOURCE_URI_ATTRIBUTE]);

/**
 * Checks if an attribute key should be considered network PII.
 *
 * Returns true for:
 * - client.address (IP address)
 * - client.port (port number)
 * - mcp.resource.uri (potentially sensitive URIs)
 *
 * @param key - Attribute key to evaluate
 * @returns true if the attribute should be filtered out (is network PII), false if it should be preserved
 * @internal
 */
function isNetworkPiiAttribute(key) {
  return NETWORK_PII_ATTRIBUTES.has(key);
}

/**
 * Removes network PII attributes from span data when sendDefaultPii is false
 * @param spanData - Raw span attributes
 * @param sendDefaultPii - Whether to include PII data
 * @returns Filtered span attributes
 */
function filterMcpPiiFromSpanData(
  spanData,
  sendDefaultPii,
) {
  if (sendDefaultPii) {
    return spanData ;
  }

  return Object.entries(spanData).reduce(
    (acc, [key, value]) => {
      if (!isNetworkPiiAttribute(key)) {
        acc[key] = value ;
      }
      return acc;
    },
    {} ,
  );
}

exports.filterMcpPiiFromSpanData = filterMcpPiiFromSpanData;
//# sourceMappingURL=piiFiltering.js.map
