import { MCP_PROTOCOL_VERSION_ATTRIBUTE, CLIENT_PORT_ATTRIBUTE, CLIENT_ADDRESS_ATTRIBUTE, MCP_SESSION_ID_ATTRIBUTE, NETWORK_PROTOCOL_VERSION_ATTRIBUTE, NETWORK_TRANSPORT_ATTRIBUTE, MCP_TRANSPORT_ATTRIBUTE, MCP_SERVER_NAME_ATTRIBUTE, MCP_SERVER_TITLE_ATTRIBUTE, MCP_SERVER_VERSION_ATTRIBUTE } from './attributes.js';
import { getProtocolVersionForTransport, getClientInfoForTransport, getSessionDataForTransport } from './sessionManagement.js';
import { isValidContentItem } from './validation.js';

/**
 * Session and party info extraction functions for MCP server instrumentation
 *
 * Handles extraction of client/server info and session data from MCP messages.
 */


/**
 * Extracts and validates PartyInfo from an unknown object
 * @param obj - Unknown object that might contain party info
 * @returns Validated PartyInfo object with only string properties
 */
function extractPartyInfo(obj) {
  const partyInfo = {};

  if (isValidContentItem(obj)) {
    if (typeof obj.name === 'string') {
      partyInfo.name = obj.name;
    }
    if (typeof obj.title === 'string') {
      partyInfo.title = obj.title;
    }
    if (typeof obj.version === 'string') {
      partyInfo.version = obj.version;
    }
  }

  return partyInfo;
}

/**
 * Extracts session data from "initialize" requests
 * @param request - JSON-RPC "initialize" request containing client info and protocol version
 * @returns Session data extracted from request parameters including protocol version and client info
 */
function extractSessionDataFromInitializeRequest(request) {
  const sessionData = {};
  if (isValidContentItem(request.params)) {
    if (typeof request.params.protocolVersion === 'string') {
      sessionData.protocolVersion = request.params.protocolVersion;
    }
    if (request.params.clientInfo) {
      sessionData.clientInfo = extractPartyInfo(request.params.clientInfo);
    }
  }
  return sessionData;
}

/**
 * Extracts session data from "initialize" response
 * @param result - "initialize" response result containing server info and protocol version
 * @returns Partial session data extracted from response including protocol version and server info
 */
function extractSessionDataFromInitializeResponse(result) {
  const sessionData = {};
  if (isValidContentItem(result)) {
    if (typeof result.protocolVersion === 'string') {
      sessionData.protocolVersion = result.protocolVersion;
    }
    if (result.serverInfo) {
      sessionData.serverInfo = extractPartyInfo(result.serverInfo);
    }
  }
  return sessionData;
}

/**
 * Build client attributes from stored client info
 * @param transport - MCP transport instance
 * @returns Client attributes for span instrumentation
 */
function getClientAttributes(transport) {
  const clientInfo = getClientInfoForTransport(transport);
  const attributes = {};

  if (clientInfo?.name) {
    attributes['mcp.client.name'] = clientInfo.name;
  }
  if (clientInfo?.title) {
    attributes['mcp.client.title'] = clientInfo.title;
  }
  if (clientInfo?.version) {
    attributes['mcp.client.version'] = clientInfo.version;
  }

  return attributes;
}

/**
 * Build client attributes from PartyInfo directly
 * @param clientInfo - Client party info
 * @returns Client attributes for span instrumentation
 */
function buildClientAttributesFromInfo(clientInfo) {
  const attributes = {};

  if (clientInfo?.name) {
    attributes['mcp.client.name'] = clientInfo.name;
  }
  if (clientInfo?.title) {
    attributes['mcp.client.title'] = clientInfo.title;
  }
  if (clientInfo?.version) {
    attributes['mcp.client.version'] = clientInfo.version;
  }

  return attributes;
}

/**
 * Build server attributes from stored server info
 * @param transport - MCP transport instance
 * @returns Server attributes for span instrumentation
 */
