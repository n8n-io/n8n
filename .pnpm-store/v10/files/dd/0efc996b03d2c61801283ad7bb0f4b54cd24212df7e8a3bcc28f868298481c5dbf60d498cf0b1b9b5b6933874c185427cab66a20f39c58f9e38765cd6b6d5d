import * as z from "zod/v3";
import { AuthData, AuthData$Outbound } from "./authdata.js";
import { ResourceVisibility } from "./resourcevisibility.js";
export type ConnectorMCPCreate = {
    /**
     * The name of the connector. Should be 64 char length maximum, alphanumeric, only underscores/dashes.
     */
    name: string;
    /**
     * The description of the connector.
     */
    description: string;
    /**
     * The optional url of the icon you want to associate to the connector.
     */
    iconUrl?: string | null | undefined;
    visibility?: ResourceVisibility | undefined;
    /**
     * The url of the MCP server.
     */
    server: string;
    /**
     * Optional organization-level headers to be sent with the request to the mcp server.
     */
    headers?: {
        [k: string]: any;
    } | null | undefined;
    /**
     * Optional additional authentication data for the connector.
     */
    authData?: AuthData | null | undefined;
    /**
     * Optional system prompt for the connector.
     */
    systemPrompt?: string | null | undefined;
};
/** @internal */
export type ConnectorMCPCreate$Outbound = {
    name: string;
    description: string;
    icon_url?: string | null | undefined;
    visibility?: string | undefined;
    server: string;
    headers?: {
        [k: string]: any;
    } | null | undefined;
    auth_data?: AuthData$Outbound | null | undefined;
    system_prompt?: string | null | undefined;
};
/** @internal */
export declare const ConnectorMCPCreate$outboundSchema: z.ZodType<ConnectorMCPCreate$Outbound, z.ZodTypeDef, ConnectorMCPCreate>;
export declare function connectorMCPCreateToJSON(connectorMCPCreate: ConnectorMCPCreate): string;
//# sourceMappingURL=connectormcpcreate.d.ts.map