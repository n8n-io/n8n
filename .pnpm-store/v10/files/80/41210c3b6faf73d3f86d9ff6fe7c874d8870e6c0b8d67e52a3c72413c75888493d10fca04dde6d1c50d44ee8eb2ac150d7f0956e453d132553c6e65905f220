/**
 * Session data management for MCP server instrumentation
 */
import { MCPTransport, PartyInfo, SessionData } from './types';
/**
 * Stores session data for a transport with sessionId
 * @param transport - MCP transport instance
 * @param sessionData - Session data to store
 */
export declare function storeSessionDataForTransport(transport: MCPTransport, sessionData: SessionData): void;
/**
 * Updates session data for a transport with sessionId (merges with existing data)
 * @param transport - MCP transport instance
 * @param partialSessionData - Partial session data to merge with existing data
 */
export declare function updateSessionDataForTransport(transport: MCPTransport, partialSessionData: Partial<SessionData>): void;
/**
 * Retrieves client information for a transport
 * @param transport - MCP transport instance
 * @returns Client information if available
 */
export declare function getClientInfoForTransport(transport: MCPTransport): PartyInfo | undefined;
/**
 * Retrieves protocol version for a transport
 * @param transport - MCP transport instance
 * @returns Protocol version if available
 */
export declare function getProtocolVersionForTransport(transport: MCPTransport): string | undefined;
/**
 * Retrieves full session data for a transport
 * @param transport - MCP transport instance
 * @returns Complete session data if available
 */
export declare function getSessionDataForTransport(transport: MCPTransport): SessionData | undefined;
/**
 * Cleans up session data for a specific transport (when that transport closes)
 * @param transport - MCP transport instance
 */
export declare function cleanupSessionDataForTransport(transport: MCPTransport): void;
//# sourceMappingURL=sessionManagement.d.ts.map
