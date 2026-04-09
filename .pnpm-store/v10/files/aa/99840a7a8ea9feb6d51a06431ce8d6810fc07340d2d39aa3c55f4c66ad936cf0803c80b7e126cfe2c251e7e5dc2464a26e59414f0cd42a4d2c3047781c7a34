import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class Connectors extends ClientSDK {
    /**
     * Create a new connector.
     *
     * @remarks
     * Create a new MCP connector. You can customize its visibility, url and auth type.
     */
    create(request: components.ConnectorMCPCreate, options?: RequestOptions): Promise<components.Connector>;
    /**
     * List all connectors.
     *
     * @remarks
     * List all your custom connectors with keyset pagination and filters.
     */
    list(request?: operations.ConnectorListV1Request | undefined, options?: RequestOptions): Promise<components.PaginatedConnectors>;
    /**
     * Call Connector Tool
     *
     * @remarks
     * Call a tool on an MCP connector.
     */
    callTool(request: operations.ConnectorCallToolV1Request, options?: RequestOptions): Promise<components.MCPToolCallResponse>;
    /**
     * Get a connector.
     *
     * @remarks
     * Get a connector by its ID or name.
     */
    get(request: operations.ConnectorGetV1Request, options?: RequestOptions): Promise<components.Connector>;
    /**
     * Update a connector.
     *
     * @remarks
     * Update a connector by its ID.
     */
    update(request: operations.ConnectorUpdateV1Request, options?: RequestOptions): Promise<components.Connector>;
    /**
     * Delete a connector.
     *
     * @remarks
     * Delete a connector by its ID.
     */
    delete(request: operations.ConnectorDeleteV1Request, options?: RequestOptions): Promise<components.MessageResponse>;
}
//# sourceMappingURL=connectors.d.ts.map