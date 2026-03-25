export interface MCPServerConfig {
    mcpServerName: string;
    url: string;
    headers?: Record<string, string>;
}
export type MCPServerManifestEntry = {
    url?: string;
    headers?: Record<string, string>;
} & ({
    mcpServerName: string;
    mcpServerUniqueName?: string;
} | {
    mcpServerUniqueName: string;
    mcpServerName?: string;
});
export interface McpClientTool {
    name: string;
    description?: string;
    inputSchema: InputSchema;
}
export interface InputSchema {
    type: string;
    properties?: Record<string, object>;
    required?: string[];
    additionalProperties?: boolean;
}
export interface ToolOptions {
    orchestratorName?: string;
}
//# sourceMappingURL=contracts.d.ts.map