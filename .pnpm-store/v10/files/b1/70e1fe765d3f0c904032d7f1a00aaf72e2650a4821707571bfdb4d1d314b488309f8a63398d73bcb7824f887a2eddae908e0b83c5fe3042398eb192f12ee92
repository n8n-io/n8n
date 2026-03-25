#!/usr/bin/env node
/**
 * Example MCP server using the high-level McpServer API with outputSchema
 * This demonstrates how to easily create tools with structured output
 */
import { McpServer } from '../../server/mcp.js';
import { StdioServerTransport } from '../../server/stdio.js';
import * as z from 'zod/v4';
const server = new McpServer({
    name: 'mcp-output-schema-high-level-example',
    version: '1.0.0'
});
// Define a tool with structured output - Weather data
server.registerTool('get_weather', {
    description: 'Get weather information for a city',
    inputSchema: {
        city: z.string().describe('City name'),
        country: z.string().describe('Country code (e.g., US, UK)')
    },
    outputSchema: {
        temperature: z.object({
            celsius: z.number(),
            fahrenheit: z.number()
        }),
        conditions: z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'snowy']),
        humidity: z.number().min(0).max(100),
        wind: z.object({
            speed_kmh: z.number(),
            direction: z.string()
        })
    }
}, async ({ city, country }) => {
    // Parameters are available but not used in this example
    void city;
    void country;
    // Simulate weather API call
    const temp_c = Math.round((Math.random() * 35 - 5) * 10) / 10;
    const conditions = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'][Math.floor(Math.random() * 5)];
    const structuredContent = {
        temperature: {
            celsius: temp_c,
            fahrenheit: Math.round(((temp_c * 9) / 5 + 32) * 10) / 10
        },
        conditions,
        humidity: Math.round(Math.random() * 100),
        wind: {
            speed_kmh: Math.round(Math.random() * 50),
            direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
        }
    };
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(structuredContent, null, 2)
            }
        ],
        structuredContent
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('High-level Output Schema Example Server running on stdio');
}
main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=mcpServerOutputSchema.js.map