function getServerAttributes(transport) {
  const serverInfo = getSessionDataForTransport(transport)?.serverInfo;
  const attributes = {};

  if (serverInfo?.name) {
    attributes[MCP_SERVER_NAME_ATTRIBUTE] = serverInfo.name;
  }
  if (serverInfo?.title) {
    attributes[MCP_SERVER_TITLE_ATTRIBUTE] = serverInfo.title;
  }
  if (serverInfo?.version) {
    attributes[MCP_SERVER_VERSION_ATTRIBUTE] = serverInfo.version;
  }

  return attributes;
}

/**
 * Build server attributes from PartyInfo directly
 * @param serverInfo - Server party info
 * @returns Server attributes for span instrumentation
 */
function buildServerAttributesFromInfo(serverInfo) {
  const attributes = {};

  if (serverInfo?.name) {
    attributes[MCP_SERVER_NAME_ATTRIBUTE] = serverInfo.name;
  }
  if (serverInfo?.title) {
    attributes[MCP_SERVER_TITLE_ATTRIBUTE] = serverInfo.title;
  }
  if (serverInfo?.version) {
    attributes[MCP_SERVER_VERSION_ATTRIBUTE] = serverInfo.version;
  }

  return attributes;
}

/**
 * Extracts client connection info from extra handler data
 * @param extra - Extra handler data containing connection info
 * @returns Client address and port information
 */
function extractClientInfo(extra)

 {
  return {
    address:
      extra?.requestInfo?.remoteAddress ||
      extra?.clientAddress ||
      extra?.request?.ip ||
      extra?.request?.connection?.remoteAddress,
    port: extra?.requestInfo?.remotePort || extra?.clientPort || extra?.request?.connection?.remotePort,
  };
}

/**
 * Extracts transport types based on transport constructor name
 * @param transport - MCP transport instance
 * @returns Transport type mapping for span attributes
 */
function getTransportTypes(transport) {
  if (!transport?.constructor) {
    return { mcpTransport: 'unknown', networkTransport: 'unknown' };
  }
  const transportName = typeof transport.constructor?.name === 'string' ? transport.constructor.name : 'unknown';
  let networkTransport = 'unknown';

  const lowerTransportName = transportName.toLowerCase();
  if (lowerTransportName.includes('stdio')) {
    networkTransport = 'pipe';
  } else if (lowerTransportName.includes('http') || lowerTransportName.includes('sse')) {
    networkTransport = 'tcp';
  }

  return {
    mcpTransport: transportName,
    networkTransport,
  };
}

/**
 * Build transport and network attributes
 * @param transport - MCP transport instance
 * @param extra - Optional extra handler data
 * @returns Transport attributes for span instrumentation
 * @note sessionId may be undefined during initial setup - session should be established by client during initialize flow
 */
function buildTransportAttributes(
  transport,
  extra,
) {
  const sessionId = transport && 'sessionId' in transport ? transport.sessionId : undefined;
  const clientInfo = extra ? extractClientInfo(extra) : {};
  const { mcpTransport, networkTransport } = getTransportTypes(transport);
  const clientAttributes = getClientAttributes(transport);
  const serverAttributes = getServerAttributes(transport);
  const protocolVersion = getProtocolVersionForTransport(transport);

  const attributes = {
    ...(sessionId && { [MCP_SESSION_ID_ATTRIBUTE]: sessionId }),
    ...(clientInfo.address && { [CLIENT_ADDRESS_ATTRIBUTE]: clientInfo.address }),
    ...(clientInfo.port && { [CLIENT_PORT_ATTRIBUTE]: clientInfo.port }),
    [MCP_TRANSPORT_ATTRIBUTE]: mcpTransport,
    [NETWORK_TRANSPORT_ATTRIBUTE]: networkTransport,
    [NETWORK_PROTOCOL_VERSION_ATTRIBUTE]: '2.0',
    ...(protocolVersion && { [MCP_PROTOCOL_VERSION_ATTRIBUTE]: protocolVersion }),
    ...clientAttributes,
    ...serverAttributes,
  };

  return attributes;
}

export { buildClientAttributesFromInfo, buildServerAttributesFromInfo, buildTransportAttributes, extractClientInfo, extractSessionDataFromInitializeRequest, extractSessionDataFromInitializeResponse, getClientAttributes, getServerAttributes, getTransportTypes };
//# sourceMappingURL=sessionExtraction.js.map
