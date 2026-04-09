/**
 * Session-scoped data storage for stateful transports (with sessionId)
 * @internal Using sessionId as key handles wrapper transport patterns
 */
const sessionToSessionData = new Map();

/**
 * Transport-scoped data storage fallback for stateless transports (no sessionId)
 * @internal WeakMap allows automatic cleanup when transport is garbage collected
 */
const statelessSessionData = new WeakMap();

/**
 * Gets session data for a transport, checking sessionId first then fallback
 * @internal
 */
function getSessionData(transport) {
  const sessionId = transport.sessionId;
  if (sessionId) {
    return sessionToSessionData.get(sessionId);
  }
  return statelessSessionData.get(transport);
}

/**
 * Sets session data for a transport, using sessionId when available
 * @internal
 */
function setSessionData(transport, data) {
  const sessionId = transport.sessionId;
  if (sessionId) {
    sessionToSessionData.set(sessionId, data);
  } else {
    statelessSessionData.set(transport, data);
  }
}

/**
 * Stores session data for a transport
 * @param transport - MCP transport instance
 * @param sessionData - Session data to store
 */
function storeSessionDataForTransport(transport, sessionData) {
  // For stateful transports, always store (sessionId is the key)
  // For stateless transports, also store (transport instance is the key)
  setSessionData(transport, sessionData);
}

/**
 * Updates session data for a transport (merges with existing data)
 * @param transport - MCP transport instance
 * @param partialSessionData - Partial session data to merge with existing data
 */
function updateSessionDataForTransport(transport, partialSessionData) {
  const existingData = getSessionData(transport) || {};
  setSessionData(transport, { ...existingData, ...partialSessionData });
}

/**
 * Retrieves client information for a transport
 * @param transport - MCP transport instance
 * @returns Client information if available
 */
function getClientInfoForTransport(transport) {
  return getSessionData(transport)?.clientInfo;
}

/**
 * Retrieves protocol version for a transport
 * @param transport - MCP transport instance
 * @returns Protocol version if available
 */
function getProtocolVersionForTransport(transport) {
  return getSessionData(transport)?.protocolVersion;
}

/**
 * Retrieves full session data for a transport
 * @param transport - MCP transport instance
 * @returns Complete session data if available
 */
function getSessionDataForTransport(transport) {
  return getSessionData(transport);
}

/**
 * Cleans up session data for a specific transport (when that transport closes)
 * @param transport - MCP transport instance
 */
function cleanupSessionDataForTransport(transport) {
  const sessionId = transport.sessionId;
  if (sessionId) {
    sessionToSessionData.delete(sessionId);
  }
  // Note: WeakMap entries are automatically cleaned up when transport is GC'd
  // No explicit delete needed for statelessSessionData
}

export { cleanupSessionDataForTransport, getClientInfoForTransport, getProtocolVersionForTransport, getSessionDataForTransport, storeSessionDataForTransport, updateSessionDataForTransport };
//# sourceMappingURL=sessionManagement.js.map
