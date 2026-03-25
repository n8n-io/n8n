"use strict";
// Run with: npx tsx src/examples/server/toolWithSampleServer.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("../../server/mcp.js");
const stdio_js_1 = require("../../server/stdio.js");
const z = __importStar(require("zod/v4"));
const mcpServer = new mcp_js_1.McpServer({
    name: 'tools-with-sample-server',
    version: '1.0.0'
});
// Tool that uses LLM sampling to summarize any text
mcpServer.registerTool('summarize', {
    description: 'Summarize any text using an LLM',
    inputSchema: {
        text: z.string().describe('Text to summarize')
    }
}, async ({ text }) => {
    // Call the LLM through MCP sampling
    const response = await mcpServer.server.createMessage({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please summarize the following text concisely:\n\n${text}`
                }
            }
        ],
        maxTokens: 500
    });
    // Since we're not passing tools param to createMessage, response.content is single content
    return {
        content: [
            {
                type: 'text',
                text: response.content.type === 'text' ? response.content.text : 'Unable to generate summary'
            }
        ]
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await mcpServer.connect(transport);
    console.log('MCP server is running...');
}
main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=toolWithSampleServer.js.map