/**
 * Transport-scoped session data storage (only for transports with sessionId)
 * @internal Maps transport instances to session-level data
 */
const transportToSessionData = new WeakMap();

/**
 * Stores session data for a transport with sessionId
 * @param transport - MCP transport instance
 * @param sessionData - Session data to store
 */
function storeSessionDataForTransport(transport, sessionData) {
  if (transport.sessionId) {
    transportToSessionData.set(transport, sessionData);
  }
}

/**
 * Updates session data for a transport with sessionId (merges with existing data)
 * @param transport - MCP transport instance
 * @param partialSessionData - Partial session data to merge with existing data
 */
function updateSessionDataForTransport(transport, partialSessionData) {
  if (transport.sessionId) {
    const existingData = transportToSessionData.get(transport) || {};
    transportToSessionData.set(transport, { ...existingData, ...partialSessionData });
  }
}

/**
 * Retrieves client information for a transport
 * @param transport - MCP transport instance
 * @returns Client information if available
 */
function getClientInfoForTransport(transport) {
  return transportToSessionData.get(transport)?.clientInfo;
}

/**
 * Retrieves protocol version for a transport
 * @param transport - MCP transport instance
 * @returns Protocol version if available
 */
function getProtocolVersionForTransport(transport) {
  return transportToSessionData.get(transport)?.protocolVersion;
}

/**
 * Retrieves full session data for a transport
 * @param transport - MCP transport instance
 * @returns Complete session data if available
 */
function getSessionDataForTransport(transport) {
  return transportToSessionData.get(transport);
}

/**
 * Cleans up session data for a specific transport (when that transport closes)
 * @param transport - MCP transport instance
 */
function cleanupSessionDataForTransport(transport) {
  transportToSessionData.delete(transport);
}

export { cleanupSessionDataForTransport, getClientInfoForTransport, getProtocolVersionForTransport, getSessionDataForTransport, storeSessionDataForTransport, updateSessionDataForTransport };
//# sourceMappingURL=sessionManagement.js.map
